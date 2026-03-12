const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// ─── Crear usuario ────────────────────────────────────────────────────────────
exports.createUser = functions.https.onCall(async (data, context) => {

  // 1. Verificar autenticación
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Debes estar autenticado.');
  }

  // 2. Buscar el documento del admin por campo uid (NO por ID de documento)
  const callerSnap = await admin.firestore()
    .collection('users')
    .where('uid', '==', context.auth.uid)
    .limit(1)
    .get();

  if (callerSnap.empty) {
    throw new functions.https.HttpsError('not-found', 'Perfil de usuario no encontrado en Firestore. Sincroniza tu uid primero.');
  }

  const callerRole = callerSnap.docs[0].data().role;

  if (callerRole !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Solo los administradores pueden crear usuarios.');
  }

  // 3. Validar datos
  const { email, password, name, role, phone, active } = data;

  if (!email || !password || !name || !role) {
    throw new functions.https.HttpsError('invalid-argument', 'Faltan campos requeridos: email, password, name, role.');
  }

  if (password.length < 6) {
    throw new functions.https.HttpsError('invalid-argument', 'La contrasena debe tener al menos 6 caracteres.');
  }

  // 4. Crear en Firebase Auth
  let newAuthUser;
  try {
    newAuthUser = await admin.auth().createUser({
      email: email.toLowerCase(),
      password: password,
      displayName: name,
    });
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      throw new functions.https.HttpsError('already-exists', 'Este correo ya esta registrado.');
    }
    if (error.code === 'auth/invalid-email') {
      throw new functions.https.HttpsError('invalid-argument', 'Formato de correo invalido.');
    }
    throw new functions.https.HttpsError('internal', `Error Auth: ${error.message}`);
  }

  // 5. Guardar perfil en Firestore (sin contrasena)
  try {
    await admin.firestore().collection('users').add({
      uid: newAuthUser.uid,
      name: name,
      email: email.toLowerCase(),
      role: role,
      phone: phone || '',
      active: active !== undefined ? active : true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    await admin.auth().deleteUser(newAuthUser.uid);
    throw new functions.https.HttpsError('internal', 'Error al guardar perfil en Firestore.');
  }

  return { uid: newAuthUser.uid, message: 'Usuario creado exitosamente.' };
});


// ─── Eliminar usuario ─────────────────────────────────────────────────────────
exports.deleteUser = functions.https.onCall(async (data, context) => {

  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'No autenticado.');
  }

  // Buscar admin por campo uid
  const callerSnap = await admin.firestore()
    .collection('users')
    .where('uid', '==', context.auth.uid)
    .limit(1)
    .get();

  if (callerSnap.empty || callerSnap.docs[0].data().role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Solo admins pueden eliminar usuarios.');
  }

  const { uid, firestoreId } = data;

  if (!uid || !firestoreId) {
    throw new functions.https.HttpsError('invalid-argument', 'Se requiere uid y firestoreId.');
  }

  if (uid === context.auth.uid) {
    throw new functions.https.HttpsError('failed-precondition', 'No puedes eliminar tu propia cuenta.');
  }

  try {
    await admin.auth().deleteUser(uid);
  } catch (error) {
    if (error.code !== 'auth/user-not-found') {
      throw new functions.https.HttpsError('internal', 'Error al eliminar de Auth.');
    }
  }

  await admin.firestore().collection('users').doc(firestoreId).delete();

  return { message: 'Usuario eliminado correctamente.' };
});
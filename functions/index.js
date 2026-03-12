const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// ─── Crear usuario ────────────────────────────────────────────────────────────
// Solo admins pueden llamar esta función.
// El Admin SDK crea el usuario en Auth sin necesitar una segunda instancia.

exports.createUser = functions.https.onCall(async (data, context) => {
  // 1. Verificar que el llamador está autenticado
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Debes estar autenticado para realizar esta acción.'
    );
  }

  // 2. Verificar que el llamador es admin
  // Lee el rol desde Firestore para no depender de custom claims
  
  const callerDoc = await admin
  .firestore()
  .collection("users")
  .doc(context.auth.uid)
  .get();

  if (callerDoc.empty) {
    throw new functions.https.HttpsError(
      'not-found',
      'Usuario no encontrado.'
    );
  }

  const callerRole = callerDoc.docs[0].data().role;

  if (callerRole !== 'admin') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Solo los administradores pueden crear usuarios.'
    );
  }

  // 3. Validar datos recibidos
  const { email, password, name, role, phone, active } = data;

  if (!email || !password || !name || !role) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Faltan campos requeridos: email, password, name, role.'
    );
  }

  if (password.length < 6) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'La contraseña debe tener al menos 6 caracteres.'
    );
  }

  // 4. Crear usuario en Firebase Auth
  let newAuthUser;
  try {
    newAuthUser = await admin.auth().createUser({
      email: email.toLowerCase(),
      password: password,
      displayName: name,
    });
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      throw new functions.https.HttpsError(
        'already-exists',
        'Este correo ya está registrado.'
      );
    }
    if (error.code === 'auth/invalid-email') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Formato de correo inválido.'
      );
    }
    throw new functions.https.HttpsError('internal', 'Error al crear el usuario en Auth.');
  }

  // 5. Guardar perfil en Firestore (sin contraseña)
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
    // Si falla Firestore, eliminar el usuario de Auth para no dejar inconsistencias
    await admin.auth().deleteUser(newAuthUser.uid);
    throw new functions.https.HttpsError('internal', 'Error al guardar el perfil del usuario.');
  }

  return { uid: newAuthUser.uid, message: 'Usuario creado exitosamente.' };
});


// ─── Eliminar usuario ─────────────────────────────────────────────────────────
// Elimina de Auth Y de Firestore en una sola operación segura.

exports.deleteUser = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'No autenticado.');
  }

  // Verificar que el llamador es admin
  const callerDoc = await admin.firestore()
    .collection('users')
    .where('uid', '==', context.auth.uid)
    .limit(1)
    .get();

  if (callerDoc.empty || callerDoc.docs[0].data().role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Solo admins pueden eliminar usuarios.');
  }

  const { uid, firestoreId } = data;

  if (!uid || !firestoreId) {
    throw new functions.https.HttpsError('invalid-argument', 'Se requiere uid y firestoreId.');
  }

  // Evitar que el admin se elimine a sí mismo
  if (uid === context.auth.uid) {
    throw new functions.https.HttpsError('failed-precondition', 'No puedes eliminar tu propia cuenta.');
  }

  try {
    await admin.auth().deleteUser(uid);
  } catch (error) {
    if (error.code !== 'auth/user-not-found') {
      throw new functions.https.HttpsError('internal', 'Error al eliminar de Auth.');
    }
    // Si no existe en Auth, igual eliminamos de Firestore
  }

  await admin.firestore().collection('users').doc(firestoreId).delete();

  return { message: 'Usuario eliminado correctamente.' };
});
const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');

admin.initializeApp();

// ─── Crear usuario ────────────────────────────────────────────────────────────
exports.createUser = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Debes estar autenticado.');
  }

    const callerSnap = await admin.firestore()
      .collection('users')
      .where('uid', '==', context.auth.uid)
      .limit(1)
      .get();

    if (callerSnap.empty) {
      throw new functions.https.HttpsError('not-found', 'Perfil de usuario no encontrado en Firestore.');
    }

    if (callerSnap.docs[0].data().role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Solo los administradores pueden crear usuarios.');
    }

    const { email, password, name, role, phone, active } = data;

    if (!email || !password || !name || !role) {
      throw new functions.https.HttpsError('invalid-argument', 'Faltan campos requeridos.');
    }

    if (password.length < 6) {
      throw new functions.https.HttpsError('invalid-argument', 'La contraseña debe tener al menos 6 caracteres.');
    }

    let newAuthUser;
    try {
      newAuthUser = await admin.auth().createUser({
        email: email.toLowerCase(),
        password,
        displayName: name,
      });
    } catch (error) {
      if (error.code === 'auth/email-already-exists')
        throw new functions.https.HttpsError('already-exists', 'Este correo ya está registrado.');
      if (error.code === 'auth/invalid-email')
        throw new functions.https.HttpsError('invalid-argument', 'Formato de correo inválido.');
      throw new functions.https.HttpsError('internal', `Error Auth: ${error.message}`);
    }

    try {
      await admin.firestore().collection('users').add({
        uid: newAuthUser.uid,
        name,
        email: email.toLowerCase(),
        role,
        phone: phone || '',
        active: active !== undefined ? active : true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch {
      await admin.auth().deleteUser(newAuthUser.uid);
      throw new functions.https.HttpsError('internal', 'Error al guardar perfil en Firestore.');
    }

    return { uid: newAuthUser.uid, message: 'Usuario creado exitosamente.' };
  }
);

// ─── Eliminar usuario ─────────────────────────────────────────────────────────
exports.deleteUser = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'No autenticado.');
  }

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
      if (error.code !== 'auth/user-not-found')
        throw new functions.https.HttpsError('internal', 'Error al eliminar de Auth.');
    }

    await admin.firestore().collection('users').doc(firestoreId).delete();

    return { message: 'Usuario eliminado correctamente.' };
  }
);
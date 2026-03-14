const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");

admin.initializeApp();
setGlobalOptions({ region: "us-central1" });

// ── Helper: verifica que quien llama es admin ────────────────────────────────
async function verifyAdmin(req, res) {
  const token = req.headers.authorization?.split("Bearer ")[1];
  if (!token) {
    res.status(401).json({ error: "Sin token de autenticación" });
    return null;
  }
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const doc = await admin.firestore().collection("users").doc(decoded.uid).get();
    if (doc.data()?.role !== "admin") {
      res.status(403).json({ error: "No autorizado — se requiere rol admin" });
      return null;
    }
    return { uid: decoded.uid, ...doc.data() };
  } catch {
    res.status(401).json({ error: "Token inválido o expirado" });
    return null;
  }
}

// ── CORS helper ───────────────────────────────────────────────────────────────
function setCors(req, res) {
  const allowed = process.env.ALLOWED_ORIGIN || "*";
  res.set("Access-Control-Allow-Origin", allowed);
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") { res.status(204).send(""); return true; }
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════
// POST /createEmployee
// Body: { email, password, name, role, department, position, ... }
// ═══════════════════════════════════════════════════════════════════════════
exports.createEmployee = onRequest(async (req, res) => {
  if (setCors(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  const caller = await verifyAdmin(req, res);
  if (!caller) return;

  const { email, password, name, role, department, position, joinedAt, color, status } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: "email, password y name son obligatorios" });
  }

  try {
    // 1. Crear en Firebase Auth — sin cambiar la sesión del admin (Admin SDK)
    const userRecord = await admin.auth().createUser({ email, password });

    // 2. Enviar email de reset para que el empleado establezca su contraseña
    const resetLink = await admin.auth().generatePasswordResetLink(email);
    // (en producción enviarías este link por email con tu servicio preferido)
    // Por ahora lo devolvemos en la respuesta para que lo veas en consola
    console.log("Reset link para", email, ":", resetLink);

    // 3. Guardar perfil en Firestore usando el UID como ID del documento
    const initials = name.split(" ").slice(0, 2).map(w => w[0] || "").join("").toUpperCase();
    await admin.firestore().collection("users").doc(userRecord.uid).set({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      role: role || "recepcionista",
      department: department || "Recepción",
      position: position || "",
      joinedAt: joinedAt || new Date().toISOString().split("T")[0],
      color: color || "blue",
      status: status || "active",
      initials,
      uid: userRecord.uid,
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: caller.name || caller.uid,
    });

    return res.status(200).json({ uid: userRecord.uid, success: true });

  } catch (err) {
    console.error("createEmployee error:", err);
    const msg = err.code === "auth/email-already-exists"
      ? "Ese correo ya está registrado"
      : err.message;
    return res.status(500).json({ error: msg });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /deleteEmployee
// Body: { uid }
// ═══════════════════════════════════════════════════════════════════════════
exports.deleteEmployee = onRequest(async (req, res) => {
  if (setCors(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  const caller = await verifyAdmin(req, res);
  if (!caller) return;

  const { uid } = req.body;
  if (!uid) return res.status(400).json({ error: "uid es obligatorio" });

  try {
    // Borra de Auth Y de Firestore en paralelo
    await Promise.all([
      admin.auth().deleteUser(uid),
      admin.firestore().collection("users").doc(uid).delete(),
    ]);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("deleteEmployee error:", err);
    return res.status(500).json({ error: err.message });
  }
});
import React, { useState } from 'react';
import { auth, db } from '../firebase';
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { FaUser, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import '../styles/login.css';
import logo from '../assets/logo.png';

const MAX_ATTEMPTS    = 5;
const LOCKOUT_MINUTES = 15;

// ─── Fuera del componente — disponibles desde el primer render ───────────────
const getAttemptData = () => {
  try {
    return JSON.parse(localStorage.getItem('loginAttempts') || '{"count":0,"since":0}');
  } catch {
    return { count: 0, since: 0 };
  }
};

const isLockedOut = () => {
  const data = getAttemptData();
  if (data.count < MAX_ATTEMPTS) return false;
  const minutesPassed = (Date.now() - data.since) / 60000;
  if (minutesPassed >= LOCKOUT_MINUTES) {
    localStorage.removeItem('loginAttempts');
    return false;
  }
  return Math.ceil(LOCKOUT_MINUTES - minutesPassed);
};

const Login = ({ onLoginSuccess }) => {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [isBlocked, setIsBlocked]       = useState(() => !!isLockedOut()); // ✅ ya no hay problema de orden
  const [view, setView]                 = useState('login');
  const [resetEmail, setResetEmail]     = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError]     = useState('');

  // ─── Control de intentos fallidos ─────────────────────────────────────────
  const registerFailedAttempt = () => {
    const data = getAttemptData();
    const newCount = data.count + 1;
    localStorage.setItem('loginAttempts', JSON.stringify({
      count: newCount,
      since: data.count === 0 ? Date.now() : data.since
    }));
    if (newCount >= MAX_ATTEMPTS) setIsBlocked(true);
  };

  const clearAttempts = () => {
    localStorage.removeItem('loginAttempts');
    setIsBlocked(false);
  };

  // ─── Login ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const lockout = isLockedOut();
    if (lockout) {
      setIsBlocked(true);
      setError(`Demasiados intentos fallidos. Espera ${lockout} minuto${lockout !== 1 ? 's' : ''} o restablece tu contraseña.`);
      return;
    }

    setLoading(true);

    try {
      // 1. Autenticar con Firebase Auth
      const credential = await signInWithEmailAndPassword(auth, email.toLowerCase().trim(), password);

      // 2. Leer perfil desde colección 'users' (igual que antes)
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email.toLowerCase().trim()));
      const snap = await getDocs(q);

      if (snap.empty) {
        setError('Usuario no encontrado en el sistema. Contacta al administrador.');
        await auth.signOut();
        setLoading(false);
        return;
      }

      const userDoc  = snap.docs[0];
      const userData = userDoc.data();

      // 3. Verificar que esté activo
      if (userData.active === false) {
        setError('Tu cuenta está desactivada. Contacta al administrador.');
        await auth.signOut();
        setLoading(false);
        return;
      }

      // 4. Login exitoso
      clearAttempts();

      const user = {
        id:  userDoc.id,
        uid: credential.user.uid,
        ...userData,
        password: undefined,
      };

      localStorage.setItem('currentUser', JSON.stringify(user));
      onLoginSuccess(user);

    } catch (err) {
      registerFailedAttempt();
      const remaining = MAX_ATTEMPTS - getAttemptData().count;

      switch (err.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          setError(
            remaining > 0
              ? `Credenciales incorrectas. Te quedan ${remaining} intento${remaining !== 1 ? 's' : ''}.`
              : `Cuenta bloqueada por ${LOCKOUT_MINUTES} minutos. Podés restablecer tu contraseña.`
          );
          break;
        case 'auth/too-many-requests':
          setError('Cuenta bloqueada temporalmente por Firebase. Restablece tu contraseña o espera unos minutos.');
          break;
        case 'auth/invalid-email':
          setError('El formato del correo no es válido.');
          break;
        case 'auth/network-request-failed':
          setError('Sin conexión. Verifica tu internet.');
          break;
        default:
          setError('Error al iniciar sesión. Intenta nuevamente.');
          console.error('Auth error:', err.code, err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── Reset de contraseña ───────────────────────────────────────────────────
  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail.toLowerCase(), {
        url: window.location.origin,
      });
      setView('reset-sent');
    } catch (err) {
      switch (err.code) {
        case 'auth/user-not-found':
          setView('reset-sent'); // no revelar si el email existe
          break;
        case 'auth/invalid-email':
          setResetError('El formato del correo no es válido.');
          break;
        case 'auth/too-many-requests':
          setResetError('Demasiadas solicitudes. Espera unos minutos.');
          break;
        default:
          setResetError('Error al enviar el correo. Intenta nuevamente.');
      }
    } finally {
      setResetLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER — Reset enviado
  // ═══════════════════════════════════════════════════════════════════════════
  if (view === 'reset-sent') {
    return (
      <div className="login-page">
        <div className="login-container">
          <div className="login-left">
            <div className="login-brand">
              <div className="brand-icon"><img src={logo} alt="SGI Logo" width="120" /></div>
              <h1>SGI</h1>
              <p>Sistema de Gestión Integral</p>
            </div>
          </div>
          <div className="login-right">
            <div className="login-form-wrapper">
              <div className="login-header">
                <span style={{ fontSize: '3rem' }}>📧</span>
                <h2>Revisa tu correo</h2>
                <p>
                  Si <strong>{resetEmail}</strong> está registrado, recibirás un enlace
                  para restablecer tu contraseña en los próximos minutos.
                </p>
                <p style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: 8 }}>
                  Revisa también la carpeta de spam.
                </p>
              </div>
              <button className="login-btn" onClick={() => { setView('login'); setResetEmail(''); }}>
                Volver al inicio de sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER — Reset contraseña
  // ═══════════════════════════════════════════════════════════════════════════
  if (view === 'reset') {
    return (
      <div className="login-page">
        <div className="login-container">
          <div className="login-left">
            <div className="login-brand">
              <div className="brand-icon"><img src={logo} alt="SGI Logo" width="120" /></div>
              <h1>SGI</h1>
              <p>Sistema de Gestión Integral</p>
            </div>
          </div>
          <div className="login-right">
            <div className="login-form-wrapper">
              <div className="login-header">
                <h2>Restablecer contraseña</h2>
                <p>Ingresa tu correo y te enviaremos un enlace para crear una nueva contraseña.</p>
              </div>
              <form onSubmit={handlePasswordReset} className="login-form">
                {resetError && (
                  <div className="login-error"><span>⚠️</span><span>{resetError}</span></div>
                )}
                <div className="form-group">
                  <label htmlFor="reset-email">Correo Electrónico</label>
                  <div className="input-wrapper">
                    <FaUser className="input-icon" />
                    <input
                      id="reset-email"
                      type="email"
                      placeholder="ejemplo@hotel.com"
                      value={resetEmail}
                      onChange={e => setResetEmail(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                </div>
                <button type="submit" className="login-btn" disabled={resetLoading}>
                  {resetLoading ? <><span className="spinner"></span> Enviando...</> : 'Enviar enlace de restablecimiento'}
                </button>
              </form>
              <div className="login-footer">
                <button
                  style={{ background: 'none', border: 'none', color: '#5b5bff', cursor: 'pointer', fontSize: '0.9rem' }}
                  onClick={() => { setView('login'); setResetError(''); }}
                >
                  ← Volver al inicio de sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER — Login principal
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-left">
          <div className="login-brand">
            <div className="brand-icon"><img src={logo} alt="SGI Logo" width="120" /></div>
            <h1>SGI</h1>
            <p>Sistema de Gestión Integral</p>
          </div>
          <div className="login-features">
            <div className="feature-item"><span className="feature-icon">✓</span><span>Gestión de Turnos</span></div>
            <div className="feature-item"><span className="feature-icon">✓</span><span>Control de Check-in/out</span></div>
            <div className="feature-item"><span className="feature-icon">✓</span><span>Métricas en Tiempo Real</span></div>
            <div className="feature-item"><span className="feature-icon">✓</span><span>Reportes Detallados</span></div>
          </div>
        </div>

        <div className="login-right">
          <div className="login-form-wrapper">
            <div className="login-header">
              <h2>Bienvenido</h2>
              <p>Ingresa tus credenciales para continuar</p>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
              {error && (
                <div className="login-error"><span>⚠️</span><span>{error}</span></div>
              )}

              <div className="form-group">
                <label htmlFor="email">Correo Electrónico</label>
                <div className="input-wrapper">
                  <FaUser className="input-icon" />
                  <input
                    id="email"
                    type="email"
                    placeholder="ejemplo@hotel.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="password">Contraseña</label>
                <div className="input-wrapper">
                  <FaLock className="input-icon" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="toggle-password-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <div style={{ textAlign: 'right', marginTop: -8, marginBottom: 16 }}>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: '#5b5bff', cursor: 'pointer', fontSize: '0.85rem' }}
                  onClick={() => { setView('reset'); setResetEmail(email); setResetError(''); }}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <button type="submit" className="login-btn" disabled={loading || isBlocked}>
                {loading ? <><span className="spinner"></span> Iniciando sesión...</> : 'Iniciar Sesión'}
              </button>
            </form>

            <div className="login-footer">
              <p>&copy; 2026 SGI. Todos los derechos reservados.</p>
              <p>SGI - DEVELOPED BY S-1</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
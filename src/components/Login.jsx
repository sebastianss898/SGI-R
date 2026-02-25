import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { FaUser, FaLock, FaEye, FaEyeSlash, FaHotel } from 'react-icons/fa';
import '../styles/login.css';

const Login = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Buscar usuario por email
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email.toLowerCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError('Usuario no encontrado');
        setLoading(false);
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();

      // Verificar contraseña (⚠️ En producción usar bcrypt)
      if (userData.password !== password) {
        setError('Contraseña incorrecta');
        setLoading(false);
        return;
      }

      // Verificar si está activo
      if (!userData.active) {
        setError('Usuario desactivado. Contacta al administrador.');
        setLoading(false);
        return;
      }

      // Login exitoso
      const user = {
        id: userDoc.id,
        ...userData
      };

      // Guardar en localStorage
      localStorage.setItem('currentUser', JSON.stringify(user));
      
      // Callback de éxito
      onLoginSuccess(user);

    } catch (error) {
      console.error('Error en login:', error);
      setError('Error al iniciar sesión. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Left Side - Branding */}
        <div className="login-left">
          <div className="login-brand">
            <div className="brand-icon">
              <FaHotel />
            </div>
            <h1>Hotel Cytrico</h1>
            <p>Sistema de Gestión Hotelera</p>
          </div>
          <div className="login-features">
            <div className="feature-item">
              <span className="feature-icon">✓</span>
              <span>Gestión de Turnos</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">✓</span>
              <span>Control de Check-in/out</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">✓</span>
              <span>Métricas en Tiempo Real</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">✓</span>
              <span>Reportes Detallados</span>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="login-right">
          <div className="login-form-wrapper">
            <div className="login-header">
              <h2>Bienvenido</h2>
              <p>Ingresa tus credenciales para continuar</p>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
              {error && (
                <div className="login-error">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
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
                    onChange={(e) => setEmail(e.target.value)}
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
                    onChange={(e) => setPassword(e.target.value)}
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

              <button
                type="submit"
                className="login-btn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    <span>Iniciando sesión...</span>
                  </>
                ) : (
                  'Iniciar Sesión'
                )}
              </button>
            </form>

            <div className="login-footer">
              <p>¿Olvidaste tu contraseña?</p>
              <a href="#" onClick={(e) => { e.preventDefault(); alert('Contacta al administrador'); }}>
                Contactar administrador
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

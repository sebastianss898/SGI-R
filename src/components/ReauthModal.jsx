import React, { useState } from 'react';
import { auth } from '../firebase';
import { reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { FaLock, FaEye, FaEyeSlash, FaSpinner } from 'react-icons/fa';

export default function ReauthModal({ onSuccess, onCancel, title = "Confirma tu identidad" }) {
  const [password, setPassword]         = useState('');
  const [showPass, setShowPass]         = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user       = auth.currentUser;
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
      onSuccess();
    } catch (err) {
      switch (err.code) {
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          setError('Contraseña incorrecta.');
          break;
        case 'auth/too-many-requests':
          setError('Demasiados intentos. Espera unos minutos.');
          break;
        default:
          setError('Error al verificar. Intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--color-background-primary)',
        border: '1px solid var(--color-border-tertiary)',
        borderRadius: 16, padding: 32, width: 360, maxWidth: '90vw',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔐</div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500,
            color: 'var(--color-text-primary)' }}>{title}</h2>
          <p style={{ margin: '8px 0 0', fontSize: 13,
            color: 'var(--color-text-secondary)' }}>
            Ingresa tu contraseña para continuar
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{
              background: 'var(--color-background-danger)',
              border: '1px solid var(--color-border-danger)',
              color: 'var(--color-text-danger)',
              borderRadius: 8, padding: '10px 14px',
              fontSize: 13, marginBottom: 16,
              display: 'flex', gap: 8, alignItems: 'center',
            }}>
              ⚠ {error}
            </div>
          )}

          <div style={{ position: 'relative', marginBottom: 20 }}>
            <FaLock style={{
              position: 'absolute', left: 12, top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-tertiary)', fontSize: 14,
            }}/>
            <input
              type={showPass ? 'text' : 'password'}
              placeholder="Contraseña"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
              required
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '10px 40px 10px 36px',
                background: 'var(--color-background-secondary)',
                border: '1px solid var(--color-border-secondary)',
                borderRadius: 8, fontSize: 14,
                color: 'var(--color-text-primary)',
                outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={() => setShowPass(p => !p)}
              style={{
                position: 'absolute', right: 10, top: '50%',
                transform: 'translateY(-50%)',
                background: 'none', border: 'none',
                color: 'var(--color-text-tertiary)', cursor: 'pointer',
                fontSize: 14, padding: 4,
              }}
            >
              {showPass ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                flex: 1, padding: '10px 0',
                background: 'var(--color-background-secondary)',
                border: '1px solid var(--color-border-secondary)',
                borderRadius: 8, fontSize: 14,
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !password}
              style={{
                flex: 2, padding: '10px 0',
                background: loading || !password ? 'var(--color-border-secondary)' : '#5b5bff',
                border: 'none', borderRadius: 8,
                fontSize: 14, fontWeight: 500,
                color: '#fff', cursor: loading || !password ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 8,
              }}
            >
              {loading ? <><FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> Verificando...</> : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
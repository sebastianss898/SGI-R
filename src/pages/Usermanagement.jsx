import React, { useState, useEffect } from 'react';
import { db, auth, functions } from '../firebase';
import {
  collection, getDocs, updateDoc, deleteDoc,
  doc, query, orderBy, where
} from 'firebase/firestore';
import { onAuthStateChanged, sendPasswordResetEmail } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import {
  FaUser, FaPlus, FaEdit, FaTrash, FaLock,
  FaUnlock, FaEye, FaEyeSlash, FaSearch, FaFilter,
  FaUserShield, FaUserTie, FaUserClock, FaBroom, FaTools,
  FaEnvelope, FaSpinner
} from 'react-icons/fa';
import { ROLES, ROLE_LABELS, ROLE_COLORS, getRolePermissions } from '../utils/roles';
import '../styles/Usermanagement.css';

const createUserFn = httpsCallable(functions, 'createUser');
const deleteUserFn = httpsCallable(functions, 'deleteUser');

const UserManagement = () => {

  // ─── Auth state ───────────────────────────────────────────────────────────
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // ─── Usuario desde localStorage ───────────────────────────────────────────
  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('currentUser')); }
    catch { return null; }
  })();

  const isAdmin = currentUser?.role === ROLES.ADMIN || currentUser?.role === 'admin';

  // ─── Estados ──────────────────────────────────────────────────────────────
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [toast, setToast] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [showPassword, setShowPassword] = useState(false);

  const [userForm, setUserForm] = useState({
    name: '', email: '', password: '',
    role: ROLES.RECEPTIONIST, phone: '', active: true
  });

  useEffect(() => {
    if (authReady && isAdmin) loadUsers();
  }, [authReady]);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const resetForm = () => {
    setUserForm({ name: '', email: '', password: '', role: ROLES.RECEPTIONIST, phone: '', active: true });
    setEditingUser(null);
    setShowPassword(false);
    setModalError('');
  };

  const getRoleIcon = (role) => ({
    [ROLES.ADMIN]: <FaUserShield />,
    [ROLES.MANAGER]: <FaUserTie />,
    [ROLES.RECEPTIONIST]: <FaUserClock />,
    [ROLES.HOUSEKEEPER]: <FaBroom />,
    [ROLES.MAINTENANCE]: <FaTools />
  }[role] || <FaUser />);

  // ─── Cargar usuarios ──────────────────────────────────────────────────────

  const loadUsers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      setUsers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    } finally {
      setLoading(false);
    }
  };

  // ─── Sincronizar uid en Firestore si falta ────────────────────────────────
  // Esto soluciona el problema de admins creados antes de Firebase Auth
  const ensureUidInFirestore = async () => {
    if (!firebaseUser || !currentUser?.id) return;
    try {
      const userRef = doc(db, 'users', currentUser.id);
      await updateDoc(userRef, { uid: firebaseUser.uid });
      // Actualizar localStorage también
      const updated = { ...currentUser, uid: firebaseUser.uid };
      localStorage.setItem('currentUser', JSON.stringify(updated));
      console.log('✅ uid sincronizado en Firestore');
    } catch (e) {
      console.error('Error sincronizando uid:', e);
    }
  };

  // ─── Crear usuario ────────────────────────────────────────────────────────

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!auth.currentUser) {
    setModalError('Debes iniciar sesión nuevamente.');
      return;
    }

      await auth.currentUser.getIdToken(true);

    // Si el admin no tiene uid en Firestore, sincronizarlo primero
    if (!currentUser?.uid) await ensureUidInFirestore();

    setSaving(true);
    try {
      await createUserFn({
        email: userForm.email,
        password: userForm.password,
        name: userForm.name,
        role: userForm.role,
        phone: userForm.phone,
        active: userForm.active,
      });

      setShowUserModal(false);
      resetForm();
      loadUsers();
      showToast('Usuario creado exitosamente', 'success');

    } catch (error) {
      console.error('Error creando usuario:', error);
      switch (error.code) {
        case 'already-exists':
          setModalError('Este correo ya está registrado.');
          break;
        case 'invalid-argument':
          setModalError(error.message);
          break;
        case 'permission-denied':
          setModalError('No tienes permisos. Verifica que tu usuario tenga rol admin en Firestore.');
          break;
        case 'unauthenticated':
          setModalError('Tu sesión expiró. Recarga la página.');
          break;
        default:
          setModalError(`Error: ${error.message}`);
      }
    } finally {
      setSaving(false);
    }
  };

  // ─── Editar usuario ───────────────────────────────────────────────────────

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setModalError('');
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', editingUser.id), {
        name: userForm.name,
        role: userForm.role,
        phone: userForm.phone || '',
        active: userForm.active,
        updatedAt: new Date()
      });
      setShowUserModal(false);
      resetForm();
      loadUsers();
      showToast('Usuario actualizado', 'success');
    } catch {
      setModalError('Error al actualizar usuario.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Eliminar usuario ─────────────────────────────────────────────────────

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`¿Eliminar a ${user.name}? Perderá acceso al sistema.`)) return;

    if (!firebaseUser) {
      showToast('Tu sesión expiró. Recarga la página.', 'error');
      return;
    }

    // Si el admin no tiene uid en Firestore, sincronizarlo primero
    if (!currentUser?.uid) await ensureUidInFirestore();

    try {
      await deleteUserFn({ uid: user.uid, firestoreId: user.id });
      loadUsers();
      showToast('Usuario eliminado', 'success');
    } catch (error) {
      console.error('Error eliminando:', error);
      switch (error.code) {
        case 'permission-denied':
          showToast('Sin permisos. Verifica que tu usuario tenga rol admin en Firestore.', 'error');
          break;
        case 'unauthenticated':
          showToast('Sesión expirada. Recarga la página.', 'error');
          break;
        default:
          showToast(error.message || 'Error al eliminar usuario', 'error');
      }
    }
  };

  // ─── Activar / Desactivar ─────────────────────────────────────────────────

  const handleToggleActive = async (userId, currentStatus) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        active: !currentStatus,
        updatedAt: new Date()
      });
      loadUsers();
    } catch {
      showToast('Error al cambiar estado', 'error');
    }
  };

  // ─── Reset de contraseña ──────────────────────────────────────────────────

  const handleSendPasswordReset = async (email) => {
    if (!window.confirm(`¿Enviar email de restablecimiento a ${email}?`)) return;
    try {
      await sendPasswordResetEmail(auth, email);
      showToast(`Email enviado a ${email}`, 'success');
    } catch {
      showToast('Error al enviar el email', 'error');
    }
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setUserForm({ name: user.name, email: user.email, password: '', role: user.role, phone: user.phone || '', active: user.active });
    setModalError('');
    setShowUserModal(true);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch && (filterRole === 'all' || user.role === filterRole);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER — Cargando auth
  // ═══════════════════════════════════════════════════════════════════════════

  if (!authReady) {
    return (
      <div className="master-key-screen">
        <div className="master-key-modal">
          <FaSpinner style={{ fontSize: '2rem', animation: 'spin 1s linear infinite', color: '#5b5bff' }} />
          <p style={{ marginTop: 16 }}>Verificando sesión...</p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER — Sin permisos
  // ═══════════════════════════════════════════════════════════════════════════

  if (!currentUser || !isAdmin) {
    return (
      <div className="master-key-screen">
        <div className="master-key-modal">
          <div className="lock-icon-wrapper"><FaLock className="lock-icon" /></div>
          <h2>Acceso Denegado</h2>
          <p>Solo los administradores pueden gestionar usuarios.</p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER — Panel principal
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="user-management">
      <div className="management-header">
        <div className="header-content">
          <h1>Gestión de Usuarios</h1>
          <p>Administra los perfiles y permisos del personal</p>
        </div>
        <button className="btn-create-user" onClick={() => { resetForm(); setShowUserModal(true); }}>
          <FaPlus /> Crear Usuario
        </button>
      </div>

      <div className="users-stats">
        <div className="stat-box">
          <div className="stat-icon" style={{ background: '#e3f2fd' }}>
            <FaUser style={{ color: '#1976d2' }} />
          </div>
          <div className="stat-content"><h3>{users.length}</h3><p>Total Usuarios</p></div>
        </div>
        <div className="stat-box">
          <div className="stat-icon" style={{ background: '#e8f5e9' }}>
            <FaUnlock style={{ color: '#4caf50' }} />
          </div>
          <div className="stat-content"><h3>{users.filter(u => u.active).length}</h3><p>Activos</p></div>
        </div>
        <div className="stat-box">
          <div className="stat-icon" style={{ background: '#ffebee' }}>
            <FaLock style={{ color: '#f44336' }} />
          </div>
          <div className="stat-content"><h3>{users.filter(u => !u.active).length}</h3><p>Inactivos</p></div>
        </div>
      </div>

      <div className="users-filters">
        <div className="search-box-users">
          <FaSearch />
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-role">
          <FaFilter />
          <select value={filterRole} onChange={e => setFilterRole(e.target.value)}>
            <option value="all">Todos los roles</option>
            {Object.entries(ROLE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Aviso si falta uid en Firestore */}
      {!currentUser?.uid && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 16,
          color: '#f59e0b',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          ⚠️ Tu perfil no tiene el campo <code>uid</code> en Firestore. 
          Se sincronizará automáticamente al crear o eliminar un usuario.
          <button
            onClick={ensureUidInFirestore}
            style={{ marginLeft: 'auto', background: '#f59e0b', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', color: '#000', fontSize: '0.8rem' }}
          >
            Sincronizar ahora
          </button>
        </div>
      )}

      {loading ? (
        <div className="loading-users">Cargando usuarios...</div>
      ) : (
        <div className="users-table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th>Usuario</th><th>Email</th><th>Rol</th>
                <th>Teléfono</th><th>Estado</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id}>
                  <td>
                    <div className="user-cell">
                      <div className="user-avatar" style={{ background: ROLE_COLORS[user.role] }}>
                        {getRoleIcon(user.role)}
                      </div>
                      <span className="user-name">{user.name}</span>
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <span className="role-badge" style={{ background: ROLE_COLORS[user.role] }}>
                      {ROLE_LABELS[user.role]}
                    </span>
                  </td>
                  <td>{user.phone || '—'}</td>
                  <td>
                    <button
                      className={`status-toggle ${user.active ? 'active' : 'inactive'}`}
                      onClick={() => handleToggleActive(user.id, user.active)}
                    >
                      {user.active ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-action edit" onClick={() => openEditModal(user)} title="Editar">
                        <FaEdit />
                      </button>
                      <button
                        className="btn-action"
                        onClick={() => handleSendPasswordReset(user.email)}
                        title="Enviar reset de contraseña"
                        style={{ color: '#f59e0b' }}
                      >
                        <FaEnvelope />
                      </button>
                      <button
                        className="btn-action delete"
                        onClick={() => handleDeleteUser(user)}
                        title="Eliminar"
                        disabled={!user.uid}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showUserModal && (
        <div className="modal-overlay-user" onClick={() => { setShowUserModal(false); resetForm(); }}>
          <div className="modal-user" onClick={e => e.stopPropagation()}>
            <div className="modal-user-header">
              <h2>{editingUser ? 'Editar Usuario' : 'Crear Usuario'}</h2>
              <button onClick={() => { setShowUserModal(false); resetForm(); }}>×</button>
            </div>

            <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser}>
              {modalError && (
                <div className="login-error" style={{ marginBottom: 16 }}>
                  <span>⚠️</span><span>{modalError}</span>
                </div>
              )}

              <div className="form-grid">
                <div className="form-field">
                  <label>Nombre completo</label>
                  <input
                    type="text" placeholder="Ej: María González"
                    value={userForm.name}
                    onChange={e => setUserForm({ ...userForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-field">
                  <label>Email</label>
                  <input
                    type="email" placeholder="ejemplo@hotel.com"
                    value={userForm.email}
                    onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                    required
                    disabled={!!editingUser}
                  />
                  {editingUser && (
                    <small style={{ color: '#6a6a8a', fontSize: '0.75rem' }}>
                      Usa 📧 para enviar reset de contraseña al usuario.
                    </small>
                  )}
                </div>

                {!editingUser && (
                  <div className="form-field">
                    <label>Contraseña inicial</label>
                    <div className="password-input-wrapper">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Mínimo 6 caracteres"
                        value={userForm.password}
                        onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                        required minLength={6}
                      />
                      <button type="button" className="toggle-password" onClick={() => setShowPassword(p => !p)}>
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                    <small style={{ color: '#6a6a8a', fontSize: '0.75rem' }}>
                      El usuario puede cambiarla desde "¿Olvidaste tu contraseña?".
                    </small>
                  </div>
                )}

                <div className="form-field">
                  <label>Teléfono</label>
                  <input
                    type="tel" placeholder="+56 9 1234 5678"
                    value={userForm.phone}
                    onChange={e => setUserForm({ ...userForm, phone: e.target.value })}
                  />
                </div>

                <div className="form-field full-width">
                  <label>Rol</label>
                  <select value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })} required>
                    {Object.entries(ROLE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-field full-width">
                  <label>Estado</label>
                  <select
                    value={userForm.active ? 'true' : 'false'}
                    onChange={e => setUserForm({ ...userForm, active: e.target.value === 'true' })}
                  >
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </select>
                </div>
              </div>

              <div className="permissions-preview">
                <h4>Permisos de este rol:</h4>
                <div className="permissions-list">
                  {getRolePermissions(userForm.role).slice(0, 6).map((perm, i) => (
                    <span key={i} className="permission-tag">{perm.replace(/_/g, ' ')}</span>
                  ))}
                  {getRolePermissions(userForm.role).length > 6 && (
                    <span className="permission-tag more">+{getRolePermissions(userForm.role).length - 6} más</span>
                  )}
                </div>
              </div>

              <div className="modal-user-actions">
                <button type="button" className="btn-cancel" onClick={() => { setShowUserModal(false); resetForm(); }}>
                  Cancelar
                </button>
                <button type="submit" className="btn-save" disabled={saving}>
                  {saving
                    ? <><FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> Guardando...</>
                    : editingUser ? 'Actualizar Usuario' : 'Crear Usuario'
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <div className={`tr-toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  );
};

export default UserManagement;
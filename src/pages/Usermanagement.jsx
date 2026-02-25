import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { 
  collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, orderBy 
} from 'firebase/firestore';
import {
  FaUser, FaPlus, FaEdit, FaTrash, FaKey, FaLock,
  FaUnlock, FaEye, FaEyeSlash, FaSearch, FaFilter,
  FaUserShield, FaUserTie, FaUserClock, FaBroom, FaTools
} from 'react-icons/fa';
import { ROLES, ROLE_LABELS, ROLE_COLORS, getRolePermissions } from '../utils/roles';
import '../styles/Usermanagement.css';

// ⚠️ CAMBIAR ESTA CLAVE EN PRODUCCIÓN
const MASTER_KEY = 'hotel2026admin'; // Tu clave maestra

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMasterKeyModal, setShowMasterKeyModal] = useState(true);
  const [masterKeyInput, setMasterKeyInput] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [showPassword, setShowPassword] = useState(false);
  
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: ROLES.RECEPTIONIST,
    phone: '',
    active: true
  });

  useEffect(() => {
    if (authenticated) {
      loadUsers();
    }
  }, [authenticated]);

  const handleMasterKeySubmit = (e) => {
    e.preventDefault();
    if (masterKeyInput === MASTER_KEY) {
      setAuthenticated(true);
      setShowMasterKeyModal(false);
      setMasterKeyInput('');
    } else {
      alert('Clave maestra incorrecta');
      setMasterKeyInput('');
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const newUser = {
        ...userForm,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await addDoc(collection(db, 'users'), newUser);
      
      setShowUserModal(false);
      resetForm();
      loadUsers();
      alert('Usuario creado exitosamente');
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Error al crear usuario');
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      const userRef = doc(db, 'users', editingUser.id);
      const updateData = {
        ...userForm,
        updatedAt: new Date()
      };
      
      // Si no se cambió la contraseña, no la actualices
      if (!userForm.password) {
        delete updateData.password;
      }
      
      await updateDoc(userRef, updateData);
      
      setShowUserModal(false);
      setEditingUser(null);
      resetForm();
      loadUsers();
      alert('Usuario actualizado exitosamente');
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Error al actualizar usuario');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('¿Estás seguro de eliminar este usuario?')) {
      try {
        await deleteDoc(doc(db, 'users', userId));
        loadUsers();
        alert('Usuario eliminado exitosamente');
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Error al eliminar usuario');
      }
    }
  };

  const handleToggleActive = async (userId, currentStatus) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { 
        active: !currentStatus,
        updatedAt: new Date()
      });
      loadUsers();
    } catch (error) {
      console.error('Error toggling user status:', error);
      alert('Error al cambiar estado del usuario');
    }
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setUserForm({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      phone: user.phone || '',
      active: user.active
    });
    setShowUserModal(true);
  };

  const resetForm = () => {
    setUserForm({
      name: '',
      email: '',
      password: '',
      role: ROLES.RECEPTIONIST,
      phone: '',
      active: true
    });
    setEditingUser(null);
    setShowPassword(false);
  };

  const getRoleIcon = (role) => {
    const icons = {
      [ROLES.ADMIN]: <FaUserShield />,
      [ROLES.MANAGER]: <FaUserTie />,
      [ROLES.RECEPTIONIST]: <FaUserClock />,
      [ROLES.HOUSEKEEPER]: <FaBroom />,
      [ROLES.MAINTENANCE]: <FaTools />
    };
    return icons[role] || <FaUser />;
  };

  const filteredUsers = users
    .filter(user => {
      const matchesSearch = 
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = filterRole === 'all' || user.role === filterRole;
      return matchesSearch && matchesRole;
    });

  if (!authenticated) {
    return (
      <div className="master-key-screen">
        <div className="master-key-modal">
          <div className="lock-icon-wrapper">
            <FaLock className="lock-icon" />
          </div>
          <h2>Acceso Restringido</h2>
          <p>Se requiere clave maestra para gestionar usuarios</p>
          <form onSubmit={handleMasterKeySubmit}>
            <div className="master-key-input-wrapper">
              <FaKey />
              <input
                type="password"
                placeholder="Ingrese clave maestra"
                value={masterKeyInput}
                onChange={(e) => setMasterKeyInput(e.target.value)}
                autoFocus
              />
            </div>
            <button type="submit" className="btn-unlock">
              <FaUnlock /> Desbloquear
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="user-management">
      {/* Header */}
      <div className="management-header">
        <div className="header-content">
          <h1>Gestión de Usuarios</h1>
          <p>Administra los perfiles y permisos del personal</p>
        </div>
        <button className="btn-create-user" onClick={() => setShowUserModal(true)}>
          <FaPlus /> Crear Usuario
        </button>
      </div>

      {/* Stats */}
      <div className="users-stats">
        <div className="stat-box">
          <div className="stat-icon" style={{ background: '#e3f2fd' }}>
            <FaUser style={{ color: '#1976d2' }} />
          </div>
          <div className="stat-content">
            <h3>{users.length}</h3>
            <p>Total Usuarios</p>
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-icon" style={{ background: '#e8f5e9' }}>
            <FaUnlock style={{ color: '#4caf50' }} />
          </div>
          <div className="stat-content">
            <h3>{users.filter(u => u.active).length}</h3>
            <p>Activos</p>
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-icon" style={{ background: '#ffebee' }}>
            <FaLock style={{ color: '#f44336' }} />
          </div>
          <div className="stat-content">
            <h3>{users.filter(u => !u.active).length}</h3>
            <p>Inactivos</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="users-filters">
        <div className="search-box-users">
          <FaSearch />
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-role">
          <FaFilter />
          <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
            <option value="all">Todos los roles</option>
            {Object.entries(ROLE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="loading-users">Cargando usuarios...</div>
      ) : (
        <div className="users-table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Teléfono</th>
                <th>Estado</th>
                <th>Acciones</th>
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
                    <span 
                      className="role-badge" 
                      style={{ background: ROLE_COLORS[user.role] }}
                    >
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
                      <button 
                        className="btn-action edit"
                        onClick={() => openEditModal(user)}
                        title="Editar"
                      >
                        <FaEdit />
                      </button>
                      <button 
                        className="btn-action delete"
                        onClick={() => handleDeleteUser(user.id)}
                        title="Eliminar"
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

      {/* User Modal */}
      {showUserModal && (
        <div className="modal-overlay-user" onClick={() => { setShowUserModal(false); resetForm(); }}>
          <div className="modal-user" onClick={(e) => e.stopPropagation()}>
            <div className="modal-user-header">
              <h2>{editingUser ? 'Editar Usuario' : 'Crear Usuario'}</h2>
              <button onClick={() => { setShowUserModal(false); resetForm(); }}>×</button>
            </div>
            <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser}>
              <div className="form-grid">
                <div className="form-field">
                  <label>Nombre completo</label>
                  <input
                    type="text"
                    placeholder="Ej: María González"
                    value={userForm.name}
                    onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-field">
                  <label>Email</label>
                  <input
                    type="email"
                    placeholder="ejemplo@hotel.com"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    required
                  />
                </div>
                <div className="form-field">
                  <label>Contraseña {editingUser && '(dejar vacío para no cambiar)'}</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      required={!editingUser}
                    />
                    <button 
                      type="button"
                      className="toggle-password"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>
                <div className="form-field">
                  <label>Teléfono</label>
                  <input
                    type="tel"
                    placeholder="+56 9 1234 5678"
                    value={userForm.phone}
                    onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                  />
                </div>
                <div className="form-field full-width">
                  <label>Rol</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                    required
                  >
                    {Object.entries(ROLE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Permisos preview */}
              <div className="permissions-preview">
                <h4>Permisos de este rol:</h4>
                <div className="permissions-list">
                  {getRolePermissions(userForm.role).slice(0, 6).map((perm, index) => (
                    <span key={index} className="permission-tag">
                      {perm.replace(/_/g, ' ')}
                    </span>
                  ))}
                  {getRolePermissions(userForm.role).length > 6 && (
                    <span className="permission-tag more">
                      +{getRolePermissions(userForm.role).length - 6} más
                    </span>
                  )}
                </div>
              </div>

              <div className="modal-user-actions">
                <button type="button" className="btn-cancel" onClick={() => { setShowUserModal(false); resetForm(); }}>
                  Cancelar
                </button>
                <button type="submit" className="btn-save">
                  {editingUser ? 'Actualizar' : 'Crear'} Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;

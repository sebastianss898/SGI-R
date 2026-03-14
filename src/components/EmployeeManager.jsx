import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import {
  collection, updateDoc,
  doc, query, orderBy, serverTimestamp, onSnapshot
} from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import {
  FaUser, FaPlus, FaTrash, FaEdit, FaLock,
  FaUserShield, FaUserTie, FaSearch,
  FaSpinner, FaCheck, FaTimes,
  FaBan, FaKey, FaDownload
} from 'react-icons/fa';
import { ROLES, ROLE_LABELS } from '../utils/roles';
import '../styles/EmployeeManager.css';
import { createEmployee, deleteEmployee } from '../utils/employeeFunctions';
import ReauthModal from './ReauthModal';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

const AVATAR_COLORS = [
  { id: 'blue',   bg: '#1e3a5f', text: '#60a5fa' },
  { id: 'green',  bg: '#14362a', text: '#4ade80' },
  { id: 'purple', bg: '#2e1a4a', text: '#c084fc' },
  { id: 'amber',  bg: '#3d2a0a', text: '#fbbf24' },
  { id: 'red',    bg: '#3d0f0f', text: '#f87171' },
  { id: 'teal',   bg: '#0d2e2e', text: '#2dd4bf' },
];

const DEPARTMENTS = [
  'Recepción', 'Housekeeping', 'Administración',
  'Mantenimiento', 'Alimentos y Bebidas', 'Seguridad', 'Gerencia'
];

const ROLE_UI = {
  [ROLES.ADMIN]:        { icon: <FaUserShield />, color: '#8b5cf6' },
  [ROLES.MANAGER]:      { icon: <FaUserTie />,    color: '#3b82f6' },
  [ROLES.RECEPTIONIST]: { icon: <FaUserTie />,    color: '#10b981' },
  [ROLES.HOUSEKEEPER]:  { icon: <FaUser />,        color: '#f59e0b' },
  [ROLES.MAINTENANCE]:  { icon: <FaUser />,        color: '#ef4444' },
};

const getInitials = (name) =>
  name.split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase();

const getAvatarColor = (id) =>
  AVATAR_COLORS.find(c => c.id === id) || AVATAR_COLORS[0];

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export default function EmployeeManager({ currentUser, onBack }) {
  const userName = currentUser?.name || currentUser || '';
  const isAdmin  = currentUser?.role === ROLES.ADMIN;

  // ─── Reauth ───────────────────────────────────────────────────────────────
  const [reauthed,     setReauthed]    = useState(false);

  // ─── Estados principales ──────────────────────────────────────────────────
  const [users,        setUsers]       = useState([]);
  const [loading,      setLoading]     = useState(true);
  const [saving,       setSaving]      = useState(false);
  const [toast,        setToast]       = useState(null);

  // Filtros
  const [search,       setSearch]      = useState('');
  const [filterDept,   setFilterDept]  = useState('');
  const [filterRole,   setFilterRole]  = useState('');
  const [filterStatus, setFilterStatus]= useState('');

  // Modales
  const [modal,        setModal]       = useState(null);
  const [selectedUser, setSelectedUser]= useState(null);
  const [confirmName,  setConfirmName] = useState('');

  // Formulario
  const emptyForm = {
    name: '', email: '', position: '',
    department: 'Recepción', role: ROLES.RECEPTIONIST,
    status: 'active', joinedAt: new Date().toISOString().split('T')[0],
    color: 'blue', initials: '',
  };
  const [form,         setForm]        = useState(emptyForm);
  const [tempPassword, setTempPassword]= useState('');
  const [formError,    setFormError]   = useState('');

  // ─── Firestore listener — solo corre tras reauth ──────────────────────────
  useEffect(() => {
    if (!reauthed) return;

    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error('Error cargando usuarios:', err);
      showToast('Error al cargar usuarios', 'error');
      setLoading(false);
    });
    return () => unsub();
  }, [reauthed]);

  // ─── Toast ────────────────────────────────────────────────────────────────
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ─── Modales ──────────────────────────────────────────────────────────────
  const openCreate = () => {
    setForm({ ...emptyForm });
    setTempPassword('Hotel@' + Math.random().toString(36).slice(-5));
    setFormError('');
    setSelectedUser(null);
    setModal('create');
  };

  const openEdit = (user) => {
    setForm({
      name:       user.name,
      email:      user.email,
      position:   user.position   || '',
      department: user.department || 'Recepción',
      role:       user.role       || ROLES.RECEPTIONIST,
      status:     user.status     || 'active',
      joinedAt:   user.joinedAt   || '',
      color:      user.color      || 'blue',
      initials:   user.initials   || getInitials(user.name),
    });
    setFormError('');
    setSelectedUser(user);
    setModal('edit');
  };

  const openReset  = (user) => { setSelectedUser(user); setModal('reset'); };
  const openDelete = (user) => { setSelectedUser(user); setConfirmName(''); setModal('delete'); };
  const closeModal = ()     => { setModal(null); setSelectedUser(null); setFormError(''); };

  // ─── Campo formulario ─────────────────────────────────────────────────────
  const setField = (k, v) => {
    setForm(p => {
      const updated = { ...p, [k]: v };
      if (k === 'name') updated.initials = getInitials(v);
      return updated;
    });
  };

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      setFormError('Nombre y correo son obligatorios.');
      return;
    }
    if (!tempPassword || tempPassword.length < 6) {
      setFormError('La contraseña temporal debe tener al menos 6 caracteres.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await createEmployee({
        ...form,
        password: tempPassword,
        name:     form.name.trim(),
        email:    form.email.trim().toLowerCase(),
      });
      showToast(`✓ ${form.name} creado — se envió reset al correo`);
      closeModal();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!form.name.trim()) { setFormError('El nombre es obligatorio.'); return; }
    setSaving(true);
    setFormError('');
    try {
      await updateDoc(doc(db, 'users', selectedUser.id), {
        name:       form.name.trim(),
        position:   form.position,
        department: form.department,
        role:       form.role,
        status:     form.status,
        joinedAt:   form.joinedAt,
        color:      form.color,
        initials:   getInitials(form.name.trim()),
        updatedAt:  serverTimestamp(),
        updatedBy:  userName,
      });
      showToast(`✓ ${form.name} actualizado`);
      closeModal();
    } catch (err) {
      console.error(err);
      setFormError('Error al guardar. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      await updateDoc(doc(db, 'users', user.id), {
        status:    newStatus,
        updatedAt: serverTimestamp(),
        updatedBy: userName,
      });
      showToast(`${newStatus === 'active' ? '✓ Activado' : '⊘ Desactivado'}: ${user.name}`);
    } catch (err) {
      showToast('Error al cambiar estado', 'error');
    }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      await sendPasswordResetEmail(auth, selectedUser.email);
      showToast(`⟳ Reset enviado a ${selectedUser.email}`);
      closeModal();
    } catch (err) {
      showToast('Error al enviar reset', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (confirmName !== selectedUser.name) return;
    setSaving(true);
    try {
      await deleteEmployee(selectedUser.uid);
      showToast(`⊗ ${selectedUser.name} eliminado`);
      closeModal();
    } catch (err) {
      showToast('Error al eliminar: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // ─── Exportar CSV ─────────────────────────────────────────────────────────
  const exportCSV = () => {
    const rows = [
      ['Nombre', 'Correo', 'Cargo', 'Departamento', 'Rol', 'Estado', 'Ingreso'],
      ...users.map(u => [
        u.name, u.email, u.position, u.department, u.role, u.status, u.joinedAt
      ])
    ];
    const csv = rows.map(r => r.map(c => `"${c || ''}"`).join(',')).join('\n');
    const a   = document.createElement('a');
    a.href    = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = `usuarios_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    showToast('↓ CSV exportado');
  };

  // ─── Filtrado ─────────────────────────────────────────────────────────────
  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    if (q && !`${u.name} ${u.email} ${u.position} ${u.department}`.toLowerCase().includes(q)) return false;
    if (filterDept   && u.department !== filterDept)   return false;
    if (filterRole   && u.role       !== filterRole)   return false;
    if (filterStatus && u.status     !== filterStatus) return false;
    return true;
  });

  // ─── Stats ────────────────────────────────────────────────────────────────
  const stats = {
    total:  users.length,
    active: users.filter(u => u.status === 'active').length,
    admins: users.filter(u => u.role   === 'admin').length,
    depts:  [...new Set(users.map(u => u.department).filter(Boolean))].length,
  };

  const fmtDate = (d) => {
    if (!d) return '—';
    const [y, m, day] = d.split('-');
    const ms = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return `${parseInt(day)} ${ms[+m - 1]} ${y}`;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // GUARDS
  // ═══════════════════════════════════════════════════════════════════════════

  if (!isAdmin) {
    return (
      <div className="em-root">
        <div className="em-access-denied">
          <FaLock className="em-denied-icon" />
          <h2>Acceso restringido</h2>
          <p>Solo los administradores pueden gestionar empleados.</p>
        </div>
      </div>
    );
  }

  if (!reauthed) {
    return (
      <ReauthModal
        title="Acceso a Gestión de Empleados"
        onSuccess={() => setReauthed(true)}
        onCancel={onBack || (() => window.history.back())}
      />
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER PRINCIPAL
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="em-root">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="em-header">
        <div className="em-header-left">
          <h1>Gestión de Empleados</h1>
          <p>Administración de personal · Hotel Cytrico</p>
        </div>
        <div className="em-header-right">
          <div className="em-admin-badge">
            <FaUserShield /> Solo administradores
          </div>
          <button className="em-btn em-btn-secondary" onClick={exportCSV}>
            <FaDownload /> Exportar CSV
          </button>
          <button className="em-btn em-btn-primary" onClick={openCreate}>
            <FaPlus /> Nuevo empleado
          </button>
        </div>
      </header>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <div className="em-stats">
        <div className="em-stat-card">
          <span className="em-stat-label">Total empleados</span>
          <span className="em-stat-val">{stats.total}</span>
        </div>
        <div className="em-stat-card">
          <span className="em-stat-label">Activos</span>
          <span className="em-stat-val" style={{ color: '#4ade80' }}>{stats.active}</span>
        </div>
        <div className="em-stat-card">
          <span className="em-stat-label">Administradores</span>
          <span className="em-stat-val" style={{ color: '#c084fc' }}>{stats.admins}</span>
        </div>
        <div className="em-stat-card">
          <span className="em-stat-label">Departamentos</span>
          <span className="em-stat-val" style={{ color: '#60a5fa' }}>{stats.depts}</span>
        </div>
      </div>

      {/* ── Filtros ────────────────────────────────────────────────────────── */}
      <div className="em-filters">
        <div className="em-search-wrap">
          <FaSearch className="em-search-icon" />
          <input
            className="em-search"
            placeholder="Buscar por nombre, cargo, correo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="em-select" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
          <option value="">Todos los depts.</option>
          {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
        </select>
        <select className="em-select" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
          <option value="">Todos los roles</option>
          {Object.entries(ROLE_LABELS).map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>
        <select className="em-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
      </div>

      {/* ── Tabla ──────────────────────────────────────────────────────────── */}
      <div className="em-table-wrap">
        {loading ? (
          <div className="em-loading"><FaSpinner className="spinning" /> Cargando usuarios...</div>
        ) : filtered.length === 0 ? (
          <div className="em-empty">No se encontraron usuarios con ese criterio.</div>
        ) : (
          <table className="em-table">
            <thead>
              <tr>
                <th>Empleado</th>
                <th>Cargo</th>
                <th>Departamento</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Ingreso</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(user => {
                const col       = getAvatarColor(user.color);
                const roleInfo  = ROLE_UI[user.role] || { icon: <FaUser />, color: '#9ca3af' };
                const roleLabel = ROLE_LABELS[user.role] || user.role;
                return (
                  <tr key={user.id}>
                    <td>
                      <div className="em-emp-cell">
                        <div className="em-avatar" style={{ background: col.bg, color: col.text }}>
                          {user.initials || getInitials(user.name)}
                        </div>
                        <div>
                          <div className="em-emp-name">{user.name}</div>
                          <div className="em-emp-email">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="em-td-muted">{user.position || '—'}</td>
                    <td>{user.department || '—'}</td>
                    <td>
                      <span className="em-role-badge"
                        style={{ color: roleInfo.color, borderColor: roleInfo.color + '44' }}>
                        {roleInfo.icon} {roleLabel}
                      </span>
                    </td>
                    <td>
                      <span className={`em-status-badge ${user.status === 'active' ? 'active' : 'inactive'}`}>
                        {user.status === 'active' ? '● Activo' : '○ Inactivo'}
                      </span>
                    </td>
                    <td className="em-td-muted">{fmtDate(user.joinedAt)}</td>
                    <td>
                      <div className="em-actions">
                        <button className="em-icon-btn" title="Editar"
                          onClick={() => openEdit(user)}>
                          <FaEdit />
                        </button>
                        <button className="em-icon-btn amber" title="Reset contraseña"
                          onClick={() => openReset(user)}>
                          <FaKey />
                        </button>
                        <button
                          className={`em-icon-btn ${user.status === 'active' ? 'red' : 'green'}`}
                          title={user.status === 'active' ? 'Desactivar' : 'Activar'}
                          onClick={() => handleToggleStatus(user)}
                        >
                          {user.status === 'active' ? <FaBan /> : <FaCheck />}
                        </button>
                        <button className="em-icon-btn red" title="Eliminar"
                          onClick={() => openDelete(user)}>
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── MODAL CREAR / EDITAR ───────────────────────────────────────────── */}
      {(modal === 'create' || modal === 'edit') && (
        <div className="em-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="em-modal">
            <div className="em-modal-header">
              <h2>{modal === 'create' ? 'Nuevo empleado' : 'Editar empleado'}</h2>
              <button className="em-modal-close" onClick={closeModal}><FaTimes /></button>
            </div>
            <div className="em-modal-body">

              <div className="em-avatar-row">
                <div className="em-avatar-preview" style={{
                  background: getAvatarColor(form.color).bg,
                  color:      getAvatarColor(form.color).text,
                }}>
                  {form.initials || '?'}
                </div>
                <div>
                  <div className="em-field-label">Color de perfil</div>
                  <div className="em-color-dots">
                    {AVATAR_COLORS.map(c => (
                      <button
                        key={c.id}
                        className={`em-color-dot ${form.color === c.id ? 'selected' : ''}`}
                        style={{ background: c.bg, borderColor: form.color === c.id ? c.text : 'transparent' }}
                        onClick={() => setField('color', c.id)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="em-form-row">
                <div className="em-field">
                  <label className="em-field-label">Nombre *</label>
                  <input
                    className="em-input"
                    placeholder="Nombre"
                    value={form.name.split(' ')[0] || ''}
                    onChange={e => {
                      const rest = form.name.split(' ').slice(1).join(' ');
                      setField('name', (e.target.value + ' ' + rest).trim());
                    }}
                  />
                </div>
                <div className="em-field">
                  <label className="em-field-label">Apellidos</label>
                  <input
                    className="em-input"
                    placeholder="Apellidos"
                    value={form.name.split(' ').slice(1).join(' ')}
                    onChange={e => {
                      const first = form.name.split(' ')[0] || '';
                      setField('name', (first + ' ' + e.target.value).trim());
                    }}
                  />
                </div>
              </div>

              <div className="em-field">
                <label className="em-field-label">Correo electrónico *</label>
                <input
                  className="em-input"
                  type="email"
                  placeholder="correo@hotel.com"
                  value={form.email}
                  disabled={modal === 'edit'}
                  onChange={e => setField('email', e.target.value)}
                />
                {modal === 'edit' && (
                  <span className="em-field-hint">El correo no se puede modificar.</span>
                )}
              </div>

              {modal === 'create' && (
                <div className="em-field">
                  <label className="em-field-label">
                    Contraseña temporal
                    <span className="em-field-hint"> — se enviará reset por correo automáticamente</span>
                  </label>
                  <input
                    className="em-input em-input-mono"
                    value={tempPassword}
                    onChange={e => setTempPassword(e.target.value)}
                  />
                </div>
              )}

              <div className="em-form-row">
                <div className="em-field">
                  <label className="em-field-label">Cargo</label>
                  <input
                    className="em-input"
                    placeholder="Ej: Recepcionista"
                    value={form.position}
                    onChange={e => setField('position', e.target.value)}
                  />
                </div>
                <div className="em-field">
                  <label className="em-field-label">Departamento</label>
                  <select className="em-select em-input" value={form.department}
                    onChange={e => setField('department', e.target.value)}>
                    {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              <div className="em-form-row">
                <div className="em-field">
                  <label className="em-field-label">Rol</label>
                  <select className="em-select em-input" value={form.role}
                    onChange={e => setField('role', e.target.value)}>
                    {Object.entries(ROLE_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="em-field">
                  <label className="em-field-label">Estado</label>
                  <select className="em-select em-input" value={form.status}
                    onChange={e => setField('status', e.target.value)}>
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                </div>
              </div>

              <div className="em-field">
                <label className="em-field-label">Fecha de ingreso</label>
                <input
                  className="em-input"
                  type="date"
                  value={form.joinedAt}
                  onChange={e => setField('joinedAt', e.target.value)}
                />
              </div>

              {formError && <div className="em-form-error">{formError}</div>}
            </div>
            <div className="em-modal-footer">
              <button className="em-btn em-btn-secondary" onClick={closeModal}>Cancelar</button>
              <button
                className="em-btn em-btn-primary"
                onClick={modal === 'create' ? handleCreate : handleEdit}
                disabled={saving}
              >
                {saving
                  ? <><FaSpinner className="spinning" /> Guardando...</>
                  : modal === 'create'
                    ? <><FaPlus /> Crear empleado</>
                    : <><FaCheck /> Guardar cambios</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL RESET CONTRASEÑA ─────────────────────────────────────────── */}
      {modal === 'reset' && selectedUser && (
        <div className="em-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="em-modal em-modal-sm">
            <div className="em-modal-header">
              <h2><FaKey /> Restablecer contraseña</h2>
              <button className="em-modal-close" onClick={closeModal}><FaTimes /></button>
            </div>
            <div className="em-modal-body">
              <div className="em-alert em-alert-amber">
                ⚠ Se enviará un correo de restablecimiento al empleado.
              </div>
              <div className="em-emp-preview">
                <div className="em-avatar" style={{
                  background: getAvatarColor(selectedUser.color).bg,
                  color:      getAvatarColor(selectedUser.color).text,
                  width: 44, height: 44, fontSize: '1rem',
                }}>
                  {selectedUser.initials || getInitials(selectedUser.name)}
                </div>
                <div>
                  <div className="em-emp-name">{selectedUser.name}</div>
                  <div className="em-emp-email">{selectedUser.email}</div>
                </div>
              </div>
            </div>
            <div className="em-modal-footer">
              <button className="em-btn em-btn-secondary" onClick={closeModal}>Cancelar</button>
              <button className="em-btn em-btn-amber" onClick={handleReset} disabled={saving}>
                {saving
                  ? <><FaSpinner className="spinning" /> Enviando...</>
                  : <><FaKey /> Enviar reset</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL ELIMINAR ─────────────────────────────────────────────────── */}
      {modal === 'delete' && selectedUser && (
        <div className="em-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="em-modal em-modal-sm">
            <div className="em-modal-header">
              <h2><FaTrash /> Eliminar empleado</h2>
              <button className="em-modal-close" onClick={closeModal}><FaTimes /></button>
            </div>
            <div className="em-modal-body">
              <div className="em-alert em-alert-red">
                ⊗ Esta acción es permanente. El empleado perderá todo acceso al sistema.
              </div>
              <div className="em-emp-preview">
                <div className="em-avatar" style={{
                  background: getAvatarColor(selectedUser.color).bg,
                  color:      getAvatarColor(selectedUser.color).text,
                  width: 44, height: 44, fontSize: '1rem',
                }}>
                  {selectedUser.initials || getInitials(selectedUser.name)}
                </div>
                <div>
                  <div className="em-emp-name">{selectedUser.name}</div>
                  <div className="em-emp-email">{selectedUser.email}</div>
                </div>
              </div>
              <div className="em-field" style={{ marginTop: 16 }}>
                <label className="em-field-label">
                  Escribe <strong style={{ color: '#f87171' }}>{selectedUser.name}</strong> para confirmar
                </label>
                <input
                  className="em-input"
                  placeholder={selectedUser.name}
                  value={confirmName}
                  onChange={e => setConfirmName(e.target.value)}
                />
              </div>
            </div>
            <div className="em-modal-footer">
              <button className="em-btn em-btn-secondary" onClick={closeModal}>Cancelar</button>
              <button
                className="em-btn em-btn-danger"
                onClick={handleDelete}
                disabled={confirmName !== selectedUser.name || saving}
              >
                {saving
                  ? <><FaSpinner className="spinning" /> Eliminando...</>
                  : <><FaTrash /> Sí, eliminar</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      {toast && <div className={`em-toast ${toast.type}`}>{toast.msg}</div>}

    </div>
  );
}
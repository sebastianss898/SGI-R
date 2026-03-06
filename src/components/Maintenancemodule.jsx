import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection, addDoc, getDocs, doc, updateDoc,
  query, orderBy, serverTimestamp, getDoc
} from 'firebase/firestore';
import {
  FaTools, FaPlus, FaSearch, FaFilter,
  FaExclamationTriangle, FaCheckCircle, FaClock,
  FaSpinner, FaTrash, FaEdit, FaTh, FaList,
  FaBuilding, FaBed, FaWrench, FaBolt,
  FaTint, FaFire, FaSnowflake, FaBroom,
  FaUser, FaCalendarAlt, FaTag, FaTimes,
  FaArrowRight, FaHistory, FaClipboardList,
  FaChevronDown, FaRegClock, FaSave
} from 'react-icons/fa';

// ─── Constantes ───────────────────────────────────────────────────────────────
const PRIORITIES = {
  urgent:  { label: 'Urgente',  color: '#f87171', bg: 'rgba(248,113,113,0.12)', icon: '🔴' },
  high:    { label: 'Alta',     color: '#fb923c', bg: 'rgba(251,146,60,0.12)',  icon: '🟠' },
  medium:  { label: 'Media',    color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', icon: '🟡' },
  low:     { label: 'Baja',     color: '#4ade80', bg: 'rgba(74,222,128,0.12)', icon: '🟢' },
};

const STATUSES = {
  pending:     { label: 'Pendiente',   color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', icon: <FaClock /> },
  in_progress: { label: 'En Curso',    color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  icon: <FaSpinner /> },
  resolved:    { label: 'Resuelto',    color: '#4ade80', bg: 'rgba(74,222,128,0.12)',  icon: <FaCheckCircle /> },
  cancelled:   { label: 'Cancelado',   color: '#f87171', bg: 'rgba(248,113,113,0.08)', icon: <FaTimes /> },
};

const CATEGORIES = [
  { value: 'electrico',    label: 'Eléctrico',      icon: <FaBolt />,            color: '#fbbf24' },
  { value: 'plomeria',     label: 'Plomería',       icon: <FaTint />,            color: '#60a5fa' },
  { value: 'climatizacion',label: 'Climatización',  icon: <FaSnowflake />,       color: '#a78bfa' },
  { value: 'mobiliario',   label: 'Mobiliario',     icon: <FaWrench />,          color: '#fb923c' },
  { value: 'limpieza',     label: 'Limpieza',       icon: <FaBroom />,           color: '#4ade80' },
  { value: 'incendio',     label: 'Contra Incendio',icon: <FaFire />,            color: '#f87171' },
  { value: 'general',      label: 'General',        icon: <FaTools />,           color: '#94a3b8' },
];

const AREAS = [
  'Habitación 101','Habitación 102','Habitación 103','Habitación 104','Habitación 105',
  'Habitación 201','Habitación 202','Habitación 203','Habitación 204','Habitación 205',
  'Habitación 301','Habitación 302','Habitación 303','Habitación 304','Habitación 305',
  'Lobby','Recepción','Restaurante','Cocina','Baños Públicos',
  'Estacionamiento','Piscina','Gimnasio','Lavandería','Bodega','Exterior',
];

const STATUS_ORDER = ['pending', 'in_progress', 'resolved', 'cancelled'];
const uid = () => Math.random().toString(36).slice(2, 9);
const fmt_date = (ts) => {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('es-CL', { day:'2-digit', month:'short', year:'numeric' });
};
const fmt_time = (ts) => {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString('es-CL', { hour:'2-digit', minute:'2-digit' });
};

// ─── Componente Modal de Nueva Orden ─────────────────────────────────────────
function NewOrderModal({ onClose, onSave, receptionists, technicians }) {
  const [form, setForm] = useState({
    title: '', description: '', area: '', category: 'general',
    priority: 'medium', assignedTo: '', reportedBy: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.title || !form.area) return;
    setSaving(true);
    try { await onSave(form); onClose(); }
    catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  return (
    <div className="mnt-overlay">
      <div className="mnt-modal">
        <div className="mnt-modal-header">
          <div className="mnt-modal-title">
            <div className="mnt-modal-icon"><FaClipboardList /></div>
            Nueva Orden de Trabajo
          </div>
          <button className="mnt-modal-close" onClick={onClose}><FaTimes /></button>
        </div>

        <div className="mnt-modal-body">
          <div className="mnt-form-row">
            <div className="mnt-field mnt-field-full">
              <label>Título del problema *</label>
              <input
                placeholder="Ej: Aire acondicionado no enfría"
                value={form.title}
                onChange={e => set('title', e.target.value)}
              />
            </div>
          </div>

          <div className="mnt-form-row">
            <div className="mnt-field">
              <label>Área / Habitación *</label>
              <select value={form.area} onChange={e => set('area', e.target.value)}>
                <option value="">Seleccionar...</option>
                {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="mnt-field">
              <label>Categoría</label>
              <select value={form.category} onChange={e => set('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>

          <div className="mnt-form-row">
            <div className="mnt-field">
              <label>Prioridad</label>
              <div className="mnt-priority-selector">
                {Object.entries(PRIORITIES).map(([k, v]) => (
                  <button
                    key={k}
                    className={`mnt-prio-btn ${form.priority === k ? 'active' : ''}`}
                    style={{ '--prio-color': v.color, '--prio-bg': v.bg }}
                    onClick={() => set('priority', k)}
                  >
                    {v.icon} {v.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mnt-form-row">
            <div className="mnt-field">
              <label>Reportado por</label>
              <select value={form.reportedBy} onChange={e => set('reportedBy', e.target.value)}>
                <option value="">Seleccionar...</option>
                {receptionists.map((u, i) => <option key={i} value={u.name}>{u.name}</option>)}
              </select>
            </div>
            <div className="mnt-field">
              <label>Asignar técnico</label>
              <select value={form.assignedTo} onChange={e => set('assignedTo', e.target.value)}>
                <option value="">Sin asignar</option>
                {technicians.map((u, i) => <option key={i} value={u.name}>{u.name}</option>)}
              </select>
            </div>
          </div>

          <div className="mnt-form-row">
            <div className="mnt-field mnt-field-full">
              <label>Descripción detallada</label>
              <textarea
                placeholder="Describe el problema con el mayor detalle posible..."
                value={form.description}
                onChange={e => set('description', e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </div>

        <div className="mnt-modal-footer">
          <button className="mnt-btn-cancel" onClick={onClose}>Cancelar</button>
          <button
            className="mnt-btn-save"
            onClick={handleSave}
            disabled={!form.title || !form.area || saving}
          >
            {saving ? <><FaSpinner className="spinning" /> Guardando...</> : <><FaSave /> Crear Orden</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Componente Modal de Detalle/Edición ─────────────────────────────────────
function DetailModal({ order, onClose, onUpdate, technicians }) {
  const [status, setStatus]   = useState(order.status);
  const [assigned, setAssigned] = useState(order.assignedTo || '');
  const [note, setNote]       = useState('');
  const [saving, setSaving]   = useState(false);

  const cat = CATEGORIES.find(c => c.value === order.category) || CATEGORIES[6];
  const prio = PRIORITIES[order.priority] || PRIORITIES.medium;
  const stat = STATUSES[status] || STATUSES.pending;

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const updates = { status, assignedTo: assigned };
      if (note.trim()) {
        updates.notes = [...(order.notes || []), {
          text: note.trim(), date: new Date().toISOString(), author: 'Sistema'
        }];
      }
      if (status === 'resolved' && order.status !== 'resolved') {
        updates.resolvedAt = serverTimestamp();
      }
      await onUpdate(order.id, updates);
      onClose();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  return (
    <div className="mnt-overlay">
      <div className="mnt-modal mnt-modal-detail">
        <div className="mnt-modal-header">
          <div className="mnt-modal-title">
            <div className="mnt-modal-icon" style={{ background: cat.color + '22', color: cat.color }}>
              {cat.icon}
            </div>
            OT-{order.orderNumber || order.id.slice(0,6).toUpperCase()}
          </div>
          <button className="mnt-modal-close" onClick={onClose}><FaTimes /></button>
        </div>

        <div className="mnt-modal-body">
          <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', color: '#e2e8f0' }}>{order.title}</h3>
          <div className="mnt-detail-meta">
            <span><FaBuilding /> {order.area}</span>
            <span style={{ color: prio.color }}>{prio.icon} {prio.label}</span>
            <span><FaCalendarAlt /> {fmt_date(order.createdAt)}</span>
            {order.reportedBy && <span><FaUser /> {order.reportedBy}</span>}
          </div>

          {order.description && (
            <div className="mnt-detail-desc">{order.description}</div>
          )}

          <div className="mnt-form-row" style={{ marginTop: 16 }}>
            <div className="mnt-field">
              <label>Estado</label>
              <div className="mnt-status-selector">
                {STATUS_ORDER.map(k => {
                  const s = STATUSES[k];
                  return (
                    <button
                      key={k}
                      className={`mnt-status-btn ${status === k ? 'active' : ''}`}
                      style={{ '--st-color': s.color, '--st-bg': s.bg }}
                      onClick={() => setStatus(k)}
                    >
                      {s.icon} {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mnt-form-row">
            <div className="mnt-field">
              <label>Técnico asignado</label>
              <select value={assigned} onChange={e => setAssigned(e.target.value)}>
                <option value="">Sin asignar</option>
                {technicians.map((u, i) => <option key={i} value={u.name}>{u.name}</option>)}
              </select>
            </div>
          </div>

          {order.notes?.length > 0 && (
            <div className="mnt-notes-history">
              <div className="mnt-notes-title"><FaHistory /> Historial de notas</div>
              {order.notes.map((n, i) => (
                <div key={i} className="mnt-note-item">
                  <span className="mnt-note-date">{new Date(n.date).toLocaleDateString('es-CL')}</span>
                  <span className="mnt-note-text">{n.text}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mnt-field mnt-field-full" style={{ marginTop: 12 }}>
            <label>Agregar nota</label>
            <textarea
              placeholder="Observación, avance o comentario..."
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <div className="mnt-modal-footer">
          <button className="mnt-btn-cancel" onClick={onClose}>Cerrar</button>
          <button className="mnt-btn-save" onClick={handleUpdate} disabled={saving}>
            {saving ? <><FaSpinner className="spinning" /> Guardando...</> : <><FaSave /> Guardar cambios</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Card de Orden ────────────────────────────────────────────────────────────
function OrderCard({ order, onClick }) {
  const prio = PRIORITIES[order.priority] || PRIORITIES.medium;
  const stat = STATUSES[order.status]    || STATUSES.pending;
  const cat  = CATEGORIES.find(c => c.value === order.category) || CATEGORIES[6];

  return (
    <div className="mnt-card" onClick={onClick} style={{ '--prio-accent': prio.color }}>
      <div className="mnt-card-top">
        <div className="mnt-card-cat" style={{ color: cat.color, background: cat.color + '18' }}>
          {cat.icon} {cat.label}
        </div>
        <div className="mnt-card-prio" style={{ color: prio.color, background: prio.bg }}>
          {prio.icon} {prio.label}
        </div>
      </div>
      <div className="mnt-card-title">{order.title}</div>
      <div className="mnt-card-area"><FaBuilding /> {order.area}</div>
      {order.description && (
        <div className="mnt-card-desc">{order.description.slice(0, 80)}{order.description.length > 80 ? '…' : ''}</div>
      )}
      <div className="mnt-card-footer">
        <span className="mnt-card-date"><FaRegClock /> {fmt_date(order.createdAt)}</span>
        {order.assignedTo
          ? <span className="mnt-card-assigned"><FaUser /> {order.assignedTo}</span>
          : <span className="mnt-card-unassigned">Sin asignar</span>
        }
      </div>
    </div>
  );
}

// ─── Fila de Lista ────────────────────────────────────────────────────────────
function OrderRow({ order, onClick }) {
  const prio = PRIORITIES[order.priority] || PRIORITIES.medium;
  const stat = STATUSES[order.status]    || STATUSES.pending;
  const cat  = CATEGORIES.find(c => c.value === order.category) || CATEGORIES[6];

  return (
    <div className="mnt-row" onClick={onClick}>
      <div className="mnt-row-id">OT-{(order.orderNumber || order.id.slice(0,6)).toUpperCase()}</div>
      <div className="mnt-row-title">{order.title}</div>
      <div className="mnt-row-area"><FaBuilding /> {order.area}</div>
      <div className="mnt-row-cat" style={{ color: cat.color }}>{cat.icon} {cat.label}</div>
      <div className="mnt-row-prio" style={{ color: prio.color, background: prio.bg }}>
        {prio.icon} {prio.label}
      </div>
      <div className="mnt-row-status" style={{ color: stat.color, background: stat.bg }}>
        {stat.icon} {stat.label}
      </div>
      <div className="mnt-row-assigned">
        {order.assignedTo || <span style={{ opacity: 0.4 }}>—</span>}
      </div>
      <div className="mnt-row-date">{fmt_date(order.createdAt)}</div>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function MaintenanceModule() {
  const [orders, setOrders]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [view, setView]               = useState('kanban'); // 'kanban' | 'list'
  const [showNew, setShowNew]         = useState(false);
  const [selected, setSelected]       = useState(null);
  const [search, setSearch]           = useState('');
  const [filterStatus, setFilterStatus]   = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [receptionists, setReceptionists] = useState([]);
  const [technicians, setTechnicians]     = useState([]);
  const [orderCounter, setOrderCounter]   = useState(1);

  useEffect(() => {
    const init = async () => {
      try {
        // Cargar usuarios
        const usersSnap = await getDocs(collection(db, 'users'));
        const users = usersSnap.docs.map(d => d.data()).filter(u => u.active !== false);
        setReceptionists(users.filter(u => ['receptionist', 'admin'].includes(u.role)));
        setTechnicians(users.filter(u => ['technician', 'maintenance', 'admin'].includes(u.role)));

        // Cargar órdenes
        const q = query(collection(db, 'maintenance_orders'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setOrders(list);
        setOrderCounter(list.length + 1);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    init();
  }, []);

  const handleCreate = async (form) => {
    const newOrder = {
      ...form,
      status: 'pending',
      orderNumber: String(orderCounter).padStart(4, '0'),
      notes: [],
      createdAt: serverTimestamp(),
      resolvedAt: null,
    };
    const ref = await addDoc(collection(db, 'maintenance_orders'), newOrder);
    const created = { id: ref.id, ...newOrder, createdAt: { toDate: () => new Date() } };
    setOrders(prev => [created, ...prev]);
    setOrderCounter(c => c + 1);
  };

  const handleUpdate = async (id, updates) => {
    await updateDoc(doc(db, 'maintenance_orders', id), updates);
    setOrders(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
  };

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      o.title?.toLowerCase().includes(q) ||
      o.area?.toLowerCase().includes(q) ||
      o.assignedTo?.toLowerCase().includes(q);
    const matchStatus   = filterStatus === 'all'    || o.status === filterStatus;
    const matchPriority = filterPriority === 'all'  || o.priority === filterPriority;
    const matchCat      = filterCategory === 'all'  || o.category === filterCategory;
    return matchSearch && matchStatus && matchPriority && matchCat;
  });

  const kanbanCols = STATUS_ORDER.filter(s => s !== 'cancelled').map(s => ({
    key: s,
    ...STATUSES[s],
    orders: filtered.filter(o => o.status === s),
  }));

  const stats = {
    total:    orders.length,
    pending:  orders.filter(o => o.status === 'pending').length,
    progress: orders.filter(o => o.status === 'in_progress').length,
    resolved: orders.filter(o => o.status === 'resolved').length,
    urgent:   orders.filter(o => o.priority === 'urgent' && o.status !== 'resolved').length,
  };

  return (
    <div className="mnt-root">
      <style>{MNT_CSS}</style>

      {/* Header */}
      <header className="mnt-header">
        <div className="mnt-header-left">
          <div className="mnt-header-icon"><FaTools /></div>
          <div>
            <h1>Mantenimiento</h1>
            <p>Gestión de órdenes de trabajo · Hotel Cytrico</p>
          </div>
        </div>
        <div className="mnt-header-actions">
          <div className="mnt-view-toggle">
            <button className={view === 'kanban' ? 'active' : ''} onClick={() => setView('kanban')}><FaTh /> Kanban</button>
            <button className={view === 'list'   ? 'active' : ''} onClick={() => setView('list')}  ><FaList /> Lista</button>
          </div>
          <button className="mnt-btn-new" onClick={() => setShowNew(true)}>
            <FaPlus /> Nueva Orden
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="mnt-stats">
        <div className="mnt-stat">
          <div className="mnt-stat-val">{stats.total}</div>
          <div className="mnt-stat-label">Total</div>
        </div>
        <div className="mnt-stat mnt-stat-yellow">
          <div className="mnt-stat-val">{stats.pending}</div>
          <div className="mnt-stat-label">Pendientes</div>
        </div>
        <div className="mnt-stat mnt-stat-blue">
          <div className="mnt-stat-val">{stats.progress}</div>
          <div className="mnt-stat-label">En Curso</div>
        </div>
        <div className="mnt-stat mnt-stat-green">
          <div className="mnt-stat-val">{stats.resolved}</div>
          <div className="mnt-stat-label">Resueltos</div>
        </div>
        <div className="mnt-stat mnt-stat-red">
          <div className="mnt-stat-val">{stats.urgent}</div>
          <div className="mnt-stat-label">Urgentes activos</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="mnt-filters">
        <div className="mnt-search">
          <FaSearch />
          <input
            placeholder="Buscar por título, área, técnico..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">Todos los estados</option>
          {Object.entries(STATUSES).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="all">Todas las prioridades</option>
          {Object.entries(PRIORITIES).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
          <option value="all">Todas las categorías</option>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="mnt-loading"><FaSpinner className="spinning" /> Cargando órdenes...</div>
      ) : view === 'kanban' ? (
        /* ── Kanban ── */
        <div className="mnt-kanban">
          {kanbanCols.map(col => (
            <div key={col.key} className="mnt-kanban-col">
              <div className="mnt-kanban-header" style={{ '--col-color': col.color }}>
                <span className="mnt-kanban-icon">{col.icon}</span>
                <span className="mnt-kanban-label">{col.label}</span>
                <span className="mnt-kanban-count">{col.orders.length}</span>
              </div>
              <div className="mnt-kanban-body">
                {col.orders.length === 0
                  ? <div className="mnt-col-empty">Sin órdenes</div>
                  : col.orders.map(o => (
                    <OrderCard key={o.id} order={o} onClick={() => setSelected(o)} />
                  ))
                }
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ── Lista ── */
        <div className="mnt-list-view">
          <div className="mnt-list-header">
            <span>OT</span><span>Título</span><span>Área</span>
            <span>Categoría</span><span>Prioridad</span><span>Estado</span>
            <span>Técnico</span><span>Fecha</span>
          </div>
          {filtered.length === 0
            ? <div className="mnt-empty">No se encontraron órdenes con los filtros aplicados</div>
            : filtered.map(o => (
              <OrderRow key={o.id} order={o} onClick={() => setSelected(o)} />
            ))
          }
        </div>
      )}

      {/* Modales */}
      {showNew && (
        <NewOrderModal
          onClose={() => setShowNew(false)}
          onSave={handleCreate}
          receptionists={receptionists}
          technicians={technicians}
        />
      )}
      {selected && (
        <DetailModal
          order={selected}
          onClose={() => setSelected(null)}
          onUpdate={handleUpdate}
          technicians={technicians}
        />
      )}
    </div>
  );
}


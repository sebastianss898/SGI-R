import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { 
  collection, addDoc, getDocs, updateDoc, deleteDoc, doc, 
  query, orderBy
} from 'firebase/firestore';
import {
  FaBell, FaPlus, FaEdit, FaTrash, FaClock, FaCalendar,
  FaFilter, FaSearch, FaCheckCircle,
  FaRedo, FaTimes, FaEye, FaEyeSlash
} from 'react-icons/fa';
import {
  ALERT_TYPES, ALERT_PRIORITY, RECURRENCE_TYPE, ALERT_TARGET,
  ALERT_TYPE_LABELS, ALERT_PRIORITY_LABELS, RECURRENCE_LABELS,
  ALERT_TARGET_LABELS, ALERT_TYPE_COLORS, ALERT_PRIORITY_COLORS,
  ALERT_TYPE_ICONS, canUserManageAlert, canUserCreateAlertForTarget,
  getTodayAlerts, getUpcomingAlerts, formatAlertDateTime
} from '../utils/alerts';
import '../styles/alertsManagement.css';

const AlertsManagement = ({ currentUser }) => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAlert, setEditingAlert] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('active');
  const [showOnlyMine, setShowOnlyMine] = useState(false);
  
  const [alertForm, setAlertForm] = useState({
    title: '',
    description: '',
    type: ALERT_TYPES.REMINDER,
    priority: ALERT_PRIORITY.MEDIUM,
    date: '',
    time: '',
    recurrence: RECURRENCE_TYPE.NONE,
    customDays: [],
    target: ALERT_TARGET.ALL,
    customRoles: [],
    active: true,
  });

  const weekDays = [
    { value: 0, label: 'Dom' },
    { value: 1, label: 'Lun' },
    { value: 2, label: 'Mar' },
    { value: 3, label: 'Mié' },
    { value: 4, label: 'Jue' },
    { value: 5, label: 'Vie' },
    { value: 6, label: 'Sáb' },
  ];

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'alerts'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const alertsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));
      setAlerts(alertsData);
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAlert = async (e) => {
    e.preventDefault();
    try {
      const newAlert = {
        ...alertForm,
        createdBy: currentUser.id,
        createdByName: currentUser.name,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await addDoc(collection(db, 'alerts'), newAlert);
      
      setShowModal(false);
      resetForm();
      loadAlerts();
      alert('Alerta creada exitosamente');
    } catch (error) {
      console.error('Error creating alert:', error);
      alert('Error al crear alerta');
    }
  };

  const handleUpdateAlert = async (e) => {
    e.preventDefault();
    try {
      const alertRef = doc(db, 'alerts', editingAlert.id);
      await updateDoc(alertRef, {
        ...alertForm,
        updatedAt: new Date(),
      });
      
      setShowModal(false);
      setEditingAlert(null);
      resetForm();
      loadAlerts();
      alert('Alerta actualizada exitosamente');
    } catch (error) {
      console.error('Error updating alert:', error);
      alert('Error al actualizar alerta');
    }
  };

  const handleDeleteAlert = async (alertId) => {
    if (window.confirm('¿Estás seguro de eliminar esta alerta?')) {
      try {
        await deleteDoc(doc(db, 'alerts', alertId));
        loadAlerts();
        alert('Alerta eliminada exitosamente');
      } catch (error) {
        console.error('Error deleting alert:', error);
        alert('Error al eliminar alerta');
      }
    }
  };

  const handleToggleActive = async (alert) => {
    try {
      const alertRef = doc(db, 'alerts', alert.id);
      await updateDoc(alertRef, {
        active: !alert.active,
        updatedAt: new Date(),
      });
      loadAlerts();
    } catch (error) {
      console.error('Error toggling alert:', error);
      alert('Error al cambiar estado de alerta');
    }
  };

  const openEditModal = (alert) => {
    setEditingAlert(alert);
    setAlertForm({
      title: alert.title,
      description: alert.description,
      type: alert.type,
      priority: alert.priority,
      date: alert.date,
      time: alert.time,
      recurrence: alert.recurrence,
      customDays: alert.customDays || [],
      target: alert.target,
      customRoles: alert.customRoles || [],
      active: alert.active,
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setAlertForm({
      title: '',
      description: '',
      type: ALERT_TYPES.REMINDER,
      priority: ALERT_PRIORITY.MEDIUM,
      date: '',
      time: '',
      recurrence: RECURRENCE_TYPE.NONE,
      customDays: [],
      target: ALERT_TARGET.ALL,
      customRoles: [],
      active: true,
    });
    setEditingAlert(null);
  };

  const toggleCustomDay = (day) => {
    setAlertForm(prev => ({
      ...prev,
      customDays: prev.customDays.includes(day)
        ? prev.customDays.filter(d => d !== day)
        : [...prev.customDays, day]
    }));
  };

  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = 
      alert.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || alert.type === filterType;
    
    const matchesStatus = 
      filterStatus === 'all' ||
      (filterStatus === 'active' && alert.active !== false) ||
      (filterStatus === 'inactive' && alert.active === false);
    
    const matchesMine = !showOnlyMine || alert.createdBy === currentUser.id;
    
    return matchesSearch && matchesType && matchesStatus && matchesMine;
  });

  const todayAlerts = getTodayAlerts(alerts, currentUser.role);
  const upcomingAlerts = getUpcomingAlerts(alerts, currentUser.role, 7);

  return (
    <div className="alerts-management">
      {/* Header */}
      <div className="alerts-header">
        <div className="header-content">
          <h1><FaBell /> Alertas y Notificaciones</h1>
          <p>Programa recordatorios y tareas automáticas</p>
        </div>
        <button className="btn-create-alert" onClick={() => setShowModal(true)}>
          <FaPlus /> Nueva Alerta
        </button>
      </div>

      {/* Quick Stats */}
      <div className="alerts-quick-stats">
        <div className="quick-stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
            <FaClock style={{ color: '#3b82f6' }} />
          </div>
          <div className="stat-content">
            <h3>{todayAlerts.length}</h3>
            <p>Hoy</p>
          </div>
        </div>
        <div className="quick-stat-card">
          <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
            <FaCalendar style={{ color: '#8b5cf6' }} />
          </div>
          <div className="stat-content">
            <h3>{upcomingAlerts.length}</h3>
            <p>Próximos 7 días</p>
          </div>
        </div>
        <div className="quick-stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
            <FaCheckCircle style={{ color: '#10b981' }} />
          </div>
          <div className="stat-content">
            <h3>{alerts.filter(a => a.active !== false).length}</h3>
            <p>Activas</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="alerts-filters">
        <div className="search-box-alerts">
          <FaSearch />
          <input
            type="text"
            placeholder="Buscar alertas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-controls">
          <div className="filter-group">
            <FaFilter />
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="all">Todos los tipos</option>
              {Object.entries(ALERT_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">Todos los estados</option>
              <option value="active">Activas</option>
              <option value="inactive">Inactivas</option>
            </select>
          </div>

          <label className="checkbox-filter">
            <input
              type="checkbox"
              checked={showOnlyMine}
              onChange={(e) => setShowOnlyMine(e.target.checked)}
            />
            <span>Solo mis alertas</span>
          </label>
        </div>
      </div>

      {/* Alerts List */}
      {loading ? (
        <div className="alerts-loading">Cargando alertas...</div>
      ) : filteredAlerts.length === 0 ? (
        <div className="alerts-empty">
          <FaBell style={{ fontSize: '3rem', color: '#2e2e42', marginBottom: '16px' }} />
          <h3>No hay alertas</h3>
          <p>Crea tu primera alerta para empezar</p>
        </div>
      ) : (
        <div className="alerts-grid">
          {filteredAlerts.map(alert => (
            <div key={alert.id} className={`alert-card ${!alert.active ? 'inactive' : ''}`}>
              <div className="alert-card-header">
                <div className="alert-type-badge" style={{ background: ALERT_TYPE_COLORS[alert.type] }}>
                  <span className="alert-icon">{ALERT_TYPE_ICONS[alert.type]}</span>
                  <span>{ALERT_TYPE_LABELS[alert.type]}</span>
                </div>
                <div className="alert-actions-quick">
                  <button
                    className="action-btn-icon"
                    onClick={() => handleToggleActive(alert)}
                    title={alert.active ? 'Desactivar' : 'Activar'}
                  >
                    {alert.active ? <FaEye /> : <FaEyeSlash />}
                  </button>
                  {canUserManageAlert(alert, currentUser.role, currentUser.id) && (
                    <>
                      <button
                        className="action-btn-icon edit"
                        onClick={() => openEditModal(alert)}
                        title="Editar"
                      >
                        <FaEdit />
                      </button>
                      <button
                        className="action-btn-icon delete"
                        onClick={() => handleDeleteAlert(alert.id)}
                        title="Eliminar"
                      >
                        <FaTrash />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <h3 className="alert-title">{alert.title}</h3>
              <p className="alert-description">{alert.description}</p>

              <div className="alert-metadata">
                <div className="alert-meta-item">
                  <FaClock />
                  <span>{formatAlertDateTime(alert)}</span>
                </div>
                {alert.recurrence !== RECURRENCE_TYPE.NONE && (
                  <div className="alert-meta-item">
                    <FaRedo />
                    <span>{RECURRENCE_LABELS[alert.recurrence]}</span>
                  </div>
                )}
              </div>

              <div className="alert-footer">
                <span 
                  className="priority-indicator" 
                  style={{ background: ALERT_PRIORITY_COLORS[alert.priority] }}
                >
                  {ALERT_PRIORITY_LABELS[alert.priority]}
                </span>
                <span className="target-indicator">
                  {ALERT_TARGET_LABELS[alert.target]}
                </span>
              </div>

              <div className="alert-creator">
                <small>Por {alert.createdByName}</small>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay-alerts" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal-alerts" onClick={(e) => e.stopPropagation()}>
            <div className="modal-alerts-header">
              <h2>{editingAlert ? 'Editar Alerta' : 'Nueva Alerta'}</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }}>
                <FaTimes />
              </button>
            </div>

            <form onSubmit={editingAlert ? handleUpdateAlert : handleCreateAlert}>
              <div className="form-grid-alerts">
                <div className="form-field full-width">
                  <label>Título *</label>
                  <input
                    type="text"
                    placeholder="Ej: Jacuzzi para las 7 PM"
                    value={alertForm.title}
                    onChange={(e) => setAlertForm({ ...alertForm, title: e.target.value })}
                    required
                  />
                </div>

                <div className="form-field full-width">
                  <label>Descripción</label>
                  <textarea
                    placeholder="Detalles adicionales..."
                    value={alertForm.description}
                    onChange={(e) => setAlertForm({ ...alertForm, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="form-field">
                  <label>Tipo *</label>
                  <select
                    value={alertForm.type}
                    onChange={(e) => setAlertForm({ ...alertForm, type: e.target.value })}
                    required
                  >
                    {Object.entries(ALERT_TYPE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label>Prioridad *</label>
                  <select
                    value={alertForm.priority}
                    onChange={(e) => setAlertForm({ ...alertForm, priority: e.target.value })}
                    required
                  >
                    {Object.entries(ALERT_PRIORITY_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label>Fecha *</label>
                  <input
                    type="date"
                    value={alertForm.date}
                    onChange={(e) => setAlertForm({ ...alertForm, date: e.target.value })}
                    required
                  />
                </div>

                <div className="form-field">
                  <label>Hora *</label>
                  <input
                    type="time"
                    value={alertForm.time}
                    onChange={(e) => setAlertForm({ ...alertForm, time: e.target.value })}
                    required
                  />
                </div>

                <div className="form-field full-width">
                  <label>Recurrencia</label>
                  <select
                    value={alertForm.recurrence}
                    onChange={(e) => setAlertForm({ ...alertForm, recurrence: e.target.value })}
                  >
                    {Object.entries(RECURRENCE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                {alertForm.recurrence === RECURRENCE_TYPE.CUSTOM && (
                  <div className="form-field full-width">
                    <label>Días de la semana</label>
                    <div className="weekdays-selector">
                      {weekDays.map(day => (
                        <button
                          key={day.value}
                          type="button"
                          className={`weekday-btn ${alertForm.customDays.includes(day.value) ? 'selected' : ''}`}
                          onClick={() => toggleCustomDay(day.value)}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="form-field full-width">
                  <label>Destinatarios *</label>
                  <select
                    value={alertForm.target}
                    onChange={(e) => setAlertForm({ ...alertForm, target: e.target.value })}
                    required
                  >
                    {Object.entries(ALERT_TARGET_LABELS)
                      .filter(([key]) => canUserCreateAlertForTarget(currentUser.role, key))
                      .map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="modal-alerts-actions">
                <button type="button" className="btn-cancel-alerts" onClick={() => { setShowModal(false); resetForm(); }}>
                  Cancelar
                </button>
                <button type="submit" className="btn-save-alerts">
                  {editingAlert ? 'Actualizar' : 'Crear'} Alerta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertsManagement;

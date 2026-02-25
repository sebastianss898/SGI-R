// src/components/Sidebar.jsx - Completo con Métricas
import React from 'react';
import {
  FaHome,
  FaClock,
  FaSignOutAlt,
  FaCog,
  FaBell,
  FaUserCircle,
  FaHistory,
  FaUsers,
  FaChartLine 
} from 'react-icons/fa';
import { hasPermission, PERMISSIONS, ROLE_LABELS } from '../utils/roles';
import '../styles/sidebar.css';

const Sidebar = ({ isOpen, currentView, setCurrentView, currentUser }) => {
  // Items del menú con sus permisos requeridos
  const allMenuItems = [
    { 
      id: 'dashboard', 
      label: 'Inicio', 
      icon: <FaHome />, 
      permission: PERMISSIONS.VIEW_DASHBOARD 
    },
    { 
      id: "turnos", 
      label: "Turnos", 
      icon: <FaClock />, 
      permission: PERMISSIONS.VIEW_SHIFTS 
    },
    { 
      id: "historial", 
      label: "Historial", 
      icon: <FaHistory />, 
      permission: PERMISSIONS.VIEW_SHIFT_HISTORY 
    },
    { 
      id: "metricas", 
      label: "Métricas", 
      icon: <FaChartLine />, 
      permission: PERMISSIONS.VIEW_METRICS 
    },
    { 
      id: "usuarios", 
      label: "Usuarios", 
      icon: <FaUsers />, 
      permission: PERMISSIONS.CREATE_USER,
      adminOnly: true
    },
    { 
    id: "alertas", 
    label: "Alertas", 
    icon: <FaBell />, 
    permission: PERMISSIONS.VIEW_ALERTS 
    },
  ];

  // Filtrar items según permisos del usuario
  const menuItems = allMenuItems.filter(item => 
    !item.permission || hasPermission(currentUser.role, item.permission)
  );

  return (
    <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      {/* Header mejorado */}
      <div className="sidebar-header">
        <div className="logo-container">
          <div className="logo-icon-wrapper">
            <div className="logo-icon">
              <FaHome />
            </div>
            <div className="logo-pulse"></div>
          </div>
          {isOpen && (
            <div className="logo-text">
              <h2>Recepción</h2>
              <p>Hotel Cytrico</p>
            </div>
          )}
        </div>
      </div>

      {/* Usuario */}
      {isOpen && (
        <div className="sidebar-user">
          <div className="user-avatar-large">
            <FaUserCircle />
          </div>
          <div className="user-details">
            <h3>{currentUser.name}</h3>
            <p>{ROLE_LABELS[currentUser.role]}</p>
            <span className="user-status">
              <span className="status-dot"></span>
              En línea
            </span>
          </div>
        </div>
      )}

      {/* Notificaciones rápidas */}
      {isOpen && hasPermission(currentUser.role, PERMISSIONS.VIEW_NOTES) && (
        <div className="sidebar-notifications">
          <div className="notification-item">
            <FaBell />
            <span>3 notificaciones nuevas</span>
          </div>
        </div>
      )}

      {/* Navegación */}
      <nav className="sidebar-nav">
        {isOpen && (
          <div className="nav-section-title">
            <span>MENÚ PRINCIPAL</span>
          </div>
        )}
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${currentView === item.id ? 'active' : ''}`}
            onClick={() => setCurrentView(item.id)}
            title={!isOpen ? item.label : ''}
          >
            <span className="nav-icon-wrapper">
              <span className="nav-icon">{item.icon}</span>
            </span>
            {isOpen && (
              <span className="nav-label">{item.label}</span>
            )}
            {currentView === item.id && isOpen && <span className="nav-indicator"></span>}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="footer-divider"></div>
        {hasPermission(currentUser.role, PERMISSIONS.VIEW_SETTINGS) && (
          <button
            className="nav-item settings"
            title={!isOpen ? 'Configuración' : ''}
          >
            <span className="nav-icon-wrapper">
              <span className="nav-icon"><FaCog /></span>
            </span>
            {isOpen && <span className="nav-label">Configuración</span>}
          </button>
        )}
        <button
          className="nav-item logout"
          title={!isOpen ? 'Cerrar Sesión' : ''}
        >
          <span className="nav-icon-wrapper">
            <span className="nav-icon"><FaSignOutAlt /></span>
          </span>
          {isOpen && <span className="nav-label">Cerrar Sesión</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
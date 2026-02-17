// src/components/Sidebar.jsx - Actualizado
import React from 'react';
import { 
  FaHome, 
  FaClock,
  FaSignOutAlt,
  FaCog,
  FaBell,
  FaUserCircle
} from 'react-icons/fa';
import '../styles/sidebar.css';

const Sidebar = ({ isOpen, currentView, setCurrentView }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Inicio', icon: <FaHome />, badge: 5 },
    {id: "turnos", label: "Turnos", icon: <FaClock />, badge: 5},
    
    
  ];

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
            <h3>María González</h3>
            <p>Recepcionista</p>
            <span className="user-status">
              <span className="status-dot"></span>
              En línea
            </span>
          </div>
        </div>
      )}

      {/* Notificaciones rápidas */}
      {isOpen && (
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
            title={!isOpen ? item.label : ''} // Tooltip nativo cuando está cerrado
          >
            <span className="nav-icon-wrapper">
              <span className="nav-icon">{item.icon}</span>
              {item.badge && (
                <span className="nav-badge">{item.badge}</span>
              )}
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
        <button 
          className="nav-item settings"
          title={!isOpen ? 'Configuración' : ''}
        >
          <span className="nav-icon-wrapper">
            <span className="nav-icon"><FaCog /></span>
          </span>
          {isOpen && <span className="nav-label">Configuración</span>}
        </button>
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
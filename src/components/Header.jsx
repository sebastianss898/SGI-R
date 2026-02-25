// src/components/Header.jsx - Con funcionalidad de Logout
import React, { useState } from 'react';
import { 
  FaBars, 
  FaBell, 
  FaUserCircle,
  FaSignOutAlt,
  FaCog,
  FaChevronDown
} from 'react-icons/fa';
import { ROLE_LABELS } from '../utils/roles';
import '../styles/header.css';

const Header = ({ toggleSidebar, sidebarOpen, currentUser, onLogout }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const notifications = [
    { id: 1, text: 'Nuevo turno entregado', time: '5 min', unread: true },
    { id: 2, text: 'Check-in habitación 305', time: '15 min', unread: true },
    { id: 3, text: 'Factura emitida #1234', time: '1 hora', unread: false },
  ];

  const unreadCount = notifications.filter(n => n.unread).length;

  const handleLogout = () => {
    if (window.confirm('¿Estás seguro que deseas cerrar sesión?')) {
      onLogout();
    }
  };

  return (
    <header className="header">
      <div className="header-left">
        <button 
          className="menu-toggle-btn"
          onClick={toggleSidebar}
          aria-label="Toggle menu"
        >
          <FaBars />
        </button>
        <div className="header-breadcrumb">
          <span className="current-page">Dashboard</span>
        </div>
      </div>

      <div className="header-right">
        {/* Notifications */}
        <div className="header-item">
          <button 
            className="icon-btn"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
          >
            <FaBell />
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount}</span>
            )}
          </button>

          {showNotifications && (
            <div className="dropdown-menu notifications-menu">
              <div className="dropdown-header">
                <h4>Notificaciones</h4>
                <button className="mark-read-btn">Marcar todas leídas</button>
              </div>
              <div className="notifications-list">
                {notifications.map(notif => (
                  <div 
                    key={notif.id} 
                    className={`notification-item ${notif.unread ? 'unread' : ''}`}
                  >
                    <div className="notification-content">
                      <p>{notif.text}</p>
                      <span className="notification-time">{notif.time}</span>
                    </div>
                    {notif.unread && <span className="unread-dot"></span>}
                  </div>
                ))}
              </div>
              <div className="dropdown-footer">
                <button className="view-all-btn">Ver todas</button>
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="header-item user-menu-wrapper">
          <button 
            className="user-menu-btn"
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
          >
            <div className="user-avatar">
              <FaUserCircle />
            </div>
            <div className="user-info">
              <span className="user-name">{currentUser?.name || 'Usuario'}</span>
              <span className="user-role">{ROLE_LABELS[currentUser?.role] || 'Sin rol'}</span>
            </div>
            <FaChevronDown className="chevron-icon" />
          </button>

          {showUserMenu && (
            <div className="dropdown-menu user-dropdown">
              <div className="user-dropdown-header">
                <div className="user-avatar-large">
                  <FaUserCircle />
                </div>
                <div className="user-dropdown-info">
                  <h4>{currentUser?.name}</h4>
                  <p>{currentUser?.email}</p>
                  <span className="role-badge">{ROLE_LABELS[currentUser?.role]}</span>
                </div>
              </div>

              <div className="dropdown-divider"></div>

              <div className="user-menu-items">
                <button className="user-menu-item">
                  <FaUserCircle />
                  <span>Mi Perfil</span>
                </button>
                <button className="user-menu-item">
                  <FaCog />
                  <span>Configuración</span>
                </button>
              </div>

              <div className="dropdown-divider"></div>

              <button className="user-menu-item logout-item" onClick={handleLogout}>
                <FaSignOutAlt />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Overlay para cerrar dropdowns */}
      {(showUserMenu || showNotifications) && (
        <div 
          className="header-overlay"
          onClick={() => {
            setShowUserMenu(false);
            setShowNotifications(false);
          }}
        ></div>
      )}
    </header>
  );
};

export default Header;
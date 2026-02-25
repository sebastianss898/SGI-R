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
import NotificationsWidget from './NotificationsWidget';

const Header = ({ toggleSidebar, sidebarOpen, currentUser, onLogout }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

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
        <NotificationsWidget currentUser={currentUser} />
        <div className="header-item user-menu-wrapper">
          <button 
            className="user-menu-btn"
            onClick={() => {
              setShowUserMenu(!showUserMenu);
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
      {showUserMenu && (
        <div 
          className="header-overlay"
          onClick={() => {
            setShowUserMenu(false);
          }}
        ></div>
      )}
    </header>
  );
};

export default Header;
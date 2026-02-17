// src/components/Header.jsx
import React from 'react';
import { FaBars, FaBell, FaSearch, FaUser } from 'react-icons/fa';
import '../styles/globalStyles.css';

const Header = ({ toggleSidebar, sidebarOpen }) => {
  return (
    <header className="header">
      <div className="header-left">
        <button className="menu-toggle" onClick={toggleSidebar}>
          <FaBars />
        </button>
        <h1 className="page-title">Panel de Control</h1>
      </div>

      <div className="header-right">
        <div className="search-bar">
          <FaSearch className="search-icon" />
          <input type="text" placeholder="Buscar notas, visitantes..." />
        </div>
        
        <button className="notification-btn">
          <FaBell />
          <span className="notification-badge">3</span>
        </button>

        <div className="user-menu">
          <div className="user-avatar">
            <FaUser />
          </div>
          <div className="user-info">
            <span className="user-name">Manuela </span>
            <span className="user-role">Recepcionista / Ama de llaves</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
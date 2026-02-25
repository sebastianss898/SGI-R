import React from 'react';
import UserManagement from './Usermanagement';
import '../styles/Usermanagement.css';
import { FaArrowLeft } from 'react-icons/fa';

const UserManagementPage = ({ onBack }) => {
  return (
    <div className="users-page-full">
      {/* Header simplificado */}
      <div className="users-page-header">
        <h1>Sistema de Gestión (Hotel Cytrico)</h1>
      </div>
      
      {/* Contenido */}
      <div className="users-page-content">
        <UserManagement />
      </div>
    </div>
  );
};

export default UserManagementPage;
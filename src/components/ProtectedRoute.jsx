// src/components/ProtectedRoute.jsx - Componente para proteger rutas
import React from 'react';
import { hasPermission } from '../utils/roles';
import { FaLock, FaExclamationTriangle } from 'react-icons/fa';
import '../styles/Protectedroute.css';

const ProtectedRoute = ({ children, requiredPermission, userRole }) => {
  // Si no hay permiso requerido, mostrar el componente
  if (!requiredPermission) {
    return children;
  }

  // Verificar si el usuario tiene el permiso
  const hasAccess = hasPermission(userRole, requiredPermission);

  if (!hasAccess) {
    return (
      <div className="access-denied">
        <div className="access-denied-content">
          <div className="denied-icon">
            <FaLock />
          </div>
          <h2>Acceso Denegado</h2>
          <p>No tienes permisos para acceder a esta sección</p>
          <div className="denied-info">
            <FaExclamationTriangle />
            <span>Contacta a tu administrador si necesitas acceso</span>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
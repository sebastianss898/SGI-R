// App.jsx - Con Login Independiente y Gestión de Sesión
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import TurnRegister from './components/TurnRegister';
import ShiftHistory from './components/Shifthistory';
import UserManagement from '../src/pages/UserManagementPage';
import MetricsDashboard from './components/Metricsdashboard';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { PERMISSIONS } from './utils/roles';
import './styles/globalStyles.css';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Verificar sesión al cargar
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('currentUser');
      }
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (user) => {
    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    setCurrentView('dashboard');
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <ProtectedRoute 
            requiredPermission={PERMISSIONS.VIEW_DASHBOARD}
            userRole={currentUser.role}
          >
            <Dashboard />
          </ProtectedRoute>
        );

      case 'turnos':
        return (
          <ProtectedRoute 
            requiredPermission={PERMISSIONS.VIEW_SHIFTS}
            userRole={currentUser.role}
          >
            <TurnRegister />
          </ProtectedRoute>
        );

      case 'historial':
        return (
          <ProtectedRoute 
            requiredPermission={PERMISSIONS.VIEW_SHIFT_HISTORY}
            userRole={currentUser.role}
          >
            <ShiftHistory />
          </ProtectedRoute>
        );

      case 'metricas':
        return (
          <ProtectedRoute 
            requiredPermission={PERMISSIONS.VIEW_METRICS}
            userRole={currentUser.role}
          >
            <MetricsDashboard />
          </ProtectedRoute>
        );

      case 'usuarios':
        return (
          <ProtectedRoute 
            requiredPermission={PERMISSIONS.CREATE_USER}
            userRole={currentUser.role}
          >
            <UserManagement />
          </ProtectedRoute>
        );

      default:
        return <Dashboard />;
    }
  };

  // Mostrar loading mientras verifica sesión
  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f0f13',
        color: '#e8e6e1'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid #2e2e42',
            borderTopColor: '#5b5bff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  // Si no hay usuario logueado, mostrar página de login
  if (!currentUser) {
    return <Login onLoginSuccess={handleLogin} />;
  }

  // Si hay usuario logueado, mostrar la aplicación
  return (
    <div className="app">
      <Sidebar
        isOpen={sidebarOpen}
        currentView={currentView}
        setCurrentView={setCurrentView}
        currentUser={currentUser}
      />
      <div className={`main-content ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <Header 
          toggleSidebar={toggleSidebar} 
          sidebarOpen={sidebarOpen}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
        {renderView()}
      </div>
    </div>
  );
}

export default App;
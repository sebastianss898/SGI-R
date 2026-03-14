import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import TurnRegister from './components/TurnRegister';
import ShiftHistory from './components/Shifthistory';
import MetricsDashboard from './components/Metricsdashboard';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { PERMISSIONS } from './utils/roles';
import AlertsManagement from './components/AlertsManagement';
import ReportsManagement from './components/Reportsmanagement';
import ShiftsScheduleManagement from './components/Shiftsschedulemanagement';
import Maintenance from './components/Maintenance';
import EmployeeManager from './components/EmployeeManager';
import './styles/globalStyles.css';

function App() {
  const [sidebarOpen,  setSidebarOpen] = useState(true);
  const [currentView,  setCurrentView] = useState('dashboard');
  const [currentUser,  setCurrentUser] = useState(null);
  const [isLoading,    setIsLoading]   = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('currentUser');
    if (saved) {
      try { setCurrentUser(JSON.parse(saved)); }
      catch { localStorage.removeItem('currentUser'); }
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

  const goTo = (view) => setCurrentView(view);

  const renderView = () => {
    switch (currentView) {

      case 'dashboard':
        return (
          <ProtectedRoute requiredPermission={PERMISSIONS.VIEW_DASHBOARD} userRole={currentUser.role}>
            <Dashboard />
          </ProtectedRoute>
        );

      case 'turnos':
        return (
          <ProtectedRoute requiredPermission={PERMISSIONS.VIEW_SHIFTS} userRole={currentUser.role}>
            <TurnRegister currentUser={currentUser} onLogout={handleLogout} />
          </ProtectedRoute>
        );

      case 'historial':
        return (
          <ProtectedRoute requiredPermission={PERMISSIONS.VIEW_SHIFT_HISTORY} userRole={currentUser.role}>
            <ShiftHistory />
          </ProtectedRoute>
        );

      case 'metricas':
        return (
          <ProtectedRoute requiredPermission={PERMISSIONS.VIEW_METRICS} userRole={currentUser.role}>
            <MetricsDashboard />
          </ProtectedRoute>
        );

      case 'usuarios':
        return (
          <ProtectedRoute requiredPermission={PERMISSIONS.VIEW_USERS} userRole={currentUser.role}>
            <EmployeeManager
              currentUser={currentUser}
              onBack={() => goTo('dashboard')}
            />
          </ProtectedRoute>
        );

      case 'alertas':
        return (
          <ProtectedRoute requiredPermission={PERMISSIONS.VIEW_ALERTS} userRole={currentUser.role}>
            <AlertsManagement currentUser={currentUser} />
          </ProtectedRoute>
        );

      case 'reportes':
        return (
          <ProtectedRoute requiredPermission={PERMISSIONS.VIEW_REPORTS_PAGE} userRole={currentUser.role}>
            <ReportsManagement currentUser={currentUser} />
          </ProtectedRoute>
        );

      case 'horarios':
        return (
          <ProtectedRoute requiredPermission={PERMISSIONS.VIEW_SHIFTS_SCHEDULE} userRole={currentUser.role}>
            <ShiftsScheduleManagement currentUser={currentUser} />
          </ProtectedRoute>
        );

      case 'mantenimiento':
        return (
          <ProtectedRoute requiredPermission={PERMISSIONS.VIEW_MAINTENANCE} userRole={currentUser.role}>
            <Maintenance currentUser={currentUser} />
          </ProtectedRoute>
        );

      default:
        return <Dashboard />;
    }
  };

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: '#0f0f13', color: '#e8e6e1',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 50, height: 50,
            border: '4px solid #2e2e42',
            borderTopColor: '#5b5bff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Login onLoginSuccess={handleLogin} />;
  }

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
          toggleSidebar={() => setSidebarOpen(o => !o)}
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
// App.jsx
import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import TurnRegister from './components/TurnRegister'; // 👈 1. Importar
import './styles/globalStyles.css';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // 👈 2. Renderizar la vista según currentView
  const renderView = () => {
    switch (currentView) {
      case 'dashboard':   return <Dashboard />;
      case 'turnos':      return <TurnRegister />;
      default:            return <Dashboard />;
    }
  };

  return (
    <div className="app">
      <Sidebar 
        isOpen={sidebarOpen} 
        currentView={currentView}
        setCurrentView={setCurrentView}
      />
      <div className={`main-content ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <Header toggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />
        {renderView()} {/* 👈 3. Reemplaza <Dashboard /> por esto */}
      </div>
    </div>
  );
}

export default App;

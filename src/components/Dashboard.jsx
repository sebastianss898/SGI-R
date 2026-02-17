// src/components/Dashboard.jsx - Actualizar la parte de las notas de ejemplo y el renderizado
import React, { useState } from 'react';
import { 
  FaFileAlt, 
  FaExclamationCircle, 
  FaCheckCircle,
  FaSignInAlt,
  FaSignOutAlt,
  FaBox,
  FaUsers,
  FaTools,
  FaClock,
  FaCalendar,
  FaPlus,
  FaUser
} from 'react-icons/fa';
import NoteModal from './NoteModal';
import '../styles/globalStyles.css';

const Dashboard = () => {
  const [notes, setNotes] = useState([
    {
      id: '1',
      title: 'Llegada grupo corporativo',
      description: 'Grupo de 15 personas de empresa TechCorp. Check-in a las 14:00hrs. Solicitan sala de reuniones.',
      category: 'check-in',
      priority: 'high',
      date: '2026-02-12',
      startTime: '09:30',
      endTime: '17:30',
      user: 'María González',
      status: 'pending'
    },
    {
      id: '2',
      title: 'Paquete urgente habitación 305',
      description: 'Documentos importantes para el Sr. Ramírez. Entregar personalmente. Requiere firma.',
      category: 'package',
      priority: 'urgent',
      date: '2026-02-12',
      startTime: '08:15',
      endTime: '12:00',
      user: 'Carlos Pérez',
      status: 'pending'
    },
    {
      id: '3',
      title: 'Solicitud late check-out',
      description: 'Habitación 512 solicita salida a las 16:00hrs. Aprobado por gerencia.',
      category: 'check-out',
      priority: 'medium',
      date: '2026-02-11',
      startTime: '12:00',
      endTime: '16:00',
      user: 'Ana Martínez',
      status: 'completed'
    },
    {
      id: '4',
      title: 'Mantenimiento en lobby',
      description: 'Programado mantenimiento de aire acondicionado para mañana 06:00hrs.',
      category: 'maintenance',
      priority: 'medium',
      date: '2026-02-11',
      startTime: '06:00',
      endTime: '10:00',
      user: 'Jorge Silva',
      status: 'pending'
    },
    {
      id: '5',
      title: 'Visita importante - VIP',
      description: 'El Sr. Thompson llegará esta tarde. Preparar suite presidencial con amenidades especiales.',
      category: 'visitor',
      priority: 'high',
      date: '2026-02-11',
      startTime: '15:30',
      endTime: '18:00',
      user: 'María González',
      status: 'in-progress'
    },
    {
      id: '6',
      title: 'Reservación confirmada',
      description: 'Familia Johnson confirma reservación para 3 habitaciones del 15 al 20 de febrero.',
      category: 'check-in',
      priority: 'low',
      date: '2026-02-10',
      startTime: '14:20',
      endTime: '22:00',
      user: 'Carlos Pérez',
      status: 'completed'
    },
  ]);

  const [selectedFilter, setSelectedFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSaveNote = (newNote) => {
    setNotes(prev => [newNote, ...prev]);
  };

  const getCategoryInfo = (category) => {
    const categories = {
      'check-in': { label: 'Check-in', color: '#4CAF50', icon: <FaSignInAlt /> },
      'check-out': { label: 'Check-out', color: '#F44336', icon: <FaSignOutAlt /> },
      'package': { label: 'Paquete', color: '#2196F3', icon: <FaBox /> },
      'visitor': { label: 'Visita', color: '#00BCD4', icon: <FaUsers /> },
      'maintenance': { label: 'Mantenimiento', color: '#FF9800', icon: <FaTools /> },
    };
    return categories[category] || categories.visitor;
  };

  const getPriorityInfo = (priority) => {
    const priorities = {
      urgent: { label: 'Urgente', color: '#D32F2F' },
      high: { label: 'Alta', color: '#F57C00' },
      medium: { label: 'Media', color: '#FBC02D' },
      low: { label: 'Baja', color: '#689F38' },
    };
    return priorities[priority] || priorities.medium;
  };

  const getStatusInfo = (status) => {
    const statuses = {
      pending: { label: 'Pendiente', color: '#FF9800' },
      'in-progress': { label: 'En Proceso', color: '#2196F3' },
      completed: { label: 'Completada', color: '#4CAF50' },
    };
    return statuses[status] || statuses.pending;
  };

  const filteredNotes = selectedFilter === 'all' 
    ? notes 
    : notes.filter(note => note.category === selectedFilter);

  const urgentCount = notes.filter(n => n.priority === 'urgent' || n.priority === 'high').length;

  return (
    <div className="dashboard"
    
    >
      {/* Stats Cards */}
    <div>
      <button className="btn-primary" onClick={() => setIsModalOpen(true)}>entregar turno</button>
    </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#E3F2FD' }}>
            <FaFileAlt style={{ color: '#1A237E' }} />
          </div>
          <div className="stat-content">
            <h3>{notes.length}</h3>
            <p>Total Notas</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#FFEBEE' }}>
            <FaExclamationCircle style={{ color: '#F44336' }} />
          </div>
          <div className="stat-content">
            <h3>{urgentCount}</h3>
            <p>Urgentes</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#E8F5E9' }}>
            <FaCheckCircle style={{ color: '#4CAF50' }} />
          </div>
          <div className="stat-content">
            <h3>{notes.filter(n => n.status === 'completed').length}</h3>
            <p>Completadas</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#FFF3E0' }}>
            <FaClock style={{ color: '#FF9800' }} />
          </div>
          <div className="stat-content">
            <h3>{notes.filter(n => n.status === 'pending').length}</h3>
            <p>Pendientes</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-tabs">
          <button 
            className={`filter-tab ${selectedFilter === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedFilter('all')}
          >
            Todas
          </button>
          <button 
            className={`filter-tab ${selectedFilter === 'check-in' ? 'active' : ''}`}
            onClick={() => setSelectedFilter('check-in')}
          >
            Check-in
          </button>
          <button 
            className={`filter-tab ${selectedFilter === 'check-out' ? 'active' : ''}`}
            onClick={() => setSelectedFilter('check-out')}
          >
            Check-out
          </button>
          <button 
            className={`filter-tab ${selectedFilter === 'package' ? 'active' : ''}`}
            onClick={() => setSelectedFilter('package')}
          >
            Paquetes
          </button>
          <button 
            className={`filter-tab ${selectedFilter === 'visitor' ? 'active' : ''}`}
            onClick={() => setSelectedFilter('visitor')}
          >
            Visitas
          </button>
        </div>
      </div>

      {/* Notes Section */}
      <div className="notes-section">
        <div className="section-header">
          <h2>Historial de Notas</h2>
          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
            <FaPlus /> Nueva Nota
          </button>
        </div>

        <div className="notes-grid">
          {filteredNotes.map((note) => {
            const categoryInfo = getCategoryInfo(note.category);
            const priorityInfo = getPriorityInfo(note.priority);
            const statusInfo = getStatusInfo(note.status);

            return (
              <div key={note.id} className="note-card">
                <div className="note-header">
                  <div className="note-category" style={{ color: categoryInfo.color }}>
                    {categoryInfo.icon}
                    <span>{categoryInfo.label}</span>
                  </div>
                  <div className="note-badges">
                    <span 
                      className="priority-badge" 
                      style={{ backgroundColor: priorityInfo.color }}
                    >
                      {priorityInfo.label}
                    </span>
                    <span 
                      className="status-badge" 
                      style={{ backgroundColor: statusInfo.color }}
                    >
                      {statusInfo.label}
                    </span>
                  </div>
                </div>

                <h3 className="note-title">{note.title}</h3>
                <p className="note-description">{note.description}</p>

                <div className="note-footer">
                  <div className="note-meta">
                    <span className="note-date">
                      <FaCalendar /> {note.date}
                    </span>
                    <span className="note-time">
                      <FaClock /> {note.startTime} - {note.endTime}
                    </span>
                  </div>
                  <div className="note-user">
                    <FaUser /> {note.user}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      <NoteModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveNote}
      />
    </div>
  );
};

export default Dashboard;
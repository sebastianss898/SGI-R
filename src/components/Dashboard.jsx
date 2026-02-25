// src/components/Dashboard.jsx - Actualizado con NoteCard y CountrySearch
import React, { useState } from 'react';
import {
  FaFileAlt,
  FaExclamationCircle,
  FaCheckCircle,
  FaClock,
  FaPlus
} from 'react-icons/fa';
import NoteModal from './NoteModal';
import NoteCard from './NoteCard';
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
      status: 'pending',
      country: null
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
      status: 'pending',
      country: null
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
      status: 'completed',
      country: null
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
      status: 'pending',
      country: null
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
      status: 'in-progress',
      country: null
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
      status: 'completed',
      country: null
    },
  ]);

  const [selectedFilter, setSelectedFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSaveNote = (newNote) => {
    setNotes(prev => [newNote, ...prev]);
  };

  const handleUpdateNote = (updatedNote) => {
    setNotes(prev => prev.map(note =>
      note.id === updatedNote.id ? updatedNote : note
    ));
  };

  const handleDeleteNote = (noteId) => {
    if (window.confirm('¿Estás seguro de eliminar esta nota?')) {
      setNotes(prev => prev.filter(note => note.id !== noteId));
    }
  };

  const filteredNotes = selectedFilter === 'all'
    ? notes
    : notes.filter(note => note.category === selectedFilter);

  const urgentCount = notes.filter(n => n.priority === 'urgent' || n.priority === 'high').length;

  return (
    <div className="dashboard">
      {/* Stats Cards */}
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
      <div class="utils-section">

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
          {filteredNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onUpdate={handleUpdateNote}
              onDelete={handleDeleteNote}
            />
          ))}
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
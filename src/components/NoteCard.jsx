import React, { useState } from 'react';
import {
    FaSignInAlt,
    FaSignOutAlt,
    FaBox,
    FaUsers,
    FaTools,
    FaClock,
    FaCalendar,
    FaUser,
    FaGlobe,
    FaEdit,
    FaTrash
} from 'react-icons/fa';
import CountrySearch from './CountrySearch';
import '../styles/noteCard.css';

const NoteCard = ({ note, onUpdate, onDelete }) => {
    const [isEditingCountry, setIsEditingCountry] = useState(false);
    const [selectedCountry, setSelectedCountry] = useState(note.country || null);

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

    const handleCountrySelect = (countryData) => {
        setSelectedCountry(countryData);
        setIsEditingCountry(false);

        // Actualizar la nota con el país seleccionado
        if (onUpdate) {
            onUpdate({
                ...note,
                country: countryData
            });
        }
    };

    const categoryInfo = getCategoryInfo(note.category);
    const priorityInfo = getPriorityInfo(note.priority);
    const statusInfo = getStatusInfo(note.status);

    return (
        <div className="note-card">
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

            {/* País de origen - Integración con CountrySearch */}
            <div className="note-country-section">
                {!isEditingCountry && !selectedCountry && (
                    <button
                        className="add-country-btn"
                        onClick={() => setIsEditingCountry(true)}
                    >
                        <FaGlobe /> Agregar país de origen
                    </button>
                )}

                {!isEditingCountry && selectedCountry && (
                    <div className="country-display">
                        <img
                            src={selectedCountry.flag}
                            alt={selectedCountry.name}
                            className="country-flag-display"
                        />
                        <div className="country-info-display">
                            <span className="country-name-display">{selectedCountry.name}</span>
                            {selectedCountry.cca3 && (
                                <span className="cioc-code-display">TRA: {selectedCountry.cca3}</span>
                            )}
                        </div>
                        <button
                            className="edit-country-btn"
                            onClick={() => setIsEditingCountry(true)}
                            title="Cambiar país"
                        >
                            <FaEdit />
                        </button>
                    </div>
                )}

                {isEditingCountry && (
                    <div className="country-search-wrapper">
                        <CountrySearch
                            onSelectCountry={handleCountrySelect}
                            placeholder="Buscar país de origen..."
                        />
                        <button
                            className="cancel-country-btn"
                            onClick={() => setIsEditingCountry(false)}
                        >
                            Cancelar
                        </button>
                    </div>
                )}
            </div>

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

            {/* Acciones opcionales */}
            {onDelete && (
                <div className="note-actions">
                    <button
                        className="delete-note-btn"
                        onClick={() => onDelete(note.id)}
                        title="Eliminar nota"
                    >
                        <FaTrash /> Eliminar
                    </button>
                </div>
            )}
        </div>
    );
};

export default NoteCard;
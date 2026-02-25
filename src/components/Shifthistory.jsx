import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import {
    FaSun, FaCloudSun, FaMoon,
    FaCalendar, FaClock, FaUser,
    FaMoneyBillWave, FaPiggyBank,
    FaReceipt, FaBed, FaSearch,
    FaFilter, FaEye, FaSpinner,
    FaChevronDown, FaChevronUp
} from 'react-icons/fa';
import ShiftDetailModal from './Shiftdetailmodal';
import '../styles/Shifthistory.css';

const ShiftHistory = () => {
    const [shifts, setShifts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedShift, setSelectedShift] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterShift, setFilterShift] = useState('all');
    const [sortOrder, setSortOrder] = useState('desc');

    useEffect(() => {
        loadShifts();
    }, []);

    const loadShifts = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'turnos'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            const shiftsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate()
            }));
            setShifts(shiftsData);
        } catch (error) {
            console.error('Error loading shifts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = (shift) => {
        setSelectedShift(shift);
        setShowModal(true);
    };

    const getShiftIcon = (shiftKey) => {
        const icons = {
            morning: <FaSun />,
            afternoon: <FaCloudSun />,
            night: <FaMoon />
        };
        return icons[shiftKey] || <FaClock />;
    };

    const getShiftColor = (shiftKey) => {
        const colors = {
            morning: '#FFB347',
            afternoon: '#87CEEB',
            night: '#9B7FD4'
        };
        return colors[shiftKey] || '#6b6b8a';
    };

    const fmt = (n) => new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        maximumFractionDigits: 0
    }).format(n);

    // Filtrado y búsqueda
    const filteredShifts = shifts
        .filter(shift => {
            const matchesSearch =
                shift.receptionist?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                shift.shiftLabel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                shift.date?.includes(searchTerm);

            const matchesFilter = filterShift === 'all' || shift.shift === filterShift;

            return matchesSearch && matchesFilter;
        })
        .sort((a, b) => {
            const dateA = a.createdAt || new Date(0);
            const dateB = b.createdAt || new Date(0);
            return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });

    const totalShifts = filteredShifts.length;
    const totalIngresos = filteredShifts.reduce((sum, s) => sum + (s.totals?.ingresos || 0), 0);
    const totalGastos = filteredShifts.reduce((sum, s) => sum + (s.totals?.gastos || 0), 0);

    return (
        <div className="shift-history">
            {/* Header */}
            <div className="history-header">
                <div className="header-content">
                    <h1>Historial de Turnos</h1>
                    <p>Registro completo de entregas de turno</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="history-stats">
                <div className="stat-card-history">
                    <div className="stat-icon-history" style={{ background: '#e3f2fd' }}>
                        <FaCalendar style={{ color: '#1976d2' }} />
                    </div>
                    <div className="stat-content-history">
                        <h3>{totalShifts}</h3>
                        <p>Turnos Registrados</p>
                    </div>
                </div>
                <div className="stat-card-history">
                    <div className="stat-icon-history" style={{ background: '#e8f5e9' }}>
                        <FaMoneyBillWave style={{ color: '#4caf50' }} />
                    </div>
                    <div className="stat-content-history">
                        <h3>{fmt(totalIngresos)}</h3>
                        <p>Total Ingresos</p>
                    </div>
                </div>
                <div className="stat-card-history">
                    <div className="stat-icon-history" style={{ background: '#f3e5f5' }}>
                        <FaPiggyBank style={{ color: '#9c27b0' }} />
                    </div>
                    <div className="stat-content-history">
                        <h3>{fmt(totalGastos)}</h3>
                        <p>Total Gastos</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="history-filters">
                <div className="search-box">
                    <FaSearch className="search-icon" />
                    <input
                        type="text"
                        placeholder="Buscar por recepcionista, turno o fecha..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="filter-controls">
                    <div className="filter-group">
                        <FaFilter />
                        <select value={filterShift} onChange={(e) => setFilterShift(e.target.value)}>
                            <option value="all">Todos los turnos</option>
                            <option value="morning">Mañana</option>
                            <option value="afternoon">Tarde</option>
                            <option value="night">Noche</option>
                        </select>
                    </div>

                    <button
                        className="sort-btn"
                        onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                    >
                        {sortOrder === 'desc' ? <FaChevronDown /> : <FaChevronUp />}
                        {sortOrder === 'desc' ? 'Más recientes' : 'Más antiguos'}
                    </button>
                </div>
            </div>

            {/* Shifts List */}
            {loading ? (
                <div className="loading-container">
                    <FaSpinner className="spinner" />
                    <p>Cargando turnos...</p>
                </div>
            ) : filteredShifts.length === 0 ? (
                <div className="empty-state">
                    <FaCalendar />
                    <h3>No hay turnos registrados</h3>
                    <p>Los turnos entregados aparecerán aquí</p>
                </div>
            ) : (
                <div className="shifts-grid">
                    {filteredShifts.map((shift) => (
                        <div key={shift.id} className="shift-card">
                            <div className="shift-card-header">
                                <div className="shift-badge" style={{ color: getShiftColor(shift.shift) }}>
                                    {getShiftIcon(shift.shift)}
                                    <span>{shift.shiftLabel}</span>
                                </div>
                                <div className="shift-date">
                                    <FaCalendar />
                                    {new Date(shift.date).toLocaleDateString('es-CL', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric'
                                    })}
                                </div>
                            </div>

                            <div className="shift-card-body">
                                <div className="shift-receptionist">
                                    <FaUser />
                                    <span>{shift.receptionist}</span>
                                </div>

                                <div className="shift-summary">
                                    <div className="summary-item">
                                        <FaMoneyBillWave className="summary-icon green" />
                                        <div>
                                            <span className="summary-label">Ingresos</span>
                                            <span className="summary-value green">{fmt(shift.totals?.ingresos || 0)}</span>
                                        </div>
                                    </div>

                                    <div className="summary-item">
                                        <FaPiggyBank className="summary-icon purple" />
                                        <div>
                                            <span className="summary-label">Gastos</span>
                                            <span className="summary-value purple">{fmt(shift.totals?.gastos || 0)}</span>
                                        </div>
                                    </div>

                                    <div className="summary-item">
                                        <FaReceipt className="summary-icon blue" />
                                        <div>
                                            <span className="summary-label">Facturas</span>
                                            <span className="summary-value blue">{fmt(shift.totals?.facturas || 0)}</span>
                                        </div>
                                    </div>

                                    <div className="summary-item">
                                        <FaBed className="summary-icon orange" />
                                        <div>
                                            <span className="summary-label">Check-ins</span>
                                            <span className="summary-value orange">{shift.checkins?.length || 0}</span>
                                        </div>
                                    </div>
                                </div>

                                {shift.notes && (
                                    <div className="shift-notes-preview">
                                        <p>"{shift.notes.slice(0, 80)}{shift.notes.length > 80 ? '...' : ''}"</p>
                                    </div>
                                )}
                            </div>

                            <div className="shift-card-footer">
                                <div className="shift-time">
                                    <FaClock />
                                    {shift.createdAt?.toLocaleTimeString('es-CL', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </div>
                                <button
                                    className="view-details-btn"
                                    onClick={() => handleViewDetails(shift)}
                                >
                                    <FaEye /> Ver detalles
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && selectedShift && (
                <ShiftDetailModal
                    shift={selectedShift}
                    onClose={() => setShowModal(false)}
                />
            )}
        </div>
    );
};

export default ShiftHistory;
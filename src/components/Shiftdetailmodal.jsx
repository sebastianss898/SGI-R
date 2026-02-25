import React from 'react';
import {
    FaSun, FaCloudSun, FaMoon,
    FaUser, FaCalendar, FaClock,
    FaMoneyBillWave, FaPiggyBank,
    FaReceipt, FaBed, FaTimes,
    FaSignInAlt, FaSignOutAlt,
    FaFileInvoiceDollar, FaTools,
    FaStickyNote, FaDownload
} from 'react-icons/fa';
import '../styles/Shiftdetailmodal.css';

const ShiftDetailModal = ({ shift, onClose }) => {
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

    const handleDownloadPDF = async () => {
        // Aquí podrías regenerar el PDF o descargarlo si lo guardaste
        alert('Función de descarga de PDF - por implementar');
    };

    return (
        <div className="modal-overlay-detail" onClick={onClose}>
            <div className="modal-detail" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="modal-detail-header">
                    <div className="header-info">
                        <div className="shift-badge-large" style={{ color: getShiftColor(shift.shift) }}>
                            {getShiftIcon(shift.shift)}
                            <span>Turno {shift.shiftLabel}</span>
                        </div>
                        <div className="header-meta">
                            <span className="date-large">
                                <FaCalendar />
                                {new Date(shift.date).toLocaleDateString('es-CL', {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric'
                                })}
                            </span>
                            <span className="time-large">
                                <FaClock />
                                Entregado a las {shift.createdAt?.toLocaleTimeString('es-CL', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </span>
                        </div>
                    </div>
                    <button className="close-modal-btn" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>

                {/* Recepcionista */}
                <div className="receptionist-section">
                    <FaUser />
                    <div>
                        <span className="label-small">Recepcionista</span>
                        <span className="receptionist-name">{shift.receptionist}</span>
                    </div>
                </div>

                {/* Resumen Financiero */}
                <div className="financial-summary">
                    <h3>Resumen Financiero</h3>
                    <div className="summary-grid">
                        <div className="summary-box green">
                            <FaMoneyBillWave />
                            <div>
                                <span className="summary-label">Total Ingresos</span>
                                <span className="summary-amount">{fmt(shift.totals?.ingresos || 0)}</span>
                                <div className="summary-breakdown">
                                    <span>Alojamiento: {fmt(shift.totals?.alojamiento || 0)}</span>
                                    <span>Lavandería: {fmt(shift.totals?.lavanderia || 0)}</span>
                                    <span>Otros: {fmt(shift.totals?.otros || 0)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="summary-box blue">
                            <FaReceipt />
                            <div>
                                <span className="summary-label">Facturas Emitidas</span>
                                <span className="summary-amount">{fmt(shift.totals?.facturas || 0)}</span>
                                <span className="summary-count">{shift.invoices?.length || 0} facturas</span>
                            </div>
                        </div>

                        <div className="summary-box purple">
                            <FaPiggyBank />
                            <div>
                                <span className="summary-label">Gastos Caja Menor</span>
                                <span className="summary-amount">{fmt(shift.totals?.gastos || 0)}</span>
                                <span className="summary-count">Saldo restante: {fmt(shift.totals?.saldoCajaMenor || 0)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Detalles por Sección */}
                <div className="details-sections">
                    {/* Check-ins / Check-outs */}
                    {shift.checkins && shift.checkins.length > 0 && (
                        <div className="detail-section">
                            <div className="section-title">
                                <FaBed />
                                <h4>Check-ins / Check-outs ({shift.checkins.length})</h4>
                            </div>
                            <div className="items-list">
                                {shift.checkins.map((ci, index) => (
                                    <div key={index} className="detail-item">
                                        <div className="item-icon" style={{ color: ci.type === 'in' ? '#4ade80' : '#f87171' }}>
                                            {ci.type === 'in' ? <FaSignInAlt /> : <FaSignOutAlt />}
                                        </div>
                                        <div className="item-info">
                                            <span className="item-title">Hab. {ci.room} - {ci.guest}</span>
                                            <span className="item-meta">{ci.time} • {ci.type === 'in' ? 'Check-in' : 'Check-out'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Ingresos */}
                    {shift.income && shift.income.length > 0 && (
                        <div className="detail-section">
                            <div className="section-title">
                                <FaMoneyBillWave />
                                <h4>Ingresos ({shift.income.length})</h4>
                            </div>
                            <div className="items-list">
                                {shift.income.map((inc, index) => (
                                    <div key={index} className="detail-item">
                                        <div className="item-info">
                                            <span className="item-title">{inc.concept || inc.typeLabel}</span>
                                            <span className="item-meta">{inc.typeLabel} • {inc.method}</span>
                                        </div>
                                        <span className="item-amount green">+{fmt(inc.amount)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Facturas */}
                    {shift.invoices && shift.invoices.length > 0 && (
                        <div className="detail-section">
                            <div className="section-title">
                                <FaFileInvoiceDollar />
                                <h4>Facturas ({shift.invoices.length})</h4>
                            </div>
                            <div className="items-list">
                                {shift.invoices.map((inv, index) => (
                                    <div key={index} className="detail-item">
                                        <div className="item-info">
                                            <span className="item-title">{inv.number} - {inv.guest || 'Sin nombre'}</span>
                                            <span className="item-meta">{inv.method}</span>
                                        </div>
                                        <span className="item-amount blue">{fmt(inv.amount)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Gastos */}
                    {shift.expenses && shift.expenses.length > 0 && (
                        <div className="detail-section">
                            <div className="section-title">
                                <FaTools />
                                <h4>Gastos Caja Menor ({shift.expenses.length})</h4>
                            </div>
                            <div className="items-list">
                                {shift.expenses.map((exp, index) => (
                                    <div key={index} className="detail-item">
                                        <div className="item-info">
                                            <span className="item-title">{exp.concept}</span>
                                            <span className="item-meta">{exp.category}</span>
                                        </div>
                                        <span className="item-amount purple">-{fmt(exp.amount)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Notas */}
                    {shift.notes && (
                        <div className="detail-section">
                            <div className="section-title">
                                <FaStickyNote />
                                <h4>Notas del Turno</h4>
                            </div>
                            <div className="notes-content">
                                <p>{shift.notes}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="modal-detail-footer">
                    <button className="btn-download" onClick={handleDownloadPDF}>
                        <FaDownload /> Descargar PDF
                    </button>
                    <button className="btn-close" onClick={onClose}>
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ShiftDetailModal;
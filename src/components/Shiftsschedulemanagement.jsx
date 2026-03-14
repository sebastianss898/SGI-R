import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../firebase';
import { collection, doc, getDoc, setDoc, getDocs } from 'firebase/firestore';
import { FaCalendarAlt, FaSave, FaTimes, FaFilePdf, FaBell } from 'react-icons/fa';
import {
  getDaysInMonth, generateScheduleId, getDayName
} from '../utils/shiftsSchedule';
import { downloadShiftsSchedulePDF } from '../utils/shiftsSchedulePDF';
import '../styles/Shiftsschedule.css';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

const MONTHS = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
];

const ROLE_TO_DEPT = {
  receptionist: 'RECEPCIÓN',
  maintenance:  'MANTENIMIENTO',
  housekeeper:  'CAMARERAS',
  manager:      'GERENCIA',
};

const SHIFT_TYPES = {
  '6':  { label: '6-14',  bg: '#b3d9ff', text: 'Mañana (6:00-14:00)'  },
  '14': { label: '14-22', bg: '#ffcba4', text: 'Tarde (14:00-22:00)'  },
  '22': { label: '22-6',  bg: '#d4b5f7', text: 'Noche (22:00-6:00)'  },
  'V':  { label: 'V',     bg: '#b8e6b8', text: 'Vacaciones'           },
  'L':  { label: 'L',     bg: '#e8e8e8', text: 'Libre'                },
  'D':  { label: 'D',     bg: '#ffb3ba', text: 'Descanso'             },
};

const WORK_SHIFTS = ['6', '14', '22'];

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

const ShiftsScheduleManagement = ({ currentUser }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear,  setSelectedYear]  = useState(new Date().getFullYear());
  const [schedule,      setSchedule]      = useState(null);
  const [employees,     setEmployees]     = useState({});
  const [loading,       setLoading]       = useState(true);

  // Selección de celdas
  const [selectionMode,   setSelectionMode]   = useState(false);
  const [selectedDays,    setSelectedDays]    = useState([]);
  const [currentEmployee, setCurrentEmployee] = useState(null);

  // UI
  const [toast,        setToast]        = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);

  // ─── Derivados ────────────────────────────────────────────────────────────
  const isAdmin = currentUser?.role === 'admin';
  const canEdit = isAdmin || (currentUser?.role === 'manager' && !schedule?.published);
  const days    = useMemo(
    () => getDaysInMonth(selectedYear, selectedMonth),
    [selectedYear, selectedMonth]
  );

  const scheduleId = useMemo(
    () => generateScheduleId(selectedMonth, selectedYear),
    [selectedMonth, selectedYear]
  );

  const hoursWorked = useMemo(() => {
    if (!schedule?.shifts || Object.keys(employees).length === 0) return {};
    const result = {};
    Object.values(employees).flat().forEach(emp => {
      const shifts = schedule.shifts[emp.id] || {};
      result[emp.id] = Object.values(shifts)
        .filter(s => WORK_SHIFTS.includes(String(s))).length * 8;
    });
    return result;
  }, [schedule?.shifts, employees]);

  const currentEmployeeName = useMemo(() => {
    if (!currentEmployee || Object.keys(employees).length === 0) return null;
    return Object.values(employees).flat().find(e => e.id === currentEmployee)?.name ?? null;
  }, [currentEmployee, employees]);

  // ─── Toast ────────────────────────────────────────────────────────────────
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ─── Confirm ──────────────────────────────────────────────────────────────
  const showConfirm = useCallback((message, onConfirm) => {
    setConfirmModal({ message, onConfirm });
  }, []);

  // ─── Cargar empleados ─────────────────────────────────────────────────────
  const loadEmployees = useCallback(async () => {
    try {
      const snap     = await getDocs(collection(db, 'users'));
      const allUsers = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(u => u.status === 'active');

      const grouped = allUsers.reduce((acc, user) => {
        const dept = ROLE_TO_DEPT[user.role] || 'OTROS';
        if (!acc[dept]) acc[dept] = [];
        acc[dept].push(user);
        return acc;
      }, {});

      setEmployees(grouped);
    } catch (err) {
      console.error('Error cargando empleados:', err);
      showToast('Error al cargar empleados', 'error');
    }
  }, [showToast]);

  // ─── Cargar horario — recibe scheduleId como parámetro para evitar
  //     problemas de closure con el useMemo ──────────────────────────────────
  const loadSchedule = useCallback(async (sid, month, year) => {
    setLoading(true);
    setSchedule(null);
    try {
      const ref         = doc(db, 'shiftsSchedule', sid);
      const scheduleDoc = await getDoc(ref);

      if (scheduleDoc.exists()) {
        setSchedule(scheduleDoc.data());
      } else {
        setSchedule({
          month,
          year,
          scheduleId: sid,
          published:  false,
          shifts:     {},
          createdAt:  new Date(),
          createdBy:  currentUser?.id ?? '',
        });
      }
    } catch (err) {
      console.error('Error cargando horario:', err);
      showToast('Error al cargar horario', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, showToast]);

  // ─── Effects ──────────────────────────────────────────────────────────────
  useEffect(() => { loadEmployees(); }, [loadEmployees]);

  useEffect(() => {
    loadSchedule(scheduleId, selectedMonth, selectedYear);
  }, [scheduleId, selectedMonth, selectedYear, loadSchedule]);

  // ─── Selección de celdas ──────────────────────────────────────────────────
  const toggleDaySelection = (employeeId, dayIndex) => {
    if (!canEdit) return;
    if (!selectionMode || currentEmployee !== employeeId) {
      setSelectionMode(true);
      setCurrentEmployee(employeeId);
      setSelectedDays([dayIndex]);
    } else {
      setSelectedDays(prev =>
        prev.includes(dayIndex)
          ? prev.filter(d => d !== dayIndex)
          : [...prev, dayIndex]
      );
    }
  };

  const applyShiftToSelected = (shift) => {
    if (!currentEmployee || selectedDays.length === 0 || !schedule) return;
    setSchedule(prev => {
      if (!prev) return prev;
      const updatedShifts = { ...prev.shifts };
      if (!updatedShifts[currentEmployee]) updatedShifts[currentEmployee] = {};
      selectedDays.forEach(idx => {
        updatedShifts[currentEmployee][idx + 1] = shift;
      });
      return { ...prev, shifts: updatedShifts };
    });
    cancelSelection();
  };

  const cancelSelection = () => {
    setSelectionMode(false);
    setSelectedDays([]);
    setCurrentEmployee(null);
  };

  // ─── Guardar ──────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!canEdit || !schedule) return;
    try {
      await setDoc(doc(db, 'shiftsSchedule', scheduleId), {
        ...schedule,
        updatedAt: new Date(),
        updatedBy: currentUser?.id,
      });
      showToast('Horario guardado exitosamente');
    } catch (err) {
      console.error('Error guardando horario:', err);
      showToast('Error al guardar horario', 'error');
    }
  };

  // ─── Publicar ─────────────────────────────────────────────────────────────
  const handlePublish = () => {
    if (!canEdit || !schedule) return;

    const hasShifts = Object.keys(schedule.shifts ?? {}).length > 0;
    if (!hasShifts) {
      showToast('No hay turnos asignados. Agrega turnos antes de publicar.', 'error');
      return;
    }

    showConfirm(
      `¿Deseas publicar el horario de ${MONTHS[selectedMonth]} ${selectedYear}?\n\nTodos los empleados recibirán una notificación.\n\nUna vez publicado, solo administradores podrán editarlo.`,
      async () => {
        try {
          await setDoc(doc(db, 'shiftsSchedule', scheduleId), {
            ...schedule,
            published:       true,
            publishedAt:     new Date(),
            publishedBy:     currentUser?.id,
            publishedByName: currentUser?.name,
          });

          await setDoc(doc(db, 'alerts', `schedule_${Date.now()}`), {
            title:        `📅 Nuevo Horario: ${MONTHS[selectedMonth]} ${selectedYear}`,
            description:  'Se ha publicado el horario del mes. Ingresa a "Horarios" para ver tus turnos asignados.',
            type:         'reminder',
            priority:     'high',
            date:         new Date().toISOString().split('T')[0],
            time:         new Date().toTimeString().slice(0, 5),
            recurrence:   'none',
            target:       'all',
            active:       true,
            createdBy:     currentUser?.id,
            createdByName: currentUser?.name,
            createdAt:    new Date(),
            updatedAt:    new Date(),
            readBy:       [],
          });

          showToast('Horario publicado — notificación enviada a todos los empleados');
          cancelSelection();
          await loadSchedule(scheduleId, selectedMonth, selectedYear);
        } catch (err) {
          console.error('Error publicando horario:', err);
          showToast('Error al publicar horario', 'error');
        }
      }
    );
  };

  // ─── Republicar ───────────────────────────────────────────────────────────
  const handleRepublish = () => {
    if (!isAdmin || !schedule) return;

    showConfirm(
      `¿Deseas notificar los cambios del horario de ${MONTHS[selectedMonth]} ${selectedYear}?\n\nSe enviará una alerta a todos los empleados.`,
      async () => {
        try {
          await setDoc(doc(db, 'shiftsSchedule', scheduleId), {
            ...schedule,
            lastModifiedAt:     new Date(),
            lastModifiedBy:     currentUser?.id,
            lastModifiedByName: currentUser?.name,
          }, { merge: true });

          await setDoc(doc(db, 'alerts', `schedule_update_${Date.now()}`), {
            title:        `🔄 Horario Actualizado: ${MONTHS[selectedMonth]} ${selectedYear}`,
            description:  'Se han realizado cambios en el horario del mes. Revisa tus turnos en "Horarios".',
            type:         'reminder',
            priority:     'high',
            date:         new Date().toISOString().split('T')[0],
            time:         new Date().toTimeString().slice(0, 5),
            recurrence:   'none',
            target:       'all',
            active:       true,
            createdBy:     currentUser?.id,
            createdByName: currentUser?.name,
            createdAt:    new Date(),
            updatedAt:    new Date(),
            readBy:       [],
          });

          showToast('Cambios guardados — notificación enviada a todos los empleados');
          await loadSchedule(scheduleId, selectedMonth, selectedYear);
        } catch (err) {
          console.error('Error republicando horario:', err);
          showToast('Error al republicar', 'error');
        }
      }
    );
  };

  // ─── Exportar PDF ─────────────────────────────────────────────────────────
  const handleExportPDF = () => {
    if (!schedule) {
      showToast('No hay horario para exportar', 'error');
      return;
    }
    try {
      downloadShiftsSchedulePDF(schedule, employees, selectedMonth, selectedYear);
    } catch (err) {
      console.error('Error exportando PDF:', err);
      showToast('Error al exportar PDF', 'error');
    }
  };

  // ─── Helpers de celda ─────────────────────────────────────────────────────
  const getCellValue = (employeeId, day) =>
    schedule?.shifts?.[employeeId]?.[day] ?? '';

  const getCellBg = (employeeId, day) => {
    const shift = getCellValue(employeeId, day);
    return shift ? (SHIFT_TYPES[shift]?.bg ?? '') : '';
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="shifts-schedule-modern">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="schedule-header-modern">
        <div className="header-left">
          <h1><FaCalendarAlt /> Horarios — {MONTHS[selectedMonth]} {selectedYear}</h1>

          {schedule?.published && (
            <div className="status-badges">
              <span className="published-badge">
                <FaBell /> Publicado el{' '}
                {new Date(
                  schedule.publishedAt?.seconds
                    ? schedule.publishedAt.seconds * 1000
                    : schedule.publishedAt
                ).toLocaleDateString('es-CL')}
              </span>
              {isAdmin && (
                <span className="admin-edit-badge">
                  ✏️ Modo Administrador — Edición permitida
                </span>
              )}
            </div>
          )}

          {!schedule?.published && canEdit && (
            <span className="draft-badge">Borrador</span>
          )}
          {!schedule?.published && !canEdit && (
            <span className="info-message">
              ℹ️ Este horario aún no ha sido publicado
            </span>
          )}
        </div>

        <div className="header-actions-modern">
          {canEdit && (
            <>
              <button className="btn-save-modern" onClick={handleSave} disabled={!schedule}>
                <FaSave /> Guardar
              </button>
              {!schedule?.published && (
                <button className="btn-publish-modern" onClick={handlePublish} disabled={!schedule}>
                  <FaBell /> Publicar
                </button>
              )}
              {schedule?.published && isAdmin && (
                <button className="btn-republish-modern" onClick={handleRepublish}>
                  <FaBell /> Republicar cambios
                </button>
              )}
            </>
          )}
          <button className="btn-export-modern" onClick={handleExportPDF} disabled={!schedule}>
            <FaFilePdf /> Exportar PDF
          </button>
        </div>
      </div>

      {/* ── Banner de selección ────────────────────────────────────────────── */}
      {selectionMode && (
        <div className="selection-banner">
          <div className="selection-info">
            <h3>Modo selección activo</h3>
            <p>{selectedDays.length} día(s) seleccionado(s) para {currentEmployeeName}</p>
          </div>
          <button className="btn-cancel-selection" onClick={cancelSelection}>
            <FaTimes /> Cancelar
          </button>
          <div className="shift-buttons">
            <span>Aplicar turno:</span>
            {Object.entries(SHIFT_TYPES).map(([key, data]) => (
              <button
                key={key}
                className="shift-type-btn"
                style={{ background: data.bg }}
                onClick={() => applyShiftToSelected(key)}
              >
                {data.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Controles + leyenda ────────────────────────────────────────────── */}
      <div className="controls-modern">
        <div className="month-year-selector">
          <select
            value={selectedMonth}
            onChange={e => { cancelSelection(); setSelectedMonth(parseInt(e.target.value)); }}
          >
            {MONTHS.map((m, idx) => (
              <option key={m} value={idx}>{m}</option>
            ))}
          </select>
          <input
            type="number"
            value={selectedYear}
            onChange={e => { cancelSelection(); setSelectedYear(parseInt(e.target.value)); }}
          />
        </div>

        <div className="legend-modern">
          {Object.entries(SHIFT_TYPES).map(([key, data]) => (
            <div key={key} className="legend-item-modern">
              <div className="legend-color" style={{ background: data.bg }}>{data.label}</div>
              <span>{data.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabla ──────────────────────────────────────────────────────────── */}
      <div className="schedule-table-container">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            Cargando horario...
          </div>
        ) : !schedule ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            No se pudo cargar el horario.
          </div>
        ) : Object.keys(employees).length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            No hay empleados activos registrados.
          </div>
        ) : (
          <table className="schedule-table-modern">
            <thead>
              <tr>
                <th className="col-empleado">EMPLEADO</th>
                <th className="col-categoria">CATEGORÍA</th>
                {days.map(day => (
                  <th key={day.day} className={day.isWeekend ? 'weekend' : ''}>
                    <div>{getDayName(day.dayOfWeek)}</div>
                    <div className="day-number">{day.day}</div>
                  </th>
                ))}
                <th className="col-horas">HORAS</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(employees).map(([category, empList]) =>
                empList.length > 0 && (
                  <React.Fragment key={category}>
                    <tr className="category-row">
                      <td colSpan={days.length + 3}>{category}</td>
                    </tr>
                    {empList.map(emp => (
                      <tr key={emp.id}>
                        <td className="col-empleado">{emp.name}</td>
                        <td className="col-categoria">{category}</td>
                        {days.map((day, idx) => {
                          const value      = getCellValue(emp.id, day.day);
                          const isSelected = selectionMode &&
                            currentEmployee === emp.id &&
                            selectedDays.includes(idx);

                          return (
                            <td
                              key={day.day}
                              className={[
                                'shift-cell-modern',
                                canEdit    ? 'editable'  : '',
                                isSelected ? 'selected'  : '',
                              ].filter(Boolean).join(' ')}
                              style={{ background: getCellBg(emp.id, day.day) }}
                              onClick={() => toggleDaySelection(emp.id, idx)}
                            >
                              <div className="cell-content">
                                {value
                                  ? SHIFT_TYPES[value]?.label
                                  : isSelected ? '✓' : ''
                                }
                              </div>
                            </td>
                          );
                        })}
                        <td className="col-horas">{hoursWorked[emp.id] ?? 0}h</td>
                      </tr>
                    ))}
                  </React.Fragment>
                )
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Modal de confirmación ──────────────────────────────────────────── */}
      {confirmModal && (
        <div className="em-overlay">
          <div className="em-modal em-modal-sm">
            <div className="em-modal-header">
              <h2>Confirmar acción</h2>
              <button className="em-modal-close" onClick={() => setConfirmModal(null)}>
                <FaTimes />
              </button>
            </div>
            <div className="em-modal-body">
              <p style={{
                whiteSpace: 'pre-line',
                color: 'var(--color-text-primary)',
                lineHeight: 1.6,
                fontSize: 14,
              }}>
                {confirmModal.message}
              </p>
            </div>
            <div className="em-modal-footer">
              <button className="em-btn em-btn-secondary"
                onClick={() => setConfirmModal(null)}>
                Cancelar
              </button>
              <button className="em-btn em-btn-primary"
                onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      {toast && <div className={`em-toast ${toast.type}`}>{toast.msg}</div>}

    </div>
  );
};

export default ShiftsScheduleManagement;
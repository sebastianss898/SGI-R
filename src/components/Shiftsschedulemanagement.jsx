import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { collection, doc, getDoc, setDoc, getDocs } from 'firebase/firestore';
import { FaCalendarAlt, FaSave, FaTimes, FaFilePdf, FaBell } from 'react-icons/fa';
import {
  getDaysInMonth, generateScheduleId,
  getDayName, getShiftConfig, TURNOS_LABELS
} from '../utils/shiftsSchedule';
import { downloadShiftsSchedulePDF } from '../utils/shiftsSchedulePDF';
import '../styles/Shiftsschedule.css';

const ShiftsScheduleManagement = ({ currentUser }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [schedule, setSchedule] = useState(null);
  const [employees, setEmployees] = useState([]);
  
  // Selection mode states
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedDays, setSelectedDays] = useState([]);
  const [currentEmployee, setCurrentEmployee] = useState(null);

  const canEdit = currentUser.role === 'admin' || (currentUser.role === 'manager' && !schedule?.published);
  const isAdmin = currentUser.role === 'admin';
  const days = getDaysInMonth(selectedYear, selectedMonth);

  const shiftTypes = {
    '6': {
    label: '6-14',
    bg: '#3b82f6', // azul brillante balanceado
    text: 'Mañana (6:00-14:00)'
  },

  '14': {
    label: '14-22',
    bg: '#f97316', // naranja más intenso y visible en dark
    text: 'Tarde (14:00-22:00)'
  },

  '22': {
    label: '22-6',
    bg: '#8b5cf6', // violeta más limpio y moderno
    text: 'Noche (22:00-6:00)'
  },

  'V': {
    label: 'V',
    bg: '#22c55e', // verde más profesional
    text: 'Vacaciones'
  },

  'L': {
    label: 'L',
    bg: '#6b7280', // gris visible en dark mode
    text: 'Libre'
  },

  'D': {
    label: 'D',
    bg: '#ef4444', // rojo más claro y visible
    text: 'Descanso'
  }
  };

  const loadSchedule = useCallback(async () => {
    try {
      const scheduleId = generateScheduleId(selectedMonth, selectedYear);
      const scheduleDoc = await getDoc(doc(db, 'shiftsSchedule', scheduleId));

      if (scheduleDoc.exists()) {
        setSchedule(scheduleDoc.data());
      } else {
        const emptySchedule = {
          month: selectedMonth,
          year: selectedYear,
          scheduleId,
          published: false,
          shifts: {},
          createdAt: new Date(),
          createdBy: currentUser.id
        };
        setSchedule(emptySchedule);
      }
    } catch (error) {
      console.error('Error loading schedule:', error);
    }
  }, [selectedMonth, selectedYear, currentUser.id]);

  useEffect(() => {
    loadEmployees();
    loadSchedule();
  }, [selectedMonth, selectedYear, loadSchedule]);

  const loadEmployees = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const allUsers = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Agrupar por departamento
      const grouped = {
        'RECEPCIÓN': allUsers.filter(u => u.role === 'receptionist'),
        'MANTENIMIENTO': allUsers.filter(u => u.role === 'maintenance'),
        'CAMARERAS': allUsers.filter(u => u.role === 'housekeeper'),
      };

      setEmployees(grouped);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };



  const toggleDaySelection = (employeeId, dayIndex) => {
    if (!canEdit) return;

    if (!selectionMode || currentEmployee !== employeeId) {
      setSelectionMode(true);
      setCurrentEmployee(employeeId);
      setSelectedDays([dayIndex]);
    } else {
      if (selectedDays.includes(dayIndex)) {
        setSelectedDays(selectedDays.filter(d => d !== dayIndex));
      } else {
        setSelectedDays([...selectedDays, dayIndex]);
      }
    }
  };

  const applyShiftToSelected = (shift) => {
    if (currentEmployee && selectedDays.length > 0) {
      setSchedule(prev => {
        const updatedShifts = { ...prev.shifts };
        if (!updatedShifts[currentEmployee]) {
          updatedShifts[currentEmployee] = {};
        }
        
        selectedDays.forEach(dayIndex => {
          const day = dayIndex + 1;
          updatedShifts[currentEmployee][day] = shift;
        });

        return { ...prev, shifts: updatedShifts };
      });

      cancelSelection();
    }
  };

  const cancelSelection = () => {
    setSelectionMode(false);
    setSelectedDays([]);
    setCurrentEmployee(null);
  };

  const handleRepublish = async () => {
    if (!isAdmin) return;

    if (window.confirm('🔄 ¿Deseas notificar los cambios realizados?\n\nSe enviará una alerta a todos los empleados informando que el horario fue actualizado.')) {
      try {
        // Actualizar fecha de última modificación
        const scheduleId = generateScheduleId(selectedMonth, selectedYear);
        
        await setDoc(doc(db, 'shiftsSchedule', scheduleId), {
          ...schedule,
          lastModifiedAt: new Date(),
          lastModifiedBy: currentUser.id,
          lastModifiedByName: currentUser.name
        }, { merge: true });

        // Crear alerta de cambios
        await setDoc(doc(db, 'alerts', `schedule_update_${Date.now()}`), {
          title: `🔄 Horario Actualizado: ${months[selectedMonth]} ${selectedYear}`,
          description: `Se han realizado cambios en el horario del mes. Revisa tus turnos actualizados en la sección "Horarios".`,
          type: 'reminder',
          priority: 'high',
          date: new Date().toISOString().split('T')[0],
          time: new Date().toTimeString().split(' ')[0].substring(0, 5),
          recurrence: 'none',
          target: 'all',
          active: true,
          createdBy: currentUser.id,
          createdByName: currentUser.name,
          createdAt: new Date(),
          updatedAt: new Date(),
          readBy: []
        });

        alert('✅ Cambios guardados y notificación enviada\n\n📧 Los empleados han sido notificados de los cambios.');
        await loadSchedule();
      } catch (error) {
        console.error('Error republishing schedule:', error);
        alert('❌ Error al republicar: ' + error.message);
      }
    }
  };

  const handleSave = async () => {
    if (!canEdit) return;

    try {
      const scheduleId = generateScheduleId(selectedMonth, selectedYear);
      
      await setDoc(doc(db, 'shiftsSchedule', scheduleId), {
        ...schedule,
        updatedAt: new Date(),
        updatedBy: currentUser.id
      });

      alert('✅ Horario guardado exitosamente');
    } catch (error) {
      console.error('Error saving schedule:', error);
      alert('❌ Error al guardar horario');
    }
  };

  const handlePublish = async () => {
    if (!canEdit) return;

    // Validar que hay al menos algunos turnos asignados
    const hasShifts = schedule?.shifts && Object.keys(schedule.shifts).length > 0;
    
    if (!hasShifts) {
      alert('⚠️ No hay turnos asignados. Agrega turnos antes de publicar.');
      return;
    }

    if (window.confirm('📢 ¿Deseas publicar este horario?\n\nTodos los empleados recibirán una notificación y podrán ver sus turnos asignados.\n\nUna vez publicado, no podrás editarlo.')) {
      try {
        const scheduleId = generateScheduleId(selectedMonth, selectedYear);
        
        // Guardar horario como publicado
        await setDoc(doc(db, 'shiftsSchedule', scheduleId), {
          ...schedule,
          published: true,
          publishedAt: new Date(),
          publishedBy: currentUser.id,
          publishedByName: currentUser.name
        });

        // Crear alerta para todos los empleados
        await setDoc(doc(db, 'alerts', `schedule_${Date.now()}`), {
          title: `📅 Nuevo Horario: ${months[selectedMonth]} ${selectedYear}`,
          description: `Se ha publicado el horario del mes. Ingresa a la sección "Horarios" para ver tus turnos asignados.`,
          type: 'reminder',
          priority: 'high',
          date: new Date().toISOString().split('T')[0],
          time: new Date().toTimeString().split(' ')[0].substring(0, 5),
          recurrence: 'none',
          target: 'all',
          active: true,
          createdBy: currentUser.id,
          createdByName: currentUser.name,
          createdAt: new Date(),
          updatedAt: new Date(),
          readBy: []
        });

        alert('✅ ¡Horario publicado exitosamente!\n\n📧 Se ha enviado una notificación a todos los empleados.');
        
        // Recargar el horario para mostrar el estado actualizado
        await loadSchedule();
        
        // Cancelar modo selección si estaba activo
        cancelSelection();
      } catch (error) {
        console.error('Error publishing schedule:', error);
        alert('❌ Error al publicar horario: ' + error.message);
      }
    }
  };

  const handleExportPDF = () => {
    if (!schedule) {
      alert('No hay horario para exportar');
      return;
    }
    
    try {
      downloadShiftsSchedulePDF(schedule, employees, selectedMonth, selectedYear);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('❌ Error al exportar PDF');
    }
  };

  const getCellValue = (employeeId, day) => {
    return schedule?.shifts?.[employeeId]?.[day] || '';
  };

  const getCellColor = (employeeId, day) => {
    const shift = getCellValue(employeeId, day);
    return shiftTypes[shift]?.bg || '#13131d';
  };

  const getHoursWorked = (employeeId) => {
    let hours = 0;
    const empShifts = schedule?.shifts?.[employeeId] || {};
    Object.values(empShifts).forEach(shift => {
      if (shift === '6' || shift === '14' || shift === '22') {
        hours += 8;
      }
    });
    return hours;
  };

  const months = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
    'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

  const currentEmployeeName = currentEmployee && 
    Object.values(employees).flat().find(e => e.id === currentEmployee)?.name;

  return (
    <div className="shifts-schedule-modern">
      {/* Header */}
      <div className="schedule-header-modern">
        <div className="header-left">
          <h1><FaCalendarAlt /> Horarios - {months[selectedMonth]} {selectedYear}</h1>
          {schedule?.published && (
            <div className="status-badges">
              <span className="published-badge">
                <FaBell /> Publicado el {new Date(schedule.publishedAt?.seconds * 1000 || schedule.publishedAt).toLocaleDateString('es-CL')}
              </span>
              {isAdmin && (
                <span className="admin-edit-badge">
                  ✏️ Modo Administrador - Edición permitida
                </span>
              )}
            </div>
          )}
          {!schedule?.published && canEdit && (
            <span className="draft-badge">Borrador</span>
          )}
          {!schedule?.published && !canEdit && (
            <span className="info-message">
              ℹ️ Este horario aún no ha sido publicado por administración
            </span>
          )}
        </div>
        
        <div className="header-actions-modern">
          {canEdit && (
            <>
              <button className="btn-save-modern" onClick={handleSave}>
                <FaSave /> Guardar
              </button>
              {!schedule?.published && (
                <button className="btn-publish-modern" onClick={handlePublish}>
                  <FaBell /> Publicar
                </button>
              )}
              {schedule?.published && isAdmin && (
                <button className="btn-republish-modern" onClick={handleRepublish}>
                  <FaBell /> Republicar Cambios
                </button>
              )}
            </>
          )}
          <button className="btn-export-modern" onClick={handleExportPDF}>
            <FaFilePdf /> Exportar PDF
          </button>
        </div>
      </div>

      {/* Selection Mode Banner */}
      {selectionMode && (
        <div className="selection-banner">
          <div className="selection-info">
            <h3>Modo Selección Activado</h3>
            <p>{selectedDays.length} día(s) seleccionado(s) para {currentEmployeeName}</p>
          </div>
          <button className="btn-cancel-selection" onClick={cancelSelection}>
            <FaTimes /> Cancelar
          </button>
          <div className="shift-buttons">
            <span>Aplicar turno:</span>
            {Object.entries(shiftTypes).map(([key, data]) => (
              <button
                key={key}
                onClick={() => applyShiftToSelected(key)}
                className="shift-type-btn"
                style={{ background: data.bg }}
              >
                {data.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Month/Year Selector and Legend */}
      <div className="controls-modern">
        <div className="month-year-selector">
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))}>
            {months.map((m, idx) => (
              <option key={m} value={idx}>{m}</option>
            ))}
          </select>
          <input 
            type="number" 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          />
        </div>

        <div className="legend-modern">
          {Object.entries(shiftTypes).map(([key, data]) => (
            <div key={key} className="legend-item-modern">
              <div className="legend-color" style={{ background: data.bg }}>{data.label}</div>
              <span>{data.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Schedule Table */}
      <div className="schedule-table-container">
        <table className="schedule-table-modern">
          <thead>
            <tr>
              <th className="col-empleado">EMPLEADO</th>
              <th className="col-categoria">CATEGORÍA</th>
              {days.map((day, idx) => (
                <th key={day.day} className={day.isWeekend ? 'weekend' : ''}>
                  <div>{getDayName(day.dayOfWeek)}</div>
                  <div className="day-number">{day.day}</div>
                </th>
              ))}
              <th className="col-horas">HORAS</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(employees).map(([category, empList]) => (
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
                        const value = getCellValue(emp.id, day.day);
                        const isSelected = selectionMode && currentEmployee === emp.id && selectedDays.includes(idx);
                        
                        return (
                          <td
                            key={day.day}
                            className={`shift-cell-modern ${day.isWeekend ? 'weekend' : ''} ${canEdit ? 'editable' : ''} ${isSelected ? 'selected' : ''}`}
                            style={{ background: value ? getCellColor(emp.id, day.day) : (day.isWeekend ? '#f17878' : '') }}
                            onClick={() => toggleDaySelection(emp.id, idx)}
                          >
                            <div className="cell-content">
                              {value ? shiftTypes[value]?.label : (isSelected ? '✓' : '')}
                            </div>
                          </td>
                        );
                      })}
                      <td className="col-horas">{getHoursWorked(emp.id)}h</td>
                    </tr>
                  ))}
                </React.Fragment>
              )
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ShiftsScheduleManagement;
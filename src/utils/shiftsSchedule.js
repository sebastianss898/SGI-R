// src/utils/shiftsSchedule.js - Sistema de gestión de turnos

export const TURNOS = {
  MANANA: '6',
  TARDE: '14',
  NOCHE: '22',
  DESCANSO: 'D',
  VACACIONES: 'V',
  CAPACITACION: 'C',
  INCAPACIDAD: 'I',
  COMPENSATORIO: 'CH',
};

export const TURNOS_LABELS = {
  [TURNOS.MANANA]: 'Mañana (6-14)',
  [TURNOS.TARDE]: 'Tarde (14-22)',
  [TURNOS.NOCHE]: 'Noche (22-6)',
  [TURNOS.DESCANSO]: 'Descanso',
  [TURNOS.VACACIONES]: 'Vacaciones',
  [TURNOS.CAPACITACION]: 'Capacitación',
  [TURNOS.INCAPACIDAD]: 'Incapacidad',
  [TURNOS.COMPENSATORIO]: 'Compensatorio',
};

export const TURNOS_COLORS = {
  [TURNOS.MANANA]: '#b3d9ff',      // Azul pastel suave
  [TURNOS.TARDE]: '#ffcba4',       // Naranja/durazno pastel
  [TURNOS.NOCHE]: '#d4b5f7',       // Púrpura pastel
  [TURNOS.DESCANSO]: '#e8e8e8',    // Gris muy claro
  [TURNOS.VACACIONES]: '#b8e6b8',  // Verde pastel
  [TURNOS.CAPACITACION]: '#fffacd', // Amarillo pastel muy suave
  [TURNOS.INCAPACIDAD]: '#ffb3ba', // Rosa pastel suave
  [TURNOS.COMPENSATORIO]: '#f0e5d8', // Beige pastel
};

export const DEPARTAMENTOS = {
  RECEPCION: 'recepcion',
  MANTENIMIENTO: 'mantenimiento',
  CAMARERAS: 'camareras',
  OTROS: 'otros'
};

export const DEPARTAMENTOS_LABELS = {
  [DEPARTAMENTOS.RECEPCION]: 'RECEPCIÓN',
  [DEPARTAMENTOS.MANTENIMIENTO]: 'MANTENIMIENTO',
  [DEPARTAMENTOS.CAMARERAS]: 'CAMARERAS',
  [DEPARTAMENTOS.OTROS]: 'OTROS',
};

// Generar array de días del mes
export const getDaysInMonth = (year, month) => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay(); // 0 = Domingo, 6 = Sábado
    
    days.push({
      day,
      date: date.toISOString().split('T')[0],
      dayOfWeek,
      isDomingo: dayOfWeek === 0,
      isSabado: dayOfWeek === 6,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6
    });
  }
  
  return days;
};

// Calcular horas trabajadas en el mes
export const calculateHoursWorked = (shifts) => {
  const hoursPerShift = {
    [TURNOS.MANANA]: 8,
    [TURNOS.TARDE]: 8,
    [TURNOS.NOCHE]: 8,
    [TURNOS.DESCANSO]: 0,
    [TURNOS.VACACIONES]: 0,
    [TURNOS.CAPACITACION]: 8,
    [TURNOS.INCAPACIDAD]: 0,
    [TURNOS.COMPENSATORIO]: 8,
  };
  
  let totalHours = 0;
  let daysWorked = 0;
  let daysOff = 0;
  
  Object.values(shifts).forEach(shift => {
    const hours = hoursPerShift[shift] || 0;
    totalHours += hours;
    
    if (hours > 0) daysWorked++;
    if (shift === TURNOS.DESCANSO) daysOff++;
  });
  
  return { totalHours, daysWorked, daysOff };
};

// Validar que el horario cumpla normas laborales
export const validateSchedule = (shifts, month, year) => {
  const errors = [];
  const warnings = [];
  
  const days = getDaysInMonth(year, month);
  const stats = calculateHoursWorked(shifts);
  
  // Máximo de horas mensuales (aprox 240 horas = 30 días x 8 horas)
  if (stats.totalHoras > 240) {
    warnings.push(`Total de horas (${stats.totalHoras}) excede el máximo recomendado de 240 horas`);
  }
  
  // Mínimo de días de descanso (aprox 4 por mes)
  if (stats.daysOff < 4) {
    warnings.push(`Solo tiene ${stats.daysOff} días de descanso. Mínimo recomendado: 4`);
  }
  
  // Verificar secuencias de trabajo sin descanso
  let consecutiveWorkDays = 0;
  days.forEach(day => {
    const shift = shifts[day.day];
    if (shift && shift !== TURNOS.DESCANSO && shift !== TURNOS.VACACIONES) {
      consecutiveWorkDays++;
      if (consecutiveWorkDays > 6) {
        errors.push(`Más de 6 días consecutivos de trabajo (día ${day.day})`);
      }
    } else {
      consecutiveWorkDays = 0;
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
};

// Generar ID único para el horario
export const generateScheduleId = (month, year) => {
  return `schedule_${year}_${String(month + 1).padStart(2, '0')}`;
};

// Formatear mes para mostrar
export const formatMonthYear = (month, year) => {
  const months = [
    'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
    'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
  ];
  return `${months[month]} ${year}`;
};

// Obtener nombre corto del día de la semana
export const getDayName = (dayOfWeek) => {
  const names = ['DO', 'LU', 'MA', 'MI', 'JU', 'VI', 'SÁ'];
  return names[dayOfWeek];
};
// src/utils/shiftsSchedule.js - Sistema de gestión de turnos
// Configuración centralizada de turnos con todas sus propiedades

// Paleta de colores personalizada - Diseño coherente y profesional
const COLOR_PALETTE = {
  background: '#121826',      // Deep Navy - Fondo Principal
  primary: {
    morning: '#7DA0CA',       // Azul Aire (6-14)
    afternoon: '#D9A18B',     // Arcilla Suave (14-22)
    night: '#9B99BD',         // Lavanda Gris (22-6)
  },
  activities: {
    vacation: '#8EAC99',      // Verde Salvia (V)
    rest: '#4A5568',          // Gris Ceniza (L)
    absence: '#C08B8B',       // Rosa Viejo (D)
  },
  text: {
    primary: '#FFFFFF',       // Blanco para mejor contraste
    secondary: '#121826',     // Oscuro para elementos claros si es necesario
  },
};

const SHIFT_CONFIG = {
  '6': {
    label: 'Mañana (6-14)',
    shortLabel: '6-14',
    fullText: 'Mañana (6:00-14:00)',
    hours: 8,
    bg: COLOR_PALETTE.primary.morning,
    color: COLOR_PALETTE.text.primary,
    workingShift: true,
  },
  '14': {
    label: 'Tarde (14-22)',
    shortLabel: '14-22',
    fullText: 'Tarde (14:00-22:00)',
    hours: 8,
    bg: COLOR_PALETTE.primary.afternoon,
    color: COLOR_PALETTE.text.primary,
    workingShift: true,
  },
  '22': {
    label: 'Noche (22-6)',
    shortLabel: '22-6',
    fullText: 'Noche (22:00-6:00)',
    hours: 8,
    bg: COLOR_PALETTE.primary.night,
    color: COLOR_PALETTE.text.primary,
    workingShift: true,
  },
  'D': {
    label: 'Descanso',
    shortLabel: 'D',
    fullText: 'Descanso',
    hours: 0,
    bg: COLOR_PALETTE.activities.absence,
    color: COLOR_PALETTE.text.primary,
    workingShift: false,
  },
  'V': {
    label: 'Vacaciones',
    shortLabel: 'V',
    fullText: 'Vacaciones',
    hours: 0,
    bg: COLOR_PALETTE.activities.vacation,
    color: COLOR_PALETTE.text.primary,
    workingShift: false,
  },
  'L': {
    label: 'Libre',
    shortLabel: 'L',
    fullText: 'Libre',
    hours: 0,
    bg: COLOR_PALETTE.activities.rest,
    color: COLOR_PALETTE.text.primary,
    workingShift: false,
  },
  'C': {
    label: 'Capacitación',
    shortLabel: 'C',
    fullText: 'Capacitación',
    hours: 8,
    bg: COLOR_PALETTE.primary.morning,
    color: COLOR_PALETTE.text.primary,
    workingShift: true,
  },
  'I': {
    label: 'Incapacidad',
    shortLabel: 'I',
    fullText: 'Incapacidad',
    hours: 0,
    bg: COLOR_PALETTE.activities.absence,
    color: COLOR_PALETTE.text.primary,
    workingShift: false,
  },
  'CH': {
    label: 'Compensatorio',
    shortLabel: 'CH',
    fullText: 'Compensatorio',
    hours: 8,
    bg: COLOR_PALETTE.activities.vacation,
    color: COLOR_PALETTE.text.primary,
    workingShift: true,
  },
};

// Generar constantes dinámicamente desde la configuración
export const TURNOS = Object.keys(SHIFT_CONFIG).reduce((acc, key) => {
  const name = key.replace(/-/g, '_').toUpperCase();
  acc[name] = key;
  return acc;
}, {});

export const TURNOS_LABELS = Object.keys(SHIFT_CONFIG).reduce((acc, key) => {
  acc[key] = SHIFT_CONFIG[key].label;
  return acc;
}, {});

export const TURNOS_COLORS = Object.keys(SHIFT_CONFIG).reduce((acc, key) => {
  acc[key] = SHIFT_CONFIG[key].bg;
  return acc;
}, {});

// Función auxiliar para obtener configuración completa de un turno
export const getShiftConfig = (shiftCode) => SHIFT_CONFIG[shiftCode] || null;

// Función auxiliar para obtener horas de un turno
export const getShiftHours = (shiftCode) => SHIFT_CONFIG[shiftCode]?.hours || 0;

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
  let totalHours = 0;
  let daysWorked = 0;
  let daysOff = 0;
  
  Object.values(shifts).forEach(shift => {
    const config = getShiftConfig(shift);
    if (!config) return;
    
    const hours = config.hours;
    totalHours += hours;
    
    if (config.workingShift) daysWorked++;
    if (shift === 'D') daysOff++;
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
  if (stats.totalHours > 240) {
    warnings.push(`Total de horas (${stats.totalHours}) excede el máximo recomendado de 240 horas`);
  }
  
  // Mínimo de días de descanso (aprox 4 por mes)
  if (stats.daysOff < 4) {
    warnings.push(`Solo tiene ${stats.daysOff} días de descanso. Mínimo recomendado: 4`);
  }
  
  // Verificar secuencias de trabajo sin descanso
  let consecutiveWorkDays = 0;
  days.forEach(day => {
    const shift = shifts[day.day];
    const config = getShiftConfig(shift);
    
    if (config?.workingShift) {
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

// Funciones auxiliares para análisis de turnos
export const countShiftType = (shifts, shiftCode) => {
  return Object.values(shifts).filter(shift => shift === shiftCode).length;
};

// Obtener resumen estadístico del horario
export const getScheduleSummary = (shifts) => {
  const stats = calculateHoursWorked(shifts);
  const summary = {
    ...stats,
    shiftCounts: {}
  };
  
  Object.keys(SHIFT_CONFIG).forEach(shiftCode => {
    summary.shiftCounts[shiftCode] = countShiftType(shifts, shiftCode);
  });
  
  return summary;
};

// Validar si un turno es válido
export const isValidShift = (shiftCode) => {
  return shiftCode in SHIFT_CONFIG;
};

// Obtener todos los códigos de turno disponibles
export const getAvailableShifts = () => {
  return Object.keys(SHIFT_CONFIG);
};
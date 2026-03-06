// src/utils/reports.js - Sistema de informes y reportes

export const REPORT_TYPES = {
  CHLORINE: 'chlorine',
  CLEANING: 'cleaning',
  SAMPLES: 'samples',
  TEMPERATURE: 'temperature',
  RECEPTION: 'reception',
  MAINTENANCE: 'maintenance',
  SHIFTS: 'shifts',
  FINANCES: 'finances',
  OCCUPANCY: 'occupancy',
  INVENTARIO: 'inventario',
};

export const REPORT_CATEGORIES = {
  OPERATIONS: 'operations',
  QUALITY: 'quality',
  ADMINISTRATION: 'administration',
  MAINTENANCE: 'maintenance',
};

export const REPORT_LABELS = {
  [REPORT_TYPES.CHLORINE]: 'Control de Cloro',
  [REPORT_TYPES.CLEANING]: 'Limpieza y Gobernanza',
  [REPORT_TYPES.SAMPLES]: 'Toma de Muestras',
  [REPORT_TYPES.RECEPTION]: 'Recepción',
  [REPORT_TYPES.MAINTENANCE]: 'Mantenimiento',
  [REPORT_TYPES.SHIFTS]: 'Turnos y Entregas',
  [REPORT_TYPES.FINANCES]: 'Finanzas y Caja',
  [REPORT_TYPES.OCCUPANCY]: 'Ocupación Hotelera',
  [REPORT_TYPES.TEMPERATURE]: 'Control de Temperatura',
  [REPORT_TYPES.INVENTARIO]: 'Inventario de Productos Químicos',
};

export const REPORT_DESCRIPTIONS = {
  [REPORT_TYPES.CHLORINE]: 'Registro de mediciones de cloro en piscina y jacuzzi',
  [REPORT_TYPES.CLEANING]: 'Control de limpieza de habitaciones y áreas comunes',
  [REPORT_TYPES.SAMPLES]: 'Registro de toma de muestras de agua y calidad',
  [REPORT_TYPES.RECEPTION]: 'Check-ins, check-outs y gestión de recepción',
  [REPORT_TYPES.MAINTENANCE]: 'Órdenes de trabajo y mantenimiento preventivo',
  [REPORT_TYPES.SHIFTS]: 'Entregas de turno y handover entre personal',
  [REPORT_TYPES.FINANCES]: 'Ingresos, gastos y cuadre de caja',
  [REPORT_TYPES.OCCUPANCY]: 'Tasa de ocupación y estadísticas de habitaciones',
  [REPORT_TYPES.TEMPERATURE]: 'Registro de temperaturas en áreas críticas',
  [REPORT_TYPES.INVENTARIO]: 'Control de stock y uso de productos químicos',
};

export const REPORT_ICONS = {
  [REPORT_TYPES.CHLORINE]: '💧',
  [REPORT_TYPES.CLEANING]: '🧹',
  [REPORT_TYPES.SAMPLES]: '🔬',
  [REPORT_TYPES.RECEPTION]: '🏨',
  [REPORT_TYPES.MAINTENANCE]: '🔧',
  [REPORT_TYPES.SHIFTS]: '🔄',
  [REPORT_TYPES.FINANCES]: '💰',
  [REPORT_TYPES.OCCUPANCY]: '📊',
  [REPORT_TYPES.TEMPERATURE]: '🌡️',
  [REPORT_TYPES.INVENTARIO]: '💧',
  [REPORT_TYPES.INVENTARIO]: '📦',
};

export const REPORT_COLORS = {
  [REPORT_TYPES.CHLORINE]: '#06b6d4',
  [REPORT_TYPES.CLEANING]: '#10b981',
  [REPORT_TYPES.SAMPLES]: '#8b5cf6',
  [REPORT_TYPES.RECEPTION]: '#3b82f6',
  [REPORT_TYPES.MAINTENANCE]: '#f59e0b',
  [REPORT_TYPES.SHIFTS]: '#6366f1',
  [REPORT_TYPES.FINANCES]: '#10b981',
  [REPORT_TYPES.OCCUPANCY]: '#ec4899',
  [REPORT_TYPES.TEMPERATURE]: '#ef4444',
  [REPORT_TYPES.INVENTARIO]: '#14b8a6',
};

export const REPORT_CATEGORY_MAP = {
  [REPORT_TYPES.CHLORINE]: REPORT_CATEGORIES.QUALITY,
  [REPORT_TYPES.CLEANING]: REPORT_CATEGORIES.OPERATIONS,
  [REPORT_TYPES.SAMPLES]: REPORT_CATEGORIES.QUALITY,
  [REPORT_TYPES.RECEPTION]: REPORT_CATEGORIES.OPERATIONS,
  [REPORT_TYPES.MAINTENANCE]: REPORT_CATEGORIES.MAINTENANCE,
  [REPORT_TYPES.SHIFTS]: REPORT_CATEGORIES.OPERATIONS,
  [REPORT_TYPES.FINANCES]: REPORT_CATEGORIES.ADMINISTRATION,
  [REPORT_TYPES.OCCUPANCY]: REPORT_CATEGORIES.ADMINISTRATION,
  [REPORT_TYPES.TEMPERATURE]: REPORT_CATEGORIES.QUALITY,
  [REPORT_TYPES.INVENTARIO]: REPORT_CATEGORIES.MAINTENANCE,
};

export const REPORT_FREQUENCY = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  CUSTOM: 'custom',
};

export const REPORT_FREQUENCY_LABELS = {
  [REPORT_FREQUENCY.DAILY]: 'Diario',
  [REPORT_FREQUENCY.WEEKLY]: 'Semanal',
  [REPORT_FREQUENCY.MONTHLY]: 'Mensual',
  [REPORT_FREQUENCY.CUSTOM]: 'Rango Personalizado',
};

// Plantillas de datos para cada tipo de reporte
export const REPORT_TEMPLATES = {
  [REPORT_TYPES.CHLORINE]: {
    fields: [
      { name: 'date', label: 'Fecha', type: 'date' },
      { name: 'time', label: 'Hora', type: 'time' },
      { name: 'location', label: 'Ubicación', type: 'select', options: ['Piscina', 'Jacuzzi', 'Spa'] },
      { name: 'chlorineLevel', label: 'Nivel de Cloro (ppm)', type: 'number' },
      { name: 'phLevel', label: 'Nivel de pH', type: 'number' },
      { name: 'temperature', label: 'Temperatura (°C)', type: 'number' },
      { name: 'responsible', label: 'Responsable', type: 'text' },
      { name: 'observations', label: 'Observaciones', type: 'textarea' },
    ],
    standards: {
      chlorine: { min: 1.0, max: 3.0, unit: 'ppm' },
      ph: { min: 7.2, max: 7.6 },
      temperature: { min: 26, max: 30, unit: '°C' },
    }
  },
  
  [REPORT_TYPES.CLEANING]: {
    fields: [
      { name: 'date', label: 'Fecha', type: 'date' },
      { name: 'room', label: 'Habitación/Área', type: 'text' },
      { name: 'type', label: 'Tipo', type: 'select', options: ['Limpieza diaria', 'Limpieza profunda', 'Check-out'] },
      { name: 'cleaner', label: 'Encargado', type: 'text' },
      { name: 'startTime', label: 'Hora inicio', type: 'time' },
      { name: 'endTime', label: 'Hora fin', type: 'time' },
      { name: 'status', label: 'Estado', type: 'select', options: ['Completado', 'Pendiente', 'En proceso'] },
      { name: 'checklist', label: 'Checklist', type: 'checklist', items: [
        'Cambio de sábanas',
        'Limpieza de baño',
        'Aspirado de alfombra',
        'Reposición de amenidades',
        'Limpieza de ventanas',
        'Control de minibar'
      ]},
      { name: 'observations', label: 'Observaciones', type: 'textarea' },
    ]
  },
  
  [REPORT_TYPES.SAMPLES]: {
    fields: [
      { name: 'date', label: 'Fecha', type: 'date' },
      { name: 'sampleId', label: 'ID Muestra', type: 'text' },
      { name: 'location', label: 'Punto de Muestreo', type: 'text' },
      { name: 'type', label: 'Tipo de Muestra', type: 'select', options: ['Agua potable', 'Agua piscina', 'Agua jacuzzi', 'Superficies', 'Aire'] },
      { name: 'responsible', label: 'Responsable', type: 'text' },
      { name: 'parameters', label: 'Parámetros Analizados', type: 'textarea' },
      { name: 'results', label: 'Resultados', type: 'textarea' },
      { name: 'compliant', label: 'Cumple Normativa', type: 'select', options: ['Sí', 'No', 'Pendiente'] },
      { name: 'lab', label: 'Laboratorio', type: 'text' },
    ]
  },
  
  [REPORT_TYPES.RECEPTION]: {
    fields: [
      { name: 'date', label: 'Fecha', type: 'date' },
      { name: 'shift', label: 'Turno', type: 'select', options: ['Mañana', 'Tarde', 'Noche'] },
      { name: 'receptionist', label: 'Recepcionista', type: 'text' },
      { name: 'checkIns', label: 'Check-ins', type: 'number' },
      { name: 'checkOuts', label: 'Check-outs', type: 'number' },
      { name: 'reservations', label: 'Reservas nuevas', type: 'number' },
      { name: 'cancellations', label: 'Cancelaciones', type: 'number' },
      { name: 'complaints', label: 'Quejas/Reclamos', type: 'number' },
      { name: 'incidents', label: 'Incidentes', type: 'textarea' },
    ]
  },
  
  [REPORT_TYPES.MAINTENANCE]: {
    fields: [
      { name: 'date', label: 'Fecha', type: 'date' },
      { name: 'workOrderId', label: 'Orden de Trabajo', type: 'text' },
      { name: 'type', label: 'Tipo', type: 'select', options: ['Correctivo', 'Preventivo', 'Emergencia'] },
      { name: 'location', label: 'Ubicación', type: 'text' },
      { name: 'description', label: 'Descripción', type: 'textarea' },
      { name: 'technician', label: 'Técnico', type: 'text' },
      { name: 'priority', label: 'Prioridad', type: 'select', options: ['Baja', 'Media', 'Alta', 'Urgente'] },
      { name: 'status', label: 'Estado', type: 'select', options: ['Pendiente', 'En proceso', 'Completado'] },
      { name: 'materials', label: 'Materiales Utilizados', type: 'textarea' },
      { name: 'cost', label: 'Costo', type: 'number' },
    ]
  },
  [REPORT_TYPES.TEMPERATURE]: {
    fields: [
      { name: 'date', label: 'Fecha', type: 'date' },
      { name: 'workOrderId', label: 'Orden de Trabajo', type: 'text' },
      { name: 'type', label: 'Tipo', type: 'select', options: ['Correctivo', 'Preventivo', 'Emergencia'] },
      { name: 'location', label: 'Ubicación', type: 'text' },
      { name: 'description', label: 'Descripción', type: 'textarea' },
      { name: 'technician', label: 'Técnico', type: 'text' },
      { name: 'priority', label: 'Prioridad', type: 'select', options: ['Baja', 'Media', 'Alta', 'Urgente'] },
      { name: 'status', label: 'Estado', type: 'select', options: ['Pendiente', 'En proceso', 'Completado'] },
      { name: 'materials', label: 'Materiales Utilizados', type: 'textarea' },
      { name: 'cost', label: 'Costo', type: 'number' },
    ]
  }
};

// Generar nombre de archivo para reporte
export const generateReportFilename = (reportType, dateRange) => {
  const type = REPORT_LABELS[reportType].replace(/\s+/g, '_');
  const date = new Date().toISOString().split('T')[0];
  const startDate = dateRange?.start ? dateRange.start.replace(/\//g, '-') : date;
  const endDate = dateRange?.end ? dateRange.end.replace(/\//g, '-') : '';
  
  if (endDate && endDate !== startDate) {
    return `${type}_${startDate}_al_${endDate}.pdf`;
  }
  return `${type}_${startDate}.pdf`;
};

// Validar rango de fechas
export const validateDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();
  
  if (start > end) {
    return { valid: false, error: 'La fecha inicial no puede ser posterior a la fecha final' };
  }
  
  if (start > now) {
    return { valid: false, error: 'La fecha inicial no puede ser futura' };
  }
  
  const diffDays = (end - start) / (1000 * 60 * 60 * 24);
  if (diffDays > 365) {
    return { valid: false, error: 'El rango no puede ser mayor a 1 año' };
  }
  
  return { valid: true };
};

// Formatear fecha para mostrar
export const formatDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const formatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
  
  if (startDate === endDate) {
    return start.toLocaleDateString('es-CL', formatOptions);
  }
  
  return `${start.toLocaleDateString('es-CL', formatOptions)} - ${end.toLocaleDateString('es-CL', formatOptions)}`;
};
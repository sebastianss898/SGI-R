// src/utils/metrics.js - Sistema de métricas para recepcionistas

export const METRIC_CATEGORIES = {
  PRODUCTIVITY: 'productivity',
  QUALITY: 'quality',
  CUSTOMER_SERVICE: 'customer_service',
  EFFICIENCY: 'efficiency',
};

export const METRICS = {
  // Productividad
  SHIFTS_COMPLETED: {
    id: 'shifts_completed',
    category: METRIC_CATEGORIES.PRODUCTIVITY,
    label: 'Turnos Completados',
    description: 'Total de turnos entregados',
    unit: 'turnos',
    weight: 10,
  },
  CHECKINS_PROCESSED: {
    id: 'checkins_processed',
    category: METRIC_CATEGORIES.PRODUCTIVITY,
    label: 'Check-ins Procesados',
    description: 'Total de check-ins realizados',
    unit: 'check-ins',
    weight: 15,
  },
  CHECKOUTS_PROCESSED: {
    id: 'checkouts_processed',
    category: METRIC_CATEGORIES.PRODUCTIVITY,
    label: 'Check-outs Procesados',
    description: 'Total de check-outs realizados',
    unit: 'check-outs',
    weight: 15,
  },
  INVOICES_GENERATED: {
    id: 'invoices_generated',
    category: METRIC_CATEGORIES.PRODUCTIVITY,
    label: 'Facturas Generadas',
    description: 'Total de facturas emitidas',
    unit: 'facturas',
    weight: 10,
  },

  // Calidad
  COMPLETE_CHECKINS: {
    id: 'complete_checkins',
    category: METRIC_CATEGORIES.QUALITY,
    label: 'Check-ins Completos',
    description: 'Check-ins con todas las validaciones completadas',
    unit: '%',
    weight: 20,
  },
  COMPLETE_CHECKOUTS: {
    id: 'complete_checkouts',
    category: METRIC_CATEGORIES.QUALITY,
    label: 'Check-outs Completos',
    description: 'Check-outs con todas las validaciones completadas',
    unit: '%',
    weight: 15,
  },
  NOTES_QUALITY: {
    id: 'notes_quality',
    category: METRIC_CATEGORIES.QUALITY,
    label: 'Calidad de Notas',
    description: 'Notas de turno con información completa',
    unit: '%',
    weight: 10,
  },

  // Servicio al Cliente
  RESPONSE_TIME: {
    id: 'response_time',
    category: METRIC_CATEGORIES.CUSTOMER_SERVICE,
    label: 'Tiempo de Respuesta',
    description: 'Tiempo promedio de atención',
    unit: 'min',
    weight: 15,
  },
  CUSTOMER_SATISFACTION: {
    id: 'customer_satisfaction',
    category: METRIC_CATEGORIES.CUSTOMER_SERVICE,
    label: 'Satisfacción del Cliente',
    description: 'Calificación promedio de clientes',
    unit: '/5',
    weight: 20,
  },

  // Eficiencia
  CASH_ACCURACY: {
    id: 'cash_accuracy',
    category: METRIC_CATEGORIES.EFFICIENCY,
    label: 'Precisión en Caja',
    description: 'Diferencias en cuadre de caja',
    unit: '%',
    weight: 20,
  },
  SHIFT_HANDOVER_TIME: {
    id: 'shift_handover_time',
    category: METRIC_CATEGORIES.EFFICIENCY,
    label: 'Tiempo de Entrega',
    description: 'Tiempo promedio para entregar turno',
    unit: 'min',
    weight: 10,
  },
};

// Calcular métricas desde los datos de turnos
export const calculateMetrics = (shifts, userId = null) => {
  // Filtrar por usuario si se especifica
  const userShifts = userId 
    ? shifts.filter(s => s.userId === userId || s.receptionist === userId)
    : shifts;

  if (userShifts.length === 0) {
    return {
      totalScore: 0,
      metrics: {},
      byCategory: {}
    };
  }

  const metrics = {};

  // Productividad
  metrics.shifts_completed = userShifts.length;
  metrics.checkins_processed = userShifts.reduce((sum, s) => 
    sum + (s.checkins?.filter(c => c.type === 'in').length || 0), 0
  );
  metrics.checkouts_processed = userShifts.reduce((sum, s) => 
    sum + (s.checkins?.filter(c => c.type === 'out').length || 0), 0
  );
  metrics.invoices_generated = userShifts.reduce((sum, s) => 
    sum + (s.invoices?.length || 0), 0
  );

  // Calidad - % de check-ins/outs con todas las validaciones completas
  const allCheckins = userShifts.flatMap(s => s.checkins || []).filter(c => c.type === 'in');
  const completeCheckins = allCheckins.filter(c => {
    const checks = c.checks || {};
    return checks.fotos && checks.registro && checks.llave && checks.pago;
  });
  metrics.complete_checkins = allCheckins.length > 0 
    ? Math.round((completeCheckins.length / allCheckins.length) * 100)
    : 0;

  const allCheckouts = userShifts.flatMap(s => s.checkins || []).filter(c => c.type === 'out');
  const completeCheckouts = allCheckouts.filter(c => {
    const checks = c.checks || {};
    return checks.llave && checks.habitacion && checks.cargos && checks.factura;
  });
  metrics.complete_checkouts = allCheckouts.length > 0
    ? Math.round((completeCheckouts.length / allCheckouts.length) * 100)
    : 0;

  // Calidad de notas (si tienen notas completas)
  const shiftsWithNotes = userShifts.filter(s => s.notes && s.notes.length > 50);
  metrics.notes_quality = userShifts.length > 0
    ? Math.round((shiftsWithNotes.length / userShifts.length) * 100)
    : 0;

  // Servicio (valores simulados - en producción vendrían de encuestas)
  metrics.response_time = 12; // minutos promedio
  metrics.customer_satisfaction = 4.5; // de 5

  // Eficiencia
  metrics.cash_accuracy = 98; // % de precisión en caja
  metrics.shift_handover_time = 15; // minutos promedio

  // Calcular puntajes por categoría
  const byCategory = {};
  Object.values(METRIC_CATEGORIES).forEach(category => {
    const categoryMetrics = Object.values(METRICS).filter(m => m.category === category);
    const categoryScore = categoryMetrics.reduce((sum, metric) => {
      const value = metrics[metric.id] || 0;
      const normalized = normalizeMetricValue(metric, value);
      return sum + (normalized * metric.weight);
    }, 0);
    const totalWeight = categoryMetrics.reduce((sum, m) => sum + m.weight, 0);
    byCategory[category] = totalWeight > 0 ? Math.round(categoryScore / totalWeight) : 0;
  });

  // Calcular puntaje total
  const totalWeight = Object.values(METRICS).reduce((sum, m) => sum + m.weight, 0);
  const totalScore = Object.values(METRICS).reduce((sum, metric) => {
    const value = metrics[metric.id] || 0;
    const normalized = normalizeMetricValue(metric, value);
    return sum + (normalized * metric.weight);
  }, 0);

  return {
    totalScore: Math.round(totalScore / totalWeight),
    metrics,
    byCategory
  };
};

// Normalizar valores de métricas a escala 0-100
const normalizeMetricValue = (metric, value) => {
  switch (metric.id) {
    case 'shifts_completed':
      return Math.min(value * 5, 100); // 20 turnos = 100%
    case 'checkins_processed':
    case 'checkouts_processed':
      return Math.min(value * 2, 100); // 50 = 100%
    case 'invoices_generated':
      return Math.min(value * 4, 100); // 25 facturas = 100%
    case 'complete_checkins':
    case 'complete_checkouts':
    case 'notes_quality':
    case 'cash_accuracy':
      return value; // Ya están en %
    case 'response_time':
      return Math.max(100 - value * 5, 0); // Menos tiempo = mejor
    case 'customer_satisfaction':
      return (value / 5) * 100; // de 5 a 100
    case 'shift_handover_time':
      return Math.max(100 - value * 3, 0); // Menos tiempo = mejor
    default:
      return value;
  }
};

// Obtener nivel de rendimiento
export const getPerformanceLevel = (score) => {
  if (score >= 90) return { label: 'Excelente', color: '#4ade80', emoji: '🌟' };
  if (score >= 75) return { label: 'Muy Bueno', color: '#60a5fa', emoji: '⭐' };
  if (score >= 60) return { label: 'Bueno', color: '#fbbf24', emoji: '👍' };
  if (score >= 40) return { label: 'Regular', color: '#fb923c', emoji: '📊' };
  return { label: 'Necesita Mejorar', color: '#f87171', emoji: '📈' };
};

// Labels de categorías
export const CATEGORY_LABELS = {
  [METRIC_CATEGORIES.PRODUCTIVITY]: 'Productividad',
  [METRIC_CATEGORIES.QUALITY]: 'Calidad',
  [METRIC_CATEGORIES.CUSTOMER_SERVICE]: 'Servicio al Cliente',
  [METRIC_CATEGORIES.EFFICIENCY]: 'Eficiencia',
};

// Colores de categorías
export const CATEGORY_COLORS = {
  [METRIC_CATEGORIES.PRODUCTIVITY]: '#60a5fa',
  [METRIC_CATEGORIES.QUALITY]: '#4ade80',
  [METRIC_CATEGORIES.CUSTOMER_SERVICE]: '#c084fc',
  [METRIC_CATEGORIES.EFFICIENCY]: '#fbbf24',
};
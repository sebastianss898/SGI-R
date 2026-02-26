// src/utils/alerts.js - Sistema de alertas y notificaciones

export const ALERT_TYPES = {
  MAINTENANCE: 'maintenance',
  CLEANING: 'cleaning',
  RESERVATION: 'reservation',
  EVENT: 'event',
  REMINDER: 'reminder',
  TASK: 'task',
  URGENT: 'urgent',
};

export const ALERT_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
};

export const RECURRENCE_TYPE = {
  NONE: 'none',
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  CUSTOM: 'custom',
};

export const ALERT_TARGET = {
  ALL: 'all',                          // Todos los roles
  ADMIN: 'admin',                      // Solo admin
  MANAGER: 'manager',                  // Admin + Manager
  RECEPTION: 'reception',              // Recepción
  HOUSEKEEPING: 'housekeeping',        // Gobernanza/Limpieza
  MAINTENANCE: 'maintenance',          // Mantenimiento
  CUSTOM: 'custom',                    // Roles específicos
};

// Labels para UI
export const ALERT_TYPE_LABELS = {
  [ALERT_TYPES.MAINTENANCE]: 'Mantenimiento',
  [ALERT_TYPES.CLEANING]: 'Limpieza',
  [ALERT_TYPES.RESERVATION]: 'Reservación',
  [ALERT_TYPES.EVENT]: 'Evento',
  [ALERT_TYPES.REMINDER]: 'Recordatorio',
  [ALERT_TYPES.TASK]: 'Tarea',
  [ALERT_TYPES.URGENT]: 'Urgente',
};

export const ALERT_PRIORITY_LABELS = {
  [ALERT_PRIORITY.LOW]: 'Baja',
  [ALERT_PRIORITY.MEDIUM]: 'Media',
  [ALERT_PRIORITY.HIGH]: 'Alta',
  [ALERT_PRIORITY.URGENT]: 'Urgente',
};

export const RECURRENCE_LABELS = {
  [RECURRENCE_TYPE.NONE]: 'No se repite',
  [RECURRENCE_TYPE.DAILY]: 'Diario',
  [RECURRENCE_TYPE.WEEKLY]: 'Semanal',
  [RECURRENCE_TYPE.MONTHLY]: 'Mensual',
  [RECURRENCE_TYPE.CUSTOM]: 'Personalizado',
};

export const ALERT_TARGET_LABELS = {
  [ALERT_TARGET.ALL]: 'Todos',
  [ALERT_TARGET.ADMIN]: 'Solo Administradores',
  [ALERT_TARGET.MANAGER]: 'Gerencia',
  [ALERT_TARGET.RECEPTION]: 'Recepción',
  [ALERT_TARGET.HOUSEKEEPING]: 'Limpieza/Gobernanza',
  [ALERT_TARGET.MAINTENANCE]: 'Mantenimiento',
  [ALERT_TARGET.CUSTOM]: 'Personalizado',
};

// Colores por tipo
export const ALERT_TYPE_COLORS = {
  [ALERT_TYPES.MAINTENANCE]: '#f59e0b',
  [ALERT_TYPES.CLEANING]: '#10b981',
  [ALERT_TYPES.RESERVATION]: '#3b82f6',
  [ALERT_TYPES.EVENT]: '#8b5cf6',
  [ALERT_TYPES.REMINDER]: '#06b6d4',
  [ALERT_TYPES.TASK]: '#6366f1',
  [ALERT_TYPES.URGENT]: '#ef4444',
};

// Colores por prioridad
export const ALERT_PRIORITY_COLORS = {
  [ALERT_PRIORITY.LOW]: '#10b981',
  [ALERT_PRIORITY.MEDIUM]: '#f59e0b',
  [ALERT_PRIORITY.HIGH]: '#f97316',
  [ALERT_PRIORITY.URGENT]: '#ef4444',
};

// Íconos por tipo
export const ALERT_TYPE_ICONS = {
  [ALERT_TYPES.MAINTENANCE]: '🔧',
  [ALERT_TYPES.CLEANING]: '🧹',
  [ALERT_TYPES.RESERVATION]: '📅',
  [ALERT_TYPES.EVENT]: '🎉',
  [ALERT_TYPES.REMINDER]: '⏰',
  [ALERT_TYPES.TASK]: '✓',
  [ALERT_TYPES.URGENT]: '🚨',
};

// Mapeo de targets a roles
export const TARGET_TO_ROLES = {
  [ALERT_TARGET.ALL]: ['admin', 'manager', 'receptionist', 'housekeeper', 'maintenance'],
  [ALERT_TARGET.ADMIN]: ['admin'],
  [ALERT_TARGET.MANAGER]: ['admin', 'manager'],
  [ALERT_TARGET.RECEPTION]: ['admin', 'manager', 'receptionist'],
  [ALERT_TARGET.HOUSEKEEPING]: ['admin', 'manager', 'housekeeper'],
  [ALERT_TARGET.MAINTENANCE]: ['admin', 'manager', 'maintenance'],
};

// Verificar si un usuario puede ver una alerta
export const canUserSeeAlert = (alert, userRole) => {
  if (!alert || !userRole) return false;

  // Si es target personalizado, verificar roles específicos
  if (alert.target === ALERT_TARGET.CUSTOM && alert.customRoles) {
    return alert.customRoles.includes(userRole);
  }

  // Si es target predefinido
  const allowedRoles = TARGET_TO_ROLES[alert.target] || [];
  return allowedRoles.includes(userRole);
};

// Verificar si un usuario puede crear alertas para un target
export const canUserCreateAlertForTarget = (userRole, target) => {
  switch (target) {
    case ALERT_TARGET.ALL:
      return userRole === 'admin' || userRole === 'manager';
    case ALERT_TARGET.ADMIN:
      return userRole === 'admin';
    case ALERT_TARGET.MANAGER:
      return userRole === 'admin' || userRole === 'manager';
    case ALERT_TARGET.RECEPTION:
      return ['admin', 'manager', 'receptionist'].includes(userRole);
    case ALERT_TARGET.HOUSEKEEPING:
      return ['admin', 'manager', 'housekeeper'].includes(userRole);
    case ALERT_TARGET.MAINTENANCE:
      return ['admin', 'manager', 'maintenance'].includes(userRole);
    case ALERT_TARGET.CUSTOM:
      return userRole === 'admin' || userRole === 'manager';
    default:
      return false;
  }
};

// Verificar si un usuario puede editar/eliminar una alerta
export const canUserManageAlert = (alert, userRole, userId) => {
  // Admin puede todo
  if (userRole === 'admin') return true;
  
  // El creador puede editar su alerta
  if (alert.createdBy === userId) return true;
  
  // Manager puede editar alertas de su área
  if (userRole === 'manager') {
    const managerTargets = [
      ALERT_TARGET.MANAGER,
      ALERT_TARGET.RECEPTION,
      ALERT_TARGET.HOUSEKEEPING,
      ALERT_TARGET.MAINTENANCE
    ];
    return managerTargets.includes(alert.target);
  }
  
  return false;
};

// Helper para interpretar fechas en formato YYYY-MM-DD como fechas locales
const parseDateLocal = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// Calcular próxima ocurrencia según recurrencia
export const calculateNextOccurrence = (alert) => {
  if (!alert.recurrence || alert.recurrence === RECURRENCE_TYPE.NONE) {
    return null;
  }

  const currentDate = parseDateLocal(alert.date);
  const now = new Date();
  let nextDate = new Date(currentDate);

  // Si la fecha ya pasó, calcular siguiente ocurrencia
  if (currentDate < now) {
    switch (alert.recurrence) {
      case RECURRENCE_TYPE.DAILY:
        while (nextDate < now) {
          nextDate.setDate(nextDate.getDate() + 1);
        }
        break;
      
      case RECURRENCE_TYPE.WEEKLY:
        while (nextDate < now) {
          nextDate.setDate(nextDate.getDate() + 7);
        }
        break;
      
      case RECURRENCE_TYPE.MONTHLY:
        while (nextDate < now) {
          nextDate.setMonth(nextDate.getMonth() + 1);
        }
        break;
      
      case RECURRENCE_TYPE.CUSTOM:
        if (alert.customDays && alert.customDays.length > 0) {
          // Repetir en días específicos de la semana
          const currentDay = now.getDay();
          const sortedDays = [...alert.customDays].sort((a, b) => a - b);
          
          // Encontrar el siguiente día válido
          let nextDay = sortedDays.find(day => day > currentDay);
          if (!nextDay) {
            nextDay = sortedDays[0];
            nextDate.setDate(nextDate.getDate() + 7);
          }
          
          const daysToAdd = nextDay - currentDay;
          nextDate.setDate(now.getDate() + daysToAdd);
        }
        break;
      
      default:
        // RECURRENCE_TYPE.NONE - no hacer nada
        break;
    }
  }

  return nextDate;
};

// Verificar si una alerta está activa ahora
export const isAlertActiveNow = (alert) => {
  const now = new Date();
  const alertDate = parseDateLocal(alert.date);
  const alertTime = alert.time;
  
  // Combinar fecha y hora
  const [hours, minutes] = alertTime.split(':');
  alertDate.setHours(parseInt(hours), parseInt(minutes), 0);
  
  // Verificar si es una alerta de un solo uso que ya pasó
  if (alert.recurrence === RECURRENCE_TYPE.NONE) {
    return alertDate > now;
  }
  
  // Si tiene recurrencia, siempre está activa hasta que se desactive manualmente
  return alert.active !== false;
};

// Obtener alertas activas para hoy
export const getTodayAlerts = (alerts, userRole) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return alerts.filter(alert => {
    // Verificar si el usuario puede ver la alerta
    if (!canUserSeeAlert(alert, userRole)) return false;
    
    // Verificar si está activa
    if (!isAlertActiveNow(alert)) return false;
    
    const alertDate = parseDateLocal(alert.date);
    alertDate.setHours(0, 0, 0, 0);
    
    // Si no tiene recurrencia, verificar si es hoy
    if (alert.recurrence === RECURRENCE_TYPE.NONE) {
      return alertDate >= today && alertDate < tomorrow;
    }
    
    // Si tiene recurrencia, verificar si aplica hoy
    const nextOccurrence = calculateNextOccurrence(alert);
    if (!nextOccurrence) return false;
    
    nextOccurrence.setHours(0, 0, 0, 0);
    return nextOccurrence >= today && nextOccurrence < tomorrow;
  });
};

// Obtener alertas próximas (siguiente semana)
export const getUpcomingAlerts = (alerts, userRole, days = 7) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + days);
  
  return alerts.filter(alert => {
    if (!canUserSeeAlert(alert, userRole)) return false;
    if (!isAlertActiveNow(alert)) return false;
    
    const alertDate = parseDateLocal(alert.date);
    alertDate.setHours(0, 0, 0, 0);
    
    if (alert.recurrence === RECURRENCE_TYPE.NONE) {
      return alertDate >= today && alertDate <= futureDate;
    }
    
    const nextOccurrence = calculateNextOccurrence(alert);
    if (!nextOccurrence) return false;
    
    nextOccurrence.setHours(0, 0, 0, 0);
    return nextOccurrence >= today && nextOccurrence <= futureDate;
  });
};

// Formatear fecha y hora para mostrar
export const formatAlertDateTime = (alert) => {
  const date = parseDateLocal(alert.date);
  const dateStr = date.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  
  const timeStr = alert.time;
  
  if (alert.recurrence === RECURRENCE_TYPE.NONE) {
    return `${dateStr} a las ${timeStr}`;
  }
  
  return `${RECURRENCE_LABELS[alert.recurrence]} a las ${timeStr}`;
};
// src/utils/roles.js - Sistema de roles y permisos

export const ROLES = {
  ADMIN: 'admin',           // Acceso total
  MANAGER: 'manager',       // Gerente - acceso a reportes y configuración
  RECEPTIONIST: 'receptionist', // Recepcionista - turnos, notas, check-in/out
  HOUSEKEEPER: 'housekeeper',   // Gobernanta - limpieza, mantenimiento
  MAINTENANCE: 'maintenance',   // Mantenimiento - solo mantenimiento
};

export const PERMISSIONS = {
  // Dashboard
  VIEW_DASHBOARD: 'view_dashboard',
  
  // Turnos
  VIEW_SHIFTS: 'view_shifts',
  CREATE_SHIFT: 'create_shift',
  EDIT_SHIFT: 'edit_shift',
  DELETE_SHIFT: 'delete_shift',
  VIEW_SHIFT_HISTORY: 'view_shift_history',
  
  // Notas
  VIEW_NOTES: 'view_notes',
  CREATE_NOTE: 'create_note',
  EDIT_NOTE: 'edit_note',
  DELETE_NOTE: 'delete_note',
  
  // Check-in/out
  CHECKIN: 'checkin',
  CHECKOUT: 'checkout',
  
  // Finanzas
  VIEW_FINANCES: 'view_finances',
  MANAGE_CAJA: 'manage_caja',
  VIEW_REPORTS: 'view_reports',
  
  // Mantenimiento
  VIEW_MAINTENANCE: 'view_maintenance',
  CREATE_MAINTENANCE: 'create_maintenance',
  
  // Usuarios
  VIEW_USERS: 'view_users',
  CREATE_USER: 'create_user',
  EDIT_USER: 'edit_user',
  DELETE_USER: 'delete_user',
  
  // Métricas
  VIEW_METRICS: 'view_metrics',
  VIEW_ALL_METRICS: 'view_all_metrics',
  
  // Alertas
  VIEW_ALERTS: 'view_alerts',
  CREATE_ALERT: 'create_alert',
  EDIT_ALERT: 'edit_alert',
  DELETE_ALERT: 'delete_alert',
  CREATE_GLOBAL_ALERT: 'create_global_alert',
  
  // Configuración
  VIEW_SETTINGS: 'view_settings',
  EDIT_SETTINGS: 'edit_settings',
};

// Permisos por rol
export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: Object.values(PERMISSIONS), // Todos los permisos
  
  [ROLES.MANAGER]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_SHIFTS,
    PERMISSIONS.VIEW_SHIFT_HISTORY,
    PERMISSIONS.VIEW_NOTES,
    PERMISSIONS.CREATE_NOTE,
    PERMISSIONS.EDIT_NOTE,
    PERMISSIONS.VIEW_FINANCES,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.VIEW_MAINTENANCE,
    PERMISSIONS.CREATE_MAINTENANCE,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.VIEW_SETTINGS,
    PERMISSIONS.VIEW_METRICS,
    PERMISSIONS.VIEW_ALL_METRICS,
    PERMISSIONS.VIEW_ALERTS,
    PERMISSIONS.CREATE_ALERT,
    PERMISSIONS.EDIT_ALERT,
    PERMISSIONS.DELETE_ALERT,
    PERMISSIONS.CREATE_GLOBAL_ALERT,
  ],
  
  [ROLES.RECEPTIONIST]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_SHIFTS,
    PERMISSIONS.CREATE_SHIFT,
    PERMISSIONS.VIEW_SHIFT_HISTORY,
    PERMISSIONS.VIEW_NOTES,
    PERMISSIONS.CREATE_NOTE,
    PERMISSIONS.EDIT_NOTE,
    PERMISSIONS.CHECKIN,
    PERMISSIONS.CHECKOUT,
    PERMISSIONS.MANAGE_CAJA,
    PERMISSIONS.VIEW_ALERTS,
    PERMISSIONS.CREATE_ALERT,
  ],
  
  [ROLES.HOUSEKEEPER]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_NOTES,
    PERMISSIONS.CREATE_NOTE,
    PERMISSIONS.VIEW_MAINTENANCE,
    PERMISSIONS.CREATE_MAINTENANCE,
    PERMISSIONS.VIEW_ALERTS,
    PERMISSIONS.CREATE_ALERT,
  ],
  
  [ROLES.MAINTENANCE]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_MAINTENANCE,
    PERMISSIONS.CREATE_MAINTENANCE,
    PERMISSIONS.VIEW_ALERTS,
    PERMISSIONS.CREATE_ALERT,
  ],
};

// Función para verificar permisos
export const hasPermission = (userRole, permission) => {
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  return permissions.includes(permission);
};

// Función para obtener permisos de un rol
export const getRolePermissions = (role) => {
  return ROLE_PERMISSIONS[role] || [];
};

// Labels para mostrar en UI
export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Administrador',
  [ROLES.MANAGER]: 'Gerente',
  [ROLES.RECEPTIONIST]: 'Recepcionista',
  [ROLES.HOUSEKEEPER]: 'Gobernanta',
  [ROLES.MAINTENANCE]: 'Mantenimiento',
};

// Colores por rol
export const ROLE_COLORS = {
  [ROLES.ADMIN]: '#8b5cf6',
  [ROLES.MANAGER]: '#3b82f6',
  [ROLES.RECEPTIONIST]: '#10b981',
  [ROLES.HOUSEKEEPER]: '#f59e0b',
  [ROLES.MAINTENANCE]: '#ef4444',
};
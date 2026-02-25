// src/components/NotificationsWidget.jsx - Widget de notificaciones en tiempo real
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, getDocs, updateDoc, doc, orderBy } from 'firebase/firestore';
import { FaBell, FaCheck, FaClock, FaExclamationTriangle, FaCalendar } from 'react-icons/fa';
import { 
  getTodayAlerts, canUserSeeAlert, formatAlertDateTime,
  ALERT_TYPE_ICONS, ALERT_TYPE_COLORS, ALERT_PRIORITY_COLORS 
} from '../utils/alerts';
import '../styles/notificationsWidget.css';

const NotificationsWidget = ({ currentUser }) => {
  const [alerts, setAlerts] = useState([]);
  const [todayAlerts, setTodayAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (currentUser?.id) {
      loadAlerts();
      
      // Recargar cada 30 segundos
      const interval = setInterval(loadAlerts, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (alerts.length > 0) {
      // Mostrar TODAS las alertas activas como "de hoy" si no tienen fecha especificada
      const todayAlerts = alerts.filter(alert => {
        // Si no tiene fecha, mostrarla como alerta de hoy
        if (!alert.date) {
          console.log('⚠️ Alerta sin fecha:', alert);
          return true;
        }
        
        // Si tiene fecha, verificar si es hoy
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        try {
          // Intentar parsear la fecha
          let alertDate;
          if (typeof alert.date === 'string') {
            alertDate = new Date(alert.date);
          } else if (alert.date instanceof Date) {
            alertDate = alert.date;
          } else if (alert.date?.toDate) {
            alertDate = alert.date.toDate();
          } else {
            console.log('⚠️ Formato de fecha desconocido:', alert.date, typeof alert.date);
            return true; // Mostrar si no podemos parsear
          }
          
          alertDate.setHours(0, 0, 0, 0);
          return alertDate >= today && alertDate < tomorrow;
        } catch (err) {
          console.error('❌ Error parsing date:', err, alert.date);
          return true; // Mostrar si hay error
        }
      });
      
      console.log('📅 Alertas de hoy:', todayAlerts);
      setTodayAlerts(todayAlerts);
      
      // Contar no leídas
      const unread = todayAlerts.filter(a => !a.readBy?.includes(currentUser?.id)).length;
      setUnreadCount(unread);
      console.log('🔔 Alertas no leídas:', unread);
    } else {
      setTodayAlerts([]);
      setUnreadCount(0);
    }
  }, [alerts, currentUser?.id]);

  const loadAlerts = async () => {
    try {
      setIsLoading(true);
      // Primero intentar obtener todas las alertas sin filtro
      const q = query(
        collection(db, 'alerts'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const alertsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date()
      }));
      
      console.log('📢 Todas las alertas:', alertsData);
      console.log('👤 Usuario actual:', currentUser);
      
      // Filtrar solo activas
      const activeAlerts = alertsData.filter(a => a.active !== false);
      console.log('✅ Alertas activas:', activeAlerts);
      
      // Para el widget de notificaciones, mostrar todas las alertas activas
      // (el filtrado por rol se hace después)
      setAlerts(activeAlerts);
    } catch (error) {
      console.error('❌ Error loading alerts:', error);
      setAlerts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (alertId) => {
    try {
      const alertRef = doc(db, 'alerts', alertId);
      const alert = alerts.find(a => a.id === alertId);
      const readBy = alert.readBy || [];
      
      if (!readBy.includes(currentUser.id)) {
        await updateDoc(alertRef, {
          readBy: [...readBy, currentUser.id]
        });
        loadAlerts();
      }
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadAlerts = todayAlerts.filter(a => !a.readBy?.includes(currentUser.id));
      
      for (const alert of unreadAlerts) {
        const alertRef = doc(db, 'alerts', alert.id);
        const readBy = alert.readBy || [];
        await updateDoc(alertRef, {
          readBy: [...readBy, currentUser.id]
        });
      }
      
      loadAlerts();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getAlertsByTime = () => {
    if (!todayAlerts || todayAlerts.length === 0) return [];
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    
    return todayAlerts.map(alert => {
      try {
        if (!alert.time) {
          return {
            ...alert,
            status: 'later',
            statusLabel: 'Sin hora',
            timeDiff: 9999
          };
        }
        
        const [hours, minutes] = alert.time.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) {
          return {
            ...alert,
            status: 'later',
            statusLabel: alert.time,
            timeDiff: 9999
          };
        }
        
        const alertMinutes = hours * 60 + minutes;
        const currentMinutesTotal = currentHour * 60 + currentMinutes;
        const diff = alertMinutes - currentMinutesTotal;
        
        let status = 'upcoming';
        let statusLabel = '';
        
        if (diff < -30) {
          status = 'passed';
          statusLabel = 'Pasado';
        } else if (diff >= -30 && diff <= 30) {
          status = 'now';
          statusLabel = 'AHORA';
        } else if (diff > 30 && diff <= 120) {
          status = 'soon';
          const hrs = Math.floor(diff / 60);
          const mins = diff % 60;
          statusLabel = `En ${hrs}h ${mins}min`;
        } else {
          status = 'later';
          statusLabel = `A las ${alert.time}`;
        }
        
        return {
          ...alert,
          status,
          statusLabel,
          timeDiff: diff
        };
      } catch (err) {
        console.error('Error parsing alert time:', alert, err);
        return {
          ...alert,
          status: 'later',
          statusLabel: 'Hora inválida',
          timeDiff: 9999
        };
      }
    }).sort((a, b) => a.timeDiff - b.timeDiff);
  };

  const sortedAlerts = getAlertsByTime();
  const activeNow = sortedAlerts.filter(a => a.status === 'now');
  const upcoming = sortedAlerts.filter(a => a.status === 'soon');

  return (
    <div className="notifications-widget">
      <button 
        className="notifications-btn"
        onClick={() => setShowDropdown(!showDropdown)}
        title={`${unreadCount} alertas no leídas`}
      >
        <FaBell />
        {unreadCount > 0 && (
          <span className="notifications-badge">{unreadCount}</span>
        )}
      </button>

      {showDropdown && (
        <>
          <div className="notifications-overlay" onClick={() => setShowDropdown(false)} />
          <div className="notifications-dropdown">
            {isLoading ? (
              <div className="notifications-loading">
                <p>Cargando alertas...</p>
              </div>
            ) : todayAlerts.length === 0 ? (
              <div className="no-notifications">
                <FaBell style={{ fontSize: '2rem', opacity: 0.3 }} />
                <p>No hay alertas para hoy</p>
              </div>
            ) : (
              <>
                <div className="notifications-header">
                  <h4>Notificaciones de Hoy ({todayAlerts.length})</h4>
                  {unreadCount > 0 && (
                    <button 
                      className="mark-all-read-btn"
                      onClick={markAllAsRead}
                    >
                      <FaCheck /> Marcar todas
                    </button>
                  )}
                </div>

                <div className="notifications-list">
                  {/* Alertas AHORA */}
                  {activeNow.length > 0 && (
                    <div className="notification-group">
                      <div className="group-header urgent">
                        <FaExclamationTriangle />
                        <span>AHORA</span>
                      </div>
                      {activeNow.map(alert => (
                        <NotificationItem 
                          key={alert.id}
                          alert={alert}
                          currentUser={currentUser}
                          onMarkAsRead={markAsRead}
                        />
                      ))}
                    </div>
                  )}

                  {/* Próximas (siguiente 2 horas) */}
                  {upcoming.length > 0 && (
                    <div className="notification-group">
                      <div className="group-header">
                        <FaClock />
                        <span>Próximas</span>
                      </div>
                      {upcoming.map(alert => (
                        <NotificationItem 
                          key={alert.id}
                          alert={alert}
                          currentUser={currentUser}
                          onMarkAsRead={markAsRead}
                        />
                      ))}
                    </div>
                  )}

                  {/* Resto del día */}
                  {sortedAlerts.filter(a => a.status === 'later').length > 0 && (
                    <div className="notification-group">
                      <div className="group-header">
                        <FaCalendar />
                        <span>Más tarde</span>
                      </div>
                      {sortedAlerts.filter(a => a.status === 'later').map(alert => (
                        <NotificationItem 
                          key={alert.id}
                          alert={alert}
                          currentUser={currentUser}
                          onMarkAsRead={markAsRead}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="notifications-footer">
                  <button 
                    className="view-all-alerts-btn"
                    onClick={() => {
                      setShowDropdown(false);
                      // Aquí podrías navegar a /alertas
                    }}
                  >
                    Ver todas las alertas
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const NotificationItem = ({ alert, currentUser, onMarkAsRead }) => {
  const isUnread = !alert.readBy?.includes(currentUser.id);
  
  return (
    <div 
      className={`notification-item ${isUnread ? 'unread' : ''} ${alert.status}`}
      onClick={() => isUnread && onMarkAsRead(alert.id)}
    >
      <div className="notification-icon" style={{ color: ALERT_TYPE_COLORS[alert.type] }}>
        {ALERT_TYPE_ICONS[alert.type]}
      </div>
      <div className="notification-content">
        <h5>{alert.title}</h5>
        {alert.description && <p>{alert.description}</p>}
        <div className="notification-meta">
          <span className="notification-time">{alert.statusLabel}</span>
          {alert.status === 'now' && (
            <span className="pulse-indicator"></span>
          )}
        </div>
      </div>
      {isUnread && <span className="unread-dot"></span>}
    </div>
  );
};

export default NotificationsWidget;

// src/components/NotificationsWidget.jsx - Widget de notificaciones en tiempo real
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { FaBell, FaCheck, FaClock, FaExclamationTriangle,FaCalendar } from 'react-icons/fa';
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

  const [previousActiveCount, setPreviousActiveCount] = useState(0);

  useEffect(() => {
    loadAlerts();
    
    // Recargar cada 10 segundos para ser más reactivo
    const interval = setInterval(loadAlerts, 10000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Verificar alertas activas y notificar cambios
  useEffect(() => {
    if (todayAlerts.length > 0) {
      const sortedAlerts = getAlertsByTime();
      const activeNow = sortedAlerts.filter(a => a.status === 'now');
      
      // Si hay nuevas alertas activas
      if (activeNow.length > previousActiveCount) {
        // Reproducir sonido de notificación
        playNotificationSound();
        
        // Mostrar notificación del navegador
        showBrowserNotification(activeNow[activeNow.length - 1]);
        
        // Hacer que el badge parpadee
        const badge = document.querySelector('.notifications-badge');
        if (badge) {
          badge.style.animation = 'none';
          setTimeout(() => {
            badge.style.animation = 'pulse 2s infinite, shake 0.5s ease';
          }, 10);
        }
      }
      
      setPreviousActiveCount(activeNow.length);
    }
  }, [todayAlerts]);

  const playNotificationSound = () => {
    try {
      // Crear un beep simple
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.log('No se pudo reproducir sonido:', error);
    }
  };

  const showBrowserNotification = (alert) => {
    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'granted') {
      new Notification('⏰ Alerta Activa - Hotel Cytrico', {
        body: alert.title + '\n' + (alert.description || ''),
        icon: '/favicon.ico',
        tag: alert.id,
        requireInteraction: true
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          showBrowserNotification(alert);
        }
      });
    }
  };

  useEffect(() => {
    if (alerts.length > 0) {
      const today = getTodayAlerts(alerts, currentUser.role);
      setTodayAlerts(today);
      
      // Contar no leídas
      const unread = today.filter(a => !a.readBy?.includes(currentUser.id)).length;
      setUnreadCount(unread);
    }
  }, [alerts, currentUser]);

  const loadAlerts = async () => {
    try {
      const q = query(collection(db, 'alerts'));
      const snapshot = await getDocs(q);
      const alertsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filtrar solo las activas y que el usuario puede ver
      const userAlerts = alertsData.filter(alert => 
        alert.active !== false && canUserSeeAlert(alert, currentUser.role)
      );
      
      setAlerts(userAlerts);
    } catch (error) {
      console.error('Error loading alerts:', error);
      // Si hay error, establecer array vacío para evitar crashes
      setAlerts([]);
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
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    
    return todayAlerts.map(alert => {
      const [hours, minutes] = alert.time.split(':').map(Number);
      const alertMinutes = hours * 60 + minutes;
      const currentMinutesTotal = currentHour * 60 + currentMinutes;
      const diff = alertMinutes - currentMinutesTotal;
      
      let status = 'upcoming';
      let statusLabel = '';
      
      // Ajustado para ser más preciso
      if (diff < -60) {
        // Más de 1 hora pasada - no mostrar
        return null;
      } else if (diff >= -15 && diff <= 15) {
        // Ventana de ±15 minutos = AHORA
        status = 'now';
        statusLabel = '🔴 AHORA';
      } else if (diff > 15 && diff <= 60) {
        // Entre 15 y 60 minutos = Muy pronto
        status = 'soon';
        const minLeft = Math.ceil(diff);
        statusLabel = `En ${minLeft} min`;
      } else if (diff > 60 && diff <= 180) {
        // Entre 1 y 3 horas = Próximas
        status = 'soon';
        const hours = Math.floor(diff / 60);
        const mins = diff % 60;
        statusLabel = mins > 0 ? `En ${hours}h ${mins}min` : `En ${hours}h`;
      } else if (diff > 180) {
        // Más de 3 horas = Más tarde
        status = 'later';
        statusLabel = `A las ${alert.time}`;
      } else {
        // Entre -60 y -15 = Pasó hace poco
        status = 'recent';
        const minAgo = Math.abs(diff);
        statusLabel = `Hace ${minAgo} min`;
      }
      
      return {
        ...alert,
        status,
        statusLabel,
        timeDiff: diff
      };
    })
    .filter(a => a !== null) // Remover alertas muy pasadas
    .sort((a, b) => a.timeDiff - b.timeDiff);
  };

  const sortedAlerts = getAlertsByTime();
  const activeNow = sortedAlerts.filter(a => a.status === 'now');
  const recentPassed = sortedAlerts.filter(a => a.status === 'recent');
  const upcoming = sortedAlerts.filter(a => a.status === 'soon');
  const later = sortedAlerts.filter(a => a.status === 'later');

  return (
    <div className="notifications-widget">
      <button 
        className="notifications-btn"
        onClick={() => setShowDropdown(!showDropdown)}
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
            <div className="notifications-header">
              <h4>Notificaciones de Hoy</h4>
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

              {/* Alertas recién pasadas */}
              {recentPassed.length > 0 && (
                <div className="notification-group">
                  <div className="group-header recent">
                    <FaClock />
                    <span>RECIÉN PASADAS</span>
                  </div>
                  {recentPassed.map(alert => (
                    <NotificationItem 
                      key={alert.id}
                      alert={alert}
                      currentUser={currentUser}
                      onMarkAsRead={markAsRead}
                    />
                  ))}
                </div>
              )}

              {/* Próximas (siguiente 3 horas) */}
              {upcoming.length > 0 && (
                <div className="notification-group">
                  <div className="group-header">
                    <FaClock />
                    <span>PRÓXIMAS</span>
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
              {later.length > 0 && (
                <div className="notification-group">
                  <div className="group-header">
                    <FaCalendar />
                    <span>MÁS TARDE</span>
                  </div>
                  {later.map(alert => (
                    <NotificationItem 
                      key={alert.id}
                      alert={alert}
                      currentUser={currentUser}
                      onMarkAsRead={markAsRead}
                    />
                  ))}
                </div>
              )}

              {todayAlerts.length === 0 && (
                <div className="no-notifications">
                  <FaBell style={{ fontSize: '2rem', opacity: 0.3 }} />
                  <p>No hay alertas para hoy</p>
                </div>
              )}
            </div>

            {todayAlerts.length > 0 && (
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
// src/components/AlertsSeeder.jsx - Componente para crear alertas de prueba
import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { FaPlus, FaCheckCircle } from 'react-icons/fa';

const AlertsSeeder = ({ currentUser, onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const createSampleAlerts = async () => {
    setLoading(true);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const formatDate = (date) => {
      return date.toISOString().split('T')[0];
    };

    // Calcular hora "en 1 hora" y "en 30 minutos"
    const now = new Date();
    const in1Hour = new Date(now.getTime() + 60 * 60 * 1000);
    const in30Min = new Date(now.getTime() + 30 * 60 * 1000);
    const in2Hours = new Date(now.getTime() + 120 * 60 * 1000);

    const formatTime = (date) => {
      return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    };

    const sampleAlerts = [
      {
        title: 'Check-in VIP - AHORA',
        description: 'Cliente VIP llegando. Preparar suite presidencial con amenidades especiales.',
        type: 'reservation',
        priority: 'urgent',
        date: formatDate(today),
        time: formatTime(now),
        recurrence: 'none',
        customDays: [],
        target: 'reception',
        customRoles: [],
        active: true,
        createdBy: currentUser.id,
        createdByName: currentUser.name,
        createdAt: new Date(),
        updatedAt: new Date(),
        readBy: []
      },
      {
        title: 'Preparar Jacuzzi',
        description: 'Preparar jacuzzi para habitación 305 - Solicitud especial',
        type: 'event',
        priority: 'high',
        date: formatDate(today),
        time: formatTime(in30Min),
        recurrence: 'none',
        customDays: [],
        target: 'reception',
        customRoles: [],
        active: true,
        createdBy: currentUser.id,
        createdByName: currentUser.name,
        createdAt: new Date(),
        updatedAt: new Date(),
        readBy: []
      },
      {
        title: 'Limpieza de lobby',
        description: 'Limpieza profunda del área de recepción y lobby principal',
        type: 'cleaning',
        priority: 'medium',
        date: formatDate(today),
        time: '15:00',
        recurrence: 'daily',
        customDays: [],
        target: 'housekeeping',
        customRoles: [],
        active: true,
        createdBy: currentUser.id,
        createdByName: currentUser.name,
        createdAt: new Date(),
        updatedAt: new Date(),
        readBy: []
      },
      {
        title: 'Entrega de paquete urgente',
        description: 'Paquete para habitación 207 - Requiere firma',
        type: 'task',
        priority: 'high',
        date: formatDate(today),
        time: formatTime(in1Hour),
        recurrence: 'none',
        customDays: [],
        target: 'reception',
        customRoles: [],
        active: true,
        createdBy: currentUser.id,
        createdByName: currentUser.name,
        createdAt: new Date(),
        updatedAt: new Date(),
        readBy: []
      },
      {
        title: 'Reunión de gerencia',
        description: 'Reunión semanal de coordinación - Sala de juntas',
        type: 'event',
        priority: 'medium',
        date: formatDate(today),
        time: formatTime(in2Hours),
        recurrence: 'weekly',
        customDays: [],
        target: 'manager',
        customRoles: [],
        active: true,
        createdBy: currentUser.id,
        createdByName: currentUser.name,
        createdAt: new Date(),
        updatedAt: new Date(),
        readBy: []
      },
      {
        title: 'Mantenimiento preventivo',
        description: 'Revisión de sistema de aire acondicionado central',
        type: 'maintenance',
        priority: 'medium',
        date: formatDate(tomorrow),
        time: '08:00',
        recurrence: 'monthly',
        customDays: [],
        target: 'maintenance',
        customRoles: [],
        active: true,
        createdBy: currentUser.id,
        createdByName: currentUser.name,
        createdAt: new Date(),
        updatedAt: new Date(),
        readBy: []
      },
      {
        title: 'Inventario semanal',
        description: 'Revisión de inventario de amenidades y suministros',
        type: 'task',
        priority: 'low',
        date: formatDate(today),
        time: '10:00',
        recurrence: 'custom',
        customDays: [1, 4], // Lunes y Jueves
        target: 'all',
        customRoles: [],
        active: true,
        createdBy: currentUser.id,
        createdByName: currentUser.name,
        createdAt: new Date(),
        updatedAt: new Date(),
        readBy: []
      }
    ];

    try {
      for (const alert of sampleAlerts) {
        await addDoc(collection(db, 'alerts'), alert);
      }
      setSuccess(true);
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 2000);
    } catch (error) {
      console.error('Error creando alertas:', error);
      alert('Error al crear alertas de prueba: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        background: '#13131d',
        borderRadius: '14px',
        border: '1px solid #1e1e2e'
      }}>
        <FaCheckCircle style={{ fontSize: '4rem', color: '#4ade80', marginBottom: '16px' }} />
        <h3 style={{ color: '#f0ede8', marginBottom: '8px' }}>¡Alertas creadas!</h3>
        <p style={{ color: '#6b6b8a' }}>7 alertas de prueba fueron creadas exitosamente</p>
      </div>
    );
  }

  return (
    <div style={{
      padding: '40px',
      textAlign: 'center',
      background: '#13131d',
      borderRadius: '14px',
      border: '1px solid #1e1e2e'
    }}>
      <h3 style={{ color: '#f0ede8', marginBottom: '16px' }}>Inicializar Alertas de Prueba</h3>
      <p style={{ color: '#6b6b8a', marginBottom: '24px' }}>
        Esto creará 7 alertas de ejemplo para probar el sistema:
      </p>
      <ul style={{ 
        textAlign: 'left', 
        color: '#9090b0', 
        maxWidth: '400px', 
        margin: '0 auto 24px',
        listStyle: 'none',
        padding: 0
      }}>
        <li style={{ marginBottom: '8px' }}>✓ Check-in VIP (AHORA)</li>
        <li style={{ marginBottom: '8px' }}>✓ Preparar Jacuzzi (en 30 min)</li>
        <li style={{ marginBottom: '8px' }}>✓ Limpieza de lobby (diaria)</li>
        <li style={{ marginBottom: '8px' }}>✓ Entrega de paquete (en 1 hora)</li>
        <li style={{ marginBottom: '8px' }}>✓ Reunión gerencia (en 2 horas)</li>
        <li style={{ marginBottom: '8px' }}>✓ Mantenimiento (mañana)</li>
        <li style={{ marginBottom: '8px' }}>✓ Inventario (Lun y Jue)</li>
      </ul>
      <button
        onClick={createSampleAlerts}
        disabled={loading}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '14px 28px',
          background: 'linear-gradient(135deg, #5b5bff, #7b3fe4)',
          border: 'none',
          borderRadius: '10px',
          color: '#fff',
          fontSize: '1rem',
          fontWeight: '600',
          cursor: loading ? 'not-allowed' : 'pointer',
          margin: '0 auto',
          opacity: loading ? 0.6 : 1
        }}
      >
        <FaPlus />
        {loading ? 'Creando alertas...' : 'Crear Alertas de Prueba'}
      </button>
    </div>
  );
};

export default AlertsSeeder;
// src/utils/reportDataFetcher.js - Obtener datos desde Firebase para reportes

import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

/**
 * Obtener datos de control de cloro desde controlCloroPh
 */
export const fetchChlorineData = async (startDate, endDate) => {
  try {
    // Nueva estructura simple: controlCloroPh/[documentos]
    const collectionRef = collection(db, 'controlCloroPh');
    const snapshot = await getDocs(collectionRef);
    
    const allData = [];
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      
      // Convertir fecha de timestamp a string YYYY-MM-DD para comparar
      let dateStr = '';
      if (data.fecha) {
        if (data.fecha.toDate) {
          // Si es un timestamp de Firestore
          dateStr = data.fecha.toDate().toISOString().split('T')[0];
        } else if (typeof data.fecha === 'string') {
          // Si es string, intentar parsearlo
          // Formato esperado: "1 de marzo de 2026 a las 12:05:16 a.m. UTC-5"
          const dateMatch = data.fecha.match(/(\d+) de (\w+) de (\d+)/);
          if (dateMatch) {
            const day = dateMatch[1].padStart(2, '0');
            const monthNames = {
              'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
              'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
              'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
            };
            const month = monthNames[dateMatch[2].toLowerCase()] || '01';
            const year = dateMatch[3];
            dateStr = `${year}-${month}-${day}`;
          }
        }
      }
      
      // Filtrar por rango de fechas
      if (dateStr && dateStr >= startDate && dateStr <= endDate) {
        allData.push({
          id: doc.id,
          date: dateStr,
          time: '00:00', // No hay hora separada en esta estructura
          location: data.lugarId || data.lugar || 'No especificada',
          chlorineLevel: data.cloro || 0,
          phLevel: data.ph || 0,
          temperature: 0, // No está en tus datos
          responsible: data.userId || 'No asignado',
          observations: `Cloro cumple: ${data.cumpleCloro ? 'Sí' : 'No'}, pH cumple: ${data.cumplePh ? 'Sí' : 'No'}`
        });
      }
    });
    
    // Ordenar por fecha
    return allData.sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error('Error fetching chlorine data:', error);
    return [];
  }
};

/**
 * Obtener datos de limpieza desde limpiezaDesinfeccion
 */
export const fetchCleaningData = async (startDate, endDate) => {
  try {
    const collectionRef = collection(db, 'limpiezaDesinfeccion');
    const snapshot = await getDocs(collectionRef);
    
    const allData = [];
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      
      // Convertir fecha de timestamp a string YYYY-MM-DD
      let dateStr = '';
      if (data.fecha) {
        if (data.fecha.toDate) {
          dateStr = data.fecha.toDate().toISOString().split('T')[0];
        }
      }
      
      // Filtrar por rango de fechas
      if (dateStr && dateStr >= startDate && dateStr <= endDate) {
        // Contar áreas completadas
        const areas = data.areas || {};
        const totalAreas = Object.keys(areas).length;
        const completadas = Object.values(areas).filter(v => v === true).length;
        const porcentaje = totalAreas > 0 ? Math.round((completadas / totalAreas) * 100) : 0;
        
        allData.push({
          id: doc.id,
          date: dateStr,
          room: data.lugar || 'No especificada',
          type: 'Limpieza y Desinfección',
          cleaner: data.auxiliarId || 'No asignado',
          startTime: '00:00',
          endTime: '00:00',
          status: porcentaje === 100 ? 'Completado' : 'Pendiente',
          areasCompletadas: completadas,
          totalAreas: totalAreas,
          porcentajeCompletado: porcentaje,
          supervisor: data.supervisorId || 'Sin supervisar',
          observaciones: data.observaciones || 'S/N',
          // Detalle de áreas
          areas: areas
        });
      }
    });
    
    // Ordenar por fecha
    return allData.sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error('Error fetching cleaning data:', error);
    return [];
  }
};

/**
 * Obtener datos de toma de muestras desde muestras_alimentos
 */
export const fetchSamplesData = async (startDate, endDate) => {
  try {
    const q = query(
      collection(db, 'muestras_alimentos'),
      where('fecha', '>=', startDate),
      where('fecha', '<=', endDate),
      orderBy('fecha', 'asc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        date: data.fecha || data.date,
        sampleId: data.idMuestra || data.sampleId || doc.id,
        location: data.ubicacion || data.location || 'No especificada',
        type: data.tipo || data.type || 'Muestra',
        responsible: data.responsable || data.responsible || 'No asignado',
        compliant: data.cumpleNormativa || data.compliant || 'Pendiente'
      };
    });
  } catch (error) {
    console.error('Error fetching samples data:', error);
    return [];
  }
};

/**
 * Obtener datos de recepción desde la colección de turnos
 */
export const fetchReceptionData = async (startDate, endDate) => {
  try {
    const turnosRef = collection(db, 'turnos');
    const q = query(
      turnosRef,
      orderBy('createdAt', 'asc')
    );
    
    const snapshot = await getDocs(q);
    const turnos = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()
    }));
    
    // Filtrar por rango de fechas
    const filtered = turnos.filter(turno => {
      const turnoDate = turno.createdAt;
      if (!turnoDate) return false;
      
      const turnoDateStr = turnoDate.toISOString().split('T')[0];
      return turnoDateStr >= startDate && turnoDateStr <= endDate;
    });
    
    // Transformar datos para el reporte
    return filtered.map(turno => {
      const checkIns = turno.checkins?.filter(c => c.type === 'in').length || 0;
      const checkOuts = turno.checkins?.filter(c => c.type === 'out').length || 0;
      
      return {
        date: turno.createdAt.toISOString().split('T')[0],
        shift: turno.shift === 'morning' ? 'Mañana' : 
               turno.shift === 'afternoon' ? 'Tarde' : 'Noche',
        receptionist: turno.receptionist || 'Sin asignar',
        checkIns,
        checkOuts,
        reservations: 0, // Agregar si tienes este dato
        cancellations: 0, // Agregar si tienes este dato
        complaints: 0 // Agregar si tienes este dato
      };
    });
  } catch (error) {
    console.error('Error fetching reception data:', error);
    return [];
  }
};

/**
 * Obtener datos de mantenimiento
 * Si no existe la colección 'maintenance', retorna array vacío
 */
export const fetchMaintenanceData = async (startDate, endDate) => {
  try {
    // Intentar obtener de colección 'maintenance' si existe
    const q = query(
      collection(db, 'maintenance'),
      where('fecha', '>=', startDate),
      where('fecha', '<=', endDate),
      orderBy('fecha', 'asc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        date: data.fecha || data.date,
        workOrderId: data.ordenTrabajo || data.workOrderId || doc.id,
        type: data.tipo || data.type || 'Correctivo',
        location: data.ubicacion || data.location || 'No especificada',
        description: data.descripcion || data.description || '',
        technician: data.tecnico || data.technician || 'No asignado',
        priority: data.prioridad || data.priority || 'Media',
        status: data.estado || data.status || 'Pendiente'
      };
    });
  } catch (error) {
    console.error('Error fetching maintenance data:', error);
    // Si la colección no existe, retornar array vacío sin error
    return [];
  }
};

/**
 * Obtener datos de turnos para reporte de entregas
 */
export const fetchShiftsData = async (startDate, endDate) => {
  try {
    const turnosRef = collection(db, 'turnos');
    const q = query(
      turnosRef,
      orderBy('createdAt', 'asc')
    );
    
    const snapshot = await getDocs(q);
    const turnos = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()
    }));
    
    // Filtrar por rango de fechas
    const filtered = turnos.filter(turno => {
      const turnoDate = turno.createdAt;
      if (!turnoDate) return false;
      
      const turnoDateStr = turnoDate.toISOString().split('T')[0];
      return turnoDateStr >= startDate && turnoDateStr <= endDate;
    });
    
    // Transformar datos
    return filtered.map(turno => {
      const checkIns = turno.checkins?.filter(c => c.type === 'in').length || 0;
      const totalIncome = turno.totals?.totalIngresos || 0;
      const totalExpenses = turno.totals?.totalGastos || 0;
      
      return {
        date: turno.createdAt.toISOString().split('T')[0],
        shift: turno.shift === 'morning' ? 'Mañana' : 
               turno.shift === 'afternoon' ? 'Tarde' : 'Noche',
        receptionist: turno.receptionist || 'Sin asignar',
        checkIns,
        income: totalIncome,
        expenses: totalExpenses
      };
    });
  } catch (error) {
    console.error('Error fetching shifts data:', error);
    return [];
  }
};

/**
 * Obtener datos financieros desde turnos
 */
export const fetchFinancesData = async (startDate, endDate) => {
  try {
    const turnosRef = collection(db, 'turnos');
    const q = query(
      turnosRef,
      orderBy('createdAt', 'asc')
    );
    
    const snapshot = await getDocs(q);
    const turnos = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()
    }));
    
    // Filtrar por rango de fechas
    const filtered = turnos.filter(turno => {
      const turnoDate = turno.createdAt;
      if (!turnoDate) return false;
      
      const turnoDateStr = turnoDate.toISOString().split('T')[0];
      return turnoDateStr >= startDate && turnoDateStr <= endDate;
    });
    
    // Agrupar por concepto
    const financesMap = new Map();
    
    filtered.forEach(turno => {
      const date = turno.createdAt.toISOString().split('T')[0];
      
      // Ingresos
      if (turno.income && turno.income.length > 0) {
        turno.income.forEach(item => {
          const key = `${date}-${item.concept}`;
          if (!financesMap.has(key)) {
            financesMap.set(key, {
              date,
              concept: item.concept,
              income: 0,
              expenses: 0,
              balance: 0
            });
          }
          const current = financesMap.get(key);
          current.income += item.amount;
          current.balance += item.amount;
        });
      }
      
      // Gastos
      if (turno.expenses && turno.expenses.length > 0) {
        turno.expenses.forEach(item => {
          const key = `${date}-${item.concept}`;
          if (!financesMap.has(key)) {
            financesMap.set(key, {
              date,
              concept: item.concept,
              income: 0,
              expenses: 0,
              balance: 0
            });
          }
          const current = financesMap.get(key);
          current.expenses += item.amount;
          current.balance -= item.amount;
        });
      }
      
      // Totales del turno
      const totalKey = `${date}-Total del turno`;
      if (!financesMap.has(totalKey)) {
        financesMap.set(totalKey, {
          date,
          concept: 'Total del turno',
          income: 0,
          expenses: 0,
          balance: 0
        });
      }
      const totalEntry = financesMap.get(totalKey);
      totalEntry.income += turno.totals?.totalIngresos || 0;
      totalEntry.expenses += turno.totals?.totalGastos || 0;
      totalEntry.balance = totalEntry.income - totalEntry.expenses;
    });
    
    return Array.from(financesMap.values());
  } catch (error) {
    console.error('Error fetching finances data:', error);
    return [];
  }
};

/**
 * Obtener datos de ocupación (simulado - ajustar según tu estructura)
 */
export const fetchOccupancyData = async (startDate, endDate) => {
  try {
    // Esto dependerá de cómo manejes la ocupación en tu sistema
    // Por ahora retornamos datos calculados desde turnos
    
    const turnosRef = collection(db, 'turnos');
    const q = query(
      turnosRef,
      orderBy('createdAt', 'asc')
    );
    
    const snapshot = await getDocs(q);
    const turnos = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()
    }));
    
    // Filtrar por rango de fechas
    const filtered = turnos.filter(turno => {
      const turnoDate = turno.createdAt;
      if (!turnoDate) return false;
      
      const turnoDateStr = turnoDate.toISOString().split('T')[0];
      return turnoDateStr >= startDate && turnoDateStr <= endDate;
    });
    
    // Agrupar por fecha
    const occupancyMap = new Map();
    
    filtered.forEach(turno => {
      const date = turno.createdAt.toISOString().split('T')[0];
      
      if (!occupancyMap.has(date)) {
        occupancyMap.set(date, {
          date,
          totalRooms: 50, // Ajustar según tu hotel
          occupied: 0,
          available: 50,
          occupancyRate: 0,
          revenue: 0
        });
      }
      
      const entry = occupancyMap.get(date);
      
      // Contar check-ins del día (habitaciones ocupadas)
      const checkIns = turno.checkins?.filter(c => c.type === 'in').length || 0;
      entry.occupied += checkIns;
      
      // Sumar ingresos
      entry.revenue += turno.totals?.totalIngresos || 0;
    });
    
    // Calcular tasa de ocupación y disponibilidad
    return Array.from(occupancyMap.values()).map(entry => ({
      ...entry,
      available: entry.totalRooms - entry.occupied,
      occupancyRate: Math.round((entry.occupied / entry.totalRooms) * 100)
    }));
  } catch (error) {
    console.error('Error fetching occupancy data:', error);
    return [];
  }
};

/**
 * Función principal que obtiene datos según el tipo de reporte
 */
export const fetchReportData = async (reportType, startDate, endDate) => {
  switch (reportType) {
    case 'chlorine':
      return await fetchChlorineData(startDate, endDate);
    case 'cleaning':
      return await fetchCleaningData(startDate, endDate);
    case 'samples':
      return await fetchSamplesData(startDate, endDate);
    case 'reception':
      return await fetchReceptionData(startDate, endDate);
    case 'maintenance':
      return await fetchMaintenanceData(startDate, endDate);
    case 'shifts':
      return await fetchShiftsData(startDate, endDate);
    case 'finances':
      return await fetchFinancesData(startDate, endDate);
    case 'occupancy':
      return await fetchOccupancyData(startDate, endDate);
    default:
      return [];
  }
};
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection, addDoc, getDocs, getDoc, setDoc, doc,
  query, orderBy, limit, serverTimestamp, onSnapshot, where
} from 'firebase/firestore';
import {
  FaSun, FaCloudSun, FaMoon,
  FaPlus, FaTrash, FaReceipt,
  FaSignInAlt, FaSignOutAlt,
  FaMoneyBillWave, FaTools,
  FaCheck, FaLock,
  FaUser, FaClock, FaBed,
  FaFileInvoiceDollar, FaWallet,
  FaArrowUp, FaSpinner,
  FaPiggyBank, FaEdit, FaFilePdf, FaFileAlt,
  FaSignOutAlt as FaLogout
} from 'react-icons/fa';
import '../styles/Turnregister.css';
import { generateShiftHandoverPDF } from '../utils/shiftHandoverPDF';
import NightAuditModal from './NightAuditModal';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES Y UTILIDADES
// ═══════════════════════════════════════════════════════════════════════════

const todayStr = new Date().toLocaleDateString('es-CL', { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
});

const fmt = (n) => new Intl.NumberFormat('es-CL', { 
  style: 'currency', 
  currency: 'CLP', 
  maximumFractionDigits: 0 
}).format(n);

const uid = () => Math.random().toString(36).slice(2, 8);

const SHIFT_ORDER = ['morning', 'afternoon', 'night'];

const SHIFTS = {
  morning: { 
    label: 'Mañana', 
    hours: '06:00–14:00', 
    icon: <FaSun />, 
    cls: 'morning', 
    emoji: '🌅',
    startHour: 6,
    endHour: 14
  },
  afternoon: { 
    label: 'Tarde', 
    hours: '14:00–22:00', 
    icon: <FaCloudSun />, 
    cls: 'afternoon', 
    emoji: '🌤',
    startHour: 14,
    endHour: 22
  },
  night: { 
    label: 'Noche', 
    hours: '22:00–06:00', 
    icon: <FaMoon />, 
    cls: 'night', 
    emoji: '🌙',
    startHour: 22,
    endHour: 6
  },
};

const RECEPTIONIST_ROLES = ['receptionist'];

const INCOME_TYPES = [
  { value: 'alojamiento', label: 'Alojamiento', badge: 'badge-aloj' },
  { value: 'lavanderia', label: 'Lavandería', badge: 'badge-lav' },
  { value: 'otro', label: 'Otro', badge: 'badge-otro' },
];

const CI_CHECKS = {
  in: [
    { key: 'fotos', label: 'Fotos tomadas', icon: '📷' },
    { key: 'registro', label: 'Registro firmado', icon: '📋' },
    { key: 'llave', label: 'Llave entregada', icon: '🔑' },
    { key: 'pago', label: 'Pago recibido', icon: '💳' },
  ],
  out: [
    { key: 'llave', label: 'Llave devuelta', icon: '🔑' },
    { key: 'habitacion', label: 'Hab. revisada', icon: '🛏' },
    { key: 'cargos', label: 'Cargos cerrados', icon: '💰' },
    { key: 'factura', label: 'Factura entregada', icon: '🧾' },
  ],
};

const makeChecks = (type) => Object.fromEntries(CI_CHECKS[type].map(c => [c.key, false]));

const makeShiftData = () => ({ 
  checkins: [], 
  invoices: [], 
  cajaMayor: {
    income: [],
    totales: {
      efectivo: 0,
      tarjeta: 0,
      transferencia: 0,
      total: 0,
      alojamiento: 0,
      lavanderia: 0,
      otros: 0
    }
  },
  cajaMenor: {
    expenses: [],
    saldoInicial: null,
    saldoFinal: null
  },
  notes: '' 
});

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIÓN: DETECTAR TURNO AUTOMÁTICAMENTE
// ═══════════════════════════════════════════════════════════════════════════

const detectCurrentShift = () => {
  const now = new Date();
  const hours = now.getHours();
  
  if (hours >= 6 && hours < 14) return 'morning';
  if (hours >= 14 && hours < 22) return 'afternoon';
  return 'night';
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export default function TurnRegister({ onLogout }) {
  
  // ─── Estados de Sesión ──────────────────────────────────────────────────────
  
  const [currentUser, setCurrentUser] = useState(null); // Usuario logueado
  const [sessionId, setSessionId] = useState(null);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [detectedShift, setDetectedShift] = useState(() => detectCurrentShift());
  
  // ─── Estados de Autenticación ───────────────────────────────────────────────
  
  const [showLoginModal, setShowLoginModal] = useState(true);
  const [loginName, setLoginName] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [receptionists, setReceptionists] = useState([]);
  
  // ─── Estados de Datos ───────────────────────────────────────────────────────
  
  const [shiftData, setShiftData] = useState(() => makeShiftData());
  
  // ─── Estados de Caja Menor (Compartida) ─────────────────────────────────────
  
  const [cajaMenorSaldo, setCajaMenorSaldo] = useState(null);
  const [cajaMenorInput, setCajaMenorInput] = useState('');
  const [cajaMenorLocked, setCajaMenorLocked] = useState(false);
  const [cajaMenorInicial, setCajaMenorInicial] = useState(null);
  
  // ─── Estados UI ─────────────────────────────────────────────────────────────
  
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [showNightAudit, setShowNightAudit] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  
  // ─── Estados de Formularios ─────────────────────────────────────────────────
  
  const [ciForm, setCiForm] = useState({ 
    room: '', 
    guest: '', 
    type: 'in', 
    time: '', 
    checks: makeChecks('in') 
  });
  
  const [invForm, setInvForm] = useState({ 
    number: '', 
    guest: '', 
    amount: '', 
    method: 'efectivo' 
  });
  
  const [incForm, setIncForm] = useState({ 
    type: 'alojamiento', 
    concept: '', 
    amount: '', 
    method: 'efectivo' 
  });
  
  const [expForm, setExpForm] = useState({ 
    concept: '', 
    amount: '', 
    category: 'operativo' 
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // EFECTOS - INICIALIZACIÓN
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Cargar recepcionistas y caja menor al montar
  useEffect(() => {
    const init = async () => {
      try {
        // Cargar recepcionistas
        const usersQuery = query(
          collection(db, 'users'), 
          orderBy('name', 'asc')
        );
        const usersSnap = await getDocs(usersQuery);
        const usersList = usersSnap.docs
          .map(doc => doc.data())
          .filter(user => RECEPTIONIST_ROLES.includes(user.role) && user.active !== false);
        setReceptionists(usersList);
        
        // Cargar saldo de caja menor
        const cajaMenorDoc = await getDoc(doc(db, 'cajaMenor', 'saldo'));
        if (cajaMenorDoc.exists()) {
          const saldo = cajaMenorDoc.data().monto;
          setCajaMenorSaldo(saldo);
          setCajaMenorInicial(saldo);
          setCajaMenorLocked(true);
        } else {
          setCajaMenorSaldo(0);
          setCajaMenorInicial(0);
        }
        
      } catch (error) {
        console.error('Error en inicialización:', error);
        setCajaMenorSaldo(0);
        setCajaMenorInicial(0);
      }
    };
    
    init();
  }, []);
  
  // Verificar sesión guardada en localStorage
  useEffect(() => {
    const savedSession = localStorage.getItem('currentSession');
    
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        const now = Date.now();
        const hoursSince = (now - session.timestamp) / (1000 * 60 * 60);
        
        // Si la sesión tiene menos de 24 horas
        if (hoursSince < 24) {
          console.log('📦 Sesión encontrada:', session);
          setCurrentUser(session.user);
          setSessionId(session.sessionId);
          setSessionStartTime(new Date(session.startTime));
          setDetectedShift(session.shift);
          setShiftData(session.data);
          setShowLoginModal(false);
          
          showToast(`Bienvenido de vuelta, ${session.user}`, 'success');
        } else {
          // Sesión expirada
          localStorage.removeItem('currentSession');
        }
      } catch (error) {
        console.error('Error recuperando sesión:', error);
        localStorage.removeItem('currentSession');
      }
    }
  }, []);
  
  // Sincronización en tiempo real de caja menor
  useEffect(() => {
    if (!cajaMenorLocked || !currentUser) return;
    
    const unsubscribe = onSnapshot(
      doc(db, 'cajaMenor', 'saldo'),
      (doc) => {
        if (doc.exists()) {
          const newSaldo = doc.data().monto;
          const modificadoPor = doc.data().modificadoPor;
          
          if (modificadoPor && modificadoPor !== currentUser) {
            console.log(`🔄 Caja Menor actualizada por ${modificadoPor}: ${fmt(newSaldo)}`);
            showToast(`Caja menor actualizada por ${modificadoPor}`, 'info');
          }
          
          setCajaMenorSaldo(newSaldo);
        }
      },
      (error) => {
        console.error('Error en sync de caja menor:', error);
      }
    );
    
    return () => unsubscribe();
  }, [cajaMenorLocked, currentUser]);
  
  // Auto-guardado cada 30 segundos
  useEffect(() => {
    if (!currentUser) return;
    
    const interval = setInterval(() => {
      saveToLocalStorage();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [currentUser, shiftData, detectedShift, cajaMenorSaldo]);
  
  // Guardar al salir
  useEffect(() => {
    if (!currentUser) return;
    
    const handleBeforeUnload = () => {
      saveToLocalStorage();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      saveToLocalStorage();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentUser, shiftData, detectedShift, cajaMenorSaldo]);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FUNCIONES - SESIÓN Y AUTENTICACIÓN
  // ═══════════════════════════════════════════════════════════════════════════
  
  const saveToLocalStorage = () => {
    if (!currentUser) return;
    
    const hasData = 
      (shiftData?.cajaMayor?.income?.length || 0) > 0 ||
      (shiftData?.cajaMenor?.expenses?.length || 0) > 0 ||
      (shiftData?.checkins?.length || 0) > 0 ||
      (shiftData?.invoices?.length || 0) > 0 ||
      (shiftData?.notes?.trim() || '').length > 0;
    
    if (!hasData) return;
    
    try {
      const session = {
        user: currentUser,
        sessionId: sessionId,
        shift: detectedShift,
        startTime: sessionStartTime,
        data: shiftData,
        cajaMenor: cajaMenorSaldo,
        timestamp: Date.now()
      };
      
      localStorage.setItem('currentSession', JSON.stringify(session));
      setLastSaved(new Date());
      console.log('💾 Auto-guardado exitoso');
    } catch (error) {
      console.error('Error guardando en localStorage:', error);
    }
  };
  
  const handleLogin = async () => {
    setLoginError('');
    
    if (!loginName.trim() || !loginPassword.trim()) {
      setLoginError('Completa todos los campos');
      return;
    }
    
    setSaving(true);
    
    try {
      // Buscar usuario
      const usersQuery = query(collection(db, 'users'));
      const usersSnap = await getDocs(usersQuery);
      const user = usersSnap.docs.find(doc => doc.data().name === loginName);
      
      if (!user) {
        setLoginError('Usuario no encontrado');
        setSaving(false);
        return;
      }
      
      const userData = user.data();
      
      // Validar contraseña
      if (userData.password !== loginPassword) {
        setLoginError('Contraseña incorrecta');
        setSaving(false);
        return;
      }
      
      // Validar rol
      if (!RECEPTIONIST_ROLES.includes(userData.role)) {
        setLoginError('No tienes permisos de recepcionista');
        setSaving(false);
        return;
      }
      
      // Detectar turno actual
      const currentShift = detectCurrentShift();
      
      // Crear sesión
      const newSessionId = `${loginName.replace(/\s/g, '_')}_${Date.now()}`;
      const startTime = new Date();
      
      setCurrentUser(loginName);
      setSessionId(newSessionId);
      setSessionStartTime(startTime);
      setDetectedShift(currentShift);
      setShowLoginModal(false);
      
      // Guardar sesión en localStorage
      const session = {
        user: loginName,
        sessionId: newSessionId,
        shift: currentShift,
        startTime: startTime,
        data: makeShiftData(),
        cajaMenor: cajaMenorSaldo,
        timestamp: Date.now()
      };
      
      localStorage.setItem('currentSession', JSON.stringify(session));
      
      // Registrar sesión activa en Firebase
      await setDoc(doc(db, 'activeSessions', newSessionId), {
        receptionist: loginName,
        shift: currentShift,
        startTime: serverTimestamp(),
        isActive: true,
        lastUpdate: serverTimestamp()
      });
      
      showToast(`Bienvenido ${loginName} - Turno ${SHIFTS[currentShift].label}`, 'success');
      
      console.log('✅ Sesión iniciada:', {
        user: loginName,
        shift: currentShift,
        sessionId: newSessionId
      });
      
    } catch (error) {
      console.error('Error en login:', error);
      setLoginError('Error al iniciar sesión');
    } finally {
      setSaving(false);
    }
  };
  
  const handleLogout = async () => {
    if (!window.confirm('¿Cerrar sesión sin entregar turno?\n\nTus datos se guardarán para continuar después.')) {
      return;
    }
    
    // Guardar antes de salir
    saveToLocalStorage();
    
    // Desactivar sesión en Firebase
    if (sessionId) {
      try {
        await setDoc(doc(db, 'activeSessions', sessionId), {
          isActive: false,
          lastUpdate: serverTimestamp()
        }, { merge: true });
      } catch (error) {
        console.error('Error desactivando sesión:', error);
      }
    }
    
    // RESET TOTAL (pero SIN borrar localStorage - se mantiene para volver)
    setCurrentUser(null);
    setSessionId(null);
    setSessionStartTime(null);
    setDetectedShift(() => detectCurrentShift());
    
    // NO resetear shiftData - se mantiene en localStorage
    
    // Limpiar estados de autenticación
    setShowLoginModal(true);
    setLoginName('');
    setLoginPassword('');
    setLoginError('');
    
    // Limpiar estados UI
    setToast(null);
    setShowNightAudit(false);
    
    // Limpiar formularios
    setCiForm({ room: '', guest: '', type: 'in', time: '', checks: makeChecks('in') });
    setInvForm({ number: '', guest: '', amount: '', method: 'efectivo' });
    setIncForm({ type: 'alojamiento', concept: '', amount: '', method: 'efectivo' });
    setExpForm({ concept: '', amount: '', category: 'operativo' });
    
    showToast('Sesión cerrada. Datos guardados.', 'info');
  };
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FUNCIONES - CAJA MENOR
  // ═══════════════════════════════════════════════════════════════════════════
  
  const handleSetSaldo = async () => {
    const monto = parseFloat(cajaMenorInput);
    if (isNaN(monto) || monto < 0) return;
    
    try {
      await setDoc(doc(db, 'cajaMenor', 'saldo'), { 
        monto, 
        actualizadoEn: serverTimestamp(),
        actualizadoPor: currentUser
      });
      
      setCajaMenorSaldo(monto);
      setCajaMenorInicial(monto);
      setCajaMenorLocked(true);
      showToast(`Saldo caja menor: ${fmt(monto)}`, 'success');
    } catch (error) {
      showToast('Error al guardar saldo', 'error');
    }
  };
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FUNCIONES - FORMULARIOS
  // ═══════════════════════════════════════════════════════════════════════════
  
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };
  
  const handleCiTypeChange = (newType) => {
    setCiForm(p => ({ ...p, type: newType, checks: makeChecks(newType) }));
  };
  
  const toggleCheck = (key) => {
    setCiForm(p => ({ ...p, checks: { ...p.checks, [key]: !p.checks[key] } }));
  };
  
  const addCheckin = () => {
    if (!ciForm.room || !ciForm.guest) return;
    
    const newCheckin = { 
      id: uid(), 
      ...ciForm, 
      time: ciForm.time || new Date().toTimeString().slice(0, 5),
      addedBy: currentUser,
      timestamp: new Date().toISOString()
    };
    
    setShiftData(prev => ({
      ...prev,
      checkins: [newCheckin, ...(prev?.checkins || [])]
    }));
    
    setCiForm({ room: '', guest: '', type: 'in', time: '', checks: makeChecks('in') });
  };
  
  const addInvoice = () => {
    if (!invForm.number || !invForm.amount) return;
    
    const newInvoice = { 
      id: uid(), 
      ...invForm, 
      amount: parseFloat(invForm.amount),
      addedBy: currentUser,
      timestamp: new Date().toISOString()
    };
    
    setShiftData(prev => ({
      ...prev,
      invoices: [newInvoice, ...(prev?.invoices || [])]
    }));
    
    setInvForm({ number: '', guest: '', amount: '', method: 'efectivo' });
  };
  
  const addIncome = () => {
    if (!incForm.amount) return;
    
    const typeLabel = INCOME_TYPES.find(t => t.value === incForm.type)?.label || incForm.type;
    const amount = parseFloat(incForm.amount);
    
    const newIncome = { 
      id: uid(), 
      ...incForm, 
      amount: amount, 
      typeLabel,
      addedBy: currentUser,
      timestamp: new Date().toISOString()
    };
    
    setShiftData(prev => ({
      ...prev,
      cajaMayor: {
        ...(prev?.cajaMayor || {}),
        income: [newIncome, ...(prev?.cajaMayor?.income || [])]
      }
    }));
    
    setIncForm({ type: 'alojamiento', concept: '', amount: '', method: 'efectivo' });
  };
  
  const addExpense = async () => {
    if (!expForm.concept || !expForm.amount) return;
    
    const monto = parseFloat(expForm.amount);
    
    if (cajaMenorSaldo !== null && monto > cajaMenorSaldo) { 
      showToast('Saldo insuficiente en caja menor', 'error'); 
      return; 
    }
    
    const newExpense = { 
      id: uid(), 
      ...expForm, 
      amount: monto,
      addedBy: currentUser,
      timestamp: new Date().toISOString()
    };
    
    // Actualizar localmente
    setShiftData(prev => ({
      ...prev,
      cajaMenor: {
        ...(prev?.cajaMenor || {}),
        expenses: [newExpense, ...(prev?.cajaMenor?.expenses || [])]
      }
    }));
    
    // Actualizar Firebase
    const newSaldo = cajaMenorSaldo - monto;
    
    try {
      await setDoc(doc(db, 'cajaMenor', 'saldo'), { 
        monto: newSaldo, 
        actualizadoEn: serverTimestamp(),
        actualizadoPor: currentUser,
        ultimoGasto: {
          concepto: expForm.concept,
          monto: monto,
          por: currentUser
        }
      });
      
      console.log(`💸 Gasto registrado: $${monto} por ${currentUser}`);
    } catch (error) {
      console.error('Error actualizando caja menor:', error);
      showToast('Error al actualizar caja menor', 'error');
    }
    
    setExpForm({ concept: '', amount: '', category: 'operativo' });
  };
  
  const delExpense = async (id) => {
    const expenses = shiftData?.cajaMenor?.expenses || [];
    const expense = expenses.find(e => e.id === id);
    
    if (expense) {
      const newSaldo = cajaMenorSaldo + expense.amount;
      
      try {
        await setDoc(doc(db, 'cajaMenor', 'saldo'), { 
          monto: newSaldo, 
          actualizadoEn: serverTimestamp(),
          actualizadoPor: currentUser
        });
        
        console.log(`♻️ Gasto eliminado: $${expense.amount} restaurado`);
      } catch (error) {
        console.error('Error restaurando caja menor:', error);
      }
    }
    
    setShiftData(prev => ({
      ...prev,
      cajaMenor: {
        ...prev.cajaMenor,
        expenses: expenses.filter(e => e.id !== id)
      }
    }));
  };
  
  const delCheckin = (id) => {
    setShiftData(prev => ({
      ...prev,
      checkins: (prev?.checkins || []).filter(c => c.id !== id)
    }));
  };
  
  const delInvoice = (id) => {
    setShiftData(prev => ({
      ...prev,
      invoices: (prev?.invoices || []).filter(i => i.id !== id)
    }));
  };
  
  const delIncome = (id) => {
    setShiftData(prev => ({
      ...prev,
      cajaMayor: {
        ...prev.cajaMayor,
        income: (prev?.cajaMayor?.income || []).filter(i => i.id !== id)
      }
    }));
  };
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FUNCIONES - CIERRE DE TURNO
  // ═══════════════════════════════════════════════════════════════════════════
  
  const handleCloseShift = async () => {
    if (saving) return;
    
    if (!window.confirm(
      `¿Entregar turno ${SHIFTS[detectedShift].label}?\n\n` +
      `Esto generará el PDF y cerrará tu sesión.`
    )) {
      return;
    }
    
    setSaving(true);
    
    try {
      // Calcular horas trabajadas
      const endTime = new Date();
      const horasTrabajadas = sessionStartTime 
        ? ((endTime - sessionStartTime) / (1000 * 60 * 60)).toFixed(2)
        : 0;
      
      // Calcular totales
      const cajaMayorIncome = shiftData?.cajaMayor?.income || [];
      const totalIngresos = cajaMayorIncome.reduce((s, i) => s + i.amount, 0);
      const totalAloj = cajaMayorIncome.filter(i => i.type === 'alojamiento').reduce((s, i) => s + i.amount, 0);
      const totalLav = cajaMayorIncome.filter(i => i.type === 'lavanderia').reduce((s, i) => s + i.amount, 0);
      const totalOtros = cajaMayorIncome.filter(i => i.type === 'otro').reduce((s, i) => s + i.amount, 0);
      const totalEfectivo = cajaMayorIncome.filter(i => i.method === 'efectivo').reduce((s, i) => s + i.amount, 0);
      const totalTarjeta = cajaMayorIncome.filter(i => i.method === 'tarjeta').reduce((s, i) => s + i.amount, 0);
      const totalTransferencia = cajaMayorIncome.filter(i => i.method === 'transferencia').reduce((s, i) => s + i.amount, 0);
      
      const cajaMenorExpenses = shiftData?.cajaMenor?.expenses || [];
      const misGastos = cajaMenorExpenses.filter(e => e.addedBy === currentUser);
      const totalMisGastos = misGastos.reduce((s, i) => s + i.amount, 0);
      const totalGastos = cajaMenorExpenses.reduce((s, i) => s + i.amount, 0);
      
      const totalInvoices = (shiftData?.invoices || []).reduce((s, i) => s + i.amount, 0);
      
      // Preparar documento
      const turnoData = {
        sessionId: sessionId,
        receptionist: currentUser,
        shift: detectedShift,
        shiftLabel: SHIFTS[detectedShift].label,
        date: new Date().toISOString().slice(0, 10),
        startTime: sessionStartTime,
        endTime: endTime,
        horasTrabajadas: parseFloat(horasTrabajadas),
        
        cajaMayor: {
          income: cajaMayorIncome,
          totales: {
            total: totalIngresos,
            alojamiento: totalAloj,
            lavanderia: totalLav,
            otros: totalOtros,
            efectivo: totalEfectivo,
            tarjeta: totalTarjeta,
            transferencia: totalTransferencia
          }
        },
        
        cajaMenor: {
          saldoInicial: cajaMenorInicial || cajaMenorSaldo,
          saldoFinal: cajaMenorSaldo,
          misGastos: misGastos,
          totalMisGastos: totalMisGastos,
          todosLosGastos: cajaMenorExpenses,
          totalGastos: totalGastos
        },
        
        checkins: shiftData?.checkins || [],
        invoices: shiftData?.invoices || [],
        notes: shiftData?.notes || '',
        
        totals: {
          cajaMayor: totalIngresos,
          misGastosCajaMenor: totalMisGastos,
          todosGastosCajaMenor: totalGastos,
          facturas: totalInvoices,
          facturasCount: (shiftData?.invoices || []).length,
          checkinsCount: (shiftData?.checkins || []).filter(c => c.type === 'in').length,
          checkoutsCount: (shiftData?.checkins || []).filter(c => c.type === 'out').length
        },
        
        createdAt: serverTimestamp()
      };
      
      // Guardar en Firebase
      await addDoc(collection(db, 'turnos'), turnoData);
      
      // Generar PDF
      await generateShiftHandoverPDF(turnoData, detectedShift, currentUser, cajaMenorSaldo);
      
      // Desactivar sesión
      if (sessionId) {
        await setDoc(doc(db, 'activeSessions', sessionId), {
          isActive: false,
          endTime: serverTimestamp()
        }, { merge: true });
      }
      
      // Limpiar COMPLETAMENTE localStorage
      localStorage.clear();
      
      console.log(`✅ Turno entregado: ${currentUser} - ${SHIFTS[detectedShift].label}`);
      
      // RESET TOTAL DE LA APLICACIÓN
      // Limpiar TODOS los estados a sus valores iniciales
      setCurrentUser(null);
      setSessionId(null);
      setSessionStartTime(null);
      setDetectedShift(() => detectCurrentShift());
      setShiftData(makeShiftData());
      
      // Limpiar estados de autenticación
      setShowLoginModal(true);
      setLoginName('');
      setLoginPassword('');
      setLoginError('');
      
      // Limpiar estados de caja menor
      setCajaMenorSaldo(null);
      setCajaMenorInput('');
      setCajaMenorLocked(false);
      setCajaMenorInicial(null);
      
      // Limpiar estados UI
      setToast(null);
      setShowNightAudit(false);
      setLastSaved(null);
      
      // Limpiar formularios
      setCiForm({ room: '', guest: '', type: 'in', time: '', checks: makeChecks('in') });
      setInvForm({ number: '', guest: '', amount: '', method: 'efectivo' });
      setIncForm({ type: 'alojamiento', concept: '', amount: '', method: 'efectivo' });
      setExpForm({ concept: '', amount: '', category: 'operativo' });
      
      // Recargar datos básicos (recepcionistas y caja menor)
      setTimeout(async () => {
        try {
          // Recargar recepcionistas
          const usersQuery = query(collection(db, 'users'), orderBy('name', 'asc'));
          const usersSnap = await getDocs(usersQuery);
          const usersList = usersSnap.docs
            .map(doc => doc.data())
            .filter(user => RECEPTIONIST_ROLES.includes(user.role) && user.active !== false);
          setReceptionists(usersList);
          
          // Recargar saldo de caja menor
          const cajaMenorDoc = await getDoc(doc(db, 'cajaMenor', 'saldo'));
          if (cajaMenorDoc.exists()) {
            const saldo = cajaMenorDoc.data().monto;
            setCajaMenorSaldo(saldo);
            setCajaMenorInicial(saldo);
            setCajaMenorLocked(true);
          } else {
            setCajaMenorSaldo(0);
            setCajaMenorInicial(0);
          }
        } catch (error) {
          console.error('Error recargando datos:', error);
        }
      }, 500);
      
    } catch (error) {
      console.error('Error al cerrar turno:', error);
      showToast('Error al entregar turno', 'error');
    } finally {
      setSaving(false);
    }
    if (onLogout) {
      onLogout(); // ← Cierra TODO el sistema
    }
  };
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CÁLCULOS
  // ═══════════════════════════════════════════════════════════════════════════
  
  const cajaMayorIncome = shiftData?.cajaMayor?.income || [];
  const totalIngresos = cajaMayorIncome.reduce((s, i) => s + i.amount, 0);
  const totalAloj = cajaMayorIncome.filter(i => i.type === 'alojamiento').reduce((s, i) => s + i.amount, 0);
  const totalLav = cajaMayorIncome.filter(i => i.type === 'lavanderia').reduce((s, i) => s + i.amount, 0);
  const totalOtros = cajaMayorIncome.filter(i => i.type === 'otro').reduce((s, i) => s + i.amount, 0);
  
  const totalEfectivo = cajaMayorIncome.filter(i => i.method === 'efectivo').reduce((s, i) => s + i.amount, 0);
  const totalTarjeta = cajaMayorIncome.filter(i => i.method === 'tarjeta').reduce((s, i) => s + i.amount, 0);
  const totalTransferencia = cajaMayorIncome.filter(i => i.method === 'transferencia').reduce((s, i) => s + i.amount, 0);
  
  const cajaMenorExpenses = shiftData?.cajaMenor?.expenses || [];
  const misGastos = cajaMenorExpenses.filter(e => e.addedBy === currentUser);
  const totalMisGastos = misGastos.reduce((s, i) => s + i.amount, 0);
  const totalGastos = cajaMenorExpenses.reduce((s, i) => s + i.amount, 0);
  
  const totalInvoices = (shiftData?.invoices || []).reduce((s, i) => s + i.amount, 0);
  
  const activeChecks = CI_CHECKS[ciForm.type];
  
  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Modal de Login
  if (showLoginModal) {
    return (
      <div className="modal-overlay" style={{ background: 'rgba(13, 13, 19, 0.95)' }}>
        <div className="modal-box" style={{ maxWidth: 400 }}>
          <span className="modal-icon">🏨</span>
          <h2>Hotel Cytrico</h2>
          <p>Inicia sesión para comenzar tu turno</p>
          
          <div className="modal-shift-badge" style={{ marginBottom: 20 }}>
            {SHIFTS[detectedShift].icon}
            Turno Detectado: {SHIFTS[detectedShift].label}
            <span style={{ fontSize: '0.8rem', opacity: 0.6, display: 'block', marginTop: 4 }}>
              {SHIFTS[detectedShift].hours}
            </span>
          </div>
          
          <div className="modal-field">
            <label>Recepcionista</label>
            <select
              value={loginName}
              onChange={e => setLoginName(e.target.value)}
              autoFocus
            >
              <option value="">Selecciona tu nombre...</option>
              {receptionists.map((user, idx) => (
                <option key={idx} value={user.name}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="modal-field">
            <label>Contraseña</label>
            <div className="password-input-wrapper">
              <FaLock className="password-icon" />
              <input
                type="password"
                placeholder="Ingresa tu contraseña"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
            </div>
            {loginError && <span className="modal-error">{loginError}</span>}
          </div>
          
          <button 
            className="btn-start-shift" 
            onClick={handleLogin}
            disabled={!loginName || !loginPassword || saving}
          >
            {saving ? (
              <><FaSpinner className="spinning" /> Validando...</>
            ) : (
              <><FaCheck /> Iniciar Sesión</>
            )}
          </button>
        </div>
      </div>
    );
  }
  
  // Vista Principal
  return (
    <div className="tr-root">
      <header className="tr-header">
        <div className="tr-header-left">
          <h1>Registro de Turno</h1>
          <p>Gestión de operaciones · Hotel Cytrico</p>
        </div>
        
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="receptionist-badge">
            <FaUser />
            <span>{currentUser}</span>
          </div>
          
          <div className="shift-badge" style={{
            padding: '8px 14px',
            background: 'rgba(91, 91, 255, 0.1)',
            border: '1px solid rgba(91, 91, 255, 0.3)',
            borderRadius: '8px',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: '#9090ff'
          }}>
            {SHIFTS[detectedShift].icon}
            {SHIFTS[detectedShift].label}
          </div>
          
          {detectedShift === 'night' && (
            <button 
              className="btn-night-audit"
              onClick={() => setShowNightAudit(true)}
            >
              <FaFileAlt /> Auditoría
            </button>
          )}
          
          <div className="tr-date-badge">
            <FaClock />
            <span style={{ textTransform: 'capitalize' }}>{todayStr}</span>
          </div>
          
          {lastSaved && (
            <div style={{ 
              fontSize: '0.7rem', 
              color: '#10b981', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 4 
            }}>
              💾 {lastSaved.toLocaleTimeString('es-CL')}
            </div>
          )}
          
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 12px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              color: '#ef4444',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.85rem'
            }}
          >
            <FaLogout /> Salir
          </button>
        </div>
      </header>

      <div className="tr-content">
        <div className="tr-full cajas-row">
          <div className="caja-card caja-principal">
            <div className="caja-label"><FaMoneyBillWave /> Caja Principal</div>
            <div className="caja-amount">{fmt(totalIngresos)}</div>
            <div className="caja-sub">
              Aloj. {fmt(totalAloj)} · Lav. {fmt(totalLav)} · Otros {fmt(totalOtros)}
            </div>
          </div>
          
          <div className="caja-card caja-menor">
            <div className="caja-label"><FaPiggyBank /> Caja Menor</div>
            <div className="caja-amount">
              {cajaMenorSaldo !== null ? fmt(cajaMenorSaldo) : '—'}
            </div>
            <div className="caja-sub">Gastos del turno: {fmt(totalGastos)}</div>
            
            {!cajaMenorLocked ? (
              <div className="caja-menor-init">
                <input 
                  type="number" 
                  placeholder="Saldo inicial $" 
                  value={cajaMenorInput} 
                  onChange={e => setCajaMenorInput(e.target.value)} 
                />
                <button className="btn-set-saldo" onClick={handleSetSaldo}>
                  <FaCheck /> Guardar
                </button>
              </div>
            ) : (
              <div className="saldo-bloqueado">
                <FaLock /> Saldo establecido
                <button 
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    color: '#6a4a9a', 
                    cursor: 'pointer', 
                    marginLeft: 3 
                  }}
                  onClick={() => { 
                    setCajaMenorLocked(false); 
                    setCajaMenorInput(cajaMenorSaldo ?? ''); 
                  }}
                >
                  <FaEdit style={{ fontSize: '0.7rem' }} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Check-in / Check-out */}
        <div className="tr-panel">
          <div className="tr-panel-header">
            <div className="tr-panel-title">
              <div className="tr-panel-icon icon-purple"><FaBed /></div>
              Check-in / Check-out
            </div>
            <span style={{ fontSize: '0.72rem', color: '#5a5a7a' }}>
              {shiftData?.checkins?.length || 0} registros
            </span>
          </div>
          
          <div className="tr-form">
            <div className="tr-field" style={{ maxWidth: 65 }}>
              <label>Hab.</label>
              <input 
                placeholder="305" 
                value={ciForm.room} 
                onChange={e => setCiForm(p => ({ ...p, room: e.target.value }))} 
              />
            </div>
            <div className="tr-field">
              <label>Huésped</label>
              <input 
                placeholder="Nombre completo" 
                value={ciForm.guest} 
                onChange={e => setCiForm(p => ({ ...p, guest: e.target.value }))} 
              />
            </div>
            <div className="tr-field" style={{ maxWidth: 110 }}>
              <label>Tipo</label>
              <select value={ciForm.type} onChange={e => handleCiTypeChange(e.target.value)}>
                <option value="in">Check-in</option>
                <option value="out">Check-out</option>
              </select>
            </div>
            <div className="tr-field" style={{ maxWidth: 85 }}>
              <label>Hora</label>
              <input 
                type="time" 
                value={ciForm.time} 
                onChange={e => setCiForm(p => ({ ...p, time: e.target.value }))} 
              />
            </div>
          </div>
          
          <div className="ci-checklist">
            <span className="ci-checklist-label">
              {ciForm.type === 'in' ? '✅ Check-in:' : '✅ Check-out:'}
            </span>
            {activeChecks.map(c => {
              const isChecked = !!ciForm.checks[c.key];
              return (
                <label 
                  key={c.key} 
                  className={`ci-check ${isChecked ? (ciForm.type === 'in' ? 'checked-in' : 'checked-out') : ''}`}
                  onClick={() => toggleCheck(c.key)}
                >
                  <div className="ci-check-dot" />{c.icon} {c.label}
                </label>
              );
            })}
            <button className="btn-add" style={{ marginLeft: 'auto' }} onClick={addCheckin}>
              <FaPlus /> Agregar
            </button>
          </div>
          
          <div className="tr-list">
            {(!shiftData?.checkins || shiftData.checkins.length === 0) ? (
              <div className="tr-empty">Sin movimientos en este turno</div>
            ) : (
              shiftData.checkins.map(ci => {
                const checksDefn = CI_CHECKS[ci.type] || [];
                return (
                  <div key={ci.id} className="tr-item">
                    <span 
                      className="tr-item-icon" 
                      style={{ color: ci.type === 'in' ? '#4ade80' : '#60a5fa', paddingTop: 3 }}
                    >
                      {ci.type === 'in' ? <FaSignInAlt /> : <FaSignOutAlt />}
                    </span>
                    <div className="tr-item-body">
                      <div className="tr-item-title">
                        Hab. {ci.room} · {ci.guest} 
                        <span style={{ opacity: 0.45, fontWeight: 400 }}>· {ci.time}</span>
                      </div>
                      <div className="ci-tags">
                        {checksDefn.map(c => (
                          <span key={c.key} className={`ci-tag ${ci.checks?.[c.key] ? '' : 'missing'}`}>
                            {c.icon} {ci.checks?.[c.key] ? c.label : `Sin ${c.label.toLowerCase()}`}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span 
                      className={`type-badge ${ci.type === 'in' ? 'badge-in' : 'badge-out'}`} 
                      style={{ alignSelf: 'flex-start', marginTop: 2 }}
                    >
                      {ci.type === 'in' ? 'Check-in' : 'Check-out'}
                    </span>
                    <button className="btn-del" onClick={() => delCheckin(ci.id)}>
                      <FaTrash />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Ingresos */}
        <div className="tr-panel">
          <div className="tr-panel-header">
            <div className="tr-panel-title">
              <div className="tr-panel-icon icon-green"><FaWallet /></div>
              Ingresos — Caja Principal
            </div>
            <span className="sum-green" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '0.92rem' }}>
              {fmt(totalIngresos)}
            </span>
          </div>
          
          <div className="tr-form">
            <div className="tr-field" style={{ maxWidth: 130 }}>
              <label>Tipo</label>
              <select value={incForm.type} onChange={e => setIncForm(p => ({ ...p, type: e.target.value }))}>
                {INCOME_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="tr-field">
              <label>
                {incForm.type === 'alojamiento' ? 'Hab. / Huésped' : 
                 incForm.type === 'lavanderia' ? 'Detalle' : 'Concepto'}
              </label>
              <input
                placeholder={
                  incForm.type === 'alojamiento' ? 'Hab. 305 · Smith' : 
                  incForm.type === 'lavanderia' ? '2 camisas, 1 pantalón' : 'Descripción'
                }
                value={incForm.concept} 
                onChange={e => setIncForm(p => ({ ...p, concept: e.target.value }))} 
              />
            </div>
            <div className="tr-field" style={{ maxWidth: 95 }}>
              <label>Monto $</label>
              <input 
                type="number" 
                placeholder="0" 
                value={incForm.amount} 
                onChange={e => setIncForm(p => ({ ...p, amount: e.target.value }))} 
              />
            </div>
            <div className="tr-field" style={{ maxWidth: 115 }}>
              <label>Método</label>
              <select value={incForm.method} onChange={e => setIncForm(p => ({ ...p, method: e.target.value }))}>
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="transferencia">Transferencia</option>
              </select>
            </div>
            <button className="btn-add" onClick={addIncome}><FaPlus /> Agregar</button>
          </div>
          
          <div className="tr-list">
            {cajaMayorIncome.length === 0 ? (
              <div className="tr-empty">Sin ingresos registrados</div>
            ) : (
              cajaMayorIncome.map(inc => {
                const typeInfo = INCOME_TYPES.find(t => t.value === inc.type);
                return (
                  <div key={inc.id} className="tr-item">
                    <span className="tr-item-icon" style={{ color: '#4ade80' }}>
                      <FaArrowUp />
                    </span>
                    <div className="tr-item-body">
                      <div className="tr-item-title">{inc.concept || inc.typeLabel}</div>
                      <div className="tr-item-sub">{inc.method}</div>
                    </div>
                    <span className={`type-badge ${typeInfo?.badge}`}>{inc.typeLabel}</span>
                    <span className="tr-item-amount amount-pos" style={{ marginLeft: 6 }}>
                      +{fmt(inc.amount)}
                    </span>
                    <button className="btn-del" onClick={() => delIncome(inc.id)}>
                      <FaTrash />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Facturas */}
        <div className="tr-panel">
          <div className="tr-panel-header">
            <div className="tr-panel-title">
              <div className="tr-panel-icon icon-blue"><FaReceipt /></div>
              Facturas Emitidas
            </div>
            <span className="sum-blue" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '0.92rem' }}>
              {fmt(totalInvoices)}
            </span>
          </div>
          
          <div className="tr-form">
            <div className="tr-field" style={{ maxWidth: 95 }}>
              <label>N° Factura</label>
              <input 
                placeholder="F-0001" 
                value={invForm.number} 
                onChange={e => setInvForm(p => ({ ...p, number: e.target.value }))} 
              />
            </div>
            <div className="tr-field">
              <label>Cliente</label>
              <input 
                placeholder="Nombre / empresa" 
                value={invForm.guest} 
                onChange={e => setInvForm(p => ({ ...p, guest: e.target.value }))} 
              />
            </div>
            <div className="tr-field" style={{ maxWidth: 95 }}>
              <label>Monto $</label>
              <input 
                type="number" 
                placeholder="0" 
                value={invForm.amount} 
                onChange={e => setInvForm(p => ({ ...p, amount: e.target.value }))} 
              />
            </div>
            <div className="tr-field" style={{ maxWidth: 115 }}>
              <label>Método</label>
              <select value={invForm.method} onChange={e => setInvForm(p => ({ ...p, method: e.target.value }))}>
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="transferencia">Transferencia</option>
              </select>
            </div>
            <button className="btn-add" onClick={addInvoice}><FaPlus /> Agregar</button>
          </div>
          
          <div className="tr-list">
            {(!shiftData?.invoices || shiftData.invoices.length === 0) ? (
              <div className="tr-empty">Sin facturas emitidas</div>
            ) : (
              shiftData.invoices.map(inv => (
                <div key={inv.id} className="tr-item">
                  <span className="tr-item-icon" style={{ color: '#60a5fa' }}>
                    <FaFileInvoiceDollar />
                  </span>
                  <div className="tr-item-body">
                    <div className="tr-item-title">{inv.number} · {inv.guest || 'Sin nombre'}</div>
                    <div className="tr-item-sub">{inv.method}</div>
                  </div>
                  <span className="tr-item-amount amount-neu">{fmt(inv.amount)}</span>
                  <button className="btn-del" onClick={() => delInvoice(inv.id)}>
                    <FaTrash />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Gastos */}
        <div className="tr-panel tr-full">
          <div className="tr-panel-header">
            <div className="tr-panel-title">
              <div className="tr-panel-icon icon-purple"><FaPiggyBank /></div>
              Gastos — Caja Menor
            </div>
            <span className="sum-purple" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '0.92rem' }}>
              Saldo: {cajaMenorSaldo !== null ? fmt(cajaMenorSaldo) : '—'}
            </span>
          </div>
          
          <div className="tr-form">
            <div className="tr-field">
              <label>Concepto</label>
              <input 
                placeholder="Descripción del gasto" 
                value={expForm.concept} 
                onChange={e => setExpForm(p => ({ ...p, concept: e.target.value }))} 
              />
            </div>
            <div className="tr-field" style={{ maxWidth: 95 }}>
              <label>Monto $</label>
              <input 
                type="number" 
                placeholder="0" 
                value={expForm.amount} 
                onChange={e => setExpForm(p => ({ ...p, amount: e.target.value }))} 
              />
            </div>
            <div className="tr-field" style={{ maxWidth: 130 }}>
              <label>Categoría</label>
              <select value={expForm.category} onChange={e => setExpForm(p => ({ ...p, category: e.target.value }))}>
                <option value="operativo">Operativo</option>
                <option value="mantenimiento">Mantenimiento</option>
                <option value="limpieza">Limpieza</option>
                <option value="alimentos">Alimentos</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <button className="btn-add purple" onClick={addExpense}><FaPlus /> Agregar</button>
          </div>
          
          <div className="tr-list" style={{ maxHeight: 160 }}>
            {cajaMenorExpenses.length === 0 ? (
              <div className="tr-empty">Sin gastos de caja menor en este turno</div>
            ) : (
              cajaMenorExpenses.map(exp => (
                <div key={exp.id} className="tr-item">
                  <span className="tr-item-icon" style={{ color: '#c084fc' }}>
                    <FaTools />
                  </span>
                  <div className="tr-item-body">
                    <div className="tr-item-title">
                      {exp.concept}
                      {exp.addedBy && exp.addedBy !== currentUser && (
                        <span style={{ fontSize: '0.75rem', opacity: 0.5, marginLeft: 6 }}>
                          (por {exp.addedBy})
                        </span>
                      )}
                    </div>
                    <div className="tr-item-sub">{exp.category}</div>
                  </div>
                  <span className="tr-item-amount amount-purple">-{fmt(exp.amount)}</span>
                  <button 
                    className="btn-del" 
                    onClick={() => delExpense(exp.id)}
                    disabled={exp.addedBy && exp.addedBy !== currentUser}
                    title={exp.addedBy && exp.addedBy !== currentUser ? `Solo ${exp.addedBy} puede eliminar` : ''}
                  >
                    <FaTrash />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Cierre */}
        <div className="tr-panel tr-full">
          <div className="tr-panel-header">
            <div className="tr-panel-title">
              <div className="tr-panel-icon icon-purple"><FaUser /></div>
              Cierre y Entrega de Turno
            </div>
          </div>
          
          <div className="entrega-info">
            <div className="ei-item">
              <span className="ei-label">Ingresos totales</span>
              <span className="ei-val sum-green">{fmt(totalIngresos)}</span>
            </div>
            <div className="ei-item">
              <span className="ei-label">Alojamiento</span>
              <span className="ei-val" style={{ color: '#60a5fa' }}>{fmt(totalAloj)}</span>
            </div>
            <div className="ei-item">
              <span className="ei-label">Lavandería</span>
              <span className="ei-val" style={{ color: '#34d399' }}>{fmt(totalLav)}</span>
            </div>
            <div className="ei-item">
              <span className="ei-label">Otros</span>
              <span className="ei-val" style={{ color: '#fbbf24' }}>{fmt(totalOtros)}</span>
            </div>
            <div className="ei-item">
              <span className="ei-label">Facturas</span>
              <span className="ei-val sum-blue">{fmt(totalInvoices)}</span>
            </div>
            <div className="ei-item">
              <span className="ei-label">Gastos caja menor</span>
              <span className="ei-val" style={{ color: '#f87171' }}>-{fmt(totalGastos)}</span>
            </div>
            <div className="ei-item">
              <span className="ei-label">Saldo caja menor</span>
              <span className="ei-val" style={{ color: (cajaMenorSaldo ?? 0) >= 0 ? '#c084fc' : '#f87171' }}>
                {cajaMenorSaldo !== null ? fmt(cajaMenorSaldo) : '—'}
              </span>
            </div>
            <div className="ei-item">
              <span className="ei-label">Check-ins / outs</span>
              <span className="ei-val" style={{ color: '#c084fc' }}>
                {(shiftData?.checkins || []).filter(c => c.type === 'in').length} / {(shiftData?.checkins || []).filter(c => c.type === 'out').length}
              </span>
            </div>
          </div>
          
          <textarea 
            className="tr-textarea"
            placeholder="Notas para el próximo turno: pendientes, incidencias, instrucciones especiales..."
            value={shiftData?.notes || ''} 
            onChange={e => setShiftData(prev => ({ ...prev, notes: e.target.value }))} 
          />
          
          <button className="btn-close-shift" onClick={handleCloseShift} disabled={saving}>
            {saving ? (
              <><FaSpinner className="spinning" /> Generando PDF y cerrando...</>
            ) : (
              <><FaFilePdf /> Entregar Turno y Cerrar Sesión</>
            )}
          </button>
        </div>
      </div>

      {toast && <div className={`tr-toast ${toast.type}`}>{toast.msg}</div>}
      
      <NightAuditModal 
        isOpen={showNightAudit}
        onClose={() => setShowNightAudit(false)}
        currentShift={detectedShift}
      />
    </div>

    );
}
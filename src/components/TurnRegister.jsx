import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection, addDoc, getDocs, getDoc, setDoc, doc,
  query, orderBy, limit, serverTimestamp
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
  FaPiggyBank, FaEdit, FaFilePdf,FaFileAlt
} from 'react-icons/fa';
import '../styles/Turnregister.css';
import { generateShiftHandoverPDF } from '../utils/shiftHandoverPDF';
import NightAuditModal from './NightAuditModal';

// ─── Constantes ───────────────────────────────────────────────────────────────
const todayStr = new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
const fmt = (n) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
const uid = () => Math.random().toString(36).slice(2, 8);

const SHIFT_ORDER = ['morning', 'afternoon', 'night'];
const SHIFTS = {
  morning: { label: 'Mañana', hours: '06:00–14:00', icon: <FaSun />, cls: 'morning', emoji: '🌅' },
  afternoon: { label: 'Tarde', hours: '14:00–22:00', icon: <FaCloudSun />, cls: 'afternoon', emoji: '🌤' },
  night: { label: 'Noche', hours: '22:00–06:00', icon: <FaMoon />, cls: 'night', emoji: '🌙' },
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
const makeShift = () => ({ checkins: [], invoices: [], income: [], expenses: [], notes: '' });
 
const STORAGE_KEY = 'turnregister_state';

const saveToStorage = (state) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) { console.warn('No se pudo guardar estado local', e); }
};

const loadFromStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
};

// ─── Componente ───────────────────────────────────────────────────────────────
export default function TurnRegister() {
  const [activeShift, setActiveShift] = useState(() => loadFromStorage()?.activeShift || 'morning');
  const [receptionistName, setReceptionistName] = useState(() => loadFromStorage()?.receptionistName || '');
  const [receptionists, setReceptionists] = useState([]);
  const [data, setData] = useState(() => loadFromStorage()?.data || { morning: makeShift(), afternoon: makeShift(), night: makeShift() });
  const [cajaMenorSaldo, setCajaMenorSaldo] = useState(null);
  const [cajaMenorInput, setCajaMenorInput] = useState('');
  const [cajaMenorLocked, setCajaMenorLocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [showStartModal, setShowStartModal] = useState(false);
  const [nextShiftName, setNextShiftName] = useState('');
  const [nextShiftPassword, setNextShiftPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [pendingNextShift, setPendingNextShift] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        // Cargar recepcionistas desde Firebase
        const q = query(collection(db, 'users'), orderBy('name', 'asc'));
        const snap = await getDocs(q);
        const usersList = snap.docs
          .map(doc => doc.data())
          .filter(user => RECEPTIONIST_ROLES.includes(user.role) && user.active !== false);
        setReceptionists(usersList);

        // Cargar último turno
        const q2 = query(collection(db, 'turnos'), orderBy('createdAt', 'desc'), limit(1));
        const snap2 = await getDocs(q2);
        if (!snap2.empty) {
          const lastShift = snap2.docs[0].data().shift;
          const idx = SHIFT_ORDER.indexOf(lastShift);
          setActiveShift(SHIFT_ORDER[(idx + 1) % SHIFT_ORDER.length]);
        }
        
        // Cargar saldo caja menor
        const cmDoc = await getDoc(doc(db, 'cajaMenor', 'saldo'));
        if (cmDoc.exists()) { setCajaMenorSaldo(cmDoc.data().monto); setCajaMenorLocked(true); }
        else setCajaMenorSaldo(0);
      } catch (e) { console.error(e); setCajaMenorSaldo(0); }
    };
    init();
  }, []);

  useEffect(() => {
  saveToStorage({ activeShift, receptionistName, data });
}, [activeShift, receptionistName, data]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const sd = data[activeShift];
  const update = (field, val) =>
    setData(prev => ({ ...prev, [activeShift]: { ...prev[activeShift], [field]: val } }));

  const handleSetSaldo = async () => {
    const monto = parseFloat(cajaMenorInput);
    if (isNaN(monto) || monto < 0) return;
    try {
      await setDoc(doc(db, 'cajaMenor', 'saldo'), { monto, actualizadoEn: serverTimestamp() });
      setCajaMenorSaldo(monto); setCajaMenorLocked(true);
      showToast(`Saldo caja menor: ${fmt(monto)}`, 'success');
    } catch (e) { showToast('Error al guardar saldo', 'error'); }
  };

  const [ciForm, setCiForm] = useState({ room: '', guest: '', type: 'in', time: '', checks: makeChecks('in') });
  const [invForm, setInvForm] = useState({ number: '', guest: '', amount: '', method: 'efectivo' });
  const [incForm, setIncForm] = useState({ type: 'alojamiento', concept: '', amount: '', method: 'efectivo' });
  const [expForm, setExpForm] = useState({ concept: '', amount: '', category: 'operativo' });

  const handleCiTypeChange = (newType) => setCiForm(p => ({ ...p, type: newType, checks: makeChecks(newType) }));
  const toggleCheck = (key) => setCiForm(p => ({ ...p, checks: { ...p.checks, [key]: !p.checks[key] } }));

  const addCheckin = () => {
    if (!ciForm.room || !ciForm.guest) return;
    update('checkins', [{ id: uid(), ...ciForm, time: ciForm.time || new Date().toTimeString().slice(0, 5) }, ...sd.checkins]);
    setCiForm({ room: '', guest: '', type: 'in', time: '', checks: makeChecks('in') });
  };
  const addInvoice = () => {
    if (!invForm.number || !invForm.amount) return;
    update('invoices', [{ id: uid(), ...invForm, amount: parseFloat(invForm.amount) }, ...sd.invoices]);
    setInvForm({ number: '', guest: '', amount: '', method: 'efectivo' });
  };
  const addIncome = () => {
    if (!incForm.amount) return;
    const typeLabel = INCOME_TYPES.find(t => t.value === incForm.type)?.label || incForm.type;
    update('income', [{ id: uid(), ...incForm, amount: parseFloat(incForm.amount), typeLabel }, ...sd.income]);
    setIncForm({ type: 'alojamiento', concept: '', amount: '', method: 'efectivo' });
  };
  const addExpense = () => {
    if (!expForm.concept || !expForm.amount) return;
    const monto = parseFloat(expForm.amount);
    if (cajaMenorSaldo !== null && monto > cajaMenorSaldo) { showToast('Saldo insuficiente en caja menor', 'error'); return; }
    update('expenses', [{ id: uid(), ...expForm, amount: monto }, ...sd.expenses]);
    setCajaMenorSaldo(prev => prev - monto);
    setExpForm({ concept: '', amount: '', category: 'operativo' });
  };
  const delExpense = (id) => {
    const item = sd.expenses.find(e => e.id === id);
    if (item) setCajaMenorSaldo(prev => prev + item.amount);
    update('expenses', sd.expenses.filter(i => i.id !== id));
  };
  const del = (field, id) => update(field, sd[field].filter(i => i.id !== id));

  const totalIngresos = sd.income.reduce((s, i) => s + i.amount, 0);
  const totalAloj = sd.income.filter(i => i.type === 'alojamiento').reduce((s, i) => s + i.amount, 0);
  const totalLav = sd.income.filter(i => i.type === 'lavanderia').reduce((s, i) => s + i.amount, 0);
  const totalOtros = sd.income.filter(i => i.type === 'otro').reduce((s, i) => s + i.amount, 0);
  const totalInvoices = sd.invoices.reduce((s, i) => s + i.amount, 0);
  const totalGastos = sd.expenses.reduce((s, i) => s + i.amount, 0);
  const nextShiftKey = SHIFT_ORDER[(SHIFT_ORDER.indexOf(activeShift) + 1) % 3];

 /* const handleCloseShift = async () => {
    if (saving) return;
    if (!receptionistName.trim()) { showToast('Ingresa tu nombre antes de entregar el turno', 'error'); return; }
    setSaving(true);
    try {
      await setDoc(doc(db, 'cajaMenor', 'saldo'), { monto: cajaMenorSaldo, actualizadoEn: serverTimestamp() });
      await addDoc(collection(db, 'turnos'), {
        shift: activeShift, shiftLabel: SHIFTS[activeShift].label,
        receptionist: receptionistName,
        date: new Date().toISOString().slice(0, 10), createdAt: serverTimestamp(),
        checkins: sd.checkins, invoices: sd.invoices,
        income: sd.income, expenses: sd.expenses, notes: sd.notes,
        totals: { ingresos: totalIngresos, alojamiento: totalAloj, lavanderia: totalLav, otros: totalOtros, gastos: totalGastos, facturas: totalInvoices, saldoCajaMenor: cajaMenorSaldo }
      });

      await generateShiftHandoverPDF(sd, activeShift, receptionistName, cajaMenorSaldo);

      setPendingNextShift(nextShiftKey);
      setNextShiftPassword('');
      setPasswordError('');
      setShowStartModal(true);

    } catch (e) {
      console.error(e);
      showToast('Error al guardar. Verifica Firebase.', 'error');
    } finally {
      setSaving(false);
    }
    localStorage.removeItem(STORAGE_KEY);
  };*/

//testpfd-------------------------------------------------------------------------------
  const handleTestPDF = async () => {

  const mockData = {
    income: [
      { type: "alojamiento", typeLabel: "Alojamiento", concept: "Hab 201", method: "Efectivo", amount: 50000 },
      { type: "lavanderia", typeLabel: "Lavandería", concept: "Ropa", method: "Tarjeta", amount: 8000 }
    ],

    expenses: [
      { concept: "Compra jabón", category: "Limpieza", amount: 5000 }
    ],

    invoices: [
      { amount: 40000 }
    ],

    checkins: [
      { type: "in", room: 201, guest: "Juan Perez", time: "10:30" },
      { type: "out", room: 105, guest: "Ana Gomez", time: "11:00" }
    ],

    notes: "Todo en orden en el turno."
  };

  await generateShiftHandoverPDF(
    mockData,
    "morning",
    "Sebastian",
    20000
  );
};

//testpfd-------------------------------------------------------------------------------

  const handleStartShift = async () => {
    setPasswordError('');
    if (!nextShiftName.trim()) return;
    if (!nextShiftPassword.trim()) {
      setPasswordError('Ingresa tu contraseña para confirmar');
      return;
    }

    setSaving(true);
    try {
      // Obtener usuario desde Firestore para validar contraseña
      const q = query(collection(db, 'users'));
      const snap = await getDocs(q);
      const user = snap.docs.find(doc => doc.data().name === nextShiftName);
      
      if (!user) {
        setPasswordError('Usuario no encontrado');
        setSaving(false);
        return;
      }

      const userData = user.data();
      // Validar contraseña (comparación simple - idealmente usar bcrypt en backend)
      if (userData.password !== nextShiftPassword) {
        setPasswordError('Contraseña incorrecta');
        setSaving(false);
        return;
      }

      // Contraseña válida - iniciar turno
      setData(prev => ({ ...prev, [activeShift]: makeShift() }));
      setActiveShift(pendingNextShift);
      setReceptionistName(nextShiftName);
      setNextShiftName('');
      setNextShiftPassword('');
      setShowStartModal(false);
      showToast(`✓ Turno ${SHIFTS[pendingNextShift].label} iniciado. Bienvenida, ${nextShiftName}`, 'success');
    } catch (e) {
      console.error(e);
      setPasswordError('Error validando contraseña');
    } finally {
      setSaving(false);
    }
  };

  const activeChecks = CI_CHECKS[ciForm.type];
  const [showNightAudit, setShowNightAudit] = useState(false);

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
    <select 
      value={receptionistName} 
      onChange={e => setReceptionistName(e.target.value)}
    >
      <option value="">Selecciona recepcionista...</option>
      {receptionists.map((user, idx) => (
        <option key={idx} value={user.name}>
          {user.name}
        </option>
      ))}
    </select>
  </div>
  
  {/* NUEVO: Botón de Auditoría Nocturna */}
  {activeShift === 'night' && (
    <button 
      className="btn-night-audit"
      onClick={() => setShowNightAudit(true)}
      title="Generar auditoría nocturna (solo turno noche)"
    >
      <FaFileAlt /> Auditoría Nocturna
    </button>
  )}
  
  <div className="tr-date-badge">
    <FaClock />
    <span style={{ textTransform: 'capitalize' }}>{todayStr}</span>
  </div>
</div>
      </header>

      <div className="tr-shift-tabs">
        {SHIFT_ORDER.map(key => {
          const s = SHIFTS[key]; const isActive = key === activeShift;
          return (
            <button key={key} className={`tr-shift-tab ${s.cls} ${isActive ? 'active' : ''}`}
              disabled={!isActive} title={!isActive ? 'Bloqueado — esperando entrega del turno anterior' : ''}>
              {s.icon} {s.label}
              <span style={{ fontSize: '0.67rem', opacity: 0.45 }}>({s.hours})</span>
              {!isActive && <FaLock className="tab-lock" />}
            </button>
          );
        })}
      </div>

      <div className="tr-content">
        <div className="tr-full cajas-row">
          <div className="caja-card caja-principal">
            <div className="caja-label"><FaMoneyBillWave /> Caja Principal</div>
            <div className="caja-amount">{fmt(totalIngresos)}</div>
            <div className="caja-sub">Aloj. {fmt(totalAloj)} · Lav. {fmt(totalLav)} · Otros {fmt(totalOtros)}</div>
          </div>
          <div className="caja-card caja-menor">
            <div className="caja-label"><FaPiggyBank /> Caja Menor</div>
            <div className="caja-amount">{cajaMenorSaldo !== null ? fmt(cajaMenorSaldo) : '—'}</div>
            <div className="caja-sub">Gastos del turno: {fmt(totalGastos)}</div>
            {!cajaMenorLocked ? (
              <div className="caja-menor-init">
                <input type="number" placeholder="Saldo inicial $" value={cajaMenorInput} onChange={e => setCajaMenorInput(e.target.value)} />
                <button className="btn-set-saldo" onClick={handleSetSaldo}><FaCheck /> Guardar</button>
              </div>
            ) : (
              <div className="saldo-bloqueado">
                <FaLock /> Saldo establecido
                <button style={{ background: 'none', border: 'none', color: '#6a4a9a', cursor: 'pointer', marginLeft: 3 }}
                  onClick={() => { setCajaMenorLocked(false); setCajaMenorInput(cajaMenorSaldo ?? ''); }}>
                  <FaEdit style={{ fontSize: '0.7rem' }} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Check-in / Check-out */}
        <div className="tr-panel">
          <div className="tr-panel-header">
            <div className="tr-panel-title"><div className="tr-panel-icon icon-purple"><FaBed /></div>Check-in / Check-out</div>
            <span style={{ fontSize: '0.72rem', color: '#5a5a7a' }}>{sd.checkins.length} registros</span>
          </div>
          <div className="tr-form">
            <div className="tr-field" style={{ maxWidth: 65 }}>
              <label>Hab.</label>
              <input placeholder="305" value={ciForm.room} onChange={e => setCiForm(p => ({ ...p, room: e.target.value }))} />
            </div>
            <div className="tr-field">
              <label>Huésped</label>
              <input placeholder="Nombre completo" value={ciForm.guest} onChange={e => setCiForm(p => ({ ...p, guest: e.target.value }))} />
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
              <input type="time" value={ciForm.time} onChange={e => setCiForm(p => ({ ...p, time: e.target.value }))} />
            </div>
          </div>
          <div className="ci-checklist">
            <span className="ci-checklist-label">{ciForm.type === 'in' ? '✅ Check-in:' : '✅ Check-out:'}</span>
            {activeChecks.map(c => {
              const isChecked = !!ciForm.checks[c.key];
              return (
                <label key={c.key} className={`ci-check ${isChecked ? (ciForm.type === 'in' ? 'checked-in' : 'checked-out') : ''}`}
                  onClick={() => toggleCheck(c.key)}>
                  <div className="ci-check-dot" />{c.icon} {c.label}
                </label>
              );
            })}
            <button className="btn-add" style={{ marginLeft: 'auto' }} onClick={addCheckin}><FaPlus /> Agregar</button>
          </div>
          <div className="tr-list">
            {sd.checkins.length === 0
              ? <div className="tr-empty">Sin movimientos en este turno</div>
              : sd.checkins.map(ci => {
                const checksDefn = CI_CHECKS[ci.type] || [];
                return (
                  <div key={ci.id} className="tr-item">
                    <span className="tr-item-icon" style={{ color: ci.type === 'in' ? '#4ade80' : '#60a5fa', paddingTop: 3 }}>
                      {ci.type === 'in' ? <FaSignInAlt /> : <FaSignOutAlt />}
                    </span>
                    <div className="tr-item-body">
                      <div className="tr-item-title">Hab. {ci.room} · {ci.guest} <span style={{ opacity: 0.45, fontWeight: 400 }}>· {ci.time}</span></div>
                      <div className="ci-tags">
                        {checksDefn.map(c => (
                          <span key={c.key} className={`ci-tag ${ci.checks?.[c.key] ? '' : 'missing'}`}>
                            {c.icon} {ci.checks?.[c.key] ? c.label : `Sin ${c.label.toLowerCase()}`}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className={`type-badge ${ci.type === 'in' ? 'badge-in' : 'badge-out'}`} style={{ alignSelf: 'flex-start', marginTop: 2 }}>
                      {ci.type === 'in' ? 'Check-in' : 'Check-out'}
                    </span>
                    <button className="btn-del" onClick={() => del('checkins', ci.id)}><FaTrash /></button>
                  </div>
                );
              })
            }
          </div>
        </div>

        {/* Ingresos */}
        <div className="tr-panel">
          <div className="tr-panel-header">
            <div className="tr-panel-title"><div className="tr-panel-icon icon-green"><FaWallet /></div>Ingresos — Caja Principal</div>
            <span className="sum-green" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '0.92rem' }}>{fmt(totalIngresos)}</span>
          </div>
          <div className="tr-form">
            <div className="tr-field" style={{ maxWidth: 130 }}>
              <label>Tipo</label>
              <select value={incForm.type} onChange={e => setIncForm(p => ({ ...p, type: e.target.value }))}>
                {INCOME_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="tr-field">
              <label>{incForm.type === 'alojamiento' ? 'Hab. / Huésped' : incForm.type === 'lavanderia' ? 'Detalle' : 'Concepto'}</label>
              <input
                placeholder={incForm.type === 'alojamiento' ? 'Hab. 305 · Smith' : incForm.type === 'lavanderia' ? '2 camisas, 1 pantalón' : 'Descripción'}
                value={incForm.concept} onChange={e => setIncForm(p => ({ ...p, concept: e.target.value }))} />
            </div>
            <div className="tr-field" style={{ maxWidth: 95 }}>
              <label>Monto $</label>
              <input type="number" placeholder="0" value={incForm.amount} onChange={e => setIncForm(p => ({ ...p, amount: e.target.value }))} />
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
            {sd.income.length === 0
              ? <div className="tr-empty">Sin ingresos registrados</div>
              : sd.income.map(inc => {
                const typeInfo = INCOME_TYPES.find(t => t.value === inc.type);
                return (
                  <div key={inc.id} className="tr-item">
                    <span className="tr-item-icon" style={{ color: '#4ade80' }}><FaArrowUp /></span>
                    <div className="tr-item-body">
                      <div className="tr-item-title">{inc.concept || inc.typeLabel}</div>
                      <div className="tr-item-sub">{inc.method}</div>
                    </div>
                    <span className={`type-badge ${typeInfo?.badge}`}>{inc.typeLabel}</span>
                    <span className="tr-item-amount amount-pos" style={{ marginLeft: 6 }}>+{fmt(inc.amount)}</span>
                    <button className="btn-del" onClick={() => del('income', inc.id)}><FaTrash /></button>
                  </div>
                );
              })
            }
          </div>
        </div>

        {/* Facturas */}
        <div className="tr-panel">
          <div className="tr-panel-header">
            <div className="tr-panel-title"><div className="tr-panel-icon icon-blue"><FaReceipt /></div>Facturas Emitidas</div>
            <span className="sum-blue" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '0.92rem' }}>{fmt(totalInvoices)}</span>
          </div>
          <div className="tr-form">
            <div className="tr-field" style={{ maxWidth: 95 }}>
              <label>N° Factura</label>
              <input placeholder="F-0001" value={invForm.number} onChange={e => setInvForm(p => ({ ...p, number: e.target.value }))} />
            </div>
            <div className="tr-field">
              <label>Cliente</label>
              <input placeholder="Nombre / empresa" value={invForm.guest} onChange={e => setInvForm(p => ({ ...p, guest: e.target.value }))} />
            </div>
            <div className="tr-field" style={{ maxWidth: 95 }}>
              <label>Monto $</label>
              <input type="number" placeholder="0" value={invForm.amount} onChange={e => setInvForm(p => ({ ...p, amount: e.target.value }))} />
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
            {sd.invoices.length === 0
              ? <div className="tr-empty">Sin facturas emitidas</div>
              : sd.invoices.map(inv => (
                <div key={inv.id} className="tr-item">
                  <span className="tr-item-icon" style={{ color: '#60a5fa' }}><FaFileInvoiceDollar /></span>
                  <div className="tr-item-body">
                    <div className="tr-item-title">{inv.number} · {inv.guest || 'Sin nombre'}</div>
                    <div className="tr-item-sub">{inv.method}</div>
                  </div>
                  <span className="tr-item-amount amount-neu">{fmt(inv.amount)}</span>
                  <button className="btn-del" onClick={() => del('invoices', inv.id)}><FaTrash /></button>
                </div>
              ))
            }
          </div>
        </div>
        

        {/* Gastos caja menor */}
        <div className="tr-panel tr-full">
          <div className="tr-panel-header">
            <div className="tr-panel-title"><div className="tr-panel-icon icon-purple"><FaPiggyBank /></div>Gastos — Caja Menor</div>
            <span className="sum-purple" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '0.92rem' }}>
              Saldo: {cajaMenorSaldo !== null ? fmt(cajaMenorSaldo) : '—'}
            </span>
          </div>
          <div className="tr-form">
            <div className="tr-field">
              <label>Concepto</label>
              <input placeholder="Descripción del gasto" value={expForm.concept} onChange={e => setExpForm(p => ({ ...p, concept: e.target.value }))} />
            </div>
            <div className="tr-field" style={{ maxWidth: 95 }}>
              <label>Monto $</label>
              <input type="number" placeholder="0" value={expForm.amount} onChange={e => setExpForm(p => ({ ...p, amount: e.target.value }))} />
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
            {sd.expenses.length === 0
              ? <div className="tr-empty">Sin gastos de caja menor en este turno</div>
              : sd.expenses.map(exp => (
                <div key={exp.id} className="tr-item">
                  <span className="tr-item-icon" style={{ color: '#c084fc' }}><FaTools /></span>
                  <div className="tr-item-body">
                    <div className="tr-item-title">{exp.concept}</div>
                    <div className="tr-item-sub">{exp.category}</div>
                  </div>
                  <span className="tr-item-amount amount-purple">-{fmt(exp.amount)}</span>
                  <button className="btn-del" onClick={() => delExpense(exp.id)}><FaTrash /></button>
                </div>
              ))
            }
          </div>
        </div>

        {/* Cierre */}
        <div className="tr-panel tr-full">
          <div className="tr-panel-header">
            <div className="tr-panel-title"><div className="tr-panel-icon icon-purple"><FaUser /></div>Cierre y Entrega de Turno</div>
          </div>
          <div className="entrega-info">
            <div className="ei-item"><span className="ei-label">Ingresos totales</span><span className="ei-val sum-green">{fmt(totalIngresos)}</span></div>
            <div className="ei-item"><span className="ei-label">Alojamiento</span><span className="ei-val" style={{ color: '#60a5fa' }}>{fmt(totalAloj)}</span></div>
            <div className="ei-item"><span className="ei-label">Lavandería</span><span className="ei-val" style={{ color: '#34d399' }}>{fmt(totalLav)}</span></div>
            <div className="ei-item"><span className="ei-label">Otros</span><span className="ei-val" style={{ color: '#fbbf24' }}>{fmt(totalOtros)}</span></div>
            <div className="ei-item"><span className="ei-label">Facturas</span><span className="ei-val sum-blue">{fmt(totalInvoices)}</span></div>
            <div className="ei-item"><span className="ei-label">Gastos caja menor</span><span className="ei-val" style={{ color: '#f87171' }}>-{fmt(totalGastos)}</span></div>
            <div className="ei-item">
              <span className="ei-label">Saldo caja menor</span>
              <span className="ei-val" style={{ color: (cajaMenorSaldo ?? 0) >= 0 ? '#c084fc' : '#f87171' }}>
                {cajaMenorSaldo !== null ? fmt(cajaMenorSaldo) : '—'}
              </span>
            </div>
            <div className="ei-item">
              <span className="ei-label">Check-ins / outs</span>
              <span className="ei-val" style={{ color: '#c084fc' }}>
                {sd.checkins.filter(c => c.type === 'in').length} / {sd.checkins.filter(c => c.type === 'out').length}
              </span>
            </div>
          </div>
          <textarea className="tr-textarea"
            placeholder="Notas para el próximo turno: pendientes, incidencias, instrucciones especiales..."
            value={sd.notes} onChange={e => update('notes', e.target.value)} />

            <button className="btn-close-shift" onClick={handleTestPDF} disabled={saving}>
            {saving
              ? <><FaSpinner className="spinning" /> Guardando y generando PDF...</>
              : <><FaFilePdf /> puerba pdf {SHIFTS[activeShift].label} y generar PDF</>
            }
          </button>
          {/*<button className="btn-close-shift" onClick={handleCloseShift} disabled={saving}>
            {saving
              ? <><FaSpinner className="spinning" /> Guardando y generando PDF...</>
              : <><FaFilePdf /> Entregar Turno {SHIFTS[activeShift].label} y generar PDF</>
            }
          </button>*/}
        </div>
      </div>

      {showStartModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <span className="modal-icon">{pendingNextShift ? SHIFTS[pendingNextShift].emoji : '🌅'}</span>
            <h2>Iniciar Turno {pendingNextShift ? SHIFTS[pendingNextShift].label : ''}</h2>
            <p>El turno anterior fue entregado y el PDF fue generado correctamente. Ingresa el nombre de quien recibe para activar el nuevo turno.</p>
            <div className="modal-shift-badge">
              {pendingNextShift && SHIFTS[pendingNextShift].icon}
              {pendingNextShift && SHIFTS[pendingNextShift].label} · {pendingNextShift && SHIFTS[pendingNextShift].hours}
            </div>
            <div className="modal-field">
              <label>Nombre de quien recibe el turno</label>
              <select
                autoFocus
                value={nextShiftName}
                onChange={e => setNextShiftName(e.target.value)}
              >
                <option value="">Selecciona recepcionista...</option>
                {receptionists.map((user, idx) => (
                  <option key={idx} value={user.name}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="modal-field">
              <label>Contraseña para confirmar</label>
              <div className="password-input-wrapper">
                <FaLock className="password-icon" />
                <input
                  type="password"
                  placeholder="Ingresa tu contraseña"
                  value={nextShiftPassword}
                  onChange={e => { setNextShiftPassword(e.target.value); setPasswordError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleStartShift()}
                />
              </div>
              {passwordError && <span className="modal-error">{passwordError}</span>}
            </div>
            <button className="btn-start-shift" onClick={handleStartShift} disabled={!nextShiftName.trim() || !nextShiftPassword.trim() || saving}>
              {saving ? (
                <><FaSpinner className="spinning" /> Validando...</>
              ) : (
                <><FaCheck /> Comenzar Turno {pendingNextShift ? SHIFTS[pendingNextShift].label : ''}</>
              )}
            </button>
          </div>
        </div>
      )}

      {toast && <div className={`tr-toast ${toast.type}`}>{toast.msg}</div>}
      {/* Modal de Auditoría Nocturna */}
      <NightAuditModal 
        isOpen={showNightAudit}
        onClose={() => setShowNightAudit(false)}
        currentShift={activeShift}
      />
    </div>
  );
}
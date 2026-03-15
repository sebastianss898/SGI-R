import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where, orderBy, setDoc, doc, getDoc } from 'firebase/firestore';
import {
  FaFileAlt, FaTimes, FaFilePdf, FaSpinner,
  FaCheckCircle, FaChevronLeft, FaChevronRight,
  FaSave, FaBoxOpen, FaBed, FaMoneyBillWave,
  FaPiggyBank, FaSatelliteDish, FaComments, FaPenFancy
} from 'react-icons/fa';
import '../styles/Nightaudit.css';

// ═══════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════

const STEPS = [
  { id: 'inventario',   label: 'Inventario',  icon: <FaBoxOpen /> },
  { id: 'habitaciones', label: 'Habitaciones', icon: <FaBed /> },
  { id: 'ingresos',     label: 'Ingresos',     icon: <FaMoneyBillWave /> },
  { id: 'caja',         label: 'Caja',         icon: <FaPiggyBank /> },
  { id: 'canales',      label: 'Canales',      icon: <FaSatelliteDish /> },
  { id: 'mensajes',     label: 'Mensajes',     icon: <FaComments /> },
  { id: 'cierre',       label: 'Cierre',       icon: <FaPenFancy /> },
];

const DEFAULT_INVENTORY = [
  { equipo: 'Radios de comunicación',          cantidad: 5,  obs: '' },
  { equipo: 'Cargadores',                       cantidad: 4,  obs: '' },
  { equipo: 'Teléfono',                         cantidad: 1,  obs: '' },
  { equipo: 'Celular con cargador',             cantidad: 1,  obs: '' },
  { equipo: 'Impresora',                        cantidad: 1,  obs: '' },
  { equipo: 'Computador con teclado y mouse',   cantidad: 2,  obs: '' },
  { equipo: 'Encoder / Programador de llaves',  cantidad: 1,  obs: '' },
  { equipo: 'Controles aire acondicionado',     cantidad: 7,  obs: '' },
  { equipo: 'Controles TV',                     cantidad: 3,  obs: '' },
  { equipo: 'Cosedora',                         cantidad: 1,  obs: '' },
  { equipo: 'Perforadora',                      cantidad: 1,  obs: '' },
  { equipo: 'Tarjetas huéspedes',               cantidad: 77, obs: '' },
  { equipo: 'Copia de tarjetas',                cantidad: 31, obs: '' },
];

const DEFAULT_CANALES = [
  { canal: 'Motor de reservas', cantidad: 0, obs: '' },
  { canal: 'Directa',           cantidad: 0, obs: '' },
  { canal: 'Booking',           cantidad: 0, obs: '' },
  { canal: 'Expedia',           cantidad: 0, obs: '' },
  { canal: 'Price Travel',      cantidad: 0, obs: '' },
  { canal: 'Keytel',            cantidad: 0, obs: '' },
];

const DEFAULT_MENSAJES = [
  { canal: 'WhatsApp',          cantidad: 0, obs: '' },
  { canal: 'Meta',              cantidad: 0, obs: '' },
  { canal: 'Booking',           cantidad: 0, obs: '' },
  { canal: 'Expedia',           cantidad: 0, obs: '' },
  { canal: 'Correo electrónico',cantidad: 0, obs: '' },
];

const fmtCOP = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0);

// ═══════════════════════════════════════════════════════════════════
// COMPONENTES AUXILIARES
// ═══════════════════════════════════════════════════════════════════

const AutoBadge = ({ value }) => (
  <span className="na-auto-badge">{value ?? '—'}</span>
);

const NaInput = ({ value, onChange, type = 'text', placeholder = '', readOnly = false }) => (
  <input
    className={`na-input ${readOnly ? 'na-input--readonly' : ''}`}
    type={type}
    value={value ?? ''}
    readOnly={readOnly}
    placeholder={placeholder}
    onChange={readOnly ? undefined : (e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
  />
);

const MetricCard = ({ label, value, color = '' }) => (
  <div className={`na-metric ${color}`}>
    <span className="na-metric__label">{label}</span>
    <span className="na-metric__value">{value}</span>
  </div>
);

const SectionHeader = ({ title, subtitle }) => (
  <div className="na-section-header">
    <h3 className="na-section-title">{title}</h3>
    {subtitle && <p className="na-section-sub">{subtitle}</p>}
  </div>
);

// ═══════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════

const NightAuditModal = ({ isOpen, onClose, currentShift }) => {
  const [loading,    setLoading]    = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [step,       setStep]       = useState(0);
  const [completed,  setCompleted]  = useState(new Set());
  const [toast,      setToast]      = useState(null);

  // ── Datos Firestore ──────────────────────────────────────────────
  const [fsData, setFsData] = useState(null);   // datos automáticos

  // ── Paso 0: Inventario ───────────────────────────────────────────
  const [receptionist, setReceptionist] = useState('');
  const [inventory,    setInventory]    = useState(DEFAULT_INVENTORY);

  // ── Paso 1: Habitaciones ─────────────────────────────────────────
  const [habDisp,     setHabDisp]    = useState(77);
  const [habOcup,     setHabOcup]    = useState(0);
  const [habMant,     setHabMant]    = useState(0);
  const [habAdmin,    setHabAdmin]   = useState(0);
  const [habBloq,     setHabBloq]    = useState(0);
  const [earlyCI,     setEarlyCI]    = useState(0);
  const [coDirec,     setCoDirec]    = useState(0);
  const [coBooking,   setCoBooking]  = useState(0);
  const [coExpedia,   setCoExpedia]  = useState(0);
  const [lateCO,      setLateCO]     = useState(0);
  const [noShow,      setNoShow]     = useState(0);
  const [sireIn,      setSireIn]     = useState(0);
  const [sireOut,     setSireOut]    = useState(0);
  const [jacuzzi,     setJacuzzi]    = useState(0);
  const [encuesta,    setEncuesta]   = useState('');
  const [habObs,      setHabObs]     = useState('');

  // ── Paso 2: Ingresos ─────────────────────────────────────────────
  const [ingEfec,  setIngEfec]  = useState(0);
  const [ingDat,   setIngDat]   = useState(0);
  const [ingTrans, setIngTrans] = useState(0);
  const [ingExp,   setIngExp]   = useState(0);
  const [ingLav,   setIngLav]   = useState(0);
  const [ingCXC,   setIngCXC]   = useState(0);
  const [ingObs,   setIngObs]   = useState('');

  // ── Paso 3: Caja ─────────────────────────────────────────────────
  const [baseIni,  setBaseIni]  = useState(0);
  const [usoBase,  setUsoBase]  = useState(0);
  const [cajaObs,  setCajaObs]  = useState('');

  // ── Paso 4: Canales ──────────────────────────────────────────────
  const [canales, setCanales] = useState(DEFAULT_CANALES);

  // ── Paso 5: Mensajes ─────────────────────────────────────────────
  const [mensajes, setMensajes] = useState(DEFAULT_MENSAJES);

  // ── Paso 6: Cierre ───────────────────────────────────────────────
  const [notesAuditor, setNotesAuditor] = useState('SE CIERRA PUERTA PRINCIPAL A LAS 12:00 AM');

  // ── Calculados ───────────────────────────────────────────────────
  const allRomms = 85;
  const pctOcup     = habDisp > 0 ? ((habOcup / allRomms) * 100).toFixed(2) : '0.0';
  const totalIng    = ingEfec + ingDat + ingTrans + ingExp + ingLav + ingCXC;
  const baseFinal   = baseIni - usoBase;

  // ─────────────────────────────────────────────────────────────────
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Cargar datos Firestore ───────────────────────────────────────
  useEffect(() => {
    if (isOpen) { setStep(0); loadDayData(); }
  }, [isOpen]);

  const loadDayData = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      // Intentar cargar borrador guardado
      const draftDoc = await getDoc(doc(db, 'auditoriaBorradores', today));
      if (draftDoc.exists()) {
        const d = draftDoc.data();
        hydrateFromDraft(d);
        showToast('Borrador cargado automáticamente', 'info');
      }

      // Turnos del día
      const snap = await getDocs(
        query(collection(db, 'turnos'), where('date', '==', today), orderBy('createdAt', 'asc'))
      );
      const turnos = snap.docs.map(d => d.data());

      const allCI  = turnos.flatMap(t => t.checkins || []);
      const ciList = allCI.filter(c => c.type === 'in');
      const coList = allCI.filter(c => c.type === 'out');
      const notes  = turnos.filter(t => t.notes?.trim()).map(t => ({ shift: t.shiftLabel, notes: t.notes }));
      const lastR  = turnos[turnos.length - 1]?.receptionist || '';

      const totalGastos = turnos.reduce((s, t) => s + (t.totals?.gastos || 0), 0);
      const cajaMenor   = turnos[turnos.length - 1]?.totals?.saldoCajaMenor || 0;

      setFsData({
        fecha: today,
        turnos: turnos.length,
        checkIns: ciList.length,
        checkOuts: coList.length,
        ciDetails: ciList,
        coDetails: coList,
        importantNotes: notes,
        totalGastos,
        cajaMenor,
      });

      // Pre-poblar sólo si no hay borrador
      if (!draftDoc.exists()) {
        setReceptionist(lastR);
        setHabOcup(ciList.length);
        setSireIn(ciList.length);
        setSireOut(coList.length);
        setUsoBase(totalGastos);
        setBaseIni(cajaMenor + totalGastos);
      }
    } catch (err) {
      console.error(err);
      showToast('Error al cargar datos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const hydrateFromDraft = (d) => {
    if (d.receptionist !== undefined) setReceptionist(d.receptionist);
    if (d.inventory)     setInventory(d.inventory);
    if (d.habDisp  !== undefined) setHabDisp(d.habDisp);
    if (d.habOcup  !== undefined) setHabOcup(d.habOcup);
    if (d.habMant  !== undefined) setHabMant(d.habMant);
    if (d.habAdmin !== undefined) setHabAdmin(d.habAdmin);
    if (d.habBloq  !== undefined) setHabBloq(d.habBloq);
    if (d.earlyCI  !== undefined) setEarlyCI(d.earlyCI);
    if (d.coDirec  !== undefined) setCoDirec(d.coDirec);
    if (d.coBooking !== undefined) setCoBooking(d.coBooking);
    if (d.coExpedia !== undefined) setCoExpedia(d.coExpedia);
    if (d.lateCO   !== undefined) setLateCO(d.lateCO);
    if (d.noShow   !== undefined) setNoShow(d.noShow);
    if (d.sireIn   !== undefined) setSireIn(d.sireIn);
    if (d.sireOut  !== undefined) setSireOut(d.sireOut);
    if (d.jacuzzi  !== undefined) setJacuzzi(d.jacuzzi);
    if (d.encuesta !== undefined) setEncuesta(d.encuesta);
    if (d.habObs   !== undefined) setHabObs(d.habObs);
    if (d.ingEfec  !== undefined) setIngEfec(d.ingEfec);
    if (d.ingDat   !== undefined) setIngDat(d.ingDat);
    if (d.ingTrans !== undefined) setIngTrans(d.ingTrans);
    if (d.ingExp   !== undefined) setIngExp(d.ingExp);
    if (d.ingLav   !== undefined) setIngLav(d.ingLav);
    if (d.ingCXC   !== undefined) setIngCXC(d.ingCXC);
    if (d.ingObs   !== undefined) setIngObs(d.ingObs);
    if (d.baseIni  !== undefined) setBaseIni(d.baseIni);
    if (d.usoBase  !== undefined) setUsoBase(d.usoBase);
    if (d.cajaObs  !== undefined) setCajaObs(d.cajaObs);
    if (d.canales)   setCanales(d.canales);
    if (d.mensajes)  setMensajes(d.mensajes);
    if (d.notesAuditor !== undefined) setNotesAuditor(d.notesAuditor);
    if (d.completed) setCompleted(new Set(d.completed));
  };

  // ── Guardar borrador ─────────────────────────────────────────────
  const saveDraft = async () => {
    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await setDoc(doc(db, 'auditoriaBorradores', today), {
        receptionist, inventory,
        habDisp, habOcup, habMant, habAdmin, habBloq,
        earlyCI, coDirec, coBooking, coExpedia, lateCO,
        noShow, sireIn, sireOut, jacuzzi, encuesta, habObs,
        ingEfec, ingDat, ingTrans, ingExp, ingLav, ingCXC, ingObs,
        baseIni, usoBase, cajaObs,
        canales, mensajes, notesAuditor,
        completed: [...completed],
        updatedAt: new Date().toISOString(),
      });
      showToast('Borrador guardado correctamente');
    } catch (err) {
      showToast('Error al guardar borrador', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Navegación ───────────────────────────────────────────────────
  const goNext = () => {
    setCompleted(prev => new Set([...prev, step]));
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  };
  const goPrev = () => setStep(s => Math.max(s - 1, 0));
  const goStep = (i) => { setCompleted(prev => new Set([...prev, step])); setStep(i); };

  // ── Actualizar fila tabla editable ───────────────────────────────
  const updateRow = (setter, idx, field, value) => {
    setter(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  // ── PDF ──────────────────────────────────────────────────────────
  const generatePDF = async () => {
    setGenerating(true);
    try {
      // Cargar jsPDF + autotable
      const loadScript = (src) => new Promise((res, rej) => {
        if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
        const s = document.createElement('script');
        s.src = src; s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W = 210, M = 14;
      let y = 0;

      const now = new Date();
      const dateLabel = now.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const timeLabel = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

      const HEAD_H = { fillColor: [18, 18, 32], textColor: [220, 220, 235], fontStyle: 'bold', fontSize: 8 };
      const ALT_ROW = { fillColor: [245, 245, 250] };

      const sectionTitle = (title, icon = '') => {
        if (y > 250) { pdf.addPage(); y = 18; }
        pdf.setFillColor(26, 26, 42);
        pdf.rect(M, y, W - M * 2, 8, 'F');
        pdf.setTextColor(192, 132, 252);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.text(`${icon}  ${title}`, M + 3, y + 5.5);
        pdf.setTextColor(0);
        y += 11;
      };

      // ── HEADER ──────────────────────────────────────────────────
      pdf.setFillColor(13, 13, 26);
      pdf.rect(0, 0, W, 32, 'F');

      pdf.setTextColor(240, 237, 232);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(15);
      pdf.text('REPORTE DIARIO AUDITORÍA NOCTURNA', M, 13);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
      pdf.text(`Hotel Cytrico  ·  ${dateLabel}  ·  ${timeLabel}`, M, 20);
      pdf.text('FR-067-HCR-01  ·  Versión 1  ·  13/03/2026', W - M, 20, { align: 'right' });

      pdf.setFontSize(8);
      pdf.setTextColor(155, 127, 212);
      pdf.text(`Recepcionista: ${receptionist || '—'}`, M, 27);
      pdf.text(`Turno: Noche (22:00 – 06:00)`, W - M, 27, { align: 'right' });

      pdf.setTextColor(0);
      y = 38;

      // ── RESUMEN EJECUTIVO ───────────────────────────────────────
      sectionTitle('RESUMEN EJECUTIVO', '◆');
      pdf.autoTable({
        startY: y,
        head: [['Check-ins', 'Check-outs', 'Turnos', 'Ingresos día', 'Base final', '% Ocupación']],
        body: [[
          fsData?.checkIns ?? 0,
          fsData?.checkOuts ?? 0,
          fsData?.turnos ?? 0,
          fmtCOP(totalIng),
          fmtCOP(baseFinal),
          `${pctOcup}%`,
        ]],
        styles: { fontSize: 9, cellPadding: 3, halign: 'center', fontStyle: 'bold' },
        headStyles: HEAD_H,
        bodyStyles: { fillColor: [238, 237, 254], textColor: [50, 40, 120] },
        margin: { left: M, right: M },
      });
      y = pdf.lastAutoTable.finalY + 8;

      // ── 1. INVENTARIO ───────────────────────────────────────────
      sectionTitle('1. INVENTARIO DE EQUIPOS', '■');
      pdf.autoTable({
        startY: y,
        head: [['Equipo', 'Cantidad', 'Observaciones']],
        body: inventory.map(r => [r.equipo, r.cantidad, r.obs || 'Sin novedad']),
        styles: { fontSize: 7.5, cellPadding: 2.2 },
        headStyles: HEAD_H,
        alternateRowStyles: ALT_ROW,
        margin: { left: M, right: M },
        columnStyles: { 0: { cellWidth: 72 }, 1: { cellWidth: 18, halign: 'center' } },
      });
      y = pdf.lastAutoTable.finalY + 8;

      // ── 2. HABITACIONES ─────────────────────────────────────────
      sectionTitle('2. INFORME DE HABITACIONES', '■');
      pdf.autoTable({
        startY: y,
        head: [['Ítem', 'Automático', 'Manual', 'Observaciones']],
        body: [
          ['% Ocupación',                   '—',                   `${pctOcup}%`,  habObs || 'N/A'],
          ['Habitaciones disponibles',       '—',                   habDisp,        ''],
          ['Habitaciones ocupadas',          fsData?.checkIns ?? 0, habOcup,        ''],
          ['Fuera servicio – Mantenimiento', '—',                   habMant,        ''],
          ['Fuera servicio – Uso admin.',    '—',                   habAdmin,       ''],
          ['Habitaciones bloqueadas',        '—',                   habBloq,        ''],
          ['Check in',                       fsData?.checkIns ?? 0, fsData?.checkIns ?? 0, ''],
          ['Early check in',                 '—',                   earlyCI,        ''],
          ['Check out directo',              fsData?.checkOuts ?? 0, coDirec,       ''],
          ['Check out Booking',              '—',                   coBooking,      ''],
          ['Check out Expedia',              '—',                   coExpedia,      ''],
          ['Late check out',                 '—',                   lateCO,         ''],
          ['No show',                        '—',                   noShow,         ''],
          ['SIRE IN',                        fsData?.checkIns ?? 0, sireIn,         ''],
          ['SIRE OUT',                       fsData?.checkOuts ?? 0, sireOut,       ''],
          ['Uso del Jacuzzi',                '—',                   jacuzzi,        ''],
          ['Encuesta / Calificación',        '—',                   encuesta || '—', ''],
        ],
        styles: { fontSize: 7.5, cellPadding: 2.2 },
        headStyles: HEAD_H,
        alternateRowStyles: ALT_ROW,
        margin: { left: M, right: M },
        columnStyles: { 0: { cellWidth: 68 }, 1: { cellWidth: 22, halign: 'center' }, 2: { cellWidth: 22, halign: 'center' } },
      });
      y = pdf.lastAutoTable.finalY + 8;

      // ── 3. INGRESOS ─────────────────────────────────────────────
      if (y > 230) { pdf.addPage(); y = 18; }
      sectionTitle('3. INGRESOS', '■');
      pdf.autoTable({
        startY: y,
        head: [['Concepto', 'Valor', 'Observaciones']],
        body: [
          ['Efectivo',             fmtCOP(ingEfec),  ''],
          ['Voucher datáfono',     fmtCOP(ingDat),   ''],
          ['Transferencia',        fmtCOP(ingTrans), ''],
          ['Expedia',              fmtCOP(ingExp),   ''],
          ['Lavandería',           fmtCOP(ingLav),   ''],
          ['Facturas CXC',         fmtCOP(ingCXC),   ingObs || ''],
          ['TOTAL INGRESOS',       fmtCOP(totalIng), ''],
        ],
        styles: { fontSize: 7.5, cellPadding: 2.2 },
        headStyles: HEAD_H,
        alternateRowStyles: ALT_ROW,
        didParseCell: (d) => {
          if (d.row.index === 6) {
            d.cell.styles.fontStyle = 'bold';
            d.cell.styles.fillColor = [210, 245, 220];
            d.cell.styles.textColor = [20, 100, 50];
          }
        },
        margin: { left: M, right: M },
        columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: 35, halign: 'right' } },
      });
      y = pdf.lastAutoTable.finalY + 8;

      // ── 4. BASE CAJA ────────────────────────────────────────────
      if (y > 240) { pdf.addPage(); y = 18; }
      sectionTitle('4. BASE CAJA', '■');
      pdf.autoTable({
        startY: y,
        head: [['Concepto', 'Valor', 'Observaciones']],
        body: [
          ['Base inicial',   fmtCOP(baseIni),  ''],
          ['Uso base (gastos)', fmtCOP(usoBase), cajaObs || ''],
          ['Base final',     fmtCOP(baseFinal), ''],
        ],
        styles: { fontSize: 7.5, cellPadding: 2.2 },
        headStyles: HEAD_H,
        alternateRowStyles: ALT_ROW,
        didParseCell: (d) => {
          if (d.row.index === 2) {
            d.cell.styles.fontStyle = 'bold';
            d.cell.styles.fillColor = baseFinal >= 0 ? [210, 245, 220] : [254, 226, 226];
            d.cell.styles.textColor = baseFinal >= 0 ? [20, 100, 50] : [153, 27, 27];
          }
        },
        margin: { left: M, right: M },
        columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: 35, halign: 'right' } },
      });
      y = pdf.lastAutoTable.finalY + 8;

      // ── 5. CANALES ──────────────────────────────────────────────
      if (y > 230) { pdf.addPage(); y = 18; }
      sectionTitle('5. HABITACIONES POR CANAL DE RESERVA', '■');
      pdf.autoTable({
        startY: y,
        head: [['Canal', 'Cantidad', 'Observaciones']],
        body: canales.map(c => [c.canal, c.cantidad, c.obs || '']),
        styles: { fontSize: 7.5, cellPadding: 2.2 },
        headStyles: HEAD_H,
        alternateRowStyles: ALT_ROW,
        margin: { left: M, right: M },
        columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: 18, halign: 'center' } },
      });
      y = pdf.lastAutoTable.finalY + 8;

      // ── 6. MENSAJES ─────────────────────────────────────────────
      if (y > 240) { pdf.addPage(); y = 18; }
      sectionTitle('6. MENSAJES', '■');
      pdf.autoTable({
        startY: y,
        head: [['Canal', 'Cantidad', 'Observaciones']],
        body: mensajes.map(m => [m.canal, m.cantidad, m.obs || '']),
        styles: { fontSize: 7.5, cellPadding: 2.2 },
        headStyles: HEAD_H,
        alternateRowStyles: ALT_ROW,
        margin: { left: M, right: M },
        columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: 18, halign: 'center' } },
      });
      y = pdf.lastAutoTable.finalY + 8;

      // ── 7. NOTAS DE TURNOS ──────────────────────────────────────
      if (fsData?.importantNotes?.length > 0) {
        if (y > 230) { pdf.addPage(); y = 18; }
        sectionTitle('7. NOTAS DE TURNOS ANTERIORES', '■');
        fsData.importantNotes.forEach(note => {
          pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8);
          pdf.setTextColor(155, 127, 212);
          pdf.text(`Turno ${note.shift}`, M, y); y += 4;
          pdf.setTextColor(0); pdf.setFont('helvetica', 'normal');
          const lines = pdf.splitTextToSize(note.notes, W - M * 2 - 4);
          const bh = lines.length * 4 + 6;
          pdf.setFillColor(245, 245, 250);
          pdf.rect(M, y, W - M * 2, bh, 'F');
          pdf.setDrawColor(220, 220, 235);
          pdf.rect(M, y, W - M * 2, bh);
          lines.forEach((l, i) => pdf.text(l, M + 3, y + 4.5 + i * 4));
          y += bh + 6;
        });
      }

      // ── 8. OBSERVACIONES AUDITOR ────────────────────────────────
      if (y > 230) { pdf.addPage(); y = 18; }
      sectionTitle('8. OBSERVACIONES DEL AUDITOR NOCTURNO', '■');
      const obsLines = pdf.splitTextToSize(notesAuditor || 'Sin observaciones.', W - M * 2 - 6);
      const obsH = Math.max(obsLines.length * 4 + 8, 28);
      pdf.setFillColor(248, 247, 255);
      pdf.rect(M, y, W - M * 2, obsH, 'F');
      pdf.setDrawColor(180, 160, 240);
      pdf.rect(M, y, W - M * 2, obsH);
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(40, 40, 80);
      obsLines.forEach((l, i) => pdf.text(l, M + 3, y + 5 + i * 4));
      y += obsH + 10;

      // ── FIRMA ────────────────────────────────────────────────────
      if (y > 255) { pdf.addPage(); y = 18; }
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9); pdf.setTextColor(40, 40, 80);
      pdf.text('AUDITOR NOCTURNO', M, y); y += 5;
      pdf.setDrawColor(180, 160, 240);
      pdf.rect(M, y, 85, 20);
      pdf.setLineWidth(0.3);
      pdf.line(M + 5, y + 17, M + 80, y + 17);
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7); pdf.setTextColor(130);
      pdf.text('Firma y nombre', M + 5, y + 19.5);

      // ── FOOTER ──────────────────────────────────────────────────
      const total = pdf.getNumberOfPages();
      for (let i = 1; i <= total; i++) {
        pdf.setPage(i);
        pdf.setFontSize(6); pdf.setTextColor(150);
        pdf.text(
          `Página ${i} de ${total}  ·  ${dateLabel}  ·  Hotel Cytrico – Auditoría Nocturna`,
          W / 2, 291, { align: 'center' }
        );
      }

      pdf.save(`auditoria_nocturna_${fsData?.fecha || new Date().toISOString().split('T')[0]}.pdf`);
      showToast('¡PDF generado exitosamente!');
      setTimeout(onClose, 1500);
    } catch (err) {
      console.error(err);
      showToast('Error al generar PDF: ' + err.message, 'error');
    } finally {
      setGenerating(false);
    }
  };

  if (!isOpen) return null;

  // ─────────────────────────────────────────────────────────────────
  // RENDER DE CADA PASO
  // ─────────────────────────────────────────────────────────────────

  const renderStep = () => {
    switch (step) {

      // ── PASO 0: INVENTARIO ─────────────────────────────────────
      case 0: return (
        <div className="na-step-content">
          <SectionHeader
            title="Inventario de equipos"
            subtitle="Verifica cantidades y agrega observaciones si hay novedades"
          />
          <div className="na-field-row" style={{ marginBottom: 16 }}>
            <div className="na-field" style={{ maxWidth: 340 }}>
              <label>Recepcionista / Auditor nocturno</label>
              <NaInput value={receptionist} onChange={setReceptionist} placeholder="Nombre completo" />
            </div>
          </div>
          <div className="na-table-wrap">
            <table className="na-table">
              <thead>
                <tr>
                  <th>Equipo</th>
                  <th style={{ width: 80, textAlign: 'center' }}>Cantidad</th>
                  <th>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((row, i) => (
                  <tr key={i}>
                    <td className="na-td--fixed">{row.equipo}</td>
                    <td>
                      <NaInput
                        type="number"
                        value={row.cantidad}
                        onChange={v => updateRow(setInventory, i, 'cantidad', v)}
                      />
                    </td>
                    <td>
                      <NaInput
                        value={row.obs}
                        placeholder="Sin novedad"
                        onChange={v => updateRow(setInventory, i, 'obs', v)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );

      // ── PASO 1: HABITACIONES ───────────────────────────────────
      case 1: return (
        <div className="na-step-content">
          <SectionHeader
            title="Informe de habitaciones"
            subtitle="Los valores en azul son automáticos desde el sistema. Ajusta si es necesario."
          />

          {/* Métricas top */}
          <div className="na-metrics-row">
            <MetricCard label="Disponibles" value={habDisp} />
            <MetricCard label="Ocupadas hoy" value={habOcup} color="blue" />
            <MetricCard label="% Ocupación" value={`${pctOcup}%`} color="purple" />
            <MetricCard label="Check-ins (sistema)" value={fsData?.checkIns ?? '—'} color="green" />
          </div>

          {/* Ocupación */}
          <div className="na-block">
            <p className="na-block-title">Ocupación general</p>
            <div className="na-grid-4">
              <div className="na-field"><label>Disponibles</label>
                <NaInput type="number" value={habDisp} onChange={setHabDisp} /></div>
              <div className="na-field"><label>Ocupadas</label>
                <NaInput type="number" value={habOcup} onChange={setHabOcup} /></div>
              <div className="na-field"><label>Mant. fuera servicio</label>
                <NaInput type="number" value={habMant} onChange={setHabMant} /></div>
              <div className="na-field"><label>Admin. fuera servicio</label>
                <NaInput type="number" value={habAdmin} onChange={setHabAdmin} /></div>
              <div className="na-field"><label>Bloqueadas</label>
                <NaInput type="number" value={habBloq} onChange={setHabBloq} /></div>
              <div className="na-field"><label>Encuesta / calificación</label>
                <NaInput value={encuesta} onChange={setEncuesta} placeholder="8.4 – Booking" /></div>
              <div className="na-field"><label>Uso del Jacuzzi</label>
                <NaInput type="number" value={jacuzzi} onChange={setJacuzzi} /></div>
              <div className="na-field na-field--wide"><label>Observaciones generales</label>
                <NaInput value={habObs} onChange={setHabObs} placeholder="Hab 206 vestier – Hab 205 ofc…" /></div>
            </div>
          </div>

          {/* Movimientos — tabla auto vs manual */}
          <div className="na-block">
            <p className="na-block-title">Movimientos del día</p>
            <table className="na-table">
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th className="na-th--center">Sistema</th>
                  <th className="na-th--center">Manual</th>
                  <th>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Check in',         auto: fsData?.checkIns, val: fsData?.checkIns, setter: null },
                  { label: 'Early check in',   auto: null, val: earlyCI,    setter: setEarlyCI },
                  { label: 'Check out directo',auto: fsData?.checkOuts, val: coDirec, setter: setCoDirec },
                  { label: 'Check out Booking',auto: null, val: coBooking,  setter: setCoBooking },
                  { label: 'Check out Expedia',auto: null, val: coExpedia,  setter: setCoExpedia },
                  { label: 'Late check out',   auto: null, val: lateCO,     setter: setLateCO },
                  { label: 'No show',          auto: null, val: noShow,     setter: setNoShow },
                  { label: 'SIRE IN',          auto: fsData?.checkIns, val: sireIn,  setter: setSireIn },
                  { label: 'SIRE OUT',         auto: fsData?.checkOuts, val: sireOut, setter: setSireOut },
                ].map((row, i) => (
                  <tr key={i}>
                    <td className="na-td--fixed">{row.label}</td>
                    <td className="na-td--center">
                      {row.auto != null ? <AutoBadge value={row.auto} /> : <span className="na-dash">—</span>}
                    </td>
                    <td className="na-td--center">
                      {row.setter
                        ? <NaInput type="number" value={row.val} onChange={row.setter} />
                        : <AutoBadge value={row.val} />}
                    </td>
                    <td><NaInput value="" onChange={() => {}} placeholder="" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );

      // ── PASO 2: INGRESOS ───────────────────────────────────────
      case 2: return (
        <div className="na-step-content">
          <SectionHeader
            title="Ingresos del día"
            subtitle="Registra todos los ingresos recibidos durante el turno"
          />
          <div className="na-metrics-row">
            <MetricCard label="Total ingresos" value={fmtCOP(totalIng)} color="green" />
            <MetricCard label="Datáfono" value={fmtCOP(ingDat)} color="blue" />
            <MetricCard label="Transferencias" value={fmtCOP(ingTrans)} color="purple" />
            <MetricCard label="Efectivo" value={fmtCOP(ingEfec)} />
          </div>
          <div className="na-block">
            <p className="na-block-title">Detalle de ingresos</p>
            <div className="na-grid-3">
              <div className="na-field"><label>Efectivo</label>
                <NaInput type="number" value={ingEfec} onChange={setIngEfec} /></div>
              <div className="na-field"><label>Voucher datáfono</label>
                <NaInput type="number" value={ingDat} onChange={setIngDat} /></div>
              <div className="na-field"><label>Transferencia bancaria</label>
                <NaInput type="number" value={ingTrans} onChange={setIngTrans} /></div>
              <div className="na-field"><label>Expedia</label>
                <NaInput type="number" value={ingExp} onChange={setIngExp} /></div>
              <div className="na-field"><label>Lavandería</label>
                <NaInput type="number" value={ingLav} onChange={setIngLav} /></div>
              <div className="na-field"><label>Facturas CXC</label>
                <NaInput type="number" value={ingCXC} onChange={setIngCXC} /></div>
            </div>
            <div className="na-total-row">
              <span>Total ingresos</span>
              <span className="na-total-value green">{fmtCOP(totalIng)}</span>
            </div>
            <div className="na-field" style={{ marginTop: 12 }}>
              <label>Observaciones</label>
              <NaInput value={ingObs} onChange={setIngObs} placeholder="Notas sobre los ingresos…" />
            </div>
          </div>
        </div>
      );

      // ── PASO 3: CAJA ───────────────────────────────────────────
      case 3: return (
        <div className="na-step-content">
          <SectionHeader
            title="Base caja menor"
            subtitle="Registra el movimiento de la caja durante el turno"
          />
          <div className="na-metrics-row">
            <MetricCard label="Base inicial" value={fmtCOP(baseIni)} />
            <MetricCard label="Uso / gastos" value={fmtCOP(usoBase)} color="red" />
            <MetricCard
              label="Base final"
              value={fmtCOP(baseFinal)}
              color={baseFinal >= 0 ? 'green' : 'red'}
            />
            {fsData && <MetricCard label="Gastos (sistema)" value={fmtCOP(fsData.totalGastos)} color="blue" />}
          </div>
          <div className="na-block">
            <p className="na-block-title">Movimiento de caja</p>
            <div className="na-grid-3">
              <div className="na-field"><label>Base inicial</label>
                <NaInput type="number" value={baseIni} onChange={setBaseIni} /></div>
              <div className="na-field"><label>Uso base (gastos)</label>
                <NaInput type="number" value={usoBase} onChange={setUsoBase} /></div>
              <div className="na-field na-field--highlight">
                <label>Base final (calculado)</label>
                <div className={`na-calc-value ${baseFinal >= 0 ? 'green' : 'red'}`}>{fmtCOP(baseFinal)}</div>
              </div>
            </div>
            <div className="na-field" style={{ marginTop: 12 }}>
              <label>Observaciones</label>
              <NaInput value={cajaObs} onChange={setCajaObs} placeholder="Novedades de caja…" />
            </div>
          </div>
        </div>
      );

      // ── PASO 4: CANALES ────────────────────────────────────────
      case 4: return (
        <div className="na-step-content">
          <SectionHeader
            title="Habitaciones por canal de reserva"
            subtitle="¿Cómo llegaron los huéspedes del día?"
          />
          <div className="na-table-wrap">
            <table className="na-table">
              <thead>
                <tr><th>Canal</th><th style={{ width: 90, textAlign: 'center' }}>Cantidad</th><th>Observaciones</th></tr>
              </thead>
              <tbody>
                {canales.map((row, i) => (
                  <tr key={i}>
                    <td className="na-td--fixed">{row.canal}</td>
                    <td><NaInput type="number" value={row.cantidad} onChange={v => updateRow(setCanales, i, 'cantidad', v)} /></td>
                    <td><NaInput value={row.obs} onChange={v => updateRow(setCanales, i, 'obs', v)} placeholder="" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );

      // ── PASO 5: MENSAJES ───────────────────────────────────────
      case 5: return (
        <div className="na-step-content">
          <SectionHeader
            title="Mensajes recibidos"
            subtitle="Cantidad de mensajes gestionados por canal"
          />
          <div className="na-table-wrap">
            <table className="na-table">
              <thead>
                <tr><th>Canal</th><th style={{ width: 90, textAlign: 'center' }}>Cantidad</th><th>Observaciones</th></tr>
              </thead>
              <tbody>
                {mensajes.map((row, i) => (
                  <tr key={i}>
                    <td className="na-td--fixed">{row.canal}</td>
                    <td><NaInput type="number" value={row.cantidad} onChange={v => updateRow(setMensajes, i, 'cantidad', v)} /></td>
                    <td><NaInput value={row.obs} onChange={v => updateRow(setMensajes, i, 'obs', v)} placeholder="" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );

      // ── PASO 6: CIERRE ─────────────────────────────────────────
      case 6: return (
        <div className="na-step-content">
          <SectionHeader
            title="Cierre y observaciones finales"
            subtitle="Resumen del turno y notas para el siguiente recepcionista"
          />

          {/* Resumen visual */}
          <div className="na-summary-grid">
            <div className="na-summary-card">
              <span className="na-summary-icon green">✓</span>
              <span className="na-summary-label">Check-ins</span>
              <span className="na-summary-val">{fsData?.checkIns ?? 0}</span>
            </div>
            <div className="na-summary-card">
              <span className="na-summary-icon blue">↗</span>
              <span className="na-summary-label">Check-outs</span>
              <span className="na-summary-val">{fsData?.checkOuts ?? 0}</span>
            </div>
            <div className="na-summary-card">
              <span className="na-summary-icon purple">$</span>
              <span className="na-summary-label">Ingresos</span>
              <span className="na-summary-val">{fmtCOP(totalIng)}</span>
            </div>
            <div className="na-summary-card">
              <span className={`na-summary-icon ${baseFinal >= 0 ? 'green' : 'red'}`}>◆</span>
              <span className="na-summary-label">Base final</span>
              <span className="na-summary-val">{fmtCOP(baseFinal)}</span>
            </div>
          </div>

          {/* Notas de turnos */}
          {fsData?.importantNotes?.length > 0 && (
            <div className="na-block" style={{ marginBottom: 16 }}>
              <p className="na-block-title">Notas de turnos anteriores</p>
              {fsData.importantNotes.map((n, i) => (
                <div key={i} className="na-note-item">
                  <span className="na-note-badge">{n.shift}</span>
                  <p className="na-note-text">{n.notes}</p>
                </div>
              ))}
            </div>
          )}

          {/* Observaciones auditor */}
          <div className="na-block">
            <p className="na-block-title">Observaciones del auditor nocturno</p>
            <textarea
              className="na-textarea"
              rows={5}
              value={notesAuditor}
              onChange={e => setNotesAuditor(e.target.value)}
              placeholder="SE CIERRA PUERTA PRINCIPAL A LAS 12:00 AM…"
            />
          </div>
        </div>
      );

      default: return null;
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // JSX PRINCIPAL
  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="night-audit-overlay">
      <div className="night-audit-modal na-modal-v2">

        {/* ── HEADER ────────────────────────────────────────────── */}
        <div className="na-header">
          <div className="na-header-left">
            <FaFileAlt className="na-header-icon" />
            <div>
              <h2>Auditoría nocturna</h2>
              <p>FR-067-HCR-01 · Hotel Cytrico · Turno Noche 22:00–06:00</p>
            </div>
          </div>
          <div className="na-header-right">
            <button className="na-btn-ghost" onClick={saveDraft} disabled={saving} title="Guardar borrador">
              {saving ? <FaSpinner className="spinning" /> : <FaSave />}
              <span>{saving ? 'Guardando…' : 'Borrador'}</span>
            </button>
            <button className="na-btn-close" onClick={onClose}><FaTimes /></button>
          </div>
        </div>

        {/* ── STEPPER ────────────────────────────────────────────── */}
        <div className="na-stepper">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              className={`na-step-btn ${i === step ? 'active' : ''} ${completed.has(i) ? 'done' : ''}`}
              onClick={() => goStep(i)}
            >
              <span className="na-step-dot">
                {completed.has(i) ? <FaCheckCircle /> : i + 1}
              </span>
              <span className="na-step-label">{s.label}</span>
            </button>
          ))}
        </div>

        {/* ── BODY ──────────────────────────────────────────────── */}
        <div className="na-body">
          {loading ? (
            <div className="audit-loading">
              <FaSpinner className="spinning" />
              <p>Cargando datos del turno…</p>
            </div>
          ) : (
            <div className="na-layout">
              {/* Navegación lateral */}
              <nav className="na-sidenav">
                {STEPS.map((s, i) => (
                  <button
                    key={s.id}
                    className={`na-sidenav-item ${i === step ? 'active' : ''} ${completed.has(i) ? 'done' : ''}`}
                    onClick={() => goStep(i)}
                  >
                    <span className="na-sidenav-icon">{s.icon}</span>
                    <span>{s.label}</span>
                    {completed.has(i) && <FaCheckCircle className="na-sidenav-check" />}
                  </button>
                ))}
              </nav>

              {/* Contenido del paso */}
              <div className="na-main">
                {renderStep()}
              </div>
            </div>
          )}
        </div>

        {/* ── FOOTER ────────────────────────────────────────────── */}
        <div className="na-footer">
          <span className="na-footer-progress">
            Paso {step + 1} de {STEPS.length} · {completed.size} completados
          </span>
          <div className="na-footer-btns">
            {step > 0 && (
              <button className="na-btn-ghost" onClick={goPrev}>
                <FaChevronLeft /> Anterior
              </button>
            )}
            <button className="na-btn-ghost" onClick={onClose}>
              <FaTimes /> Cancelar
            </button>
            {step < STEPS.length - 1 ? (
              <button className="na-btn-primary" onClick={goNext}>
                Siguiente <FaChevronRight />
              </button>
            ) : (
              <button className="na-btn-generate" onClick={generatePDF} disabled={generating}>
                {generating
                  ? <><FaSpinner className="spinning" /> Generando…</>
                  : <><FaFilePdf /> Generar PDF</>
                }
              </button>
            )}
          </div>
        </div>

        {/* ── TOAST ─────────────────────────────────────────────── */}
        {toast && <div className={`na-toast na-toast--${toast.type}`}>{toast.msg}</div>}
      </div>
    </div>
  );
};

export default NightAuditModal;
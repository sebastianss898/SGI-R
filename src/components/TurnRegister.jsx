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
  FaPiggyBank, FaEdit, FaFilePdf
} from 'react-icons/fa';

// ─── Estilos ──────────────────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .tr-root { font-family: 'DM Sans', sans-serif; background: #0f0f13; color: #e8e6e1; min-height: 100vh; padding: 0 0 60px; }

  .tr-header { background: linear-gradient(135deg, #1a1a24 0%, #12121a 100%); border-bottom: 1px solid #2a2a3a; padding: 20px 32px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 100; }
  .tr-header-left h1 { font-family: 'DM Serif Display', serif; font-size: 1.5rem; color: #f0ede8; letter-spacing: -0.5px; }
  .tr-header-left p  { font-size: 0.75rem; color: #6b6b8a; margin-top: 1px; }
  .tr-date-badge { background: #1e1e2e; border: 1px solid #2e2e42; border-radius: 10px; padding: 7px 14px; font-size: 0.78rem; color: #9090b0; display: flex; align-items: center; gap: 7px; }
  .tr-date-badge svg { color: #5b5bff; }

  /* Nombre recepcionista en header */
  .receptionist-badge { display: flex; align-items: center; gap: 8px; background: #1e1e2e; border: 1px solid #2e2e42; border-radius: 10px; padding: 6px 14px; }
  .receptionist-badge input { background: none; border: none; color: #c0c0e0; font-family: 'DM Sans', sans-serif; font-size: 0.82rem; outline: none; width: 160px; }
  .receptionist-badge input::placeholder { color: #4a4a6a; }
  .receptionist-badge svg { color: #5b5bff; font-size: 0.85rem; }

  .tr-shift-tabs { display: flex; padding: 20px 32px 0; border-bottom: 1px solid #1e1e2e; }
  .tr-shift-tab { display: flex; align-items: center; gap: 7px; padding: 10px 24px; font-size: 0.85rem; font-weight: 500; color: #5a5a7a; border: none; background: transparent; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; transition: all 0.2s; }
  .tr-shift-tab:disabled { cursor: not-allowed; opacity: 0.3; }
  .tr-shift-tab.morning.active   { color: #FFB347; border-color: #FFB347; }
  .tr-shift-tab.afternoon.active { color: #87CEEB; border-color: #87CEEB; }
  .tr-shift-tab.night.active     { color: #9B7FD4; border-color: #9B7FD4; }
  .tab-lock { font-size: 0.6rem; opacity: 0.45; }

  .tr-content { padding: 22px 32px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; max-width: 1300px; }
  .tr-full { grid-column: 1 / -1; }

  .cajas-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .caja-card { border-radius: 14px; padding: 16px 20px; display: flex; flex-direction: column; gap: 4px; }
  .caja-principal { background: linear-gradient(135deg, #0d2818, #0a1f12); border: 1px solid #1a4028; }
  .caja-menor     { background: linear-gradient(135deg, #1a1428, #120e1e); border: 1px solid #2e1f4a; }
  .caja-label { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.6px; font-weight: 600; opacity: 0.55; display: flex; align-items: center; gap: 5px; }
  .caja-amount { font-family: 'DM Serif Display', serif; font-size: 1.75rem; line-height: 1.1; }
  .caja-principal .caja-amount { color: #4ade80; }
  .caja-menor     .caja-amount { color: #c084fc; }
  .caja-sub { font-size: 0.7rem; opacity: 0.45; margin-top: 1px; }
  .caja-menor-init { display: flex; align-items: center; gap: 7px; margin-top: 6px; }
  .caja-menor-init input { background: #1e1428; border: 1px solid #3a2560; border-radius: 7px; padding: 5px 9px; color: #c084fc; font-family: 'DM Sans', sans-serif; font-size: 0.8rem; outline: none; width: 120px; }
  .btn-set-saldo { background: #3a1f6e; border: none; border-radius: 7px; color: #c084fc; padding: 5px 11px; font-size: 0.75rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 4px; }
  .btn-set-saldo:hover { background: #4e2a90; }
  .saldo-bloqueado { font-size: 0.7rem; color: #6a4a9a; margin-top: 5px; display: flex; align-items: center; gap: 4px; }

  .tr-panel { background: #13131d; border: 1px solid #1e1e2e; border-radius: 14px; overflow: hidden; }
  .tr-panel-header { display: flex; align-items: center; justify-content: space-between; padding: 13px 18px; border-bottom: 1px solid #1a1a28; }
  .tr-panel-title { display: flex; align-items: center; gap: 9px; font-size: 0.83rem; font-weight: 600; color: #c0c0e0; }
  .tr-panel-icon { width: 28px; height: 28px; border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 0.78rem; }
  .icon-green  { background: #1a2f1a; color: #4ade80; }
  .icon-blue   { background: #1a1f38; color: #60a5fa; }
  .icon-purple { background: #221a2f; color: #c084fc; }
  .sum-green  { color: #4ade80; }
  .sum-blue   { color: #60a5fa; }
  .sum-purple { color: #c084fc; }

  .tr-form { padding: 11px 18px; display: flex; gap: 7px; align-items: flex-end; flex-wrap: wrap; border-bottom: 1px solid #1a1a28; }
  .tr-field { display: flex; flex-direction: column; gap: 3px; flex: 1; min-width: 80px; }
  .tr-field label { font-size: 0.67rem; color: #5a5a7a; text-transform: uppercase; letter-spacing: 0.4px; }
  .tr-field input, .tr-field select { background: #0d0d16; border: 1px solid #252535; border-radius: 7px; padding: 6px 9px; color: #d0d0e8; font-size: 0.8rem; font-family: 'DM Sans', sans-serif; outline: none; transition: border-color 0.2s; }
  .tr-field input:focus, .tr-field select:focus { border-color: #5b5bff; }
  .tr-field input::placeholder { color: #3a3a5a; }
  .tr-field select option { background: #1a1a28; }
  .btn-add { background: #5b5bff; border: none; border-radius: 7px; color: #fff; padding: 7px 12px; font-size: 0.8rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 4px; white-space: nowrap; transition: background 0.2s, transform 0.1s; align-self: flex-end; }
  .btn-add:hover { background: #7070ff; transform: translateY(-1px); }
  .btn-add.purple { background: #6b3fa0; }
  .btn-add.purple:hover { background: #8050c0; }

  .ci-checklist { display: flex; gap: 6px; flex-wrap: wrap; padding: 8px 18px 10px; border-bottom: 1px solid #1a1a28; align-items: center; }
  .ci-checklist-label { font-size: 0.67rem; color: #5a5a7a; text-transform: uppercase; letter-spacing: 0.4px; margin-right: 2px; }
  .ci-check { display: flex; align-items: center; gap: 5px; background: #0d0d16; border: 1px solid #252535; border-radius: 20px; padding: 4px 10px; cursor: pointer; transition: all 0.18s; user-select: none; font-size: 0.75rem; color: #5a5a7a; }
  .ci-check:hover { border-color: #3a3a5a; color: #9090b0; }
  .ci-check.checked-in  { background: #1a2f1a; border-color: #4ade80; color: #4ade80; }
  .ci-check.checked-out { background: #1a1f38; border-color: #60a5fa; color: #60a5fa; }
  .ci-check-dot { width: 10px; height: 10px; border-radius: 50%; border: 1.5px solid currentColor; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .ci-check.checked-in  .ci-check-dot::after,
  .ci-check.checked-out .ci-check-dot::after { content: ''; width: 5px; height: 5px; border-radius: 50%; background: currentColor; display: block; }

  .tr-list { max-height: 220px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: #2a2a3a transparent; }
  .tr-list::-webkit-scrollbar { width: 3px; }
  .tr-list::-webkit-scrollbar-thumb { background: #2a2a3a; border-radius: 2px; }
  .tr-empty { padding: 24px 18px; text-align: center; color: #3a3a5a; font-size: 0.78rem; }
  .tr-item { display: flex; align-items: flex-start; padding: 9px 18px; border-bottom: 1px solid #16161e; gap: 9px; transition: background 0.15s; animation: fadeSlide 0.2s ease; }
  .tr-item:hover { background: #16161e; }
  @keyframes fadeSlide { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
  .tr-item-icon { font-size: 0.72rem; opacity: 0.65; padding-top: 2px; }
  .tr-item-body { flex: 1; min-width: 0; }
  .tr-item-title { font-size: 0.8rem; color: #c0c0d8; font-weight: 500; }
  .tr-item-sub   { font-size: 0.69rem; color: #5a5a7a; margin-top: 1px; }
  .tr-item-amount { font-family: 'DM Serif Display', serif; font-size: 0.9rem; white-space: nowrap; }
  .amount-pos { color: #4ade80; }
  .amount-neg { color: #f87171; }
  .amount-neu { color: #60a5fa; }
  .amount-purple { color: #c084fc; }
  .btn-del { background: none; border: none; color: #3a3a5a; cursor: pointer; padding: 3px; border-radius: 4px; font-size: 0.7rem; transition: color 0.2s; margin-top: 1px; }
  .btn-del:hover { color: #f87171; }
  .type-badge { font-size: 0.6rem; padding: 2px 6px; border-radius: 20px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; white-space: nowrap; }
  .badge-in   { background: #1a2f1a; color: #4ade80; }
  .badge-out  { background: #2f1a1a; color: #f87171; }
  .badge-aloj { background: #1a2535; color: #60a5fa; }
  .badge-lav  { background: #1a2828; color: #34d399; }
  .badge-otro { background: #2a2520; color: #fbbf24; }
  .ci-tags { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px; }
  .ci-tag { font-size: 0.6rem; padding: 1px 6px; border-radius: 10px; font-weight: 500; background: #1a2f1a; color: #4ade80; }
  .ci-tag.missing { background: #2a1a1a; color: #f87171; }

  .entrega-info { margin: 0 18px 12px; background: #0d0d16; border: 1px solid #252535; border-radius: 11px; padding: 12px 16px; display: flex; gap: 20px; flex-wrap: wrap; }
  .ei-item { display: flex; flex-direction: column; gap: 2px; }
  .ei-label { font-size: 0.65rem; color: #5a5a7a; text-transform: uppercase; letter-spacing: 0.4px; }
  .ei-val   { font-family: 'DM Serif Display', serif; font-size: 1rem; }

  .tr-textarea { width: calc(100% - 36px); background: #0d0d16; border: 1px solid #252535; border-radius: 9px; padding: 10px 12px; color: #c0c0d8; font-family: 'DM Sans', sans-serif; font-size: 0.82rem; resize: vertical; min-height: 70px; outline: none; transition: border-color 0.2s; margin: 12px 18px; }
  .tr-textarea:focus { border-color: #5b5bff; }
  .tr-textarea::placeholder { color: #3a3a5a; }

  .btn-close-shift { margin: 0 18px 18px; width: calc(100% - 36px); padding: 12px; background: linear-gradient(135deg, #5b5bff, #7b3fe4); border: none; border-radius: 9px; color: #fff; font-family: 'DM Sans', sans-serif; font-size: 0.9rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 7px; transition: opacity 0.2s, transform 0.15s; }
  .btn-close-shift:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
  .btn-close-shift:disabled { opacity: 0.5; cursor: not-allowed; }

  /* ── Modal inicio de turno ── */
  .modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.75);
    display: flex; align-items: center; justify-content: center;
    z-index: 200; animation: fadeIn 0.2s ease;
    backdrop-filter: blur(4px);
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .modal-box {
    background: #13131d; border: 1px solid #2e2e42; border-radius: 20px;
    padding: 36px 40px; width: 420px; max-width: 95vw;
    animation: slideUp 0.25s ease;
    box-shadow: 0 24px 80px rgba(0,0,0,0.6);
  }
  @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  .modal-icon { font-size: 2.5rem; margin-bottom: 12px; display: block; }
  .modal-box h2 { font-family: 'DM Serif Display', serif; font-size: 1.5rem; color: #f0ede8; margin-bottom: 6px; }
  .modal-box p  { font-size: 0.82rem; color: #6060a0; margin-bottom: 24px; line-height: 1.5; }
  .modal-shift-badge {
    display: inline-flex; align-items: center; gap: 8px;
    background: #1e1e2e; border: 1px solid #2e2e42; border-radius: 10px;
    padding: 8px 16px; font-size: 0.85rem; color: #9090c0;
    margin-bottom: 24px;
  }
  .modal-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 20px; }
  .modal-field label { font-size: 0.72rem; color: #5a5a7a; text-transform: uppercase; letter-spacing: 0.5px; }
  .modal-field input {
    background: #0d0d16; border: 1px solid #252535; border-radius: 10px;
    padding: 12px 14px; color: #e0e0f0; font-family: 'DM Sans', sans-serif;
    font-size: 0.95rem; outline: none; transition: border-color 0.2s;
  }
  .modal-field input:focus { border-color: #5b5bff; }
  .modal-field input::placeholder { color: #3a3a5a; }
  .btn-start-shift {
    width: 100%; padding: 13px; background: linear-gradient(135deg, #5b5bff, #7b3fe4);
    border: none; border-radius: 10px; color: #fff;
    font-family: 'DM Sans', sans-serif; font-size: 0.95rem; font-weight: 600;
    cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
    transition: opacity 0.2s, transform 0.15s;
  }
  .btn-start-shift:hover { opacity: 0.9; transform: translateY(-1px); }
  .btn-start-shift:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

  .tr-toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: #1e1e2e; border: 1px solid #3a3a5a; color: #c0c0e0; padding: 10px 22px; border-radius: 11px; font-size: 0.82rem; display: flex; align-items: center; gap: 7px; box-shadow: 0 8px 32px rgba(0,0,0,0.5); animation: toastIn 0.3s ease; z-index: 999; }
  .tr-toast.success { border-color: #4ade80; color: #4ade80; }
  .tr-toast.error   { border-color: #f87171; color: #f87171; }
  @keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
  .spinning { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  @media (max-width: 900px) {
    .tr-content { grid-template-columns: 1fr; }
    .cajas-row  { grid-template-columns: 1fr; }
    .tr-shift-tabs { padding: 14px 16px 0; overflow-x: auto; }
    .tr-content    { padding: 16px; }
    .tr-header     { padding: 14px 16px; flex-wrap: wrap; gap: 10px; }
  }
`;

// ─── Constantes ───────────────────────────────────────────────────────────────
const todayStr = new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
const fmt = (n) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
const uid = () => Math.random().toString(36).slice(2, 8);

const SHIFT_ORDER = ['morning', 'afternoon', 'night'];
const SHIFTS = {
  morning:   { label: 'Mañana',  hours: '07:00–15:00', icon: <FaSun />,      cls: 'morning',   emoji: '🌅' },
  afternoon: { label: 'Tarde',   hours: '15:00–23:00', icon: <FaCloudSun />, cls: 'afternoon', emoji: '🌤' },
  night:     { label: 'Noche',   hours: '23:00–07:00', icon: <FaMoon />,     cls: 'night',     emoji: '🌙' },
};
const INCOME_TYPES = [
  { value: 'alojamiento', label: 'Alojamiento', badge: 'badge-aloj' },
  { value: 'lavanderia',  label: 'Lavandería',  badge: 'badge-lav'  },
  { value: 'otro',        label: 'Otro',        badge: 'badge-otro' },
];
const CI_CHECKS = {
  in: [
    { key: 'fotos',    label: 'Fotos tomadas',    icon: '📷' },
    { key: 'registro', label: 'Registro firmado',  icon: '📋' },
    { key: 'llave',    label: 'Llave entregada',   icon: '🔑' },
    { key: 'pago',     label: 'Pago recibido',     icon: '💳' },
  ],
  out: [
    { key: 'llave',      label: 'Llave devuelta',    icon: '🔑' },
    { key: 'habitacion', label: 'Hab. revisada',     icon: '🛏' },
    { key: 'cargos',     label: 'Cargos cerrados',   icon: '💰' },
    { key: 'factura',    label: 'Factura entregada', icon: '🧾' },
  ],
};
const makeChecks = (type) => Object.fromEntries(CI_CHECKS[type].map(c => [c.key, false]));
const makeShift  = () => ({ checkins: [], invoices: [], income: [], expenses: [], notes: '' });

// ─── Generador de PDF con jsPDF ───────────────────────────────────────────────
const generatePDF = async (shiftData, shiftKey, receptionistName, cajaMenorSaldo) => {
  // Carga dinámica de jsPDF desde CDN
  if (!window.jsPDF) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.onload  = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const W = 210; // ancho A4
  const margin = 18;
  let y = 0;

  const shift     = SHIFTS[shiftKey];
  const now       = new Date();
  const dateLabel = now.toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeLabel = now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

  // ── Cabecera ──
  pdf.setFillColor(15, 15, 19);
  pdf.rect(0, 0, W, 38, 'F');
  pdf.setTextColor(240, 237, 232);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.text('Hotel Cytrico', margin, 16);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(150, 150, 180);
  pdf.text('Reporte de Entrega de Turno', margin, 24);
  pdf.text(`${dateLabel}  •  ${timeLabel}`, margin, 30);

  // Turno badge (derecha)
  pdf.setFillColor(30, 30, 46);
  pdf.roundedRect(W - margin - 50, 8, 50, 22, 4, 4, 'F');
  pdf.setTextColor(200, 200, 230);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text(`Turno ${shift.label}`, W - margin - 25, 18, { align: 'center' });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(130, 130, 160);
  pdf.text(shift.hours, W - margin - 25, 25, { align: 'center' });

  y = 46;

  // ── Info recepcionista ──
  pdf.setFillColor(22, 22, 34);
  pdf.roundedRect(margin, y, W - margin * 2, 14, 3, 3, 'F');
  pdf.setTextColor(150, 150, 200);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text('RECEPCIONISTA SALIENTE', margin + 4, y + 5.5);
  pdf.setTextColor(220, 220, 240);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text(receptionistName || 'Sin nombre', margin + 4, y + 11);
  y += 20;

  // ── Función helpers ──
  const sectionTitle = (title, color) => {
    pdf.setFillColor(...color);
    pdf.rect(margin, y, 3, 6, 'F');
    pdf.setTextColor(200, 200, 230);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text(title, margin + 6, y + 5);
    y += 10;
  };

  const tableHeader = (cols) => {
    pdf.setFillColor(20, 20, 30);
    pdf.rect(margin, y, W - margin * 2, 7, 'F');
    pdf.setTextColor(100, 100, 140);
    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'bold');
    cols.forEach(([text, x, align]) => pdf.text(text, x, y + 5, { align: align || 'left' }));
    y += 7;
  };

  const tableRow = (cols, bg) => {
    if (bg) { pdf.setFillColor(...bg); pdf.rect(margin, y, W - margin * 2, 7, 'F'); }
    pdf.setTextColor(190, 190, 210);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    cols.forEach(([text, x, align, color]) => {
      if (color) pdf.setTextColor(...color); else pdf.setTextColor(190, 190, 210);
      pdf.text(String(text), x, y + 5, { align: align || 'left' });
    });
    y += 7;
  };

  const divider = () => {
    pdf.setDrawColor(30, 30, 46);
    pdf.line(margin, y, W - margin, y);
    y += 4;
  };

  // ── RESUMEN CAJAS ──
  const totalIngresos = shiftData.income.reduce((s, i) => s + i.amount, 0);
  const totalAloj     = shiftData.income.filter(i => i.type === 'alojamiento').reduce((s, i) => s + i.amount, 0);
  const totalLav      = shiftData.income.filter(i => i.type === 'lavanderia').reduce((s, i) => s + i.amount, 0);
  const totalOtros    = shiftData.income.filter(i => i.type === 'otro').reduce((s, i) => s + i.amount, 0);
  const totalGastos   = shiftData.expenses.reduce((s, i) => s + i.amount, 0);
  const totalFacturas = shiftData.invoices.reduce((s, i) => s + i.amount, 0);

  // Cajas resumen lado a lado
  const boxW = (W - margin * 2 - 6) / 2;
  // Caja principal
  pdf.setFillColor(13, 40, 24);
  pdf.roundedRect(margin, y, boxW, 28, 3, 3, 'F');
  pdf.setTextColor(80, 160, 100);
  pdf.setFontSize(7.5); pdf.setFont('helvetica', 'bold');
  pdf.text('CAJA PRINCIPAL — INGRESOS', margin + 4, y + 6);
  pdf.setTextColor(74, 222, 128);
  pdf.setFontSize(15); pdf.setFont('helvetica', 'bold');
  pdf.text(fmt(totalIngresos), margin + 4, y + 16);
  pdf.setTextColor(80, 140, 90); pdf.setFontSize(7.5); pdf.setFont('helvetica', 'normal');
  pdf.text(`Aloj. ${fmt(totalAloj)}  Lav. ${fmt(totalLav)}  Otros ${fmt(totalOtros)}`, margin + 4, y + 24);

  // Caja menor
  pdf.setFillColor(26, 20, 40);
  pdf.roundedRect(margin + boxW + 6, y, boxW, 28, 3, 3, 'F');
  pdf.setTextColor(100, 80, 160);
  pdf.setFontSize(7.5); pdf.setFont('helvetica', 'bold');
  pdf.text('CAJA MENOR — SALDO RESTANTE', margin + boxW + 10, y + 6);
  pdf.setTextColor(192, 132, 252);
  pdf.setFontSize(15); pdf.setFont('helvetica', 'bold');
  pdf.text(fmt(cajaMenorSaldo ?? 0), margin + boxW + 10, y + 16);
  pdf.setTextColor(100, 80, 140); pdf.setFontSize(7.5); pdf.setFont('helvetica', 'normal');
  pdf.text(`Gastos del turno: ${fmt(totalGastos)}`, margin + boxW + 10, y + 24);
  y += 34;

  // ── INGRESOS ──
  if (shiftData.income.length > 0) {
    sectionTitle('INGRESOS — CAJA PRINCIPAL', [74, 222, 128]);
    tableHeader([
      ['Tipo',     margin + 2,        'left'],
      ['Detalle',  margin + 35,       'left'],
      ['Método',   margin + 110,      'left'],
      ['Monto',    W - margin - 2,    'right'],
    ]);
    shiftData.income.forEach((inc, i) => {
      tableRow([
        [inc.typeLabel,          margin + 2,     'left'],
        [inc.concept || '—',     margin + 35,    'left'],
        [inc.method,             margin + 110,   'left'],
        [fmt(inc.amount),        W - margin - 2, 'right', [74, 222, 128]],
      ], i % 2 === 0 ? [18, 18, 28] : null);
    });
    // Total ingresos
    pdf.setFillColor(13, 40, 24);
    pdf.rect(margin, y, W - margin * 2, 8, 'F');
    pdf.setTextColor(74, 222, 128); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9);
    pdf.text('TOTAL INGRESOS', margin + 4, y + 5.5);
    pdf.text(fmt(totalIngresos), W - margin - 2, y + 5.5, { align: 'right' });
    y += 12;
    divider();
  }

  // ── FACTURAS ──
  if (shiftData.invoices.length > 0) {
    sectionTitle('FACTURAS EMITIDAS', [96, 165, 250]);
    tableHeader([
      ['N° Factura', margin + 2,     'left'],
      ['Cliente',    margin + 45,    'left'],
      ['Método',     margin + 110,   'left'],
      ['Monto',      W - margin - 2, 'right'],
    ]);
    shiftData.invoices.forEach((inv, i) => {
      tableRow([
        [inv.number,              margin + 2,     'left'],
        [inv.guest || '—',        margin + 45,    'left'],
        [inv.method,              margin + 110,   'left'],
        [fmt(inv.amount),         W - margin - 2, 'right', [96, 165, 250]],
      ], i % 2 === 0 ? [18, 18, 28] : null);
    });
    pdf.setFillColor(20, 25, 50);
    pdf.rect(margin, y, W - margin * 2, 8, 'F');
    pdf.setTextColor(96, 165, 250); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9);
    pdf.text('TOTAL FACTURAS', margin + 4, y + 5.5);
    pdf.text(fmt(totalFacturas), W - margin - 2, y + 5.5, { align: 'right' });
    y += 12;
    divider();
  }

  // ── GASTOS CAJA MENOR ──
  if (shiftData.expenses.length > 0) {
    sectionTitle('GASTOS — CAJA MENOR', [192, 132, 252]);
    tableHeader([
      ['Concepto',   margin + 2,     'left'],
      ['Categoría',  margin + 80,    'left'],
      ['Monto',      W - margin - 2, 'right'],
    ]);
    shiftData.expenses.forEach((exp, i) => {
      tableRow([
        [exp.concept,    margin + 2,     'left'],
        [exp.category,   margin + 80,    'left'],
        [fmt(exp.amount),W - margin - 2, 'right', [241, 113, 113]],
      ], i % 2 === 0 ? [18, 18, 28] : null);
    });
    pdf.setFillColor(26, 20, 40);
    pdf.rect(margin, y, W - margin * 2, 8, 'F');
    pdf.setTextColor(192, 132, 252); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9);
    pdf.text('TOTAL GASTOS', margin + 4, y + 5.5);
    pdf.text(fmt(totalGastos), W - margin - 2, y + 5.5, { align: 'right' });
    y += 12;
    divider();
  }

  // ── CHECK-INS / OUTS ──
  if (shiftData.checkins.length > 0) {
    sectionTitle('MOVIMIENTOS DE HABITACIONES', [160, 120, 240]);
    tableHeader([
      ['Hab.',  margin + 2,    'left'],
      ['Huésped', margin + 20, 'left'],
      ['Tipo',  margin + 90,   'left'],
      ['Hora',  margin + 120,  'left'],
    ]);
    shiftData.checkins.forEach((ci, i) => {
      tableRow([
        [ci.room,                         margin + 2,   'left'],
        [ci.guest,                        margin + 20,  'left'],
        [ci.type === 'in' ? 'Check-in' : 'Check-out', margin + 90, 'left',
          ci.type === 'in' ? [74, 222, 128] : [248, 113, 113]],
        [ci.time,                         margin + 120, 'left'],
      ], i % 2 === 0 ? [18, 18, 28] : null);
    });
    y += 4;
    divider();
  }

  // ── NOTAS ──
  if (shiftData.notes?.trim()) {
    sectionTitle('NOTAS PARA EL PRÓXIMO TURNO', [251, 191, 36]);
    pdf.setFillColor(30, 28, 20);
    pdf.roundedRect(margin, y, W - margin * 2, 20, 3, 3, 'F');
    pdf.setTextColor(200, 180, 120);
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(8.5);
    const lines = pdf.splitTextToSize(shiftData.notes, W - margin * 2 - 8);
    lines.slice(0, 3).forEach((line, i) => pdf.text(line, margin + 4, y + 7 + i * 5));
    y += 26;
    divider();
  }

  // ── FIRMAS ──
  // Asegurar espacio suficiente (si no queda, nueva página)
  if (y > 230) { pdf.addPage(); y = 20; }

  pdf.setFillColor(15, 15, 22);
  pdf.rect(0, y, W, pdf.internal.pageSize.height - y, 'F');
  y += 6;

  pdf.setTextColor(80, 80, 120);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text('FIRMAS DE CONFORMIDAD', margin, y);
  y += 8;

  const sigW  = (W - margin * 2 - 12) / 2;
  const sigH  = 26;

  // Firma saliente
  pdf.setFillColor(18, 18, 28);
  pdf.roundedRect(margin, y, sigW, sigH, 3, 3, 'F');
  pdf.setDrawColor(40, 40, 60);
  pdf.roundedRect(margin, y, sigW, sigH, 3, 3, 'S');
  pdf.setTextColor(80, 80, 110);
  pdf.setFontSize(7.5);
  pdf.text('RECEPCIONISTA SALIENTE', margin + 4, y + 6);
  pdf.setTextColor(170, 170, 200);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text(receptionistName || '___________________', margin + 4, y + 13);
  // Línea firma
  pdf.setDrawColor(50, 50, 80);
  pdf.line(margin + 4, y + sigH - 5, margin + sigW - 4, y + sigH - 5);
  pdf.setTextColor(60, 60, 90); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7);
  pdf.text('Firma', margin + 4, y + sigH - 1);

  // Firma entrante
  pdf.setFillColor(18, 18, 28);
  pdf.roundedRect(margin + sigW + 12, y, sigW, sigH, 3, 3, 'F');
  pdf.setDrawColor(40, 40, 60);
  pdf.roundedRect(margin + sigW + 12, y, sigW, sigH, 3, 3, 'S');
  pdf.setTextColor(80, 80, 110);
  pdf.setFontSize(7.5);
  pdf.text('RECEPCIONISTA ENTRANTE', margin + sigW + 16, y + 6);
  pdf.setTextColor(170, 170, 200);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text('___________________', margin + sigW + 16, y + 13);
  pdf.setDrawColor(50, 50, 80);
  pdf.line(margin + sigW + 16, y + sigH - 5, margin + sigW * 2 + 8, y + sigH - 5);
  pdf.setTextColor(60, 60, 90); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7);
  pdf.text('Firma', margin + sigW + 16, y + sigH - 1);

  y += sigH + 8;

  // Pie de página
  pdf.setTextColor(50, 50, 80);
  pdf.setFontSize(7);
  pdf.text(`Generado el ${dateLabel} a las ${timeLabel}  •  Hotel Cytrico — Sistema de Recepción`, W / 2, y + 4, { align: 'center' });

  const filename = `turno_${shiftKey}_${now.toISOString().slice(0, 10)}.pdf`;
  pdf.save(filename);
};

// ─── Componente ───────────────────────────────────────────────────────────────
export default function TurnRegister() {
  const [activeShift,     setActiveShift]     = useState('morning');
  const [receptionistName, setReceptionistName] = useState('');
  const [data, setData] = useState({ morning: makeShift(), afternoon: makeShift(), night: makeShift() });
  const [cajaMenorSaldo,  setCajaMenorSaldo]  = useState(null);
  const [cajaMenorInput,  setCajaMenorInput]  = useState('');
  const [cajaMenorLocked, setCajaMenorLocked] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [toast,    setToast]    = useState(null);

  // Modal inicio de turno
  const [showStartModal, setShowStartModal] = useState(false);
  const [nextShiftName,  setNextShiftName]  = useState('');
  const [pendingNextShift, setPendingNextShift] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        const q = query(collection(db, 'turnos'), orderBy('createdAt', 'desc'), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const lastShift = snap.docs[0].data().shift;
          const idx = SHIFT_ORDER.indexOf(lastShift);
          setActiveShift(SHIFT_ORDER[(idx + 1) % SHIFT_ORDER.length]);
        }
        const cmDoc = await getDoc(doc(db, 'cajaMenor', 'saldo'));
        if (cmDoc.exists()) { setCajaMenorSaldo(cmDoc.data().monto); setCajaMenorLocked(true); }
        else setCajaMenorSaldo(0);
      } catch (e) { console.error(e); setCajaMenorSaldo(0); }
    };
    init();
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const sd     = data[activeShift];
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

  // ── Forms ──
  const [ciForm,  setCiForm]  = useState({ room: '', guest: '', type: 'in', time: '', checks: makeChecks('in') });
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

  // ── Totales ──
  const totalIngresos = sd.income.reduce((s, i) => s + i.amount, 0);
  const totalAloj     = sd.income.filter(i => i.type === 'alojamiento').reduce((s, i) => s + i.amount, 0);
  const totalLav      = sd.income.filter(i => i.type === 'lavanderia').reduce((s, i) => s + i.amount, 0);
  const totalOtros    = sd.income.filter(i => i.type === 'otro').reduce((s, i) => s + i.amount, 0);
  const totalInvoices = sd.invoices.reduce((s, i) => s + i.amount, 0);
  const totalGastos   = sd.expenses.reduce((s, i) => s + i.amount, 0);
  const nextShiftKey  = SHIFT_ORDER[(SHIFT_ORDER.indexOf(activeShift) + 1) % 3];

  // ── Entregar turno: guardar → generar PDF → mostrar modal ──
  const handleCloseShift = async () => {
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

      // Generar PDF
      await generatePDF(sd, activeShift, receptionistName, cajaMenorSaldo);

      // Mostrar modal para inicio del siguiente turno
      setPendingNextShift(nextShiftKey);
      setShowStartModal(true);

    } catch (e) {
      console.error(e);
      showToast('Error al guardar. Verifica Firebase.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Confirmar inicio de turno (desde modal) ──
  const handleStartShift = () => {
    if (!nextShiftName.trim()) return;
    setData(prev => ({ ...prev, [activeShift]: makeShift() }));
    setActiveShift(pendingNextShift);
    setReceptionistName(nextShiftName);
    setNextShiftName('');
    setShowStartModal(false);
    showToast(`✓ Turno ${SHIFTS[pendingNextShift].label} iniciado. Bienvenida, ${nextShiftName}`, 'success');
  };

  const activeChecks = CI_CHECKS[ciForm.type];

  return (
    <>
      <style>{STYLES}</style>
      <div className="tr-root">

        {/* Header */}
        <header className="tr-header">
          <div className="tr-header-left">
            <h1>Registro de Turno</h1>
            <p>Gestión de operaciones · Hotel Cytrico</p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {/* Nombre recepcionista */}
            <div className="receptionist-badge">
              <FaUser />
              <input
                placeholder="Tu nombre..."
                value={receptionistName}
                onChange={e => setReceptionistName(e.target.value)}
              />
            </div>
            <div className="tr-date-badge">
              <FaClock />
              <span style={{ textTransform: 'capitalize' }}>{todayStr}</span>
            </div>
          </div>
        </header>

        {/* Shift Tabs */}
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

          {/* Cajas */}
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
            <button className="btn-close-shift" onClick={handleCloseShift} disabled={saving}>
              {saving
                ? <><FaSpinner className="spinning" /> Guardando y generando PDF...</>
                : <><FaFilePdf /> Entregar Turno {SHIFTS[activeShift].label} y generar PDF</>
              }
            </button>
          </div>

        </div>
      </div>

      {/* ── Modal inicio de turno ── */}
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
              <input
                autoFocus
                placeholder="Ej: Estefanía López"
                value={nextShiftName}
                onChange={e => setNextShiftName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleStartShift()}
              />
            </div>
            <button className="btn-start-shift" onClick={handleStartShift} disabled={!nextShiftName.trim()}>
              <FaCheck /> Comenzar Turno {pendingNextShift ? SHIFTS[pendingNextShift].label : ''}
            </button>
          </div>
        </div>
      )}

      {toast && <div className={`tr-toast ${toast.type}`}>{toast.msg}</div>}
    </>
  );
}
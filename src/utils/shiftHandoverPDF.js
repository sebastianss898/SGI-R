// Generador de PDF optimizado para impresión B&N - Formato sobre plegable
// Este PDF está diseñado para:
// 1. Impresión en blanco y negro (ahorro de tinta)
// 2. Formato plegable tipo sobre (carta A4 doblada en 3)
// 3. Mínimo uso de tinta (sin fondos oscuros)

export const generateShiftHandoverPDF = async (shiftData, shiftKey, receptionistName, cajaMenorSaldo) => {
  // Cargar jsPDF si no está disponible
  if (!window.jsPDF) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const W = 210; // Ancho A4
  const H = 297; // Alto A4
  const margin = 20;
  let y = 0;

  const SHIFTS = {
    morning: { label: 'Mañana', hours: '06:00–14:00', symbol: '☀' },
    afternoon: { label: 'Tarde', hours: '14:00–22:00', symbol: '◐' },
    night: { label: 'Noche', hours: '22:00–06:00', symbol: '☽' },
  };

  const shift = SHIFTS[shiftKey];
  const now = new Date();
  const dateLabel = now.toLocaleDateString('es-CL', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });
  const timeLabel = now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

  const fmt = (n) => new Intl.NumberFormat('es-CL', { 
    style: 'currency', currency: 'CLP', maximumFractionDigits: 0 
  }).format(n);

  // ═══════════════════════════════════════════════════════════════
  // SECCIÓN SUPERIOR - Información de cierre (para doblar hacia adentro)
  // ═══════════════════════════════════════════════════════════════
  
  // Línea de corte superior (opcional)
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineDash([3, 3]);
  pdf.line(margin, 99, W - margin, 99);
  pdf.setLineDash([]);
  
  // Header compacto
  y = 15;
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.5);
  pdf.rect(margin, y, W - margin * 2, 18);
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.setTextColor(0, 0, 0);
  pdf.text('HOTEL CYTRICO', margin + 5, y + 8);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text('Entrega de Turno', margin + 5, y + 13);
  
  // Turno en recuadro
  pdf.rect(W - margin - 45, y + 2, 45, 14);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text(` ${shift.label}`, W - margin - 22.5, y + 9, { align: 'center' });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text(shift.hours, W - margin - 22.5, y + 14, { align: 'center' });
  
  y += 24;
  
  // Información del recepcionista
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text('RECEPCIONISTA SALIENTE:', margin, y);
  pdf.setFont('helvetica', 'normal');
  pdf.text(receptionistName || 'Sin nombre', margin + 50, y);
  
  pdf.setFont('helvetica', 'bold');
  pdf.text('FECHA:', W - margin - 70, y);
  pdf.setFont('helvetica', 'normal');
  pdf.text(dateLabel.slice(0, 30), W - margin - 50, y);
  
  y += 5;
  pdf.setFont('helvetica', 'bold');
  pdf.text('HORA:', W - margin - 70, y);
  pdf.setFont('helvetica', 'normal');
  pdf.text(timeLabel, W - margin - 50, y);
  
  y += 8;
  pdf.line(margin, y, W - margin, y);
  y += 6;

  // ───────────────────────────────────────────────────────────────
  // Resumen financiero compacto
  // ───────────────────────────────────────────────────────────────
  
  const totalIngresos = shiftData.income.reduce((s, i) => s + i.amount, 0);
  const totalAloj = shiftData.income.filter(i => i.type === 'alojamiento').reduce((s, i) => s + i.amount, 0);
  const totalLav = shiftData.income.filter(i => i.type === 'lavanderia').reduce((s, i) => s + i.amount, 0);
  const totalOtros = shiftData.income.filter(i => i.type === 'otro').reduce((s, i) => s + i.amount, 0);
  const totalGastos = shiftData.expenses.reduce((s, i) => s + i.amount, 0);
  const totalFacturas = shiftData.invoices.reduce((s, i) => s + i.amount, 0);
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text('RESUMEN FINANCIERO', margin, y);
  y += 5;
  
  // Tabla compacta
  const rows = [
    ['Caja Principal - Ingresos', fmt(totalIngresos), true],
    ['  └ Alojamiento', fmt(totalAloj), false],
    ['  └ Lavandería', fmt(totalLav), false],
    ['  └ Otros', fmt(totalOtros), false],
    ['Facturas Emitidas', fmt(totalFacturas), false],
    ['Caja Menor - Gastos', fmt(totalGastos), false],
    ['Caja Menor - Saldo Final', fmt(cajaMenorSaldo ?? 0), true],
  ];
  
  rows.forEach(([label, value, isBold]) => {
    pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
    pdf.setFontSize(8);
    pdf.text(label, margin + 2, y);
    pdf.text(value, W - margin - 2, y, { align: 'right' });
    y += 4;
  });
  
  y += 2;
  pdf.line(margin, y, W - margin, y);
  y += 6;
  
  // Movimientos de habitaciones
  if (shiftData.checkins.length > 0) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.text('MOVIMIENTOS DE HABITACIONES', margin, y);
    y += 5;
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    
    shiftData.checkins.slice(0, 3).forEach(ci => {
      const type = ci.type === 'in' ? 'IN' : 'OUT';
      pdf.text(`• ${type} - Hab. ${ci.room} - ${ci.guest} (${ci.time})`, margin + 2, y);
      y += 4;
    });
    
    if (shiftData.checkins.length > 3) {
      pdf.setFont('helvetica', 'italic');
      pdf.text(`... y ${shiftData.checkins.length - 3} más`, margin + 2, y);
      y += 4;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SECCIÓN MEDIA - Detalle de transacciones (panel central visible)
  // ═══════════════════════════════════════════════════════════════
  
  y = 105; // Inicio de sección media
  
  // Línea de doblez
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineDash([3, 3]);
  pdf.line(margin, 198, W - margin, 198);
  pdf.setLineDash([]);
  
  // Título de sección
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('DETALLE DE TRANSACCIONES', margin, y);
  y += 7;
  
  // Ingresos detallados
  if (shiftData.income.length > 0) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.text('INGRESOS', margin, y);
    y += 4;
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    
    // Header de tabla
    pdf.rect(margin, y, W - margin * 2, 5);
    pdf.text('Tipo', margin + 2, y + 3.5);
    pdf.text('Detalle', margin + 30, y + 3.5);
    pdf.text('Método', margin + 90, y + 3.5);
    pdf.text('Monto', W - margin - 2, y + 3.5, { align: 'right' });
    y += 5;
    
    shiftData.income.forEach((inc, i) => {
      if (i % 2 === 0) {
        pdf.setFillColor(245, 245, 245);
        pdf.rect(margin, y, W - margin * 2, 4, 'F');
      }
      pdf.text(inc.typeLabel.slice(0, 12), margin + 2, y + 3);
      pdf.text((inc.concept || '—').slice(0, 40), margin + 30, y + 3);
      pdf.text(inc.method, margin + 90, y + 3);
      pdf.text(fmt(inc.amount), W - margin - 2, y + 3, { align: 'right' });
      y += 4;
    });
    
    // Total
    pdf.setFont('helvetica', 'bold');
    pdf.rect(margin, y, W - margin * 2, 5);
    pdf.text('TOTAL', margin + 2, y + 3.5);
    pdf.text(fmt(totalIngresos), W - margin - 2, y + 3.5, { align: 'right' });
    y += 7;
  }
  
  // Gastos detallados
  if (shiftData.expenses.length > 0) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.text('GASTOS - CAJA MENOR', margin, y);
    y += 4;
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    
    // Header de tabla
    pdf.rect(margin, y, W - margin * 2, 5);
    pdf.text('Concepto', margin + 2, y + 3.5);
    pdf.text('Categoría', margin + 90, y + 3.5);
    pdf.text('Monto', W - margin - 2, y + 3.5, { align: 'right' });
    y += 5;
    
    shiftData.expenses.forEach((exp, i) => {
      if (i % 2 === 0) {
        pdf.setFillColor(245, 245, 245);
        pdf.rect(margin, y, W - margin * 2, 4, 'F');
      }
      pdf.text(exp.concept.slice(0, 50), margin + 2, y + 3);
      pdf.text(exp.category, margin + 90, y + 3);
      pdf.text(fmt(exp.amount), W - margin - 2, y + 3, { align: 'right' });
      y += 4;
    });
    
    // Total
    pdf.setFont('helvetica', 'bold');
    pdf.rect(margin, y, W - margin * 2, 5);
    pdf.text('TOTAL', margin + 2, y + 3.5);
    pdf.text(fmt(totalGastos), W - margin - 2, y + 3.5, { align: 'right' });
    y += 7;
  }

  // ═══════════════════════════════════════════════════════════════
  // SECCIÓN INFERIOR - Notas y firmas (doblar hacia adentro)
  // ═══════════════════════════════════════════════════════════════
  
  y = 204; // Inicio de sección inferior
  
  // Notas
  if (shiftData.notes?.trim()) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.text('NOTAS PARA EL PRÓXIMO TURNO', margin, y);
    y += 5;
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.rect(margin, y, W - margin * 2, 25);
    
    const lines = pdf.splitTextToSize(shiftData.notes, W - margin * 2 - 4);
    lines.slice(0, 5).forEach((line, i) => {
      pdf.text(line, margin + 2, y + 4 + i * 4);
    });
    y += 28;
  }
  
  // Firmas
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text('FIRMAS DE CONFORMIDAD', margin, y);
  y += 6;
  
  const sigW = (W - margin * 2 - 10) / 2;
  
  // Firma saliente
  pdf.rect(margin, y, sigW, 20);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.text('RECEPCIONISTA SALIENTE', margin + 2, y + 4);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text(receptionistName || '____________________', margin + 2, y + 10);
  pdf.line(margin + 2, y + 17, margin + sigW - 2, y + 17);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6);
  pdf.text('Firma', margin + 2, y + 19);
  
  // Firma entrante
  pdf.rect(margin + sigW + 10, y, sigW, 20);
  pdf.setFontSize(7);
  pdf.text('RECEPCIONISTA ENTRANTE', margin + sigW + 12, y + 4);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.line(margin + sigW + 12, y + 17, W - margin - 2, y + 17);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6);
  pdf.text('Firma', margin + sigW + 12, y + 19);
  
  y += 24;
  
  // Footer
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6);
  pdf.setTextColor(100, 100, 100);
  pdf.text(`Generado: ${dateLabel} ${timeLabel} • Hotel Cytrico`, W / 2, y, { align: 'center' });
  
  // Guías de plegado
  pdf.setTextColor(150, 150, 150);
  pdf.setFontSize(6);
  pdf.text('← Doblar aquí', 5, 99, { angle: 90 });
  pdf.text('← Doblar aquí', 5, 198, { angle: 90 });

  // Guardar PDF
  const filename = `entrega_turno_${shiftKey}_${now.toISOString().slice(0, 10)}.pdf`;
  pdf.save(filename);
};
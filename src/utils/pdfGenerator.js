// src/utils/pdfGenerator.js - Generador real de PDFs
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Configuración general
const PDF_CONFIG = {
  margin: 14,
  fontSize: {
    title: 20,
    subtitle: 12,
    normal: 10,
    small: 8
  },
  colors: {
    primary: [91, 91, 255],
    text: [51, 51, 51],
    gray: [128, 128, 128]
  }
};

// Helper: Formatear fecha
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
};

// Helper: Agregar header al PDF
const addHeader = (doc, title, subtitle) => {
  doc.setFontSize(PDF_CONFIG.fontSize.title);
  doc.setTextColor(...PDF_CONFIG.colors.primary);
  doc.text(title, PDF_CONFIG.margin, 20);
  
  doc.setFontSize(PDF_CONFIG.fontSize.subtitle);
  doc.setTextColor(...PDF_CONFIG.colors.gray);
  doc.text(subtitle, PDF_CONFIG.margin, 30);
  
  // Línea separadora
  doc.setDrawColor(...PDF_CONFIG.colors.primary);
  doc.setLineWidth(0.5);
  doc.line(PDF_CONFIG.margin, 35, doc.internal.pageSize.width - PDF_CONFIG.margin, 35);
};

// Helper: Agregar footer con paginación
const addFooter = (doc) => {
  const pageCount = doc.internal.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.height;
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(PDF_CONFIG.fontSize.small);
    doc.setTextColor(...PDF_CONFIG.colors.gray);
    
    // Fecha de generación
    doc.text(
      `Generado: ${new Date().toLocaleString('es-CL')}`,
      PDF_CONFIG.margin,
      pageHeight - 10
    );
    
    // Número de página
    doc.text(
      `Página ${i} de ${pageCount}`,
      doc.internal.pageSize.width / 2,
      pageHeight - 10,
      { align: 'center' }
    );
    
    // Logo/Nombre del hotel (opcional)
    doc.text(
      'Hotel Cytrico',
      doc.internal.pageSize.width - PDF_CONFIG.margin,
      pageHeight - 10,
      { align: 'right' }
    );
  }
};

// 1. CONTROL DE CLORO
export const generateChlorineReport = (data, dateRange) => {
  const doc = new jsPDF();
  
  addHeader(
    doc,
    'Control de Cloro y pH',
    `Período: ${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`
  );
  
  // Usar datos reales o de muestra
  const reportData = data.length > 0 ? data : [
    {
      date: dateRange.start,
      time: '10:00',
      location: 'Piscina',
      chlorineLevel: 2.5,
      phLevel: 7.4,
      temperature: 28,
      responsible: 'Juan Pérez',
      observations: 'Valores normales'
    }
  ];
  
  doc.autoTable({
    startY: 45,
    head: [['Fecha', 'Hora', 'Lugar', 'Cloro\n(ppm)', 'Cumple\nCloro', 'pH', 'Cumple\npH', 'Responsable', 'Observaciones']],
    body: reportData.map(row => [
      formatDate(row.date),
      row.time,
      row.location,
      row.chlorineLevel,
      row.observations.includes('Cloro cumple: Sí') ? 'Sí' : 'No',
      row.phLevel,
      row.observations.includes('pH cumple: Sí') ? 'Sí' : 'No',
      row.responsible,
      'S/N'
    ]),
    theme: 'grid',
    tableWidth: 'auto', // Ocupa todo el ancho disponible
    headStyles: { 
      fillColor: [91, 91, 255],
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      cellPadding: 3
    },
    styles: { 
      fontSize: 9,
      cellPadding: 3,
      halign: 'center',
      valign: 'middle'
    },
    // Eliminamos columnStyles para que las columnas se distribuyan automáticamente
    margin: { left: PDF_CONFIG.margin, right: PDF_CONFIG.margin }
  });
  
  // Agregar resumen y rangos normales
  const finalY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(PDF_CONFIG.fontSize.normal);
  doc.setTextColor(...PDF_CONFIG.colors.text);
  doc.text(`Total de mediciones: ${reportData.length}`, PDF_CONFIG.margin, finalY);
  
  // Agregar rangos normales
  doc.setFontSize(PDF_CONFIG.fontSize.small);
  doc.setTextColor(...PDF_CONFIG.colors.gray);
  doc.text('Rangos normales:', PDF_CONFIG.margin, finalY + 10);
  doc.text('Cloro: 0.3 - 2.0 ppm', PDF_CONFIG.margin, finalY + 15);
  doc.text('pH: 6.5 - 9.0', PDF_CONFIG.margin, finalY + 20);
  
  addFooter(doc);
  
  return doc;
};

// 2. LIMPIEZA
const areasLabels = {
  pisos: 'Pisos',
  paredes: 'Paredes',
  techos: 'Techos',
  mesones: 'Mesones',
  puertas: 'Puertas',
  maquinas: 'Máquinas',
  microondas: 'Microondas',
  estufa: 'Estufa',
  campana: 'Campana',
  recipienteBasuras: 'Recipiente Basuras',
  trampaDeGrasa: 'Trampa de Grasa',
  aseoProfundo: 'Aseo Profundo'
};

export const generateCleaningReport = (data, dateRange) => {
  const doc = new jsPDF();
  
  addHeader(
    doc,
    'Registro de Limpieza y Desinfección',
    `Mes: ${new Date(dateRange.start).toLocaleDateString('es-ES', {month: 'long', year: 'numeric'})}`);
  
 const tableData = data.map(registro => {
    const fecha = formatDate(registro.date);
    
    
    // Mostrar X para cada área
    const areas = {};
    Object.keys(areasLabels).forEach(key => {
      areas[key] = registro.areas && registro.areas[key] ? 'X' : '-';
    });
    
    return [
      fecha,
      areas.pisos,
      areas.paredes,
      areas.techos,
      areas.mesones,
      areas.puertas,
      areas.maquinas,
      areas.microondas,
      areas.estufa,
      areas.campana,
      areas.recipienteBasuras,
      areas.trampaDeGrasa,
      areas.aseoProfundo,
      registro.cleaner,
      registro.supervisor || 'Sin supervisor',
      registro.novedades || 'S/N'
    ];
  });

  doc.autoTable({
    startY: 45,
    head: [[
      'Fecha',
      'Piso', 'Paredes', 'Techos', 'Mesones', 'Puertas', 'Máquinas', 'Microondas', 'Estufa', 'Campana', 'Recipiente Basuras', 'Trampa de Grasa', 'Aseo Profundo',
      'Auxiliar', 'Firma Sup', 'Novedades'
    ]],
    body: tableData,
    theme: 'grid',
    headStyles: { fontSize: 7, cellPadding: 1 },
    styles: { fontSize: 6, cellPadding: 1, halign: 'center' }
  });
    
    
  
  addFooter(doc);
  return doc;
};

// 3. TOMA DE MUESTRAS
export const generateSamplesReport = (data, dateRange) => {
  const doc = new jsPDF();
  
  addHeader(
    doc,
    'Toma de Muestras',
    `Período: ${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`
  );
  
  const sampleData = data.length > 0 ? data : [
    {
      date: dateRange.start,
      sampleId: 'MUESTRA-001',
      location: 'Piscina principal',
      type: 'Agua piscina',
      responsible: 'Laboratorio',
      compliant: 'Sí'
    }
  ];
  
  doc.autoTable({
    startY: 45,
    head: [['Fecha', 'ID Muestra', 'Ubicación', 'Tipo', 'Responsable', 'Cumple']],
    body: sampleData.map(row => [
      formatDate(row.date),
      row.sampleId,
      row.location,
      row.type,
      row.responsible,
      row.compliant
    ]),
    theme: 'grid',
    headStyles: { 
      fillColor: [139, 92, 246],
      fontSize: PDF_CONFIG.fontSize.normal
    },
    styles: { fontSize: PDF_CONFIG.fontSize.small }
  });
  
  addFooter(doc);
  return doc;
};

// 4. RECEPCIÓN
export const generateReceptionReport = (data, dateRange) => {
  const doc = new jsPDF();
  
  addHeader(
    doc,
    'Informe de Recepción',
    `Período: ${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`
  );
  
  const sampleData = data.length > 0 ? data : [
    {
      date: dateRange.start,
      shift: 'Mañana',
      receptionist: 'Carlos Ruiz',
      checkIns: 5,
      checkOuts: 3,
      reservations: 2,
      cancellations: 0,
      complaints: 0
    },
    {
      date: dateRange.start,
      shift: 'Tarde',
      receptionist: 'Laura Pérez',
      checkIns: 8,
      checkOuts: 6,
      reservations: 4,
      cancellations: 1,
      complaints: 0
    }
  ];
  
  doc.autoTable({
    startY: 45,
    head: [['Fecha', 'Turno', 'Recepcionista', 'Check-ins', 'Check-outs', 'Reservas', 'Cancelaciones', 'Quejas']],
    body: sampleData.map(row => [
      formatDate(row.date),
      row.shift,
      row.receptionist,
      row.checkIns,
      row.checkOuts,
      row.reservations,
      row.cancellations,
      row.complaints
    ]),
    theme: 'grid',
    headStyles: { 
      fillColor: [59, 130, 246],
      fontSize: PDF_CONFIG.fontSize.normal
    },
    styles: { fontSize: PDF_CONFIG.fontSize.small }
  });
  
  // Agregar totales
  const finalY = doc.lastAutoTable.finalY + 15;
  doc.setFontSize(PDF_CONFIG.fontSize.normal);
  doc.setTextColor(...PDF_CONFIG.colors.text);
  
  const totals = sampleData.reduce((acc, row) => ({
    checkIns: acc.checkIns + row.checkIns,
    checkOuts: acc.checkOuts + row.checkOuts,
    reservations: acc.reservations + row.reservations
  }), { checkIns: 0, checkOuts: 0, reservations: 0 });
  
  doc.text('Resumen del Período:', PDF_CONFIG.margin, finalY);
  doc.text(`Total Check-ins: ${totals.checkIns}`, PDF_CONFIG.margin, finalY + 7);
  doc.text(`Total Check-outs: ${totals.checkOuts}`, PDF_CONFIG.margin, finalY + 14);
  doc.text(`Total Reservas: ${totals.reservations}`, PDF_CONFIG.margin, finalY + 21);
  
  addFooter(doc);
  return doc;
};

// 5. MANTENIMIENTO
export const generateMaintenanceReport = (data, dateRange) => {
  const doc = new jsPDF();
  
  addHeader(
    doc,
    'Informe de Mantenimiento',
    `Período: ${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`
  );
  
  const sampleData = data.length > 0 ? data : [
    {
      date: dateRange.start,
      workOrderId: 'OT-001',
      type: 'Correctivo',
      location: 'Habitación 305',
      description: 'Reparación de aire acondicionado',
      technician: 'José Martínez',
      priority: 'Alta',
      status: 'Completado'
    }
  ];
  
  doc.autoTable({
    startY: 45,
    head: [['Fecha', 'OT', 'Tipo', 'Ubicación', 'Técnico', 'Prioridad', 'Estado']],
    body: sampleData.map(row => [
      formatDate(row.date),
      row.workOrderId,
      row.type,
      row.location,
      row.technician,
      row.priority,
      row.status
    ]),
    theme: 'grid',
    headStyles: { 
      fillColor: [245, 158, 11],
      fontSize: PDF_CONFIG.fontSize.normal
    },
    styles: { fontSize: PDF_CONFIG.fontSize.small }
  });
  
  addFooter(doc);
  return doc;
};

// 6. TURNOS
export const generateShiftsReport = (data, dateRange) => {
  const doc = new jsPDF();
  
  addHeader(
    doc,
    'Informe de Turnos',
    `Período: ${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`
  );
  
  const sampleData = data.length > 0 ? data : [
    {
      date: dateRange.start,
      shift: 'Mañana',
      receptionist: 'Ana García',
      checkIns: 5,
      income: 350000,
      expenses: 25000
    }
  ];
  
  doc.autoTable({
    startY: 45,
    head: [['Fecha', 'Turno', 'Recepcionista', 'Check-ins', 'Ingresos', 'Gastos']],
    body: sampleData.map(row => [
      formatDate(row.date),
      row.shift,
      row.receptionist,
      row.checkIns,
      `$${row.income.toLocaleString('es-CL')}`,
      `$${row.expenses.toLocaleString('es-CL')}`
    ]),
    theme: 'grid',
    headStyles: { 
      fillColor: [99, 102, 241],
      fontSize: PDF_CONFIG.fontSize.normal
    },
    styles: { fontSize: PDF_CONFIG.fontSize.small }
  });
  
  addFooter(doc);
  return doc;
};

// 7. FINANZAS
export const generateFinancesReport = (data, dateRange) => {
  const doc = new jsPDF();
  
  addHeader(
    doc,
    'Informe Financiero',
    `Período: ${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`
  );
  
  const sampleData = data.length > 0 ? data : [
    {
      date: dateRange.start,
      concept: 'Alojamiento',
      income: 450000,
      expenses: 0,
      balance: 450000
    },
    {
      date: dateRange.start,
      concept: 'Caja menor',
      income: 0,
      expenses: 35000,
      balance: -35000
    }
  ];
  
  doc.autoTable({
    startY: 45,
    head: [['Fecha', 'Concepto', 'Ingresos', 'Gastos', 'Balance']],
    body: sampleData.map(row => [
      formatDate(row.date),
      row.concept,
      `$${row.income.toLocaleString('es-CL')}`,
      `$${row.expenses.toLocaleString('es-CL')}`,
      `$${row.balance.toLocaleString('es-CL')}`
    ]),
    theme: 'grid',
    headStyles: { 
      fillColor: [16, 185, 129],
      fontSize: PDF_CONFIG.fontSize.normal
    },
    styles: { fontSize: PDF_CONFIG.fontSize.small }
  });
  
  addFooter(doc);
  return doc;
};

// 8. OCUPACIÓN
export const generateOccupancyReport = (data, dateRange) => {
  const doc = new jsPDF();
  
  addHeader(
    doc,
    'Informe de Ocupación',
    `Período: ${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`
  );
  
  const sampleData = data.length > 0 ? data : [
    {
      date: dateRange.start,
      totalRooms: 50,
      occupied: 38,
      available: 12,
      occupancyRate: 76,
      revenue: 1250000
    }
  ];
  
  doc.autoTable({
    startY: 45,
    head: [['Fecha', 'Total Hab.', 'Ocupadas', 'Disponibles', 'Tasa %', 'Ingresos']],
    body: sampleData.map(row => [
      formatDate(row.date),
      row.totalRooms,
      row.occupied,
      row.available,
      `${row.occupancyRate}%`,
      `$${row.revenue.toLocaleString('es-CL')}`
    ]),
    theme: 'grid',
    headStyles: { 
      fillColor: [236, 72, 153],
      fontSize: PDF_CONFIG.fontSize.normal
    },
    styles: { fontSize: PDF_CONFIG.fontSize.small }
  });
  
  addFooter(doc);
  return doc;
};
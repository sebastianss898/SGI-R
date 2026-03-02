// src/utils/shiftsSchedulePDF.js - Generador de PDF para horarios
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import {
  getDaysInMonth, formatMonthYear, getDayName, TURNOS_COLORS,
  DEPARTAMENTOS_LABELS
} from './shiftsSchedule';

export const generateShiftsSchedulePDF = (schedule, employees, month, year) => {
  // Usar orientación horizontal para más espacio
  const doc = new jsPDF('landscape', 'mm', 'a4');
  
  const days = getDaysInMonth(year, month);
  
  // Header
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, 'bold');
  doc.text(formatMonthYear(month, year), doc.internal.pageSize.width / 2, 15, { align: 'center' });
  
  // Información adicional
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`Generado: ${new Date().toLocaleDateString('es-CL')}`, 14, 22);
  doc.text(`Estado: ${schedule.published ? 'Publicado' : 'Borrador'}`, doc.internal.pageSize.width - 14, 22, { align: 'right' });
  
  let startY = 30;
  
  // Preparar headers: Día de semana y número
  const dayHeaders = days.map(day => getDayName(day.dayOfWeek));
  const dayNumbers = days.map(day => day.day.toString());
  
  // Iterar por cada departamento
  Object.entries(employees).forEach(([dept, empList], deptIndex) => {
    if (empList.length === 0) return;
    
    // Verificar si necesitamos nueva página
    const estimatedHeight = (empList.length + 3) * 6; // Aproximado
    if (startY + estimatedHeight > doc.internal.pageSize.height - 20) {
      doc.addPage();
      startY = 20;
    }
    
    // Título del departamento
    doc.setFillColor(230, 230, 230);
    doc.rect(14, startY, doc.internal.pageSize.width - 28, 8, 'F');
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(DEPARTAMENTOS_LABELS[dept], 16, startY + 5.5);
    
    startY += 10;
    
    // Preparar datos de la tabla
    const tableData = [];
    
    // Agregar filas de empleados
    empList.forEach(emp => {
      const row = [emp.name];
      days.forEach(day => {
        const shift = schedule?.shifts?.[emp.id]?.[day.day] || '';
        row.push(shift);
      });
      tableData.push(row);
    });
    
    // Crear tabla con autoTable
    doc.autoTable({
      startY: startY,
      head: [
        ['FECHA', ...dayHeaders],
        ['', ...dayNumbers]
      ],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontSize: 7,
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        lineWidth: 0.5,
        lineColor: [0, 0, 0]
      },
      bodyStyles: {
        fontSize: 8,
        halign: 'center',
        valign: 'middle',
        lineWidth: 0.5,
        lineColor: [0, 0, 0],
        cellPadding: 2
      },
      columnStyles: {
        0: { 
          cellWidth: 40, 
          halign: 'left',
          fontStyle: 'bold',
          fillColor: [245, 245, 245]
        }
      },
      didParseCell: function(data) {
        // Colorear celdas según el turno
        if (data.section === 'body' && data.column.index > 0) {
          const cellValue = data.cell.raw;
          if (cellValue && TURNOS_COLORS[cellValue]) {
            const color = TURNOS_COLORS[cellValue];
            data.cell.styles.fillColor = hexToRgb(color);
          }
        }
        
        // Resaltar fines de semana en headers
        if (data.section === 'head' && data.column.index > 0) {
          const dayIndex = data.column.index - 1;
          const day = days[dayIndex];
          if (day && day.isWeekend) {
            data.cell.styles.fillColor = [254, 240, 138]; // Amarillo
            data.cell.styles.textColor = [133, 77, 14];
          }
        }
      },
      margin: { left: 14, right: 14 }
    });
    
    startY = doc.lastAutoTable.finalY + 5;
  });
  
  // Leyenda al final
  if (startY > doc.internal.pageSize.height - 40) {
    doc.addPage();
    startY = 20;
  }
  
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.text('LEYENDA:', 14, startY);
  
  doc.setFont(undefined, 'normal');
  startY += 5;
  
  const legend = [
    '6 = Mañana (6-14)',
    '14 = Tarde (14-22)',
    '22 = Noche (22-6)',
    'D = Descanso',
    'V = Vacaciones',
    'C = Capacitación',
    'CH = Compensatorio',
    'I = Incapacidad'
  ];
  
  let xPos = 14;
  legend.forEach((item, index) => {
    if (index % 4 === 0 && index > 0) {
      startY += 5;
      xPos = 14;
    }
    doc.text(item, xPos, startY);
    xPos += 60;
  });
  
  // Footer en todas las páginas
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Página ${i} de ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
    doc.text(
      'Hotel Cytrico',
      doc.internal.pageSize.width - 14,
      doc.internal.pageSize.height - 10,
      { align: 'right' }
    );
  }
  
  return doc;
};

// Helper: Convertir hex a RGB
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : [255, 255, 255];
};

// Exportar y descargar
export const downloadShiftsSchedulePDF = (schedule, employees, month, year) => {
  const doc = generateShiftsSchedulePDF(schedule, employees, month, year);
  const filename = `Horario_${formatMonthYear(month, year).replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
};
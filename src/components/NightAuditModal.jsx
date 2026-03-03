import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { FaFileAlt, FaTimes, FaFilePdf, FaSpinner, FaCheckCircle } from 'react-icons/fa';
import '../styles/Nightaudit.css';

const NightAuditModal = ({ isOpen, onClose, currentShift }) => {
  const [loading, setLoading] = useState(false);
  const [auditData, setAuditData] = useState(null);
  const [notes, setNotes] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadDayData();
    }
  }, [isOpen]);

  const loadDayData = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Obtener turnos del día (mañana y tarde)
      const turnosQuery = query(
        collection(db, 'turnos'),
        where('date', '==', today),
        orderBy('createdAt', 'asc')
      );
      
      const turnosSnap = await getDocs(turnosQuery);
      const turnos = turnosSnap.docs.map(doc => doc.data());
      
      // Calcular totales del día
      const totalIngresos = turnos.reduce((sum, t) => sum + (t.totals?.ingresos || 0), 0);
      const totalGastos = turnos.reduce((sum, t) => sum + (t.totals?.gastos || 0), 0);
      const totalFacturas = turnos.reduce((sum, t) => sum + (t.totals?.facturas || 0), 0);
      
      // Obtener check-ins y check-outs del día
      const allCheckins = turnos.flatMap(t => t.checkins || []);
      const checkIns = allCheckins.filter(c => c.type === 'in');
      const checkOuts = allCheckins.filter(c => c.type === 'out');
      
      // Obtener notas importantes
      const importantNotes = turnos
        .filter(t => t.notes && t.notes.trim())
        .map(t => ({ shift: t.shiftLabel, notes: t.notes }));

      setAuditData({
        fecha: today,
        turnos: turnos.length,
        totalIngresos,
        totalGastos,
        totalFacturas,
        checkIns: checkIns.length,
        checkOuts: checkOuts.length,
        checkInsDetails: checkIns,
        checkOutsDetails: checkOuts,
        importantNotes,
        cajaMenorSaldo: turnos[turnos.length - 1]?.totals?.saldoCajaMenor || 0
      });
      
    } catch (error) {
      console.error('Error loading day data:', error);
      alert('Error al cargar datos del día');
    } finally {
      setLoading(false);
    }
  };

  const generateAuditPDF = async () => {
    if (!auditData) return;
    
    setGenerating(true);
    try {
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

      const W = 210;
      const margin = 15;
      let y = 0;

      const fmt = (n) => new Intl.NumberFormat('es-CL', { 
        style: 'currency', currency: 'CLP', maximumFractionDigits: 0 
      }).format(n);

      const now = new Date();
      const dateLabel = now.toLocaleDateString('es-CL', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
      });
      const timeLabel = now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

      // ════════════════════════════════════════════════════════════
      // HEADER
      // ════════════════════════════════════════════════════════════
      y = 15;
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.5);
      pdf.rect(margin, y, W - margin * 2, 25);
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      pdf.text('AUDITORÍA NOCTURNA', margin + 5, y + 10);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.text('Hotel Cytrico - Cierre de Operaciones Diarias', margin + 5, y + 16);
      
      // Fecha y hora
      pdf.setFontSize(8);
      pdf.text(`Fecha: ${dateLabel}`, margin + 5, y + 22);
      pdf.text(`Hora: ${timeLabel} (Auditoría Nocturna)`, W - margin - 55, y + 22);
      
      y += 32;

      // ════════════════════════════════════════════════════════════
      // RESUMEN EJECUTIVO
      // ════════════════════════════════════════════════════════════
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text('1. RESUMEN EJECUTIVO DEL DÍA', margin, y);
      y += 7;
      
      pdf.rect(margin, y, W - margin * 2, 40);
      
      // Cuadro de totales
      const boxW = (W - margin * 2 - 10) / 2;
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.text('INGRESOS TOTALES', margin + 5, y + 6);
      pdf.setFontSize(14);
      pdf.text(fmt(auditData.totalIngresos), margin + 5, y + 14);
      
      pdf.setFontSize(8);
      pdf.text('GASTOS TOTALES', margin + boxW + 15, y + 6);
      pdf.setFontSize(14);
      pdf.text(fmt(auditData.totalGastos), margin + boxW + 15, y + 14);
      
      // Segunda fila
      y += 20;
      pdf.setFontSize(8);
      pdf.text('FACTURAS EMITIDAS', margin + 5, y + 6);
      pdf.setFontSize(14);
      pdf.text(fmt(auditData.totalFacturas), margin + 5, y + 14);
      
      pdf.setFontSize(8);
      pdf.text('SALDO CAJA MENOR', margin + boxW + 15, y + 6);
      pdf.setFontSize(14);
      pdf.text(fmt(auditData.cajaMenorSaldo), margin + boxW + 15, y + 14);
      
      y += 27;

      // ════════════════════════════════════════════════════════════
      // OCUPACIÓN
      // ════════════════════════════════════════════════════════════
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text('2. OCUPACIÓN HOTELERA', margin, y);
      y += 7;
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.rect(margin, y, W - margin * 2, 20);
      
      pdf.text(`• Check-ins del día: ${auditData.checkIns}`, margin + 5, y + 7);
      pdf.text(`• Check-outs del día: ${auditData.checkOuts}`, margin + 5, y + 14);
      
      y += 25;

      // ════════════════════════════════════════════════════════════
      // CHECK-INS DETALLE
      // ════════════════════════════════════════════════════════════
      if (auditData.checkInsDetails.length > 0) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.text('2.1 Detalle de Check-ins', margin, y);
        y += 6;
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        
        // Header tabla
        pdf.rect(margin, y, W - margin * 2, 5);
        pdf.text('Hab.', margin + 2, y + 3.5);
        pdf.text('Huésped', margin + 20, y + 3.5);
        pdf.text('Hora', margin + 90, y + 3.5);
        y += 5;
        
        auditData.checkInsDetails.slice(0, 8).forEach((ci, i) => {
          if (i % 2 === 0) {
            pdf.setFillColor(245, 245, 245);
            pdf.rect(margin, y, W - margin * 2, 5, 'F');
          }
          pdf.text(ci.room || '—', margin + 2, y + 3.5);
          pdf.text((ci.guest || '—').slice(0, 40), margin + 20, y + 3.5);
          pdf.text(ci.time || '—', margin + 90, y + 3.5);
          y += 5;
        });
        
        if (auditData.checkInsDetails.length > 8) {
          pdf.setFont('helvetica', 'italic');
          pdf.text(`... y ${auditData.checkInsDetails.length - 8} más`, margin + 2, y + 3);
          y += 5;
        }
        
        y += 3;
      }

      // ════════════════════════════════════════════════════════════
      // CHECK-OUTS DETALLE
      // ════════════════════════════════════════════════════════════
      if (auditData.checkOutsDetails.length > 0) {
        if (y > 220) {
          pdf.addPage();
          y = 20;
        }
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.text('2.2 Detalle de Check-outs', margin, y);
        y += 6;
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        
        // Header tabla
        pdf.rect(margin, y, W - margin * 2, 5);
        pdf.text('Hab.', margin + 2, y + 3.5);
        pdf.text('Huésped', margin + 20, y + 3.5);
        pdf.text('Hora', margin + 90, y + 3.5);
        y += 5;
        
        auditData.checkOutsDetails.slice(0, 8).forEach((co, i) => {
          if (i % 2 === 0) {
            pdf.setFillColor(245, 245, 245);
            pdf.rect(margin, y, W - margin * 2, 5, 'F');
          }
          pdf.text(co.room || '—', margin + 2, y + 3.5);
          pdf.text((co.guest || '—').slice(0, 40), margin + 20, y + 3.5);
          pdf.text(co.time || '—', margin + 90, y + 3.5);
          y += 5;
        });
        
        if (auditData.checkOutsDetails.length > 8) {
          pdf.setFont('helvetica', 'italic');
          pdf.text(`... y ${auditData.checkOutsDetails.length - 8} más`, margin + 2, y + 3);
          y += 5;
        }
        
        y += 3;
      }

      // ════════════════════════════════════════════════════════════
      // NOTAS IMPORTANTES
      // ════════════════════════════════════════════════════════════
      if (auditData.importantNotes.length > 0) {
        if (y > 200) {
          pdf.addPage();
          y = 20;
        }
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.text('3. NOTAS IMPORTANTES DE TURNOS', margin, y);
        y += 7;
        
        auditData.importantNotes.forEach(note => {
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(8);
          pdf.text(`Turno ${note.shift}:`, margin, y);
          y += 5;
          
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8);
          pdf.rect(margin, y, W - margin * 2, 20);
          
          const lines = pdf.splitTextToSize(note.notes, W - margin * 2 - 4);
          lines.slice(0, 4).forEach((line, i) => {
            pdf.text(line, margin + 2, y + 5 + i * 4);
          });
          
          y += 25;
        });
      }

      // ════════════════════════════════════════════════════════════
      // OBSERVACIONES DEL AUDITOR
      // ════════════════════════════════════════════════════════════
      if (y > 220) {
        pdf.addPage();
        y = 20;
      }
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text('4. OBSERVACIONES DEL AUDITOR NOCTURNO', margin, y);
      y += 7;
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.rect(margin, y, W - margin * 2, 30);
      
      if (notes.trim()) {
        const lines = pdf.splitTextToSize(notes, W - margin * 2 - 4);
        lines.slice(0, 6).forEach((line, i) => {
          pdf.text(line, margin + 2, y + 5 + i * 4);
        });
      } else {
        pdf.setFont('helvetica', 'italic');
        pdf.text('Sin observaciones adicionales', margin + 2, y + 15);
      }
      
      y += 35;

      // ════════════════════════════════════════════════════════════
      // FIRMA
      // ════════════════════════════════════════════════════════════
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.text('AUDITOR NOCTURNO', margin, y);
      y += 5;
      
      pdf.rect(margin, y, 80, 20);
      pdf.line(margin + 5, y + 17, margin + 75, y + 17);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.text('Firma y nombre', margin + 5, y + 19);

      // Footer
      pdf.setFontSize(6);
      pdf.setTextColor(100, 100, 100);
      pdf.text(
        `Generado: ${dateLabel} ${timeLabel} • Hotel Cytrico - Auditoría Nocturna`,
        W / 2,
        pdf.internal.pageSize.height - 10,
        { align: 'center' }
      );

      // Guardar PDF
      const filename = `auditoria_nocturna_${auditData.fecha}.pdf`;
      pdf.save(filename);
      
      alert('✅ Auditoría generada exitosamente\n\nPuedes enviarla por correo.');
      onClose();
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('❌ Error al generar PDF');
    } finally {
      setGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="night-audit-overlay">
      <div className="night-audit-modal">
        <div className="night-audit-header">
          <div>
            <h2><FaFileAlt /> Auditoría Nocturna</h2>
            <p>Cierre de operaciones diarias - Turno Noche (22:00-06:00)</p>
          </div>
          <button className="btn-close-modal" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="night-audit-body">
          {loading ? (
            <div className="audit-loading">
              <FaSpinner className="spinning" />
              <p>Recopilando datos del día...</p>
            </div>
          ) : auditData ? (
            <>
              <div className="audit-section">
                <h3>📊 Resumen del Día</h3>
                <div className="audit-stats">
                  <div className="stat-card stat-green">
                    <span className="stat-label">Ingresos Totales</span>
                    <span className="stat-value">
                      {new Intl.NumberFormat('es-CL', { 
                        style: 'currency', currency: 'CLP', maximumFractionDigits: 0 
                      }).format(auditData.totalIngresos)}
                    </span>
                  </div>
                  <div className="stat-card stat-red">
                    <span className="stat-label">Gastos Totales</span>
                    <span className="stat-value">
                      {new Intl.NumberFormat('es-CL', { 
                        style: 'currency', currency: 'CLP', maximumFractionDigits: 0 
                      }).format(auditData.totalGastos)}
                    </span>
                  </div>
                  <div className="stat-card stat-blue">
                    <span className="stat-label">Facturas</span>
                    <span className="stat-value">
                      {new Intl.NumberFormat('es-CL', { 
                        style: 'currency', currency: 'CLP', maximumFractionDigits: 0 
                      }).format(auditData.totalFacturas)}
                    </span>
                  </div>
                  <div className="stat-card stat-purple">
                    <span className="stat-label">Caja Menor</span>
                    <span className="stat-value">
                      {new Intl.NumberFormat('es-CL', { 
                        style: 'currency', currency: 'CLP', maximumFractionDigits: 0 
                      }).format(auditData.cajaMenorSaldo)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="audit-section">
                <h3>🏨 Ocupación</h3>
                <div className="audit-occupancy">
                  <div className="occ-item">
                    <span className="occ-icon">✅</span>
                    <span className="occ-label">Check-ins:</span>
                    <span className="occ-value">{auditData.checkIns}</span>
                  </div>
                  <div className="occ-item">
                    <span className="occ-icon">🚪</span>
                    <span className="occ-label">Check-outs:</span>
                    <span className="occ-value">{auditData.checkOuts}</span>
                  </div>
                  <div className="occ-item">
                    <span className="occ-icon">📋</span>
                    <span className="occ-label">Turnos registrados:</span>
                    <span className="occ-value">{auditData.turnos}</span>
                  </div>
                </div>
              </div>

              {auditData.importantNotes.length > 0 && (
                <div className="audit-section">
                  <h3>📝 Notas Importantes</h3>
                  <div className="audit-notes">
                    {auditData.importantNotes.map((note, i) => (
                      <div key={i} className="note-item">
                        <span className="note-shift">Turno {note.shift}</span>
                        <p className="note-text">{note.notes}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="audit-section">
                <h3>💭 Observaciones del Auditor</h3>
                <textarea
                  className="audit-textarea"
                  placeholder="Agrega observaciones adicionales, incidencias o notas importantes del cierre nocturno..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                />
              </div>
            </>
          ) : (
            <div className="audit-error">
              <p>No se pudieron cargar los datos del día</p>
            </div>
          )}
        </div>

        <div className="night-audit-footer">
          <button className="btn-cancel-audit" onClick={onClose}>
            <FaTimes /> Cancelar
          </button>
          <button 
            className="btn-generate-audit" 
            onClick={generateAuditPDF}
            disabled={!auditData || generating}
          >
            {generating ? (
              <><FaSpinner className="spinning" /> Generando PDF...</>
            ) : (
              <><FaFilePdf /> Generar Auditoría PDF</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NightAuditModal;
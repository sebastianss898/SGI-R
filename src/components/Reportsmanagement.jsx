import React, { useState } from 'react';
import { 
  FaFileDownload, FaFilePdf, FaCalendar, FaFilter,
  FaChartLine, FaClock, FaCheckCircle, FaSearch
} from 'react-icons/fa';
import {
  REPORT_TYPES, REPORT_LABELS, REPORT_DESCRIPTIONS,
  REPORT_ICONS, REPORT_COLORS, REPORT_FREQUENCY,
  REPORT_FREQUENCY_LABELS, generateReportFilename,
  validateDateRange, formatDateRange
} from '../utils/reports';
import {
  generateChlorineReport,
  generateCleaningReport,
  generateSamplesReport,
  generateReceptionReport,
  generateMaintenanceReport,
  generateShiftsReport,
  generateFinancesReport,
  generateOccupancyReport
} from '../utils/pdfGenerator';
import '../styles/Reportsmanagement.css';

const ReportsManagement = ({ currentUser }) => {
  const [selectedReport, setSelectedReport] = useState(null);
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [frequency, setFrequency] = useState(REPORT_FREQUENCY.DAILY);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [recentReports, setRecentReports] = useState([]);

  const reportsList = Object.entries(REPORT_TYPES).map(([key, value]) => ({
    id: value,
    name: REPORT_LABELS[value],
    description: REPORT_DESCRIPTIONS[value],
    icon: REPORT_ICONS[value],
    color: REPORT_COLORS[value],
  }));

  const filteredReports = reportsList.filter(report =>
    report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleQuickRange = (range) => {
    const today = new Date();
    const start = new Date();
    
    switch(range) {
      case 'today':
        setFrequency(REPORT_FREQUENCY.DAILY);
        break;
      case 'week':
        start.setDate(today.getDate() - 7);
        setDateRange({
          start: start.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0]
        });
        setFrequency(REPORT_FREQUENCY.WEEKLY);
        break;
      case 'month':
        start.setMonth(today.getMonth() - 1);
        setDateRange({
          start: start.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0]
        });
        setFrequency(REPORT_FREQUENCY.MONTHLY);
        break;
      default:
        break;
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedReport) {
      alert('Por favor selecciona un tipo de reporte');
      return;
    }

    const validation = validateDateRange(dateRange.start, dateRange.end);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    setIsGenerating(true);

    try {
      // Aquí iría la lógica para obtener datos reales de Firebase
      // Por ahora usaremos datos de muestra incluidos en las funciones
      const data = []; // await fetchDataFromFirebase(selectedReport, dateRange);
      
      let doc;
      const filename = generateReportFilename(selectedReport, dateRange);
      
      // Generar PDF según el tipo
      switch(selectedReport) {
        case REPORT_TYPES.CHLORINE:
          doc = generateChlorineReport(data, dateRange);
          break;
        case REPORT_TYPES.CLEANING:
          doc = generateCleaningReport(data, dateRange);
          break;
        case REPORT_TYPES.SAMPLES:
          doc = generateSamplesReport(data, dateRange);
          break;
        case REPORT_TYPES.RECEPTION:
          doc = generateReceptionReport(data, dateRange);
          break;
        case REPORT_TYPES.MAINTENANCE:
          doc = generateMaintenanceReport(data, dateRange);
          break;
        case REPORT_TYPES.SHIFTS:
          doc = generateShiftsReport(data, dateRange);
          break;
        case REPORT_TYPES.FINANCES:
          doc = generateFinancesReport(data, dateRange);
          break;
        case REPORT_TYPES.OCCUPANCY:
          doc = generateOccupancyReport(data, dateRange);
          break;
        default:
          throw new Error('Tipo de reporte no soportado');
      }
      
      // Descargar el PDF
      doc.save(filename);
      
      // Guardar en historial
      const newReport = {
        id: Date.now(),
        type: selectedReport,
        name: REPORT_LABELS[selectedReport],
        dateRange: formatDateRange(dateRange.start, dateRange.end),
        generatedAt: new Date().toLocaleString('es-CL'),
        generatedBy: currentUser.name,
        filename: filename,
        pdfDoc: doc // Guardar referencia al documento
      };
      
      setRecentReports([newReport, ...recentReports.slice(0, 4)]);
      
      alert('✅ Reporte generado y descargado exitosamente');
    } catch (error) {
      console.error('Error generando reporte:', error);
      alert('❌ Error al generar reporte: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadRecent = (report) => {
    try {
      // Si tiene el documento guardado, volver a descargarlo
      if (report.pdfDoc) {
        report.pdfDoc.save(report.filename);
      } else {
        // Si no, regenerar el reporte (esto requeriría guardar los parámetros)
        alert('Regenerando reporte...');
        // Aquí podrías volver a generar el PDF con los mismos parámetros
      }
    } catch (error) {
      console.error('Error descargando reporte:', error);
      alert('❌ Error al descargar: ' + error.message);
    }
  };

  return (
    <div className="reports-management">
      {/* Header */}
      <div className="reports-header">
        <div className="header-content">
          <h1><FaChartLine /> Informes y Reportes</h1>
          <p>Genera y descarga informes en PDF del sistema</p>
        </div>
      </div>

      <div className="reports-layout">
        {/* Left Panel - Report Selection */}
        <div className="reports-left-panel">
          <div className="panel-header">
            <h2>Tipos de Informes</h2>
            <div className="search-reports">
              <FaSearch />
              <input
                type="text"
                placeholder="Buscar informe..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="reports-list">
            {filteredReports.map(report => (
              <button
                key={report.id}
                className={`report-type-card ${selectedReport === report.id ? 'selected' : ''}`}
                onClick={() => setSelectedReport(report.id)}
              >
                <div className="report-card-icon" style={{ background: report.color }}>
                  <span>{report.icon}</span>
                </div>
                <div className="report-card-content">
                  <h3>{report.name}</h3>
                  <p>{report.description}</p>
                </div>
                {selectedReport === report.id && (
                  <div className="selected-indicator">
                    <FaCheckCircle />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Right Panel - Configuration & Generation */}
        <div className="reports-right-panel">
          {!selectedReport ? (
            <div className="no-selection">
              <FaFilePdf style={{ fontSize: '4rem', color: '#2e2e42', marginBottom: '16px' }} />
              <h3>Selecciona un Tipo de Informe</h3>
              <p>Elige el tipo de informe que deseas generar del panel izquierdo</p>
            </div>
          ) : (
            <>
              {/* Selected Report Info */}
              <div className="selected-report-info">
                <div className="report-info-header">
                  <div 
                    className="report-info-icon" 
                    style={{ background: REPORT_COLORS[selectedReport] }}
                  >
                    {REPORT_ICONS[selectedReport]}
                  </div>
                  <div>
                    <h2>{REPORT_LABELS[selectedReport]}</h2>
                    <p>{REPORT_DESCRIPTIONS[selectedReport]}</p>
                  </div>
                </div>
              </div>

              {/* Quick Range Buttons */}
              <div className="quick-ranges">
                <h3>Rangos Rápidos</h3>
                <div className="quick-range-buttons">
                  <button 
                    className="quick-range-btn"
                    onClick={() => handleQuickRange('today')}
                  >
                    <FaClock />
                    <span>Hoy</span>
                  </button>
                  <button 
                    className="quick-range-btn"
                    onClick={() => handleQuickRange('week')}
                  >
                    <FaCalendar />
                    <span>Última Semana</span>
                  </button>
                  <button 
                    className="quick-range-btn"
                    onClick={() => handleQuickRange('month')}
                  >
                    <FaCalendar />
                    <span>Último Mes</span>
                  </button>
                </div>
              </div>

              {/* Date Range Configuration */}
              <div className="date-range-config">
                <h3>Configuración de Fechas</h3>
                
                <div className="frequency-selector">
                  <label>Frecuencia</label>
                  <select 
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                  >
                    {Object.entries(REPORT_FREQUENCY_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                <div className="date-inputs">
                  <div className="date-field">
                    <label>Fecha Inicio</label>
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="date-field">
                    <label>Fecha Fin</label>
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                      max={new Date().toISOString().split('T')[0]}
                      min={dateRange.start}
                    />
                  </div>
                </div>

                <div className="date-range-preview">
                  <FaCalendar />
                  <span>{formatDateRange(dateRange.start, dateRange.end)}</span>
                </div>
              </div>

              {/* Generate Button */}
              <button
                className="btn-generate-report"
                onClick={handleGenerateReport}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <div className="spinner"></div>
                    <span>Generando Reporte...</span>
                  </>
                ) : (
                  <>
                    <FaFileDownload />
                    <span>Generar y Descargar PDF</span>
                  </>
                )}
              </button>

              {/* Recent Reports */}
              {recentReports.length > 0 && (
                <div className="recent-reports">
                  <h3>Reportes Recientes</h3>
                  <div className="recent-reports-list">
                    {recentReports.map(report => (
                      <div key={report.id} className="recent-report-item">
                        <div className="recent-report-icon">
                          <FaFilePdf />
                        </div>
                        <div className="recent-report-info">
                          <h4>{report.name}</h4>
                          <p>{report.dateRange}</p>
                          <small>
                            Generado el {report.generatedAt} por {report.generatedBy}
                          </small>
                        </div>
                        <button
                          className="btn-download-recent"
                          onClick={() => handleDownloadRecent(report)}
                          title="Descargar"
                        >
                          <FaFileDownload />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsManagement;
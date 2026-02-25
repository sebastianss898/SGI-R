import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import {
  FaChartLine, FaUsers, FaTrophy, FaFire,
  FaCalendar, FaFilter, FaDownload, FaStar,
  FaCheckCircle, FaClock, FaMoneyBillWave,
  FaSpinner, FaChartBar, FaChartPie
} from 'react-icons/fa';
import {
  calculateMetrics,
  getPerformanceLevel,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  METRICS,
  METRIC_CATEGORIES
} from '../utils/metrics';
import '../styles/Metricsdashboard.css';

const MetricsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [shifts, setShifts] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('month'); // week, month, quarter, year
  const [selectedUser, setSelectedUser] = useState('all');
  const [metricsData, setMetricsData] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (shifts.length > 0 && users.length > 0) {
      calculateAllMetrics();
    }
  }, [shifts, users, selectedPeriod, selectedUser]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Cargar turnos
      const shiftsSnap = await getDocs(
        query(collection(db, 'turnos'), orderBy('createdAt', 'desc'))
      );
      const shiftsData = shiftsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));

      // Cargar usuarios (solo recepcionistas)
      const usersSnap = await getDocs(
        query(collection(db, 'users'), where('role', '==', 'receptionist'))
      );
      const usersData = usersSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setShifts(shiftsData);
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAllMetrics = () => {
    const filteredShifts = filterShiftsByPeriod(shifts, selectedPeriod);
    
    if (selectedUser === 'all') {
      // Calcular métricas para cada recepcionista
      const metrics = users.map(user => {
        const userShifts = filteredShifts.filter(s => 
          s.receptionist === user.name || s.userId === user.id
        );
        const calculated = calculateMetrics(userShifts);
        return {
          user,
          ...calculated
        };
      }).sort((a, b) => b.totalScore - a.totalScore);
      
      setMetricsData(metrics);
    } else {
      // Calcular métricas solo para el usuario seleccionado
      const user = users.find(u => u.id === selectedUser);
      const userShifts = filteredShifts.filter(s => 
        s.receptionist === user?.name || s.userId === selectedUser
      );
      const calculated = calculateMetrics(userShifts);
      setMetricsData([{ user, ...calculated }]);
    }
  };

  const filterShiftsByPeriod = (shifts, period) => {
    const now = new Date();
    const startDate = new Date();

    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(now.getMonth() - 1);
    }

    return shifts.filter(s => s.createdAt >= startDate);
  };

  const getTopPerformers = () => {
    return metricsData.slice(0, 3);
  };

  const getAverageScore = () => {
    if (metricsData.length === 0) return 0;
    const sum = metricsData.reduce((acc, m) => acc + m.totalScore, 0);
    return Math.round(sum / metricsData.length);
  };

  const getTotalShifts = () => {
    return filterShiftsByPeriod(shifts, selectedPeriod).length;
  };

  const fmt = (n) => new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(n);

  if (loading) {
    return (
      <div className="metrics-loading">
        <FaSpinner className="spinner" />
        <p>Cargando métricas...</p>
      </div>
    );
  }

  return (
    <div className="metrics-dashboard">
      {/* Header */}
      <div className="metrics-header">
        <div className="header-content">
          <h1><FaChartLine /> Dashboard de Métricas</h1>
          <p>Análisis de rendimiento del equipo de recepción</p>
        </div>
        <button className="btn-export">
          <FaDownload /> Exportar Reporte
        </button>
      </div>

      {/* Filters */}
      <div className="metrics-filters">
        <div className="filter-group">
          <FaCalendar />
          <select value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)}>
            <option value="week">Última Semana</option>
            <option value="month">Último Mes</option>
            <option value="quarter">Último Trimestre</option>
            <option value="year">Último Año</option>
          </select>
        </div>
        <div className="filter-group">
          <FaFilter />
          <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)}>
            <option value="all">Todos los Recepcionistas</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>{user.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="metrics-overview">
        <div className="overview-card">
          <div className="overview-icon" style={{ background: '#e3f2fd' }}>
            <FaUsers style={{ color: '#1976d2' }} />
          </div>
          <div className="overview-content">
            <h3>{users.length}</h3>
            <p>Recepcionistas Activos</p>
          </div>
        </div>

        <div className="overview-card">
          <div className="overview-icon" style={{ background: '#f3e5f5' }}>
            <FaChartLine style={{ color: '#9c27b0' }} />
          </div>
          <div className="overview-content">
            <h3>{getAverageScore()}%</h3>
            <p>Rendimiento Promedio</p>
          </div>
        </div>

        <div className="overview-card">
          <div className="overview-icon" style={{ background: '#e8f5e9' }}>
            <FaCheckCircle style={{ color: '#4caf50' }} />
          </div>
          <div className="overview-content">
            <h3>{getTotalShifts()}</h3>
            <p>Turnos Completados</p>
          </div>
        </div>

        <div className="overview-card">
          <div className="overview-icon" style={{ background: '#fff3e0' }}>
            <FaTrophy style={{ color: '#ff9800' }} />
          </div>
          <div className="overview-content">
            <h3>{getTopPerformers().length > 0 ? getTopPerformers()[0].totalScore : 0}%</h3>
            <p>Mejor Rendimiento</p>
          </div>
        </div>
      </div>

      {/* Top Performers */}
      {selectedUser === 'all' && getTopPerformers().length > 0 && (
        <div className="top-performers">
          <h2><FaTrophy /> Top 3 del Período</h2>
          <div className="podium">
            {getTopPerformers().map((performer, index) => {
              const level = getPerformanceLevel(performer.totalScore);
              const medals = ['🥇', '🥈', '🥉'];
              return (
                <div key={performer.user.id} className={`podium-card rank-${index + 1}`}>
                  <div className="podium-medal">{medals[index]}</div>
                  <div className="podium-avatar" style={{ background: level.color }}>
                    {performer.user.name.charAt(0).toUpperCase()}
                  </div>
                  <h3>{performer.user.name}</h3>
                  <div className="podium-score" style={{ color: level.color }}>
                    {performer.totalScore}%
                  </div>
                  <span className="podium-level" style={{ background: level.color }}>
                    {level.emoji} {level.label}
                  </span>
                  <div className="podium-stats">
                    <span>
                      <FaClock /> {performer.metrics.shifts_completed} turnos
                    </span>
                    <span>
                      <FaStar /> {performer.metrics.complete_checkins}% calidad
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detailed Metrics */}
      <div className="detailed-metrics">
        <h2><FaChartBar /> Métricas Detalladas</h2>
        
        {metricsData.map(data => {
          const level = getPerformanceLevel(data.totalScore);
          
          return (
            <div key={data.user.id} className="user-metrics-card">
              <div className="user-metrics-header">
                <div className="user-info-metrics">
                  <div className="user-avatar-metrics" style={{ background: level.color }}>
                    {data.user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3>{data.user.name}</h3>
                    <p>{data.user.email}</p>
                  </div>
                </div>
                <div className="user-overall-score">
                  <div className="score-circle" style={{ borderColor: level.color }}>
                    <span className="score-value" style={{ color: level.color }}>
                      {data.totalScore}%
                    </span>
                    <span className="score-label">Score Total</span>
                  </div>
                  <span className="performance-badge" style={{ background: level.color }}>
                    {level.emoji} {level.label}
                  </span>
                </div>
              </div>

              {/* Categories */}
              <div className="metrics-categories">
                {Object.entries(data.byCategory).map(([category, score]) => (
                  <div key={category} className="category-card">
                    <div className="category-header">
                      <span className="category-name">{CATEGORY_LABELS[category]}</span>
                      <span className="category-score" style={{ color: CATEGORY_COLORS[category] }}>
                        {score}%
                      </span>
                    </div>
                    <div className="category-bar">
                      <div 
                        className="category-fill" 
                        style={{ 
                          width: `${score}%`,
                          background: CATEGORY_COLORS[category]
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Individual Metrics */}
              <div className="individual-metrics">
                {Object.entries(METRICS)
                  .filter(([_, metric]) => data.metrics[metric.id] !== undefined)
                  .map(([key, metric]) => (
                    <div key={key} className="metric-item">
                      <div className="metric-info">
                        <span className="metric-label">{metric.label}</span>
                        <span className="metric-desc">{metric.description}</span>
                      </div>
                      <span className="metric-value" style={{ color: CATEGORY_COLORS[metric.category] }}>
                        {data.metrics[metric.id]}{metric.unit}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          );
        })}
      </div>

      {metricsData.length === 0 && (
        <div className="no-metrics">
          <FaChartPie style={{ fontSize: '4rem', color: '#2e2e42', marginBottom: '16px' }} />
          <h3>No hay datos para mostrar</h3>
          <p>No se encontraron turnos en el período seleccionado</p>
        </div>
      )}
    </div>
  );
};

export default MetricsDashboard;
// frontend/analytics-app/src/App.js
// Main Analytics Application Component
// Complete implementation with two-dropdown system and Recharts integration

import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { analyticsAPI, utils } from './api';
import './styles.css';

const App = () => {
  // ================================
  // STATE MANAGEMENT
  // ================================
  
  // URL Parameters
  const [codiceFiscale, setCodiceFiscale] = useState('');
  const [doctorId, setDoctorId] = useState('');
  
  // Dropdown Data
  const [examList, setExamList] = useState([]);
  const [sottanalisiList, setSottanalisiList] = useState([]);
  
  // Selected Values
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedSottanalisi, setSelectedSottanalisi] = useState('');
  
  // Chart Data
  const [chartData, setChartData] = useState(null);
  
  // Loading States
  const [loading, setLoading] = useState({
    exams: false,
    sottanalisi: false,
    chart: false
  });
  
  // Error Handling
  const [error, setError] = useState(null);
  
  // ================================
  // INITIALIZATION
  // ================================
  
  useEffect(() => {
    initializeApp();
  }, []);
  
  const initializeApp = async () => {
    try {
      // Extract parameters from URL
      const cf = utils.getCFFromURL();
      const doctor = utils.getDoctorIDFromURL();
      
      if (!cf) {
        setError({
          type: 'MISSING_CF',
          message: 'Codice fiscale non fornito nei parametri URL',
          details: 'L\'applicazione deve essere chiamata con il parametro ?cf=CODICEFISCALE'
        });
        return;
      }
      
      if (!utils.validateCodiceFiscale(cf)) {
        setError({
          type: 'INVALID_CF',
          message: 'Formato codice fiscale non valido',
          details: `Il codice fiscale "${cf}" non ha un formato valido`
        });
        return;
      }
      
      setCodiceFiscale(cf);
      setDoctorId(doctor);
      
      // Load initial exam list
      await loadExamList(cf);
      
    } catch (err) {
      console.error('Initialization error:', err);
      setError({
        type: 'INIT_ERROR',
        message: 'Errore inizializzazione applicazione',
        details: err.message
      });
    }
  };
  
  // ================================
  // API FUNCTIONS
  // ================================
  
  const loadExamList = async (cf) => {
    try {
      setLoading(prev => ({ ...prev, exams: true }));
      setError(null);
      
      const response = await analyticsAPI.getExamList(cf);
      
      if (response.success) {
        setExamList(response.exam_summaries || []);
        console.log(`Loaded ${response.exam_summaries?.length || 0} exams`);
      } else {
        throw new Error("Failed to load exam list");
      }
      
    } catch (err) {
      console.error('Error loading exam list:', err);
      setError({
        type: 'EXAM_LOAD_ERROR',
        message: 'Errore caricamento esami',
        details: err.message
      });
    } finally {
      setLoading(prev => ({ ...prev, exams: false }));
    }
  };
  
  const loadSottanalisi = async (cf, examKey) => {
    try {
      setLoading(prev => ({ ...prev, sottanalisi: true }));
      setSottanalisiList([]);
      setSelectedSottanalisi('');
      setChartData(null);
      
      const response = await analyticsAPI.getSottanalisi(cf, examKey);
      
      if (response.success) {
        setSottanalisiList(response.sottanalisi || []);
        console.log(`Loaded ${response.sottanalisi?.length || 0} sottanalisi for ${examKey}`);
      } else {
        throw new Error("Failed to load sottanalisi");
      }
      
    } catch (err) {
      console.error('Error loading sottanalisi:', err);
      setError({
        type: 'SOTTANALISI_LOAD_ERROR',
        message: 'Errore caricamento parametri',
        details: err.message
      });
    } finally {
      setLoading(prev => ({ ...prev, sottanalisi: false }));
    }
  };
  
  const loadChartData = async (cf, examKey, sottanalisi) => {
    try {
      setLoading(prev => ({ ...prev, chart: true }));
      setChartData(null);
      
      const response = await analyticsAPI.getChartData(cf, examKey, sottanalisi);
      
      if (response.success) {
        setChartData(response);
        console.log(`Loaded chart data: ${response.total_points} points, ${response.anomaly_points} anomalies`);
      } else {
        throw new Error("Failed to load chart data");
      }
      
    } catch (err) {
      console.error('Error loading chart data:', err);
      setError({
        type: 'CHART_LOAD_ERROR',
        message: 'Errore caricamento grafico',
        details: err.message
      });
    } finally {
      setLoading(prev => ({ ...prev, chart: false }));
    }
  };
  
  // ================================
  // EVENT HANDLERS
  // ================================
  
  const handleExamChange = (e) => {
    const examKey = e.target.value;
    setSelectedExam(examKey);
    
    if (examKey) {
      loadSottanalisi(codiceFiscale, examKey);
    } else {
      setSottanalisiList([]);
      setSelectedSottanalisi('');
      setChartData(null);
    }
  };
  
  const handleSottanalisiChange = (e) => {
    const sottanalisi = e.target.value;
    setSelectedSottanalisi(sottanalisi);
    
    if (sottanalisi && selectedExam) {
      loadChartData(codiceFiscale, selectedExam, sottanalisi);
    } else {
      setChartData(null);
    }
  };
  
  const handleErrorDismiss = () => {
    setError(null);
  };
  
  // ================================
  // CHART COMPONENTS
  // ================================
  
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          backgroundColor: 'white',
          border: '2px solid #e5e7eb',
          borderRadius: '12px',
          padding: '15px',
          boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
          minWidth: '200px'
        }}>
          <p style={{ fontWeight: '600', marginBottom: '8px', color: '#1f2937' }}>
            <strong>Data:</strong> {label}
          </p>
          <p style={{ marginBottom: '5px', color: '#374151' }}>
            <strong>Valore:</strong> {data.valore_originale} {data.unit}
          </p>
          <p style={{ marginBottom: '5px', color: '#374151' }}>
            <strong>Range:</strong> {data.range || 'N/D'}
          </p>
          <p style={{ 
            color: data.anomaly ? '#dc2626' : '#059669',
            fontWeight: '600' 
          }}>
            <strong>Anomalia:</strong> {data.anomaly ? 'SÌ' : 'NO'} ({data.flag})
          </p>
        </div>
      );
    }
    return null;
  };
  
  const renderChart = () => {
    if (!chartData || !chartData.chart_data || chartData.chart_data.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <div className="empty-state-title">Nessun dato disponibile</div>
          <div className="empty-state-message">
            Seleziona un esame e un parametro per visualizzare il grafico
          </div>
        </div>
      );
    }
    
    // Sort data by date for proper line chart visualization
    const sortedData = [...chartData.chart_data].sort((a, b) => 
      utils.parseDate(a.date) - utils.parseDate(b.date)
    );
    
    return (
      <>
        {/* Statistics Cards */}
        <div className="stats-container">
          <div className="stat-card">
            <div className="stat-value">{chartData.total_points}</div>
            <div className="stat-label">Valori Totali</div>
          </div>
          <div className="stat-card">
            <div className={`stat-value ${chartData.anomaly_points > 0 ? 'anomaly-stat' : 'normal-stat'}`}>
              {chartData.anomaly_points}
            </div>
            <div className="stat-label">Anomalie</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {chartData.anomaly_percentage}%
            </div>
            <div className="stat-label">% Anomalie</div>
          </div>
        </div>
        
        {/* Chart */}
        <div className="chart-container">
          <div className="chart-title">
            🧪 {chartData.dessottoanalisi} nel tempo
          </div>
          
          <div className="chart-content">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sortedData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="formatted_date" 
                  tick={{ fontSize: 12 }}
                  stroke="#6b7280"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  stroke="#6b7280"
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke={chartData.chart_color}
                  strokeWidth={3}
                  dot={{ 
                    r: 6, 
                    fill: chartData.chart_color,
                    strokeWidth: 2,
                    stroke: 'white'
                  }}
                  activeDot={{ 
                    r: 8, 
                    fill: chartData.chart_color,
                    strokeWidth: 3,
                    stroke: 'white'
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </>
    );
  };
  
  // ================================
  // RENDER FUNCTIONS
  // ================================
  
  const renderError = () => {
    if (!error) return null;
    
    return (
      <div className="error-container">
        <div className="error-title">⚠️ Errore</div>
        <div className="error-message">{error.message}</div>
        {error.details && (
          <div style={{ fontSize: '14px', marginBottom: '20px', opacity: 0.8 }}>
            {error.details}
          </div>
        )}
        <button className="error-button" onClick={handleErrorDismiss}>
          Chiudi
        </button>
      </div>
    );
  };
  
  const renderLoading = () => {
    if (loading.exams) {
      return (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          Caricamento esami disponibili...
        </div>
      );
    }
    
    return null;
  };
  
  const renderDropdowns = () => {
    return (
      <div className="dropdown-section">
        <div className="dropdown-container">
          {/* First Dropdown - Exam Types (desesame) */}
          <div className="dropdown-group">
            <label className="dropdown-label">Tipo Esame</label>
            <select 
              className="dropdown"
              value={selectedExam}
              onChange={handleExamChange}
              disabled={loading.exams || examList.length === 0}
            >
              <option value="">
                {loading.exams ? "Caricamento..." : 
                 examList.length === 0 ? "Nessun esame disponibile" : 
                 "Seleziona tipo esame"}
              </option>
              {examList.map(exam => (
                <option 
                  key={exam.exam_key}
                  value={exam.exam_key}
                  className={exam.has_anomaly ? "anomaly" : "normal"}
                >
                  {exam.desesame} {exam.has_anomaly ? "⚠️" : ""}
                  {exam.anomaly_count > 0 && ` (${exam.anomaly_count} anomalie)`}
                </option>
              ))}
            </select>
          </div>
          
          {/* Second Dropdown - Parameters (dessottoanalisi) */}
          <div className="dropdown-group">
            <label className="dropdown-label">Parametro Specifico</label>
            <select 
              className="dropdown"
              value={selectedSottanalisi}
              onChange={handleSottanalisiChange}
              disabled={!selectedExam || loading.sottanalisi || sottanalisiList.length === 0}
            >
              <option value="">
                {!selectedExam ? "Prima seleziona un esame" :
                 loading.sottanalisi ? "Caricamento..." :
                 sottanalisiList.length === 0 ? "Nessun parametro disponibile" :
                 "Seleziona parametro"}
              </option>
              {sottanalisiList.map(item => (
                <option 
                  key={item.dessottoanalisi}
                  value={item.dessottoanalisi}
                  className={item.has_anomaly ? "anomaly" : "normal"}
                >
                  {item.dessottoanalisi} {item.has_anomaly ? "⚠️" : ""}
                  {item.anomaly_count > 0 && ` (${item.anomaly_count} anomalie)`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    );
  };
  
  // ================================
  // MAIN RENDER
  // ================================
  
  if (error) {
    return (
      <div className="analytics-app">
        <div className="analytics-container">
          <div className="header">
            <h1>Analisi Laboratorio</h1>
            <p>Sistema ASL - Visualizzazione Dati Medici</p>
          </div>
          {renderError()}
        </div>
      </div>
    );
  }
  
  if (loading.exams) {
    return (
      <div className="analytics-app">
        <div className="analytics-container">
          <div className="header">
            <h1>Analisi Laboratorio</h1>
            <p>Paziente: {codiceFiscale}</p>
          </div>
          {renderLoading()}
        </div>
      </div>
    );
  }
  
  return (
    <div className="analytics-app">
      <div className="analytics-container">
        {/* Header */}
        <div className="header">
          <h1>Analisi Laboratorio</h1>
          <p>Paziente: {codiceFiscale} | Medico: {doctorId}</p>
        </div>
        
        {/* Content */}
        <div className="content">
          {/* Dropdowns */}
          {renderDropdowns()}
          
          {/* Chart Section */}
          <div className="chart-section">
            {loading.chart ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                Generazione grafico in corso...
              </div>
            ) : (
              renderChart()
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
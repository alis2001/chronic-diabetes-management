// frontend/analytics-app/src/App.js
// Main Analytics Application Component - HEADER REMOVED VERSION
// Clean implementation without header section and patient info

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
      
      setCodiceFiscale(cf);
      setDoctorId(doctor || 'unknown');
      
      // Load initial exam data
      await loadExamData(cf);
      
    } catch (error) {
      console.error('App initialization error:', error);
      setError({
        type: 'INIT_ERROR',
        message: 'Errore durante l\'inizializzazione dell\'applicazione',
        details: error.message
      });
    }
  };
  
  // ================================
  // DATA LOADING FUNCTIONS
  // ================================
  
  const loadExamData = async (cf) => {
    setLoading(prev => ({ ...prev, exams: true }));
    setError(null);
    
    try {
      console.log('🧪 Loading exam data for CF:', cf);
      const response = await analyticsAPI.getExamList(cf);
      
      if (response.success && response.exam_summaries) {
        setExamList(response.exam_summaries);
        console.log(`✅ Loaded ${response.exam_summaries.length} exam types`);
      } else {
        setExamList([]);
        console.warn('No exam data found');
      }
      
    } catch (error) {
      console.error('Error loading exam data:', error);
      setError({
        type: 'DATA_LOAD_ERROR',
        message: 'Errore durante il caricamento degli esami disponibili',
        details: error.message
      });
      setExamList([]);
    } finally {
      setLoading(prev => ({ ...prev, exams: false }));
    }
  };
  
  const loadSottanalisi = async (cf, examKey) => {
    setLoading(prev => ({ ...prev, sottanalisi: true }));
    
    try {
      console.log('🔬 Loading sottanalisi for exam:', examKey);
      const response = await analyticsAPI.getSottanalisi(cf, examKey);
      
      if (response.success && response.sottanalisi) {
        setSottanalisiList(response.sottanalisi);
        console.log(`✅ Loaded ${response.sottanalisi.length} sottanalisi`);
      } else {
        setSottanalisiList([]);
        console.warn('No sottanalisi found');
      }
      
    } catch (error) {
      console.error('Error loading sottanalisi:', error);
      setError({
        type: 'SOTTANALISI_ERROR',
        message: 'Errore durante il caricamento dei parametri',
        details: error.message
      });
      setSottanalisiList([]);
    } finally {
      setLoading(prev => ({ ...prev, sottanalisi: false }));
    }
  };
  
  const loadChartData = async (cf, examKey, dessottoanalisi) => {
    setLoading(prev => ({ ...prev, chart: true }));
    
    try {
      console.log('📊 Loading chart data for:', { examKey, dessottoanalisi });
      const response = await analyticsAPI.getChartData(cf, examKey, dessottoanalisi);
      
      if (response.success) {
        setChartData(response);
        console.log(`✅ Loaded chart with ${response.chart_data.length} data points`);
      } else {
        setChartData(null);
        console.warn('No chart data available');
      }
      
    } catch (error) {
      console.error('Error loading chart data:', error);
      setError({
        type: 'CHART_ERROR',
        message: 'Errore durante il caricamento del grafico',
        details: error.message
      });
      setChartData(null);
    } finally {
      setLoading(prev => ({ ...prev, chart: false }));
    }
  };
  
  // ================================
  // EVENT HANDLERS
  // ================================
  
  const handleExamChange = async (e) => {
    const examKey = e.target.value;
    setSelectedExam(examKey);
    setSelectedSottanalisi('');
    setChartData(null);
    
    if (examKey) {
      await loadSottanalisi(codiceFiscale, examKey);
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
        <div className="chart-tooltip">
            <p className="tooltip-date">
            <strong>Data:</strong> {label}
            </p>
            <p className="tooltip-value">
            <strong>Valore:</strong> {data.valore_originale} {data.unit}
            </p>
            <p className="tooltip-range">
            <strong>Range:</strong> {data.range || 'N/D'}
            </p>
            <p className="tooltip-structure">
            <strong>Struttura:</strong> {data.struttura}
            </p>
            <p className="tooltip-code">
            <strong>Codice:</strong> {data.codoffering}
            </p>
            <p className={`tooltip-anomaly ${data.anomaly ? 'anomaly' : 'normal'}`}>
            <strong>Anomalia:</strong> {data.anomaly ? 'Sì ⚠️' : 'No ✅'}
            </p>
        </div>
        );
    }
    return null;
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
          <div className="error-details">
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
          <p>Caricamento esami disponibili...</p>
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
            <label className="dropdown-label">
              <span className="label-icon">🧪</span>
              Tipo Esame
            </label>
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

          {/* Second Dropdown - Sottanalisi */}
          <div className="dropdown-group">
            <label className="dropdown-label">
              <span className="label-icon">🔬</span>
              Parametro Specifico
            </label>
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
  
  const renderChart = () => {
    if (!chartData || !chartData.chart_data || chartData.chart_data.length === 0) {
      return (
        <div className="no-chart">
          <div className="no-chart-icon">📊</div>
          <h3>Seleziona i parametri per visualizzare il grafico</h3>
          <p>Scegli un tipo di esame e un parametro specifico per generare la visualizzazione dei dati.</p>
        </div>
      );
    }
    
    const hasAnomalies = chartData.anomaly_points > 0;
    const chartColor = chartData.chart_color || (hasAnomalies ? '#dc2626' : '#059669');
    
    return (
      <>
        {/* Chart */}
        <div className="chart-container">
          <div className="chart-title">
            📈 {selectedSottanalisi} - Andamento Temporale
          </div>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData.chart_data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                    dataKey="date" 
                    stroke="#6b7280"
                    fontSize={12}
                    tickMargin={8}
                />
                <YAxis 
                    stroke="#6b7280"
                    fontSize={12}
                    tickMargin={8}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                    type="monotone"
                    dataKey="value"
                    stroke={chartColor}
                    strokeWidth={2}
                    dot={(payload) => (
                        <circle 
                            cx={payload.cx} 
                            cy={payload.cy} 
                            r={5}
                            fill={payload?.payload?.anomaly ? '#dc2626' : '#059669'}
                            stroke={payload?.payload?.anomaly ? '#dc2626' : '#059669'}
                            strokeWidth={2}
                        />
                        )}
                    connectNulls={false}
                    />
                </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </>
    );
  };
  
  // ================================
  // MAIN RENDER
  // ================================
  
  if (error) {
    return (
      <div className="analytics-app">
        <div className="analytics-container">
          {renderError()}
        </div>
      </div>
    );
  }
  
  if (loading.exams) {
    return (
      <div className="analytics-app">
        <div className="analytics-container">
          {renderLoading()}
        </div>
      </div>
    );
  }
  
  return (
    <div className="analytics-app">
      <div className="analytics-container">
        {/* Content - No Header */}
        <div className="content">
          {/* Dropdowns */}
          {renderDropdowns()}
          
          {/* Chart Section */}
          <div className="chart-section">
            {loading.chart ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Generazione grafico in corso...</p>
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
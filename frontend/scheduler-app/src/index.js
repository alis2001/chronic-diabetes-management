// frontend/scheduler-app/src/index.js
// Complete Scheduler Frontend Application
// Runs in iframe - communicates with Timeline service via postMessage
// Integrates with Scheduler Service backend for appointment scheduling

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { schedulerAPI } from './api';

// ================================
// MAIN SCHEDULER APPLICATION
// ================================

const SchedulerApp = () => {
  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [patientData, setPatientData] = useState(null);
  const [schedulingData, setSchedulingData] = useState(null);
  
  // Form state
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedExams, setSelectedExams] = useState([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  // Initialize scheduler from URL parameters or postMessage
  useEffect(() => {
    initializeScheduler();
  }, []);

  const initializeScheduler = async () => {
    try {
      // Get patient data from URL parameters (passed by Timeline service)
      const urlParams = new URLSearchParams(window.location.search);
      const cf_paziente = urlParams.get('cf_paziente');
      const cronoscita_id = urlParams.get('cronoscita_id');
      const id_medico = urlParams.get('id_medico');
      const patient_name = urlParams.get('patient_name');
      const cronoscita_name = urlParams.get('cronoscita_name');

      if (!cf_paziente || !cronoscita_id || !id_medico) {
        setError('Parametri mancanti per aprire scheduler');
        setLoading(false);
        return;
      }

      const patientInfo = {
        cf_paziente,
        cronoscita_id,
        id_medico,
        patient_name: decodeURIComponent(patient_name || ''),
        cronoscita_name: decodeURIComponent(cronoscita_name || '')
      };

      setPatientData(patientInfo);
      console.log('📋 Scheduler initialized with patient data:', patientInfo);

      // Load scheduling data from backend
      await loadSchedulingData(patientInfo);

    } catch (error) {
      console.error('❌ Error initializing scheduler:', error);
      setError('Errore inizializzazione scheduler');
      setLoading(false);
    }
  };

  const loadSchedulingData = async (patientInfo) => {
    setLoading(true);
    setError('');

    try {
      console.log('📅 Loading scheduling data from backend...');
      
      const data = await schedulerAPI.getSchedulingData(
        patientInfo.cf_paziente,
        patientInfo.cronoscita_id, 
        patientInfo.id_medico,
        30
      );


      if (!data.can_schedule) {
        setError(data.validation_result?.message || 'Impossibile programmare appuntamento');
        setSchedulingData(null);
        setLoading(false);
        return;
      }

      setSchedulingData(data);
      console.log('✅ Scheduling data loaded:', data);

      if (!data.can_schedule) {
        setError(data.validation_result.message);
        setSchedulingData(null);
      } else {
        setSchedulingData(data);
        console.log('✅ Scheduling data loaded:', data);
      }

    } catch (error) {
      console.error('❌ Error loading scheduling data:', error);
      setError('Errore comunicazione con server');
    }

    setLoading(false);
  };

  const handleExamToggle = (examId) => {
    setSelectedExams(prev => {
      if (prev.includes(examId)) {
        return prev.filter(id => id !== examId);
      } else {
        return [...prev, examId];
      }
    });
  };

  const handleScheduleAppointment = async () => {
    if (!selectedDate) {
      setError('Selezionare una data per l\'appuntamento');
      return;
    }

    if (selectedExams.length === 0) {
      setError('Selezionare almeno un esame');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const appointmentData = {
        cf_paziente: patientData.cf_paziente,
        id_medico: patientData.id_medico,
        cronoscita_id: patientData.cronoscita_id,
        appointment_date: selectedDate,
        selected_exam_mappings: selectedExams,
        notes: notes.trim()
      };

      console.log('📝 Scheduling appointment:', appointmentData);

      // Use the dynamic API from api.js
      const result = await schedulerAPI.scheduleAppointment(
        appointmentData,
        patientData.id_medico
      );

      console.log('✅ Appointment scheduled successfully:', result);

      console.log('✅ Appointment scheduled successfully:', result);

      // Notify parent timeline service of successful scheduling
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'APPOINTMENT_SCHEDULED',
          data: {
            appointment_id: result.appointment_id,
            appointment_date: selectedDate,
            exam_count: result.selected_exams_count,
            patient_cf: patientData.cf_paziente
          }
        }, '*');
      }

      // Show success message
      setError('');
      alert(`✅ Appuntamento programmato con successo per ${selectedDate}!`);

      // Close scheduler (notify parent to close iframe)
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'CLOSE_SCHEDULER',
          data: { success: true }
        }, '*');
      }

    } catch (error) {
      console.error('❌ Error scheduling appointment:', error);
      setError('Errore durante programmazione appuntamento');
    } finally {
      setSubmitting(false);
    }
  };

  // Generate date options for selected month/year
  const getDateOptions = () => {
    const dates = [];
    const firstDay = new Date(selectedYear, selectedMonth, 1);
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
    const today = new Date();
    
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const date = new Date(selectedYear, selectedMonth, day);
        
        // Skip past dates
        if (date <= today) continue;
        
        const dateStr = date.toISOString().split('T')[0];
        
        // Get density info for this date if available
        let density = null;
        if (schedulingData?.doctor_density?.dates) {
        density = schedulingData.doctor_density.dates.find(
            d => d.appointment_date === dateStr
        );
        }
        
        dates.push({
        value: dateStr,
        date: date,
        density: density
        });
    }
    
    return dates;
  };

  // Render loading state
  if (loading) {
    return (
        <div className="scheduler-container">
        <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Caricamento dati programmazione...</p>
        </div>
        </div>
    );
  }

  // Render error state
  if (error && !schedulingData) {
    return (
        <div className="scheduler-container">
        <div className="error-state">
            <div className="error-icon">⚠️</div>
            <h3>Impossibile programmare appuntamento</h3>
            <p className="error-message">{error}</p>
            <button 
            onClick={() => window.parent?.postMessage({ type: 'CLOSE_SCHEDULER' }, '*')}
            className="close-button"
            >
            Chiudi
            </button>
        </div>
        </div>
    );
  }

  const dateOptions = getDateOptions();

  return (
    <div className="scheduler-container">

      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      {/* Professional Month/Date Selection */}
      <div className="date-selection-section">
        {/* Month/Year Picker */}
        <div className="month-year-selector">
            <div className="month-year-controls">
            <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="month-select"
            >
                {Array.from({length: 12}, (_, i) => (
                <option key={i} value={i}>
                    {new Date(2024, i, 1).toLocaleDateString('it-IT', { month: 'long' })}
                </option>
                ))}
            </select>
            <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="year-select"
            >
                {Array.from({length: 2}, (_, i) => (
                <option key={i} value={new Date().getFullYear() + i}>
                    {new Date().getFullYear() + i}
                </option>
                ))}
            </select>
            </div>
        </div>
        
        {/* Date Grid */}
        <div className="professional-date-picker">
            {getDateOptions().map(dateOption => {
            const dayNum = dateOption.date.getDate();
            const dayName = dateOption.date.toLocaleDateString('it-IT', { weekday: 'short' });
            
            return (
                <div 
                key={dateOption.value}
                className={`date-option ${selectedDate === dateOption.value ? 'selected' : ''}`}
                onClick={() => setSelectedDate(dateOption.value)}
                style={{
                    backgroundColor: dateOption.density?.background_color || '#f8fafc',
                    borderColor: selectedDate === dateOption.value ? '#2563eb' : '#e2e8f0'
                }}
                >
                <div className="date-day">{dayName}</div>
                <div className="date-number">{dayNum}</div>
                {dateOption.density && (
                    <div className="density-indicator">
                    <span className="density-dot" style={{
                        backgroundColor: dateOption.density.appointment_count > 5 ? '#ef4444' : 
                                    dateOption.density.appointment_count > 2 ? '#f59e0b' : '#10b981'
                    }}></span>
                    <span className="density-count">{dateOption.density.appointment_count}</span>
                    </div>
                )}
                </div>
            );
            })}
        </div>
      </div>

      {/* Exam Selection */}
      {schedulingData?.available_exams && (
        <div className="exam-selection-section">
          <h3>🔬 Seleziona Esami Richiesti</h3>
          <div className="exam-grid">
            {schedulingData.available_exams.map(exam => (
              <div 
                key={exam.mapping_id}
                className={`exam-button ${selectedExams.includes(exam.mapping_id) ? 'selected' : ''}`}
                onClick={() => handleExamToggle(exam.mapping_id)}
              >
                <div className="exam-name">{exam.nome_esame_catalogo}</div>
                <div className="exam-structure">{exam.struttura_nome}</div>
                {selectedExams.includes(exam.mapping_id) && (
                  <div className="selected-indicator">✓</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes Section */}
      <div className="notes-section">
        <h3>📝 Note Aggiuntive (Opzionale)</h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Inserire eventuali note per l'appuntamento..."
          maxLength={500}
          rows={3}
        />
        <small>{notes.length}/500 caratteri</small>
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        <button 
          onClick={() => window.parent?.postMessage({ type: 'CLOSE_SCHEDULER' }, '*')}
          className="cancel-button"
          disabled={submitting}
        >
          Annulla
        </button>
        
        <button 
          onClick={handleScheduleAppointment}
          className="schedule-button"
          disabled={!selectedDate || selectedExams.length === 0 || submitting}
        >
          {submitting ? 'Programmazione...' : `Programma Appuntamento (${selectedExams.length} esami)`}
        </button>
      </div>
    </div>
  );
};

// ================================
// RENDER APPLICATION
// ================================

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<SchedulerApp />);

// Log application startup
console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                    📅 SCHEDULER FRONTEND READY                   ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  🎯 FEATURES:                                                    ║
║    • Date-based appointment scheduling                          ║
║    • Visual density with color gradients                       ║
║    • Admin-configured exam selection                           ║
║    • Duplicate appointment prevention                          ║
║    • Timeline service integration via iframe                   ║
║                                                                  ║
║  🔗 COMMUNICATION:                                               ║
║    • Receives patient data via URL parameters                  ║
║    • Sends appointment result via postMessage                  ║
║    • Communicates with scheduler-service via API Gateway       ║
║                                                                  ║
║  🎨 UI COMPONENTS:                                               ║
║    • Visual date picker with density colors                    ║
║    • Rounded exam selection buttons                            ║
║    • Italian healthcare compliance                             ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
`);
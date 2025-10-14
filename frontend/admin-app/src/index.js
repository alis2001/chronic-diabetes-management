// frontend/admin-app/src/index.js
// COMPLETE FUNCTIONAL ADMIN DASHBOARD - FIXED ROUTER CONTEXT
// Beautiful tabular interface for healthcare data management

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import './index.css';
import AuthApp from './AuthApp';
import { authAPI, adminAPI } from './api';
import LaboratorioManagement from './components/LaboratorioManagement';
import RefertozzioneManagement from './components/RefertozzioneManagement';


// ================================
// TABLE STYLES
// ================================

const tableStyles = {
  // Container
  container: {
    minHeight: '100vh',
    backgroundColor: '#fafafa',
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, "Segoe UI", system-ui, sans-serif',
    color: '#000000',
    lineHeight: '1.5'
  },

  // Header
  header: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e5e5',
    padding: '16px 0',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    backdropFilter: 'blur(8px)',
    backgroundColor: 'rgba(255, 255, 255, 0.95)'
  },

  headerContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '0 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },

  // Brand section
  logoSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },

  brandTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#000000',
    margin: 0,
    letterSpacing: '-0.01em'
  },

  brandSubtitle: {
    fontSize: '13px',
    color: '#666666',
    margin: 0,
    fontWeight: '400'
  },

  // User section
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },

  userInfo: {
    textAlign: 'right'
  },

  userName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#000000',
    margin: 0
  },

  userMeta: {
    fontSize: '12px',
    color: '#666666',
    margin: 0
  },

  logoutButton: {
    padding: '6px 12px',
    backgroundColor: '#000000',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
  },

  // Navigation
  nav: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e5e5',
    padding: '0',
    position: 'sticky',
    top: '73px',
    zIndex: 99
  },

  navContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '0 24px',
    display: 'flex',
    gap: '0'
  },

  navLink: {
    padding: '16px 24px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#666666',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },

  navLinkActive: {
    color: '#000000',
    borderBottom: '2px solid #000000',
    backgroundColor: '#f9f9f9'
  },

  // Main content
  main: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '32px 24px'
  },

  // Table styles
  table: {
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: 0,
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    fontSize: '14px'
  },

  tableHeader: {
    backgroundColor: '#f8f9fa',
    borderBottom: '1px solid #e9ecef'
  },

  th: {
    padding: '16px',
    textAlign: 'left',
    fontWeight: '600',
    color: '#495057',
    fontSize: '13px',
    letterSpacing: '0.025em',
    textTransform: 'uppercase'
  },

  td: {
    padding: '16px',
    borderBottom: '1px solid #f1f3f4',
    color: '#212529',
    fontSize: '14px'
  },

  tableRow: {
    transition: 'background-color 0.15s ease'
  },

  // Status badges
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '500',
    textAlign: 'center',
    minWidth: '80px'
  },

  statusActive: {
    backgroundColor: '#d4edda',
    color: '#155724'
  },

  statusInactive: {
    backgroundColor: '#f8d7da',
    color: '#721c24'
  },

  statusScheduled: {
    backgroundColor: '#d1ecf1',
    color: '#0c5460'
  },

  statusCompleted: {
    backgroundColor: '#d4edda',
    color: '#155724'
  },

  // Loading and empty states
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '64px',
    color: '#666666'
  },

  emptyState: {
    textAlign: 'center',
    padding: '64px',
    color: '#666666'
  }
};


// Cronoscita Selection Hook
const useCronoscitaSelection = () => {
  const [selectedCronoscita, setSelectedCronoscita] = useState(null);
  const [cronoscitaList, setCronoscitaList] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('selected_cronoscita');
    if (saved) {
      try {
        setSelectedCronoscita(JSON.parse(saved));
      } catch (error) {
        console.warn('Error loading saved Cronoscita:', error);
        localStorage.removeItem('selected_cronoscita');
      }
    }
    loadCronoscitaList();
  }, []);

  // Save to localStorage whenever selection changes
  useEffect(() => {
    if (selectedCronoscita) {
      localStorage.setItem('selected_cronoscita', JSON.stringify(selectedCronoscita));
    } else {
      localStorage.removeItem('selected_cronoscita');
    }
  }, [selectedCronoscita]);

  const loadCronoscitaList = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.get('/dashboard/cronoscita/list');
      
      if (response.success) {
        setCronoscitaList(response.cronoscita);
        
        // If we have a selected Cronoscita, update it with fresh data
        if (selectedCronoscita) {
          const updatedCronoscita = response.cronoscita.find(
            c => c.id === selectedCronoscita.id
          );
          if (updatedCronoscita) {
            setSelectedCronoscita(updatedCronoscita);
          }
        }
      }
    } catch (error) {
      console.error('Error loading Cronoscita list:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectCronoscita = (cronoscita) => {
    setSelectedCronoscita(cronoscita);
  };

  const clearSelection = () => {
    setSelectedCronoscita(null);
  };

  const createCronoscita = async (cronoscitaData) => {
    try {
      const response = await adminAPI.post('/dashboard/cronoscita', cronoscitaData);
      
      if (response.success) {
        await loadCronoscitaList();
        setSelectedCronoscita(response.cronoscita);
        return { success: true, cronoscita: response.cronoscita };
      } else {
        return { success: false, error: response.message || 'Errore durante la creazione' };
      }
    } catch (error) {
      console.error('Error creating Cronoscita:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Errore durante la creazione' 
      };
    }
  };

  return {
    selectedCronoscita,
    cronoscitaList,
    loading,
    selectCronoscita,
    clearSelection,
    createCronoscita,
    loadCronoscitaList
  };
};

// Cronoscita Selector Component
const CronoscitaSelector = ({ cronoscitaState }) => {
  const [showModal, setShowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCronoscitaName, setNewCronoscitaName] = useState('');
  const [newCronoscitaPresentante, setNewCronoscitaPresentante] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const {
    selectedCronoscita,
    cronoscitaList,
    loading,
    selectCronoscita,
    clearSelection,
    createCronoscita
  } = cronoscitaState;

  const handleCreateCronoscita = async (e) => {
    e.preventDefault();
    
    if (!newCronoscitaName.trim()) {
      setCreateError('Nome Cronicità è richiesto');
      return;
    }

    if (!newCronoscitaPresentante.trim()) {
      setCreateError('Nome Presentante è richiesto');
      return;
    }

    setCreating(true);
    setCreateError('');

    const result = await createCronoscita({
      nome: newCronoscitaName.trim(),
      nome_presentante: newCronoscitaPresentante.trim()
    });
    
    if (result.success) {
      setNewCronoscitaName('');
      setNewCronoscitaPresentante('');
      setShowCreateModal(false);
      alert(`Cronicità "${result.cronoscita.nome_presentante}" creata con successo!`);
    } else {
      setCreateError(result.error);
    }
    
    setCreating(false);
  };

  const handleCronoscitaSelect = (cronoscita) => {
    selectCronoscita(cronoscita);
    setShowModal(false);
  };

  return (
    <>
      <div className="cronoscita-selector-bar">
        <div className="cronoscita-selector-content">
          <div className="cronoscita-info">
            <span className="cronoscita-label">Cronoscita:</span>
            
            {selectedCronoscita ? (
              <div className="selected-cronoscita">
                <span>🏥</span>
                <div>
                  <div style={{ fontWeight: '600' }}>{selectedCronoscita.nome}</div>
                  <div style={{ fontSize: '11px', opacity: '0.8' }}>
                    {selectedCronoscita.codice} • {selectedCronoscita.total_catalogo_esami} esami • {selectedCronoscita.active_mappings} mappings
                  </div>
                </div>
              </div>
            ) : (
              <div className="cronoscita-dropdown">
                <span style={{ color: '#6c757d', fontStyle: 'italic' }}>
                  Nessuna Cronoscita selezionata
                </span>
              </div>
            )}
          </div>

          <div className="cronoscita-actions">
            <button 
              className="create-cronoscita-btn"
              onClick={() => setShowCreateModal(true)}
              disabled={loading}
            >
              + Nuova
            </button>
            
            <button 
              className="change-cronoscita-btn"
              onClick={() => setShowModal(true)}
              disabled={loading || cronoscitaList.length === 0}
            >
              {selectedCronoscita ? 'Cambia' : 'Seleziona'}
            </button>
          </div>
        </div>
      </div>

      {/* Cronoscita Selection Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Seleziona Cronoscita</h3>
            
            {cronoscitaList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: '#6c757d' }}>
                <p>Nessuna Cronoscita disponibile.</p>
                <p>Crea la prima Cronoscita per iniziare.</p>
              </div>
            ) : (
              <div className="cronoscita-list">
                {cronoscitaList.map((cronoscita) => (
                  <div
                    key={cronoscita.id}
                    className={`cronoscita-item ${selectedCronoscita?.id === cronoscita.id ? 'selected' : ''}`}
                    onClick={() => handleCronoscitaSelect(cronoscita)}
                  >
                    <div className="cronoscita-item-info">
                      <div className="cronoscita-item-name">{cronoscita.nome}</div>
                      <div className="cronoscita-item-code">{cronoscita.codice}</div>
                    </div>
                    <div className="cronoscita-item-stats">
                      <div>{cronoscita.total_catalogo_esami} esami</div>
                      <div>{cronoscita.active_mappings} mappings</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="button-group">
              <button 
                className="btn-secondary" 
                onClick={() => setShowModal(false)}
              >
                Annulla
              </button>
              {selectedCronoscita && (
                <button 
                  className="btn-secondary" 
                  onClick={() => {
                    clearSelection();
                    setShowModal(false);
                  }}
                >
                  Deseleziona
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Cronoscita Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Crea Nuova Cronoscita</h3>
            
            <form onSubmit={handleCreateCronoscita}>
              <div className="form-group">
                <label className="form-label">Nome Cronicità (Codice Interno) *</label>
                <input
                  type="text"
                  className="form-input"
                  value={newCronoscitaName}
                  onChange={(e) => setNewCronoscitaName(e.target.value)}
                  placeholder="Es: ASLROMA1, OSPEDALE-SANT-ANDREA"
                  maxLength={100}
                  disabled={creating}
                  autoFocus
                />
                <div className="form-help-text">
                  Il nome sarà convertito automaticamente in MAIUSCOLO. 
                  Lettere, numeri, spazi e caratteri - . _ consentiti.
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Nome Presentante (Display) *</label>
                <input
                  type="text"
                  className="form-input"
                  value={newCronoscitaPresentante}
                  onChange={(e) => setNewCronoscitaPresentante(e.target.value)}
                  placeholder="Es: Diabete Tipo 1, Diabete Tipo 2, Ipertensione"
                  maxLength={150}
                  disabled={creating}
                />
                <div className="form-help-text">
                  Nome visualizzato agli utenti nel sistema (es: nelle timeline).
                </div>
              </div>

              {createError && (
                <div style={{ 
                  padding: '8px 12px', 
                  backgroundColor: '#f8d7da', 
                  border: '1px solid #f5c6cb',
                  borderRadius: '4px', 
                  color: '#721c24', 
                  fontSize: '14px',
                  marginBottom: '16px'
                }}>
                  {createError}
                </div>
              )}

              <div className="button-group">
                <button 
                  type="button"
                  className="btn-secondary" 
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewCronoscitaName('');
                    setNewCronoscitaPresentante('');
                    setCreateError('');
                  }}
                  disabled={creating}
                >
                  Annulla
                </button>
                <button 
                  type="submit"
                  className="btn-success" 
                  disabled={creating || !newCronoscitaName.trim() || !newCronoscitaPresentante.trim()}
                >
                  {creating ? 'Creando...' : 'Crea Cronicità'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

// No Cronoscita Selected Placeholder
const NoCronoscitaSelected = ({ onCreateClick, onSelectClick }) => (
  <div className="no-cronoscita-selected">
    <h3>🏥 Seleziona una Cronoscita</h3>
    <p>
      Per gestire esami e mappature del laboratorio, 
      devi prima selezionare o creare una Cronoscita.
    </p>
    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
      <button className="btn-success" onClick={onCreateClick}>
        + Crea Nuova
      </button>
      <button className="btn-primary" onClick={onSelectClick}>
        Seleziona Esistente
      </button>
    </div>
  </div>
);

// ================================
// DATA TABLE COMPONENTS
// ================================

const DataTable = ({ headers, data, loading, emptyMessage = "Nessun dato disponibile" }) => {
  if (loading) {
    return (
      <div style={tableStyles.loadingContainer}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '20px',
            height: '20px',
            border: '2px solid #e9ecef',
            borderTop: '2px solid #000000',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          Caricamento dati...
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div style={tableStyles.emptyState}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
        <h3 style={{ margin: '0 0 8px 0', color: '#000000' }}>Nessun dato</h3>
        <p style={{ margin: 0 }}>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <table style={tableStyles.table}>
      <thead style={tableStyles.tableHeader}>
        <tr>
          {headers.map((header, index) => (
            <th key={index} style={tableStyles.th}>
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, rowIndex) => (
          <tr 
            key={rowIndex} 
            style={{
              ...tableStyles.tableRow,
              backgroundColor: rowIndex % 2 === 0 ? '#ffffff' : '#fafafa'
            }}
            onMouseEnter={(e) => {
              e.target.closest('tr').style.backgroundColor = '#f0f8ff';
            }}
            onMouseLeave={(e) => {
              e.target.closest('tr').style.backgroundColor = rowIndex % 2 === 0 ? '#ffffff' : '#fafafa';
            }}
          >
            {row.map((cell, cellIndex) => (
              <td key={cellIndex} style={tableStyles.td}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const StatusBadge = ({ status, type = 'general' }) => {
  const getStatusStyle = () => {
    if (type === 'patient') {
      switch (status?.toLowerCase()) {
        case 'attivo':
          return tableStyles.statusActive;
        case 'inattivo':
          return tableStyles.statusInactive;
        default:
          return tableStyles.statusInactive;
      }
    }
    
    if (type === 'appointment') {
      switch (status?.toLowerCase()) {
        case 'completed':
        case 'completato':
          return tableStyles.statusCompleted;
        case 'scheduled':
        case 'programmato':
          return tableStyles.statusScheduled;
        default:
          return tableStyles.statusInactive;
      }
    }

    return tableStyles.statusActive;
  };

  return (
    <span style={{ ...tableStyles.statusBadge, ...getStatusStyle() }}>
      {status}
    </span>
  );
};

// ================================
// PAGE COMPONENTS
// ================================

const PatientsPage = ({ cronoscitaFilter }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPatientsData();
  }, [cronoscitaFilter]); // Re-load when filter changes

  const loadPatientsData = async () => {
    try {
      // Don't load data if no Cronoscita selected
      if (!cronoscitaFilter) {
        console.log('📊 No Cronoscita selected - not loading patients data');
        setData([]);
        setLoading(false);
        return;
      }

      console.log('📊 Loading patients data for Cronoscita:', cronoscitaFilter);
      
      // Pass cronoscita filter to API call
      const result = await adminAPI.getPatientsList(cronoscitaFilter);
      
      if (result.success && result.patients) {
        const tableData = result.patients.map(patient => [
          patient.codice_fiscale,
          `${patient.nome} ${patient.cognome}`,
          patient.data_nascita,
          patient.telefono || 'N/A',
          patient.email || 'N/A',
          patient.patologia,
          patient.medico_nome,
          patient.data_registrazione,
          <StatusBadge key="status" status="Attivo" type="patient" />
        ]);
        setData(tableData);
      } else {
        console.warn('Invalid patients data format:', result);
        setData([]);
      }
    } catch (error) {
      console.error('Error loading patients:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const headers = [
    'Codice Fiscale',
    'Nome Completo',
    'Data Nascita',
    'Telefono',
    'Email',
    'Patologia',
    'Medico',
    'Data Registrazione',
    'Stato'
  ];

  // Dynamic header based on filter
  const getHeaderTitle = () => {
    if (cronoscitaFilter) {
      return `Gestione Pazienti - ${cronoscitaFilter}`;
    }
    return 'Gestione Pazienti';
  };

  const getHeaderSubtitle = () => {
    if (cronoscitaFilter) {
      return `Pazienti registrati nella Cronoscita: ${cronoscitaFilter}`;
    }
    return 'Elenco completo pazienti registrati nel sistema';
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '600' }}>
          {getHeaderTitle()}
        </h2>
        <p style={{ margin: 0, color: '#666666' }}>
          {getHeaderSubtitle()}
        </p>
        {cronoscitaFilter && (
          <div style={{ 
            marginTop: '8px', 
            padding: '8px 12px', 
            backgroundColor: '#e3f2fd', 
            borderRadius: '4px',
            fontSize: '14px',
            color: '#1565c0'
          }}>
            🔍 Filtro attivo: {cronoscitaFilter}
          </div>
        )}
      </div>
      <DataTable 
        headers={headers} 
        data={data} 
        loading={loading}
        emptyMessage={
          cronoscitaFilter 
            ? `Nessun paziente registrato nella Cronoscita: ${cronoscitaFilter}`
            : "Seleziona una Cronoscita per visualizzare i pazienti"
        }
      />
    </div>
  );
};

const DoctorsPage = ({ cronoscitaFilter }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDoctorsData();
  }, [cronoscitaFilter]);

  const loadDoctorsData = async () => {
    try {
      // Don't load data if no Cronoscita selected
      if (!cronoscitaFilter) {
        console.log('👨‍⚕️ No Cronoscita selected - not loading doctors data');
        setData([]);
        setLoading(false);
        return;
      }

      console.log('👨‍⚕️ Loading doctors data for Cronoscita:', cronoscitaFilter);
      
      // Pass cronoscita filter to API call
      const result = await adminAPI.getDoctorsList(cronoscitaFilter);
      
      if (result.success && result.doctors) {
        const tableData = result.doctors.map(doctor => [
          doctor.codice_medico,
          doctor.nome_completo,
          doctor.specializzazione,
          doctor.struttura,
          doctor.pazienti_registrati?.toString() || '0',
          doctor.appuntamenti_totali?.toString() || '0',
          doctor.appuntamenti_completati?.toString() || '0',
          `${doctor.tasso_completamento || 0}%`,
          <StatusBadge key="status" status={doctor.status || 'Attivo'} type="patient" />
        ]);
        setData(tableData);
      } else {
        console.warn('Invalid doctors data format:', result);
        setData([]);
      }
    } catch (error) {
      console.error('Error loading doctors:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const headers = [
    'Codice',
    'Nome Completo',
    'Specializzazione',
    'Struttura',
    'Pazienti',
    'Visite Totali',
    'Completate',
    'Tasso Completamento',
    'Stato'
  ];

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '600' }}>
          Gestione Medici
        </h2>
        <p style={{ margin: 0, color: '#666666' }}>
          Attività e performance dei medici del sistema
        </p>
      </div>
      <DataTable 
        headers={headers} 
        data={data} 
        loading={loading}
        emptyMessage={
          cronoscitaFilter 
            ? `Nessun medico con pazienti nella Cronicità: ${cronoscitaFilter}`
            : "Seleziona una Cronicità per visualizzare i medici"
        }
      />
    </div>
  );
};

const VisitsPage = ({ cronoscitaFilter }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVisitsData();
  }, [cronoscitaFilter]); // Re-load when filter changes

  const loadVisitsData = async () => {
    try {
      // Don't load data if no Cronoscita selected
      if (!cronoscitaFilter) {
        console.log('📅 No Cronoscita selected - not loading visits data');
        setData([]);
        setLoading(false);
        return;
      }

      console.log('📅 Loading visits data for Cronoscita:', cronoscitaFilter);
      
      // Pass cronoscita filter to API call
      const result = await adminAPI.getVisitsList(cronoscitaFilter);
      
      if (result.success && result.visits) {
        const tableData = result.visits.map(visit => [
          visit.appointment_id,
          visit.patient_name,
          visit.patient_cf,
          visit.doctor_name,
          visit.appointment_type,
          `${visit.scheduled_date} ${visit.scheduled_time}`,
          visit.patologia,
          visit.location,
          <StatusBadge key="status" status={visit.status} type="appointment" />
        ]);
        setData(tableData);
      } else {
        console.warn('Invalid visits data format:', result);
        setData([]);
      }
    } catch (error) {
      console.error('Error loading visits:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const headers = [
    'ID Appuntamento',
    'Paziente',
    'Codice Fiscale',
    'Medico',
    'Tipo Visita',
    'Data e Ora',
    'Patologia',
    'Sede',
    'Stato'
  ];

  // Dynamic header based on filter
  const getHeaderTitle = () => {
    if (cronoscitaFilter) {
      return `Gestione Visite - ${cronoscitaFilter}`;
    }
    return 'Gestione Visite';
  };

  const getHeaderSubtitle = () => {
    if (cronoscitaFilter) {
      return `Visite programmate per la Cronicità: ${cronoscitaFilter}`;
    }
    return 'Registro completo degli appuntamenti e visite';
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '600' }}>
          {getHeaderTitle()}
        </h2>
        <p style={{ margin: 0, color: '#666666' }}>
          {getHeaderSubtitle()}
        </p>
        {cronoscitaFilter && (
          <div style={{ 
            marginTop: '8px', 
            padding: '8px 12px', 
            backgroundColor: '#e3f2fd', 
            borderRadius: '4px',
            fontSize: '14px',
            color: '#1565c0'
          }}>
            🔍 Filtro attivo: {cronoscitaFilter}
          </div>
        )}
      </div>
      <DataTable 
        headers={headers} 
        data={data} 
        loading={loading}
        emptyMessage={
          cronoscitaFilter 
            ? `Nessuna visita programmata per la Cronicità: ${cronoscitaFilter}`
            : "Seleziona una Cronicità per visualizzare le visite"
        }
      />
    </div>
  );
};

const LaboratorioPage = () => {
  return <LaboratorioManagement />;
};

// ================================
// NAVIGATION COMPONENT
// ================================

const Navigation = ({ activeTab, onTabChange }) => {
  const navItems = [
    { id: 'patients', label: 'Pazienti', icon: '👥' },
    { id: 'doctors', label: 'Medici', icon: '👨‍⚕️' },
    { id: 'laboratorio', label: 'Prestazioni', icon: '🔬' }, 
    { id: 'refertazione', label: 'Valutazione', icon: '⚕️' },
    { id: 'visits', label: 'Visite', icon: '📅' }
  ];

  return (
    <nav style={tableStyles.nav}>
      <div style={tableStyles.navContent}>
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            style={{
              ...tableStyles.navLink,
              ...(activeTab === item.id ? tableStyles.navLinkActive : {})
            }}
            onMouseEnter={(e) => {
              if (activeTab !== item.id) {
                e.target.style.backgroundColor = '#f5f5f5';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== item.id) {
                e.target.style.backgroundColor = 'transparent';
              }
            }}
          >
            {item.icon} {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
};

// ================================
// MAIN DASHBOARD LAYOUT - FIXED TO USE ROUTER HOOKS INSIDE ROUTER CONTEXT
// ================================

const DashboardLayout = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('patients');
  const navigate = useNavigate();
  const cronoscitaState = useCronoscitaSelection();

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      navigate('/');
    } catch (error) {
      console.warn('Logout API call failed:', error);
    }
    onLogout();
  };

  const renderContent = () => {
    // Extract just the name from selected Cronoscita for filtering
    const cronoscitaFilter = cronoscitaState.selectedCronoscita?.nome || null;
    
    // For Laboratory tab, check Cronoscita selection
    if (activeTab === 'laboratorio') {
      if (!cronoscitaState.selectedCronoscita) {
        return (
          <NoCronoscitaSelected 
            onCreateClick={() => {
              // Trigger create modal
              const createBtn = document.querySelector('.create-cronoscita-btn');
              if (createBtn) createBtn.click();
            }}
            onSelectClick={() => {
              // Trigger select modal  
              const selectBtn = document.querySelector('.change-cronoscita-btn');
              if (selectBtn) selectBtn.click();
            }}
          />
        );
      }
      
      // Pass the selected Cronoscita object to LaboratorioManagement
      return (
        <LaboratorioManagement 
          cronoscita={cronoscitaState.selectedCronoscita} 
        />
      );
    }

    // For Refertazione tab, check Cronoscita selection
    if (activeTab === 'refertazione') {
      if (!cronoscitaState.selectedCronoscita) {
        return (
          <NoCronoscitaSelected 
            onCreateClick={() => {
              // Trigger create modal
              const createBtn = document.querySelector('.create-cronoscita-btn');
              if (createBtn) createBtn.click();
            }}
            onSelectClick={() => {
              // Trigger select modal  
              const selectBtn = document.querySelector('.change-cronoscita-btn');
              if (selectBtn) selectBtn.click();
            }}
          />
        );
      }
      
      // Pass the selected Cronoscita object to RefertozzioneManagement
      return (
        <RefertozzioneManagement 
          cronoscita={cronoscitaState.selectedCronoscita} 
        />
      );
    }

    // Other tabs - PASS CRONOSCITA NAME STRING (not object) TO ALL TABS
    switch (activeTab) {
      case 'patients':
        return <PatientsPage cronoscitaFilter={cronoscitaFilter} />;
      case 'doctors':
        return <DoctorsPage cronoscitaFilter={cronoscitaFilter} />;
      case 'visits':
        return <VisitsPage cronoscitaFilter={cronoscitaFilter} />;
      default:
        return <PatientsPage cronoscitaFilter={cronoscitaFilter} />;
    }
  };

  return (
    <div style={tableStyles.container}>
      {/* Header */}
      <header style={tableStyles.header}>
        <div style={tableStyles.headerContent}>
          <div style={tableStyles.logoSection}>
            <span style={{ fontSize: '1.75rem' }}>🏥</span>
            <div>
              <h1 style={tableStyles.brandTitle}>
                Admin Dashboard
              </h1>
              <p style={tableStyles.brandSubtitle}>
                Sistema Gestione Sanitario
              </p>
            </div>
          </div>
          
          <div style={tableStyles.userSection}>
            <div style={tableStyles.userInfo}>
              <div style={tableStyles.userName}>
                {user.nome} {user.cognome}
              </div>
              <div style={tableStyles.userMeta}>
                {user.role} • {user.email}
              </div>
            </div>
            <button
              onClick={handleLogout}
              style={tableStyles.logoutButton}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#333333';
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#000000';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* NEW: Cronoscita Selector */}
      <CronoscitaSelector cronoscitaState={cronoscitaState} />

      {/* Navigation */}
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content */}
      <main style={tableStyles.main}>
        {renderContent()}
      </main>
    </div>
  );
};

// ================================
// MAIN APPLICATION WITH PROPER ROUTER STRUCTURE
// ================================

const AdminApp = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const result = await authAPI.checkSession();
      if (result.authenticated && result.user) {
        setUser(result.user);
      }
    } catch (error) {
      console.log('No existing session found');
    }
    setLoading(false);
  };

  const handleAuthSuccess = (userData) => {
    console.log('✅ Auth success:', userData);
    setUser(userData);
  };

  const handleLogout = () => {
    console.log('👋 User logged out');
    setUser(null);
  };

  if (loading) {
    return (
      <div style={{
        ...tableStyles.container,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fafafa'  // ← CHANGED: Simple light background
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #e5e5e5',      // ← CHANGED: Light gray border
            borderTop: '3px solid #000000',   // ← CHANGED: Simple black top
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <p style={{ color: '#333333' }}>Verifica sessione...</p>  {/* ← CHANGED: Simple dark text */}
        </div>
      </div>
    );
  }

  // Show authentication if no user
  if (!user) {
    return <AuthApp onAuthSuccess={handleAuthSuccess} />;
  }

  // Show dashboard with Router context - THIS IS THE FIX
  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/*" 
          element={<DashboardLayout user={user} onLogout={handleLogout} />} 
        />
      </Routes>
    </BrowserRouter>
  );
};

// ================================
// ERROR BOUNDARY
// ================================

class AdminErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🚨 Admin Dashboard Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          ...tableStyles.container,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ textAlign: 'center', maxWidth: '500px' }}>
            <h2 style={{ color: '#dc3545', marginBottom: '20px' }}>
              Errore Dashboard
            </h2>
            <p style={{ marginBottom: '20px', color: '#666666' }}>
              Si è verificato un errore nell'applicazione admin. 
              Ricarica la pagina.
            </p>
            <button 
              onClick={() => window.location.reload()}
              style={{
                padding: '12px 20px',
                backgroundColor: '#000000',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Ricarica
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ================================
// RENDER APPLICATION
// ================================

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <AdminErrorBoundary>
    <AdminApp />
  </AdminErrorBoundary>
);

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

console.log(`
╔══════════════════════════════════════════════════════════════════╗
║              🏥 FUNCTIONAL ADMIN DASHBOARD READY                  ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  ✅ IMPLEMENTED:                                                 ║
║    • Beautiful tabular interface                                ║
║    • Three main tabs: Pazienti, Medici, Visite                 ║
║    • Real database integration                                  ║
║    • Responsive design with hover effects                      ║
║    • Session persistence working                                ║
║    • FIXED: Router context for useNavigate()                   ║
║                                                                  ║
║  📊 DATA TABLES:                                                ║
║    • Pazienti: Full patient info + enrollment data             ║
║    • Medici: Doctor activity and performance metrics           ║
║    • Visite: Complete visit records with details               ║
║                                                                  ║
║  🎨 DESIGN:                                                     ║
║    • Minimal luxury styling                                    ║
║    • Professional healthcare interface                         ║
║    • Beautiful status badges and data presentation             ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
`);
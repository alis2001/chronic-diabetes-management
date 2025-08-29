// frontend/admin-app/src/index.js
// COMPLETE FUNCTIONAL ADMIN DASHBOARD
// Beautiful tabular interface for healthcare data management

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import './index.css';
import AuthApp from './AuthApp';
import { authAPI, adminAPI } from './api';

// ================================
// BEAUTIFUL TABLE STYLES
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
    padding: '0'
  },

  navContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'flex',
    gap: '0'
  },

  navLink: {
    padding: '16px 24px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#666666',
    textDecoration: 'none',
    borderBottom: '2px solid transparent',
    transition: 'all 0.15s ease',
    cursor: 'pointer'
  },

  navLinkActive: {
    color: '#000000',
    borderBottomColor: '#000000',
    backgroundColor: '#fafafa'
  },

  // Main content
  main: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '32px 24px'
  },

  // Page header
  pageHeader: {
    marginBottom: '32px'
  },

  pageTitle: {
    fontSize: '28px',
    fontWeight: '600',
    color: '#000000',
    margin: '0 0 8px 0',
    letterSpacing: '-0.02em'
  },

  pageSubtitle: {
    fontSize: '16px',
    color: '#666666',
    margin: 0,
    fontWeight: '400'
  },

  // Stats bar
  statsBar: {
    display: 'flex',
    gap: '24px',
    marginBottom: '32px',
    padding: '20px 0'
  },

  statItem: {
    textAlign: 'center'
  },

  statNumber: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#000000',
    margin: '0 0 4px 0',
    letterSpacing: '-0.02em'
  },

  statLabel: {
    fontSize: '13px',
    color: '#666666',
    margin: 0,
    fontWeight: '500'
  },

  // Table container
  tableContainer: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e5e5',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)'
  },

  // Table
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px'
  },

  // Table header
  tableHead: {
    backgroundColor: '#fafafa',
    borderBottom: '1px solid #e5e5e5'
  },

  tableHeaderCell: {
    padding: '16px 20px',
    textAlign: 'left',
    fontWeight: '600',
    color: '#000000',
    fontSize: '13px',
    letterSpacing: '0.01em',
    textTransform: 'uppercase'
  },

  // Table body
  tableRow: {
    borderBottom: '1px solid #f0f0f0',
    transition: 'backgroundColor 0.1s ease'
  },

  tableRowHover: {
    backgroundColor: '#fafafa'
  },

  tableCell: {
    padding: '16px 20px',
    color: '#000000',
    verticalAlign: 'middle'
  },

  // Special cell types
  patientName: {
    fontWeight: '600',
    color: '#000000'
  },

  codiceFiscale: {
    fontFamily: 'SF Mono, Monaco, Inconsolata, Roboto Mono, monospace',
    fontSize: '13px',
    color: '#666666',
    backgroundColor: '#f8f9fa',
    padding: '2px 6px',
    borderRadius: '4px',
    display: 'inline-block'
  },

  doctorName: {
    fontWeight: '500',
    color: '#000000'
  },

  specialization: {
    fontSize: '13px',
    color: '#666666'
  },

  // Status badges
  statusBadge: {
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
    display: 'inline-block',
    textAlign: 'center',
    minWidth: '70px'
  },

  statusActive: {
    backgroundColor: '#dcfce7',
    color: '#166534',
    border: '1px solid #bbf7d0'
  },

  statusInactive: {
    backgroundColor: '#fef2f2',
    color: '#991b1b',
    border: '1px solid #fecaca'
  },

  statusScheduled: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    border: '1px solid #bfdbfe'
  },

  statusCompleted: {
    backgroundColor: '#dcfce7',
    color: '#166534',
    border: '1px solid #bbf7d0'
  },

  statusCancelled: {
    backgroundColor: '#fef2f2',
    color: '#991b1b',
    border: '1px solid #fecaca'
  },

  // Priority badges
  priorityNormal: {
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #e5e7eb'
  },

  priorityUrgent: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    border: '1px solid #fde68a'
  },

  priorityEmergency: {
    backgroundColor: '#fecaca',
    color: '#991b1b',
    border: '1px solid #f87171'
  },

  // Loading state
  loadingContainer: {
    padding: '60px 20px',
    textAlign: 'center',
    color: '#666666'
  },

  loadingSpinner: {
    width: '24px',
    height: '24px',
    border: '2px solid #e5e5e5',
    borderTop: '2px solid #000000',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    display: 'inline-block',
    marginBottom: '16px'
  },

  // Empty state
  emptyState: {
    padding: '60px 20px',
    textAlign: 'center',
    color: '#666666'
  },

  // Responsive
  '@media (max-width: 768px)': {
    main: {
      padding: '16px 12px'
    },
    tableContainer: {
      overflowX: 'auto'
    }
  }
};

// ================================
// BEAUTIFUL TABLE COMPONENTS
// ================================

const LoadingTable = () => (
  <div style={tableStyles.tableContainer}>
    <div style={tableStyles.loadingContainer}>
      <div style={tableStyles.loadingSpinner}></div>
      <div>Caricamento dati...</div>
    </div>
  </div>
);

const EmptyTable = ({ message }) => (
  <div style={tableStyles.tableContainer}>
    <div style={tableStyles.emptyState}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
      <div>{message}</div>
    </div>
  </div>
);

const StatusBadge = ({ status, type = 'general' }) => {
  let badgeStyle = { ...tableStyles.statusBadge };
  
  if (type === 'appointment') {
    if (status === 'Programmata') badgeStyle = { ...badgeStyle, ...tableStyles.statusScheduled };
    else if (status === 'Completata') badgeStyle = { ...badgeStyle, ...tableStyles.statusCompleted };
    else if (status === 'Cancellata') badgeStyle = { ...badgeStyle, ...tableStyles.statusCancelled };
    else badgeStyle = { ...badgeStyle, ...tableStyles.statusInactive };
  } else if (type === 'priority') {
    if (status === 'Urgente') badgeStyle = { ...badgeStyle, ...tableStyles.priorityUrgent };
    else if (status === 'Emergenza') badgeStyle = { ...badgeStyle, ...tableStyles.priorityEmergency };
    else badgeStyle = { ...badgeStyle, ...tableStyles.priorityNormal };
  } else {
    if (status === 'Attivo' || status === 'Active') badgeStyle = { ...badgeStyle, ...tableStyles.statusActive };
    else badgeStyle = { ...badgeStyle, ...tableStyles.statusInactive };
  }

  return (
    <span style={badgeStyle}>
      {status}
    </span>
  );
};

// ================================
// PATIENTS TABLE
// ================================

const PatientsTable = ({ patients, loading }) => {
  const [hoveredRow, setHoveredRow] = useState(null);

  if (loading) return <LoadingTable />;
  if (!patients || patients.length === 0) {
    return <EmptyTable message="Nessun paziente registrato nel sistema." />;
  }

  return (
    <div style={tableStyles.tableContainer}>
      <table style={tableStyles.table}>
        <thead style={tableStyles.tableHead}>
          <tr>
            <th style={tableStyles.tableHeaderCell}>Paziente</th>
            <th style={tableStyles.tableHeaderCell}>Codice Fiscale</th>
            <th style={tableStyles.tableHeaderCell}>Contatti</th>
            <th style={tableStyles.tableHeaderCell}>Patologia</th>
            <th style={tableStyles.tableHeaderCell}>Medico Curante</th>
            <th style={tableStyles.tableHeaderCell}>Data Registrazione</th>
            <th style={tableStyles.tableHeaderCell}>Stato</th>
          </tr>
        </thead>
        <tbody>
          {patients.map((patient, index) => (
            <tr
              key={patient.codice_fiscale || index}
              style={{
                ...tableStyles.tableRow,
                ...(hoveredRow === index ? tableStyles.tableRowHover : {})
              }}
              onMouseEnter={() => setHoveredRow(index)}
              onMouseLeave={() => setHoveredRow(null)}
            >
              <td style={tableStyles.tableCell}>
                <div style={tableStyles.patientName}>
                  {patient.nome} {patient.cognome}
                </div>
                <div style={tableStyles.specialization}>
                  {patient.data_nascita !== 'N/A' && `Nato/a il ${patient.data_nascita}`}
                </div>
              </td>
              <td style={tableStyles.tableCell}>
                <span style={tableStyles.codiceFiscale}>
                  {patient.codice_fiscale}
                </span>
              </td>
              <td style={tableStyles.tableCell}>
                <div>{patient.telefono !== 'N/A' ? patient.telefono : '—'}</div>
                <div style={tableStyles.specialization}>
                  {patient.email !== 'N/A' ? patient.email : '—'}
                </div>
              </td>
              <td style={tableStyles.tableCell}>
                {patient.patologia}
              </td>
              <td style={tableStyles.tableCell}>
                <div style={tableStyles.doctorName}>
                  {patient.medico_nome}
                </div>
                <div style={tableStyles.specialization}>
                  {patient.medico_specializzazione}
                </div>
              </td>
              <td style={tableStyles.tableCell}>
                {patient.data_registrazione}
              </td>
              <td style={tableStyles.tableCell}>
                <StatusBadge status={patient.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ================================
// DOCTORS TABLE
// ================================

const DoctorsTable = ({ doctors, loading }) => {
  const [hoveredRow, setHoveredRow] = useState(null);

  if (loading) return <LoadingTable />;
  if (!doctors || doctors.length === 0) {
    return <EmptyTable message="Nessun medico ha utilizzato il sistema." />;
  }

  return (
    <div style={tableStyles.tableContainer}>
      <table style={tableStyles.table}>
        <thead style={tableStyles.tableHead}>
          <tr>
            <th style={tableStyles.tableHeaderCell}>Medico</th>
            <th style={tableStyles.tableHeaderCell}>Codice</th>
            <th style={tableStyles.tableHeaderCell}>Struttura</th>
            <th style={tableStyles.tableHeaderCell}>Pazienti</th>
            <th style={tableStyles.tableHeaderCell}>Appuntamenti</th>
            <th style={tableStyles.tableHeaderCell}>Tasso Completamento</th>
            <th style={tableStyles.tableHeaderCell}>Ultima Attività</th>
            <th style={tableStyles.tableHeaderCell}>Stato</th>
          </tr>
        </thead>
        <tbody>
          {doctors.map((doctor, index) => (
            <tr
              key={doctor.id_medico || index}
              style={{
                ...tableStyles.tableRow,
                ...(hoveredRow === index ? tableStyles.tableRowHover : {})
              }}
              onMouseEnter={() => setHoveredRow(index)}
              onMouseLeave={() => setHoveredRow(null)}
            >
              <td style={tableStyles.tableCell}>
                <div style={tableStyles.doctorName}>
                  {doctor.nome_completo}
                </div>
                <div style={tableStyles.specialization}>
                  {doctor.specializzazione}
                </div>
              </td>
              <td style={tableStyles.tableCell}>
                <span style={tableStyles.codiceFiscale}>
                  {doctor.codice_medico}
                </span>
              </td>
              <td style={tableStyles.tableCell}>
                {doctor.struttura}
              </td>
              <td style={tableStyles.tableCell}>
                <div style={{ fontWeight: '600', color: '#000' }}>
                  {doctor.pazienti_registrati}
                </div>
                <div style={tableStyles.specialization}>
                  registrati
                </div>
              </td>
              <td style={tableStyles.tableCell}>
                <div style={{ fontWeight: '600', color: '#000' }}>
                  {doctor.appuntamenti_totali}
                </div>
                <div style={tableStyles.specialization}>
                  {doctor.appuntamenti_completati} completati • {doctor.appuntamenti_programmati} programmati
                </div>
              </td>
              <td style={tableStyles.tableCell}>
                <div style={{
                  fontWeight: '600',
                  color: doctor.tasso_completamento >= 90 ? '#166534' : 
                         doctor.tasso_completamento >= 70 ? '#92400e' : '#991b1b'
                }}>
                  {doctor.tasso_completamento}%
                </div>
              </td>
              <td style={tableStyles.tableCell}>
                <div style={{ fontSize: '13px' }}>
                  {doctor.ultima_attivita}
                </div>
              </td>
              <td style={tableStyles.tableCell}>
                <StatusBadge status={doctor.stato} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ================================
// VISITS TABLE
// ================================

const VisitsTable = ({ visits, loading }) => {
  const [hoveredRow, setHoveredRow] = useState(null);

  if (loading) return <LoadingTable />;
  if (!visits || visits.length === 0) {
    return <EmptyTable message="Nessuna visita registrata nel sistema." />;
  }

  return (
    <div style={tableStyles.tableContainer}>
      <table style={tableStyles.table}>
        <thead style={tableStyles.tableHead}>
          <tr>
            <th style={tableStyles.tableHeaderCell}>Paziente</th>
            <th style={tableStyles.tableHeaderCell}>Medico</th>
            <th style={tableStyles.tableHeaderCell}>Tipo Visita</th>
            <th style={tableStyles.tableHeaderCell}>Data Programmata</th>
            <th style={tableStyles.tableHeaderCell}>Stato</th>
            <th style={tableStyles.tableHeaderCell}>Priorità</th>
            <th style={tableStyles.tableHeaderCell}>Luogo</th>
            <th style={tableStyles.tableHeaderCell}>Note</th>
          </tr>
        </thead>
        <tbody>
          {visits.map((visit, index) => (
            <tr
              key={visit.appointment_id || index}
              style={{
                ...tableStyles.tableRow,
                ...(hoveredRow === index ? tableStyles.tableRowHover : {})
              }}
              onMouseEnter={() => setHoveredRow(index)}
              onMouseLeave={() => setHoveredRow(null)}
            >
              <td style={tableStyles.tableCell}>
                <div style={tableStyles.patientName}>
                  {visit.paziente_nome}
                </div>
                <div style={tableStyles.specialization}>
                  <span style={{ 
                    ...tableStyles.codiceFiscale, 
                    fontSize: '11px', 
                    padding: '1px 4px' 
                  }}>
                    {visit.paziente_cf}
                  </span>
                </div>
              </td>
              <td style={tableStyles.tableCell}>
                <div style={tableStyles.doctorName}>
                  {visit.medico_nome}
                </div>
                <div style={tableStyles.specialization}>
                  {visit.medico_specializzazione}
                </div>
              </td>
              <td style={tableStyles.tableCell}>
                {visit.tipo_visita}
              </td>
              <td style={tableStyles.tableCell}>
                {visit.data_programmata}
              </td>
              <td style={tableStyles.tableCell}>
                <StatusBadge status={visit.stato} type="appointment" />
              </td>
              <td style={tableStyles.tableCell}>
                <StatusBadge status={visit.priorita} type="priority" />
              </td>
              <td style={tableStyles.tableCell}>
                {visit.location !== 'N/A' ? visit.location : '—'}
              </td>
              <td style={tableStyles.tableCell}>
                <div style={{ 
                  maxWidth: '200px', 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis',
                  fontSize: '13px',
                  color: '#666666'
                }}>
                  {visit.note_medico || visit.note_completamento || '—'}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ================================
// PAGE COMPONENTS
// ================================

const PatientsPage = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getPatientsList();
      if (response.success) {
        setPatients(response.patients);
      }
    } catch (error) {
      console.error('Error loading patients:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={tableStyles.pageHeader}>
        <h1 style={tableStyles.pageTitle}>👥 Pazienti Registrati</h1>
        <p style={tableStyles.pageSubtitle}>
          Elenco completo dei pazienti iscritti al sistema con informazioni di registrazione
        </p>
      </div>

      {!loading && patients.length > 0 && (
        <div style={tableStyles.statsBar}>
          <div style={tableStyles.statItem}>
            <div style={tableStyles.statNumber}>{patients.length}</div>
            <div style={tableStyles.statLabel}>Pazienti Totali</div>
          </div>
          <div style={tableStyles.statItem}>
            <div style={tableStyles.statNumber}>
              {patients.filter(p => p.status === 'Active').length}
            </div>
            <div style={tableStyles.statLabel}>Attivi</div>
          </div>
          <div style={tableStyles.statItem}>
            <div style={tableStyles.statNumber}>
              {new Set(patients.map(p => p.medico_nome)).size}
            </div>
            <div style={tableStyles.statLabel}>Medici Coinvolti</div>
          </div>
        </div>
      )}

      <PatientsTable patients={patients} loading={loading} />
    </div>
  );
};

const DoctorsPage = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDoctors();
  }, []);

  const loadDoctors = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getDoctorsList();
      if (response.success) {
        setDoctors(response.doctors);
      }
    } catch (error) {
      console.error('Error loading doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={tableStyles.pageHeader}>
        <h1 style={tableStyles.pageTitle}>👨‍⚕️ Medici Sistema</h1>
        <p style={tableStyles.pageSubtitle}>
          Medici che hanno utilizzato il sistema con statistiche di attività
        </p>
      </div>

      {!loading && doctors.length > 0 && (
        <div style={tableStyles.statsBar}>
          <div style={tableStyles.statItem}>
            <div style={tableStyles.statNumber}>{doctors.length}</div>
            <div style={tableStyles.statLabel}>Medici Registrati</div>
          </div>
          <div style={tableStyles.statItem}>
            <div style={tableStyles.statNumber}>
              {doctors.filter(d => d.stato === 'Attivo').length}
            </div>
            <div style={tableStyles.statLabel}>Attivi</div>
          </div>
          <div style={tableStyles.statItem}>
            <div style={tableStyles.statNumber}>
              {doctors.reduce((sum, d) => sum + d.pazienti_registrati, 0)}
            </div>
            <div style={tableStyles.statLabel}>Pazienti Totali</div>
          </div>
          <div style={tableStyles.statItem}>
            <div style={tableStyles.statNumber}>
              {Math.round(doctors.reduce((sum, d) => sum + d.tasso_completamento, 0) / doctors.length)}%
            </div>
            <div style={tableStyles.statLabel}>Completamento Medio</div>
          </div>
        </div>
      )}

      <DoctorsTable doctors={doctors} loading={loading} />
    </div>
  );
};

const VisitsPage = () => {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVisits();
  }, []);

  const loadVisits = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getVisitsList();
      if (response.success) {
        setVisits(response.visits);
      }
    } catch (error) {
      console.error('Error loading visits:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={tableStyles.pageHeader}>
        <h1 style={tableStyles.pageTitle}>🏥 Visite Mediche</h1>
        <p style={tableStyles.pageSubtitle}>
          Registro completo delle visite programmate e completate nel sistema
        </p>
      </div>

      {!loading && visits.length > 0 && (
        <div style={tableStyles.statsBar}>
          <div style={tableStyles.statItem}>
            <div style={tableStyles.statNumber}>{visits.length}</div>
            <div style={tableStyles.statLabel}>Visite Totali</div>
          </div>
          <div style={tableStyles.statItem}>
            <div style={tableStyles.statNumber}>
              {visits.filter(v => v.stato === 'Completata').length}
            </div>
            <div style={tableStyles.statLabel}>Completate</div>
          </div>
          <div style={tableStyles.statItem}>
            <div style={tableStyles.statNumber}>
              {visits.filter(v => v.stato === 'Programmata').length}
            </div>
            <div style={tableStyles.statLabel}>Programmate</div>
          </div>
          <div style={tableStyles.statItem}>
            <div style={tableStyles.statNumber}>
              {visits.filter(v => v.priorita === 'Urgente' || v.priorita === 'Emergenza').length}
            </div>
            <div style={tableStyles.statLabel}>Priorità Alta</div>
          </div>
        </div>
      )}

      <VisitsTable visits={visits} loading={loading} />
    </div>
  );
};

// ================================
// NAVIGATION COMPONENT
// ================================

const Navigation = ({ activeTab, onTabChange }) => {
  const navItems = [
    { id: 'patients', label: 'Pazienti', icon: '👥' },
    { id: 'doctors', label: 'Medici', icon: '👨‍⚕️' },
    { id: 'visits', label: 'Visite', icon: '🏥' }
  ];

  return (
    <nav style={tableStyles.nav}>
      <div style={tableStyles.navContent}>
        {navItems.map((item) => (
          <div
            key={item.id}
            onClick={() => onTabChange(item.id)}
            style={{
              ...tableStyles.navLink,
              ...(activeTab === item.id ? tableStyles.navLinkActive : {})
            }}
          >
            {item.icon} {item.label}
          </div>
        ))}
      </div>
    </nav>
  );
};

// ================================
// MAIN DASHBOARD LAYOUT
// ================================

const DashboardLayout = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('patients');
  const navigate = useNavigate();

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
    switch (activeTab) {
      case 'patients':
        return <PatientsPage />;
      case 'doctors':
        return <DoctorsPage />;
      case 'visits':
        return <VisitsPage />;
      default:
        return <PatientsPage />;
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
                Sistema Sanitario ASL
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
// MAIN APPLICATION
// ================================

const AdminApp = () => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      const sessionResult = await authAPI.checkSession();
      if (sessionResult.authenticated && sessionResult.user) {
        setUser(sessionResult.user);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.warn('Session initialization failed:', error);
    } finally {
      setInitializing(false);
    }
  };

  const handleAuthSuccess = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
  };

  if (initializing) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fafafa'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>🏥</div>
          <div style={{ fontSize: '18px', fontWeight: '600' }}>Caricamento Dashboard...</div>
        </div>
      </div>
    );
  }

  return isAuthenticated && user ? (
    <DashboardLayout user={user} onLogout={handleLogout} />
  ) : (
    <AuthApp onAuthSuccess={handleAuthSuccess} />
  );
};

// ================================
// ERROR BOUNDARY & BOOTSTRAP
// ================================

class AdminErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fafafa'
        }}>
          <div style={{ textAlign: 'center', padding: '32px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚠️</div>
            <h1 style={{ marginBottom: '8px' }}>Errore Dashboard</h1>
            <p style={{ marginBottom: '24px', color: '#666666' }}>
              Si è verificato un errore. Ricarica la pagina.
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

// Render app
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
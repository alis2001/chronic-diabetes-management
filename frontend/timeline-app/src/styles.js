// frontend/timeline-app/src/styles.js
// Sistema di design centralizzato - Interfaccia medico ASL italiana
// Stili completi per sistema sanitario professionale

export const styles = {
  // ================================
  // LAYOUT PRINCIPALE
  // ================================
  
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    lineHeight: '1.6',
    color: '#2c3e50',
    backgroundColor: '#f8f9fa',
    minHeight: '100vh'
  },

  // ================================
  // HEADER SISTEMA
  // ================================

  header: {
    background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #06b6d4 100%)',
    color: 'white',
    padding: '25px 30px',
    borderRadius: '12px',
    marginBottom: '30px',
    boxShadow: '0 8px 25px rgba(59, 130, 246, 0.15)',
    position: 'relative',
    overflow: 'hidden'
  },

  headerContent: {
    position: 'relative',
    zIndex: 2
  },

  headerSubtitle: {
    fontSize: '14px',
    opacity: 0.9,
    marginTop: '5px',
    fontWeight: '400'
  },

  headerStatus: {
    display: 'flex',
    gap: '25px',
    marginTop: '20px',
    fontSize: '13px',
    flexWrap: 'wrap',
    alignItems: 'center'
  },

  statusItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    background: 'rgba(255, 255, 255, 0.1)',
    padding: '6px 12px',
    borderRadius: '20px',
    backdropFilter: 'blur(10px)'
  },

  // ================================
  // CARD E CONTENITORI
  // ================================

  card: {
    background: '#ffffff',
    border: '1px solid #e1e8ed',
    borderRadius: '16px',
    padding: '30px',
    marginBottom: '25px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
    transition: 'all 0.3s ease',
    position: 'relative'
  },

  cardHeader: {
    marginBottom: '25px',
    paddingBottom: '20px',
    borderBottom: '2px solid #f1f3f4'
  },

  cardDescription: {
    color: '#5d6d7e',
    fontSize: '14px',
    marginTop: '8px',
    lineHeight: '1.5'
  },

  // ================================
  // FORM E INPUT
  // ================================

  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '25px'
  },

  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },

  label: {
    fontWeight: '600',
    color: '#2c3e50',
    fontSize: '14px',
    marginBottom: '5px'
  },

  required: {
    color: '#e74c3c',
    marginLeft: '3px'
  },

  input: {
    padding: '14px 16px',
    border: '2px solid #e1e8ed',
    borderRadius: '8px',
    fontSize: '14px',
    transition: 'all 0.2s ease',
    backgroundColor: '#ffffff',
    ':focus': {
      borderColor: '#3498db',
      outline: 'none',
      boxShadow: '0 0 0 3px rgba(52, 152, 219, 0.1)'
    },
    ':disabled': {
      backgroundColor: '#f8f9fa',
      color: '#6c757d',
      cursor: 'not-allowed'
    }
  },

  select: {
    padding: '14px 16px',
    border: '2px solid #e1e8ed',
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    ':disabled': {
      backgroundColor: '#f8f9fa',
      color: '#6c757d',
      cursor: 'not-allowed'
    }
  },

  textarea: {
    padding: '14px 16px',
    border: '2px solid #e1e8ed',
    borderRadius: '8px',
    fontSize: '14px',
    minHeight: '100px',
    resize: 'vertical',
    fontFamily: 'inherit',
    lineHeight: '1.5',
    ':disabled': {
      backgroundColor: '#f8f9fa',
      color: '#6c757d',
      cursor: 'not-allowed'
    }
  },

  helpText: {
    fontSize: '12px',
    color: '#6c757d',
    fontStyle: 'italic',
    marginTop: '4px'
  },

  // ================================
  // BOTTONI
  // ================================

  primaryButton: {
    background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
    color: 'white',
    padding: '14px 28px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(52, 152, 219, 0.2)',
    ':hover': {
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 12px rgba(52, 152, 219, 0.3)'
    },
    ':disabled': {
      opacity: 0.6,
      cursor: 'not-allowed',
      transform: 'none',
      boxShadow: 'none'
    }
  },

  successButton: {
    background: 'linear-gradient(135deg, #27ae60 0%, #229954 100%)',
    color: 'white',
    padding: '14px 28px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(39, 174, 96, 0.2)',
    ':disabled': {
      opacity: 0.6,
      cursor: 'not-allowed'
    }
  },

  secondaryButton: {
    background: '#ecf0f1',
    color: '#2c3e50',
    padding: '14px 28px',
    border: '2px solid #bdc3c7',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    ':hover': {
      backgroundColor: '#d5dbdb'
    }
  },

  refreshButton: {
    background: '#f1c40f',
    color: '#2c3e50',
    padding: '8px 16px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600'
  },

  buttonGroup: {
    display: 'flex',
    gap: '15px',
    flexWrap: 'wrap',
    marginTop: '20px'
  },

  // ================================
  // SEZIONI DATI PAZIENTE
  // ================================

  patientDataSection: {
    marginBottom: '30px',
    padding: '25px',
    backgroundColor: '#f8f9fa',
    borderRadius: '12px',
    border: '1px solid #e9ecef'
  },

  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: '15px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },

  sectionDescription: {
    fontSize: '13px',
    color: '#6c757d',
    marginBottom: '20px',
    lineHeight: '1.5'
  },

  readOnlyLabel: {
    fontSize: '12px',
    color: '#e74c3c',
    fontWeight: '500',
    background: '#ffebee',
    padding: '2px 8px',
    borderRadius: '4px'
  },

  editableLabel: {
    fontSize: '12px',
    color: '#27ae60',
    fontWeight: '500',
    background: '#e8f5e8',
    padding: '2px 8px',
    borderRadius: '4px'
  },

  // ================================
  // GRIGLIA DATI
  // ================================

  readOnlySection: {
    background: '#ffffff',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #e9ecef'
  },

  editableSection: {
    background: '#ffffff',
    padding: '20px',
    borderRadius: '8px',
    border: '2px solid #d1ecf1'
  },

  dataGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '15px'
  },

  dataItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    background: '#f8f9fa',
    borderRadius: '6px'
  },

  dataLabel: {
    fontWeight: '600',
    color: '#495057',
    fontSize: '13px'
  },

  dataValue: {
    color: '#2c3e50',
    fontSize: '13px',
    fontWeight: '500'
  },

  // ================================
  // INFORMAZIONI PATOLOGIA
  // ================================

  pathologyInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '15px',
    background: '#e3f2fd',
    borderRadius: '8px',
    border: '1px solid #bbdefb'
  },

  pathologyLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1976d2'
  },

  pathologyCode: {
    fontSize: '12px',
    color: '#666',
    fontStyle: 'italic'
  },

  // ================================
  // AZIONI REGISTRAZIONE
  // ================================

  registrationActions: {
    marginTop: '30px',
    paddingTop: '25px',
    borderTop: '2px solid #e9ecef'
  },

  confirmationBox: {
    background: '#fff3cd',
    border: '1px solid #ffeaa7',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px'
  },

  // ================================
  // TIMELINE PAZIENTE
  // ================================

  timelineHeader: {
    marginBottom: '25px'
  },

  timelineTitle: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '15px'
  },

  patientInfo: {
    background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
    padding: '25px',
    borderRadius: '12px',
    marginBottom: '30px',
    border: '1px solid #dee2e6'
  },

  patientInfoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px'
  },

  patientInfoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },

  patientInfoLabel: {
    fontSize: '12px',
    color: '#6c757d',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },

  patientInfoValue: {
    fontSize: '14px',
    color: '#2c3e50',
    fontWeight: '600'
  },

  // ================================
  // GRIGLIA TIMELINE
  // ================================

  timelineGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '25px',
    marginBottom: '30px'
  },

  appointmentSection: {
    border: '2px solid #e1e8ed',
    borderRadius: '12px',
    padding: '20px',
    minHeight: '250px',
    transition: 'all 0.2s ease'
  },

  pastSection: {
    backgroundColor: '#f8f9fa',
    borderColor: '#6c757d'
  },

  todaySection: {
    backgroundColor: '#fff5f5',
    borderColor: '#e74c3c',
    boxShadow: '0 0 20px rgba(231, 76, 60, 0.1)'
  },

  futureSection: {
    backgroundColor: '#f0fff4',
    borderColor: '#27ae60',
    boxShadow: '0 0 20px rgba(39, 174, 96, 0.1)'
  },

  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    paddingBottom: '15px',
    borderBottom: '1px solid #dee2e6'
  },

  appointmentCount: {
    background: '#495057',
    color: 'white',
    fontSize: '12px',
    fontWeight: '600',
    padding: '4px 8px',
    borderRadius: '12px',
    minWidth: '24px',
    textAlign: 'center'
  },

  // ================================
  // LISTA APPUNTAMENTI
  // ================================

  appointmentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },

  appointmentItem: {
    padding: '16px',
    borderRadius: '8px',
    fontSize: '13px',
    lineHeight: '1.4',
    border: '1px solid #e9ecef',
    transition: 'all 0.2s ease',
    ':hover': {
      transform: 'translateX(2px)',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
    }
  },

  appointmentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    flexWrap: 'wrap',
    gap: '10px'
  },

  appointmentDate: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#2c3e50'
  },

  appointmentStatus: {
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },

  appointmentType: {
    fontSize: '13px',
    color: '#495057',
    marginBottom: '8px',
    fontWeight: '500'
  },

  appointmentMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '12px',
    color: '#6c757d',
    marginBottom: '8px',
    flexWrap: 'wrap',
    gap: '10px'
  },

  appointmentPriority: {
    fontWeight: '600'
  },

  appointmentLocation: {
    fontSize: '12px'
  },

  appointmentNotes: {
    fontSize: '12px',
    color: '#495057',
    marginTop: '8px',
    padding: '8px',
    background: '#f8f9fa',
    borderRadius: '4px',
    fontStyle: 'italic'
  },

  // ================================
  // STATI APPUNTAMENTO
  // ================================

  scheduledStatus: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3'
  },

  completedStatus: {
    backgroundColor: '#e8f5e9',
    borderColor: '#4caf50'
  },

  cancelledStatus: {
    backgroundColor: '#ffebee',
    borderColor: '#f44336'
  },

  no_showStatus: {
    backgroundColor: '#fff8e1',
    borderColor: '#ff9800'
  },

  // ================================
  // AZIONI TIMELINE
  // ================================

  timelineActions: {
    display: 'flex',
    gap: '15px',
    paddingTop: '25px',
    borderTop: '2px solid #e9ecef',
    flexWrap: 'wrap'
  },

  // ================================
  // STATI INTERFACE
  // ================================

  loadingState: {
    textAlign: 'center',
    padding: '40px',
    color: '#6c757d'
  },

  errorState: {
    textAlign: 'center',
    padding: '40px',
    color: '#e74c3c'
  },

  emptyState: {
    textAlign: 'center',
    padding: '30px'
  },

  emptyText: {
    color: '#6c757d',
    fontStyle: 'italic',
    fontSize: '13px'
  },

  errorText: {
    color: '#e74c3c',
    fontWeight: '600'
  },

  // ================================
  // RISULTATI OPERAZIONI
  // ================================

  resultBox: {
    marginTop: '25px',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid',
    fontSize: '14px'
  },

  resultTitle: {
    marginTop: '0',
    marginBottom: '15px',
    fontSize: '16px'
  },

  successResult: {
    lineHeight: '1.6'
  },

  errorResult: {
    lineHeight: '1.6'
  },

  // ================================
  // BREADCRUMBS E NAVIGAZIONE
  // ================================

  breadcrumbContainer: {
    backgroundColor: '#f8f9fa',
    padding: '18px 24px',
    borderRadius: '12px',
    marginBottom: '25px',
    border: '1px solid #e9ecef'
  },

  breadcrumbTrail: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
    flexWrap: 'wrap'
  },

  breadcrumbItem: {
    color: '#6c757d',
    fontSize: '14px',
    fontWeight: '500'
  },

  activeBreadcrumb: {
    color: '#2c3e50',
    fontSize: '14px',
    fontWeight: '700'
  },

  breadcrumbSeparator: {
    color: '#adb5bd',
    fontSize: '12px'
  },

  patientBadge: {
    background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
    color: 'white',
    padding: '10px 18px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    display: 'inline-block'
  },

  // ================================
  // AZIONI WORKFLOW
  // ================================

  workflowActions: {
    marginTop: '40px',
    paddingTop: '25px',
    borderTop: '3px solid #e1e8ed',
    textAlign: 'center'
  },

  // ================================
  // FOOTER
  // ================================

  footer: {
    marginTop: '60px',
    paddingTop: '30px',
    borderTop: '2px solid #e1e8ed',
    backgroundColor: '#f8f9fa',
    borderRadius: '12px',
    padding: '30px'
  },

  footerContent: {
    textAlign: 'center',
    color: '#5d6d7e'
  },

  footerLinks: {
    display: 'flex',
    justifyContent: 'center',
    gap: '25px',
    margin: '20px 0',
    flexWrap: 'wrap'
  },

  footerLink: {
    color: '#3498db',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '600',
    ':hover': {
      textDecoration: 'underline'
    }
  },

  serviceStatus: {
    fontSize: '12px',
    color: '#95a5a6',
    marginTop: '15px',
    fontStyle: 'italic'
  },

  // ================================
  // RESPONSIVE DESIGN
  // ================================

  '@media (max-width: 1200px)': {
    container: {
      maxWidth: '100%',
      padding: '15px'
    },
    
    timelineGrid: {
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))'
    }
  },

  '@media (max-width: 768px)': {
    container: {
      padding: '10px'
    },
    
    header: {
      padding: '20px'
    },
    
    headerStatus: {
      flexDirection: 'column',
      gap: '10px'
    },
    
    card: {
      padding: '20px'
    },
    
    timelineGrid: {
      gridTemplateColumns: '1fr'
    },
    
    buttonGroup: {
      flexDirection: 'column'
    },
    
    timelineTitle: {
      flexDirection: 'column',
      alignItems: 'stretch'
    },
    
    patientInfoGrid: {
      gridTemplateColumns: '1fr'
    },
    
    dataGrid: {
      gridTemplateColumns: '1fr'
    },
    
    footerLinks: {
      flexDirection: 'column',
      gap: '15px'
    }
  }
};
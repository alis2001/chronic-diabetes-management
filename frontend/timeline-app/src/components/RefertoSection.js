// frontend/timeline-app/src/components/RefertoSection.js
// Referto Section with Additional Sections Sidebar - Clean Separation

import React, { useState, useEffect } from 'react';
import { timelineAPI } from '../api';

const RefertoSection = ({ 
  patientId, 
  doctorId, 
  patologia, 
  cronoscitaId,
  onRefertoSaved, 
  onDirtyStateChange, 
  hasFutureAppointment 
}) => {
  // Main referto state
  const [referto, setReferto] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [hasExistingReferto, setHasExistingReferto] = useState(false);
  const [savedRefertoText, setSavedRefertoText] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [currentRefertoId, setCurrentRefertoId] = useState(null);
  const [loadingExistingReferto, setLoadingExistingReferto] = useState(false);

  // Additional sections state
  const [availableSections, setAvailableSections] = useState([]);
  const [activeSections, setActiveSections] = useState(new Set());
  const [loadingSections, setLoadingSections] = useState(false);

  const isReadOnly = hasFutureAppointment;

  // Load existing referto on mount
  useEffect(() => {
    if (patientId && doctorId && patologia) {
      loadExistingReferto();
    }
  }, [patientId, doctorId, patologia]);

  // Load admin-configured sections
  useEffect(() => {
    if (cronoscitaId) {
      loadAdditionalSections();
    }
  }, [cronoscitaId]);

  // Notify parent of dirty state changes
  useEffect(() => {
    if (onDirtyStateChange) {
      onDirtyStateChange(isDirty);
    }
  }, [isDirty, onDirtyStateChange]);

  const loadExistingReferto = async () => {
    setLoadingExistingReferto(true);
    
    try {
      const response = await timelineAPI.getTodaysReferto(patientId, doctorId, patologia);
      
      if (response && response.referto) {
        const existingText = response.referto.testo_referto || '';
        setReferto(existingText);
        setSavedRefertoText(existingText);
        setHasExistingReferto(true);
        setCurrentRefertoId(response.referto.referto_id);
        setIsDirty(false);
        
        // Parse active sections from existing referto
        parseActiveSections(existingText);
        
        console.log('✅ Loaded existing referto');
      }
    } catch (error) {
      console.log('ℹ️ No existing referto for today');
    } finally {
      setLoadingExistingReferto(false);
    }
  };

  const loadAdditionalSections = async () => {
    setLoadingSections(true);
    
    try {
      const sections = await timelineAPI.getActiveRefertoSections(cronoscitaId);
      setAvailableSections(sections || []);
      console.log('✅ Loaded', sections.length, 'additional referto sections');
    } catch (error) {
      console.error('❌ Error loading sections:', error);
      setAvailableSections([]);
    } finally {
      setLoadingSections(false);
    }
  };

  // Parse which sections are already in the referto text
  const parseActiveSections = (text) => {
    const active = new Set();
    
    availableSections.forEach(section => {
      const sectionHeader = `${section.section_name}:`;
      if (text.includes(sectionHeader)) {
        active.add(section.id);
      }
    });
    
    setActiveSections(active);
  };

  // Re-parse active sections when referto text or available sections change
  useEffect(() => {
    if (availableSections.length > 0) {
      parseActiveSections(referto);
    }
  }, [referto, availableSections]);

  const handleSectionClick = (section) => {
    if (isReadOnly) return;

    const sectionHeader = `${section.section_name}:`;
    
    if (activeSections.has(section.id)) {
      // Remove section from referto
      const lines = referto.split('\n');
      const filteredLines = lines.filter(line => !line.trim().startsWith(sectionHeader));
      const newText = filteredLines.join('\n');
      
      setReferto(newText);
      setActiveSections(prev => {
        const newSet = new Set(prev);
        newSet.delete(section.id);
        return newSet;
      });
    } else {
      // Add section to referto
      const newText = referto 
        ? `${referto}\n\n${sectionHeader} `
        : `${sectionHeader} `;
      
      setReferto(newText);
      setActiveSections(prev => new Set([...prev, section.id]));
    }
    
    setIsDirty(true);
  };

  const handleRefertoChange = (e) => {
    if (isReadOnly) return;
    
    const newValue = e.target.value;
    setReferto(newValue);
    
    // Track dirty state
    if (hasExistingReferto && newValue !== savedRefertoText) {
      setIsDirty(true);
      setSaveMessage('');
    } else if (hasExistingReferto && newValue === savedRefertoText) {
      setIsDirty(false);
      setSaveMessage('');
    }
  };

  const handleSaveReferto = async () => {
    setSaving(true);
    setSaveMessage('');
    
    try {
      const refertoData = {
        cf_paziente: patientId,
        id_medico: doctorId,
        patologia: patologia,
        testo_referto: referto,
        referto_id: currentRefertoId,
        data_visita: new Date().toISOString().split('T')[0]
      };
      
      const response = await timelineAPI.saveReferto(refertoData);
      
      if (response.success) {
        setSaveMessage('✅ Referto salvato con successo!');
        setHasExistingReferto(true);
        setSavedRefertoText(referto);
        setIsDirty(false);
        
        if (response.referto_id) {
          setCurrentRefertoId(response.referto_id);
        }
        
        if (onRefertoSaved) {
          onRefertoSaved(response);
        }
        
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        setSaveMessage('❌ ' + (response.message || 'Errore nel salvataggio'));
      }
    } catch (error) {
      console.error('Error saving referto:', error);
      setSaveMessage('❌ Errore nel salvataggio del referto');
    } finally {
      setSaving(false);
    }
  };

  const canSave = referto.trim().length > 0 && !isReadOnly;

  const handleVoiceRecording = async () => {
    try {
      console.log('🎤 Starting voice recording workflow...');
      
      if (!doctorId || !patientId) {
        alert('Errore: Dati sessione mancanti. Ricarica la pagina.');
        return;
      }

      console.log('📡 Creating Melody workflow...');

      const requestData = {
        doctor_id: doctorId,
        patient_cf: patientId,
        return_url: window.location.href,
        platform: 'chronic'
      };

      const API_BASE = process.env.REACT_APP_API_GATEWAY_URL || 'http://localhost:8080';
      const response = await fetch(`${API_BASE}/api/timeline/melody/create-voice-workflow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Melody workflow creation failed:', errorData);
        
        if (response.status === 503) {
          alert('⚠️ Servizio Melody temporaneamente non disponibile. Riprova tra qualche minuto.');
        } else {
          alert(`❌ Errore durante la creazione del workflow Melody: ${errorData.detail || 'Errore sconosciuto'}`);
        }
        return;
      }

      const workflowData = await response.json();
      console.log('✅ Melody workflow created:', workflowData);

      if (workflowData.success && workflowData.workflow_url) {
        console.log('🚀 Navigating to Melody workflow:', workflowData.workflow_url);
        window.location.href = workflowData.workflow_url;
      } else {
        alert('❌ Errore nella risposta del servizio Melody.');
      }

    } catch (error) {
      console.error('❌ Voice recording error:', error);
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        alert('⚠️ Errore di connessione. Verificare la connessione al servizio Melody.');
      } else {
        alert('❌ Errore durante l\'avvio della registrazione vocale.');
      }
    }
  };

  return (
    <div style={styles.container}>
      <style>{sparkleAnimation}</style>

      {/* Loading State */}
      {loadingExistingReferto && (
        <div style={styles.loadingBanner}>
          <div style={styles.spinner}></div>
          Caricamento referto esistente...
        </div>
      )}

      {/* Header with Voice Button and Save Button */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h3 style={styles.title}>
            Valutazione {patologia ? patologia.toUpperCase() : ''}
          </h3>
          
          {/* Voice Recording Button - next to title */}
          {!isReadOnly && (
            <button
              onClick={handleVoiceRecording}
              style={styles.voiceButton}
              title="Registrazione vocale con AI"
            >
              <span className="ai-sparkle" style={styles.sparkle}>✨</span>
              <span>🎤 Referto Vocale AI</span>
            </button>
          )}
        </div>

        <button
          onClick={handleSaveReferto}
          disabled={!canSave || saving}
          style={{
            ...styles.saveButton,
            background: canSave && !saving
              ? (isDirty 
                  ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                  : (hasExistingReferto 
                      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                      : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'))
              : '#e5e7eb',
            color: canSave && !saving ? 'white' : '#9ca3af',
            cursor: canSave && !saving ? 'pointer' : 'not-allowed',
            opacity: hasExistingReferto ? 0.8 : 1
          }}
        >
          {saving ? (
            <>
              <span style={styles.buttonSpinner} />
              Salvando...
            </>
          ) : isDirty ? (
            <>💾 Salva Modifiche</>
          ) : hasExistingReferto ? (
            <>✅ Salvato</>
          ) : (
            <>💾 Salva Referto</>
          )}
        </button>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div style={{
          ...styles.message,
          background: saveMessage.startsWith('✅') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          borderColor: saveMessage.startsWith('✅') ? '#10b981' : '#ef4444',
          color: saveMessage.startsWith('✅') ? '#059669' : '#dc2626'
        }}>
          {saveMessage}
        </div>
      )}

      {/* Main Content: Referto (2/3) + Additional Sections (1/3) */}
      <div style={styles.contentGrid}>
        {/* Left: Main Referto Textarea (2/3) */}
        <div style={styles.mainReferto}>
          <textarea
            value={referto}
            onChange={handleRefertoChange}
            readOnly={isReadOnly}
            placeholder={
              isReadOnly 
                ? "🔒 Referto bloccato - Il prossimo appuntamento è stato programmato" 
                : "Inserisci qui la refertazione medica del paziente..."
            }
            style={{
              ...styles.textarea,
              borderColor: isReadOnly ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)',
              backgroundColor: isReadOnly ? 'rgba(248, 250, 252, 0.8)' : 'rgba(255, 255, 255, 0.8)',
              cursor: isReadOnly ? 'not-allowed' : 'text',
              color: isReadOnly ? '#4b5563' : '#1f2937'
            }}
            onFocus={(e) => {
              if (!isReadOnly) {
                e.target.style.borderColor = '#3b82f6';
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
                e.target.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1)';
              }
            }}
            onBlur={(e) => {
              if (!isReadOnly) {
                e.target.style.borderColor = 'rgba(59, 130, 246, 0.2)';
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
                e.target.style.boxShadow = 'none';
              }
            }}
          />
        </div>

        {/* Right: Additional Sections (1/3) */}
        <div style={styles.sectionsSidebar}>
          <h4 style={styles.sidebarTitle}>
            Ulteriori Sezioni del Referto
          </h4>

          {loadingSections ? (
            <div style={styles.sidebarLoading}>
              <div style={styles.smallSpinner}></div>
              <p>Caricamento...</p>
            </div>
          ) : availableSections.length === 0 ? (
            <div style={styles.noSections}>
              <p style={styles.noSectionsIcon}>📋</p>
              <p style={styles.noSectionsText}>
                Nessuna sezione aggiuntiva configurata
              </p>
            </div>
          ) : (
            <div style={styles.sectionsButtons}>
              {availableSections.map((section) => {
                const isActive = activeSections.has(section.id);
                
                return (
                  <button
                    key={section.id}
                    onClick={() => handleSectionClick(section)}
                    disabled={isReadOnly}
                    style={{
                      ...styles.sectionButton,
                      ...(isActive ? styles.sectionButtonActive : styles.sectionButtonInactive),
                      cursor: isReadOnly ? 'not-allowed' : 'pointer',
                      opacity: isReadOnly ? 0.5 : 1
                    }}
                    title={isActive ? `Rimuovi ${section.section_name}` : `Aggiungi ${section.section_name}`}
                  >
                    <span style={styles.sectionButtonIcon}>
                      {isActive ? '✓' : '+'}
                    </span>
                    <span style={styles.sectionButtonText}>
                      {section.section_name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {!isReadOnly && availableSections.length > 0 && (
            <div style={styles.sidebarHint}>
              💡 Clicca per aggiungere/rimuovere sezioni nel referto
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Sparkle animation
const sparkleAnimation = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @keyframes sparkle-pulse {
    0% { 
      transform: scale(1) rotate(0deg); 
      opacity: 1; 
    }
    50% { 
      transform: scale(1.2) rotate(180deg); 
      opacity: 0.8; 
    }
    100% { 
      transform: scale(1) rotate(360deg); 
      opacity: 1; 
    }
  }
  
  .ai-sparkle { 
    animation: sparkle-pulse 2s ease-in-out infinite;
    display: inline-block;
    filter: drop-shadow(0 0 4px rgba(251, 191, 36, 0.6));
  }
`;

// Styles
const styles = {
  container: {
    padding: '24px',
    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(147, 197, 253, 0.1) 100%)',
    borderRadius: '16px',
    border: '1px solid rgba(59, 130, 246, 0.2)'
  },
  loadingBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '16px',
    color: '#3b82f6',
    fontSize: '14px'
  },
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(59, 130, 246, 0.3)',
    borderTop: '2px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '600',
    color: '#1d4ed8'
  },
  voiceButton: {
    padding: '10px 18px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
    transition: 'all 0.3s ease'
  },
  sparkle: {
    display: 'inline-block',
    fontSize: '16px'
  },
  saveButton: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)',
    transition: 'all 0.3s ease',
    minWidth: '160px',
    justifyContent: 'center'
  },
  buttonSpinner: {
    width: '16px',
    height: '16px',
    border: '2px solid #ffffff40',
    borderTop: '2px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    display: 'inline-block'
  },
  message: {
    padding: '10px 15px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid',
    fontSize: '14px',
    fontWeight: '500'
  },
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: '20px',
    alignItems: 'start'
  },
  mainReferto: {
    flex: 1
  },
  textarea: {
    width: '100%',
    height: '400px',
    padding: '20px',
    border: '2px solid',
    borderRadius: '12px',
    fontSize: '16px',
    fontFamily: 'inherit',
    lineHeight: '1.8',
    resize: 'vertical',
    transition: 'all 0.3s ease',
    boxSizing: 'border-box'
  },
  sectionsSidebar: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid rgba(59, 130, 246, 0.15)',
    minHeight: '400px',
    display: 'flex',
    flexDirection: 'column'
  },
  sidebarTitle: {
    margin: '0 0 16px 0',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  sidebarLoading: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    color: '#6b7280',
    fontSize: '13px'
  },
  smallSpinner: {
    width: '24px',
    height: '24px',
    border: '2px solid #e5e7eb',
    borderTop: '2px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  noSections: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    color: '#9ca3af'
  },
  noSectionsIcon: {
    fontSize: '32px',
    margin: '0 0 8px 0'
  },
  noSectionsText: {
    fontSize: '13px',
    margin: 0,
    lineHeight: '1.4'
  },
  sectionsButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flex: 1
  },
  sectionButton: {
    width: '100%',
    padding: '12px 14px',
    border: '2px solid',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s ease',
    fontFamily: 'monospace',
    textAlign: 'left'
  },
  sectionButtonInactive: {
    backgroundColor: 'white',
    borderColor: '#d1d5db',
    color: '#374151'
  },
  sectionButtonActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
    color: '#1e40af',
    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.2)'
  },
  sectionButtonIcon: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: 'currentColor',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    flexShrink: 0
  },
  sectionButtonText: {
    flex: 1,
    fontSize: '12px'
  },
  sidebarHint: {
    marginTop: '12px',
    padding: '8px',
    fontSize: '11px',
    color: '#6b7280',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    textAlign: 'center',
    lineHeight: '1.4'
  }
};

export default RefertoSection;


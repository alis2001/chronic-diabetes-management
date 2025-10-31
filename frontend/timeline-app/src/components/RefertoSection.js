// frontend/timeline-app/src/components/RefertoSection.js
// Referto Section with Additional Sections Sidebar - Clean Separation

import React, { useState, useEffect, useRef } from 'react';
import { timelineAPI, doctorPhrasesAPI } from '../api';
import VoiceTranscriptionButton from './VoiceTranscriptionButton';

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

  // Frasario state
  const [phrases, setPhrases] = useState([]);
  const [loadingPhrases, setLoadingPhrases] = useState(false);
  const [usedPhrases, setUsedPhrases] = useState(new Set());
  const [newPhraseText, setNewPhraseText] = useState('');
  const [addingPhrase, setAddingPhrase] = useState(false);
  const [showAddPhrase, setShowAddPhrase] = useState(false);
  const [currentCronoscitaIdForPhrases, setCurrentCronoscitaIdForPhrases] = useState(cronoscitaId);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef(null);

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

  // Load phrases for current doctor and cronoscita
  useEffect(() => {
    if (doctorId && currentCronoscitaIdForPhrases) {
      loadPhrases();
    }
  }, [doctorId, currentCronoscitaIdForPhrases]);

  // Detect which phrases are used in the referto text
  useEffect(() => {
    detectUsedPhrases();
  }, [referto, phrases]);

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
      
      // Convert all section names to Title Case for display
      const sectionsWithTitleCase = (sections || []).map(section => ({
        ...section,
        section_name: toTitleCase(section.section_name)
      }));
      
      setAvailableSections(sectionsWithTitleCase);
      console.log('✅ Loaded', sectionsWithTitleCase.length, 'additional sections');
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
      
      // Revert to default Cronoscita phrases
      if (currentCronoscitaIdForPhrases !== cronoscitaId) {
        console.log('↩️ Section removed → Reverting to default visit Cronoscita phrases');
        setCurrentCronoscitaIdForPhrases(cronoscitaId);
      }
    } else {
      // ✅ ALWAYS add new section at the END with ONE empty line
      let newText;
      
      if (!referto.trim()) {
        // Empty referto - just add the section
        newText = `${sectionHeader} `;
      } else {
        // Add section at the very end, one empty line before it
        // Remove any trailing whitespace first
        const trimmedReferto = referto.trimEnd();
        newText = `${trimmedReferto}\n\n${sectionHeader} `;
      }
      
      setReferto(newText);
      setActiveSections(prev => new Set([...prev, section.id]));
      
      // ✅ Switch to linked Cronoscita phrases for this section
      if (section.linked_cronoscita_id && section.linked_cronoscita_id !== currentCronoscitaIdForPhrases) {
        console.log('🎯 Section added:', section.section_name, '→ Switching to linked Cronoscita phrases');
        setCurrentCronoscitaIdForPhrases(section.linked_cronoscita_id);
      }
      
      // Focus textarea and position cursor on the new section line
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          // Position cursor right after the section header
          const headerPos = newText.indexOf(sectionHeader) + sectionHeader.length + 1;
          textareaRef.current.setSelectionRange(headerPos, headerPos);
        }
      }, 0);
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
    
    // Don't auto-detect zone on text change - let user type freely in current zone
    // Zone detection only happens on explicit cursor movements (click, arrow keys)
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
        setSaveMessage('✅ Valutazione salvata con successo!');
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
      setSaveMessage('❌ Errore nel salvataggio della valutazione');
    } finally {
      setSaving(false);
    }
  };

  const canSave = referto.trim().length > 0 && !isReadOnly;

  // Voice transcription state
  const [voiceTranscriptionStatus, setVoiceTranscriptionStatus] = useState({
    isConnected: false,
    isRecording: false,
    isProcessing: false,
    error: null,
    status: 'disconnected'
  });

  const handleVoiceTranscriptionUpdate = React.useCallback((status) => {
    setVoiceTranscriptionStatus(status);
  }, []);

  // Refs to track partial text replacement
  const lastPartialTextRef = React.useRef('');
  const lastInsertionPositionRef = React.useRef({ start: 0, end: 0 });

  const handleVoiceTranscriptionTextInsert = React.useCallback((text, isPartial = false) => {
    if (isReadOnly) return;
    
    // SIMPLE: Just append every transcription to the end of the text
    setReferto(prevReferto => {
      const needsSpace = prevReferto.length > 0 && !prevReferto.endsWith(' ') && !prevReferto.endsWith('\n');
      const spacePrefix = needsSpace ? ' ' : '';
      return prevReferto + spacePrefix + text;
    });
    
    setIsDirty(true);
    console.log('🎤 Voice transcription added:', text);
  }, [isReadOnly]);

  // ===========================
  // FRASARIO FUNCTIONS
  // ===========================

  const toTitleCase = (str) => {
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const loadPhrases = async () => {
    setLoadingPhrases(true);
    try {
      const response = await doctorPhrasesAPI.getPhrases(doctorId, currentCronoscitaIdForPhrases);
      const loadedPhrases = response.phrases || [];
      
      console.log('✅ Loaded', loadedPhrases.length, 'phrases');
      loadedPhrases.forEach((phrase, idx) => {
        console.log(`  Phrase ${idx + 1}:`, phrase.phrase_text);
      });
      
      // Convert all phrases to Title Case for display and insertion
      const titleCasePhrases = loadedPhrases.map(phrase => ({
        ...phrase,
        phrase_text: toTitleCase(phrase.phrase_text)
      }));
      
      setPhrases(titleCasePhrases);
    } catch (error) {
      console.error('❌ Error loading phrases:', error);
      setPhrases([]);
    } finally {
      setLoadingPhrases(false);
    }
  };

  const detectUsedPhrases = () => {
    const used = new Set();
    phrases.forEach(phrase => {
      if (referto.includes(phrase.phrase_text)) {
        used.add(phrase.id);
      }
    });
    setUsedPhrases(used);
  };

  const handlePhraseClick = async (phrase) => {
    if (isReadOnly) return;

    // Insert phrase at cursor position with automatic space after
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = referto.substring(0, start);
    const after = referto.substring(end);
    
    console.log('📝 Inserting phrase:', phrase.phrase_text);
    console.log('📍 Cursor position:', start, 'to', end);
    console.log('📄 Before:', before.substring(Math.max(0, before.length - 20)));
    console.log('📄 After:', after.substring(0, 20));
    
    // Always add a space after the phrase
    const phraseWithSpace = phrase.phrase_text + ' ';
    const newText = before + phraseWithSpace + after;
    
    console.log('✅ New text with phrase:', newText.substring(start - 20, start + phraseWithSpace.length + 20));
    
    setReferto(newText);
    setIsDirty(true);

    // Update usage count
    try {
      await doctorPhrasesAPI.updatePhraseUsage(phrase.id);
    } catch (error) {
      console.error('Error updating phrase usage:', error);
    }

    // Focus textarea and set cursor position (after the space)
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + phraseWithSpace.length;
      console.log('🎯 Setting cursor to position:', newPosition);
      textarea.setSelectionRange(newPosition, newPosition);
      
      // Don't recalculate zone - stay in current zone after inserting phrase
      // User can click or use arrow keys to change zones
    }, 0);
  };

  const handleAddPhrase = async () => {
    if (!newPhraseText.trim()) return;

    setAddingPhrase(true);
    try {
      // Convert to Title Case (First Letter Of Each Word Capitalized)
      const titleCasePhrase = toTitleCase(newPhraseText.trim());
      
      await doctorPhrasesAPI.createPhrase(
        doctorId,
        currentCronoscitaIdForPhrases,
        titleCasePhrase
      );
      setNewPhraseText('');
      setShowAddPhrase(false);
      await loadPhrases(); // Reload phrases
      console.log('✅ Phrase added successfully');
    } catch (error) {
      console.error('❌ Error adding phrase:', error);
      alert('Errore durante l\'aggiunta della frase');
    } finally {
      setAddingPhrase(false);
    }
  };

  const detectCurrentZone = (textarea) => {
    if (isReadOnly) return;
    
    const cursorPos = textarea.selectionStart;
    setCursorPosition(cursorPos);

    console.log('🔍 DETECTING ZONE - Cursor at position:', cursorPos);
    console.log('📄 Current referto length:', referto.length);
    console.log('📋 Available sections:', availableSections.length);

    // ===== ZONE-BASED DETECTION =====
    // Search for each configured section by its exact name
    const sections = [];
    
    console.log(`  🔎 Searching for ${availableSections.length} configured sections in text...`);
    
    availableSections.forEach(section => {
      // Look for the section header (section_name followed by colon)
      const searchPattern = `${section.section_name}:`;
      const sectionStartPos = referto.indexOf(searchPattern);
      
      console.log(`  🔍 Looking for: "${searchPattern}"`);
      console.log(`  📍 Found at position: ${sectionStartPos}`);
      
      if (sectionStartPos !== -1 && section.linked_cronoscita_id) {
        console.log(`  ✅ Matched section: "${section.section_name}" at position ${sectionStartPos}`);
        sections.push({
          cronoscitaName: section.section_name,
          cronoscitaId: section.linked_cronoscita_id,
          startPos: sectionStartPos,
          sectionId: section.id
        });
      } else if (sectionStartPos === -1) {
        console.log(`  ❌ Section "${section.section_name}" not found in text`);
      }
    });

    console.log('📊 Total sections found:', sections.length);

    // Sort sections by position
    sections.sort((a, b) => a.startPos - b.startPos);

    // Determine which section zone the cursor is in
    let currentZoneCronoscitaId = cronoscitaId; // Default
    let foundZone = false;
    
    for (let i = sections.length - 1; i >= 0; i--) {
      if (cursorPos >= sections[i].startPos) {
        // Cursor is in or after this section
        currentZoneCronoscitaId = sections[i].cronoscitaId;
        console.log(`🎯 Cursor in zone: ${sections[i].cronoscitaName} (pos: ${cursorPos} >= ${sections[i].startPos})`);
        foundZone = true;
        break;
      }
    }
    
    // If no section found, cursor is before all sections → use default
    if (!foundZone) {
      if (sections.length > 0 && cursorPos < sections[0].startPos) {
        console.log('📍 Cursor before all sections → Using default Cronoscita');
      } else {
        console.log('📍 No sections or cursor at end → Using default Cronoscita');
      }
    }

    console.log(`🔷 Current zone Cronoscita ID: ${currentZoneCronoscitaId}`);
    console.log(`🔶 Previously showing phrases for: ${currentCronoscitaIdForPhrases}`);

    // Update phrases if zone changed
    if (currentZoneCronoscitaId !== currentCronoscitaIdForPhrases) {
      console.log(`🔄 Zone changed → Switching phrases from ${currentCronoscitaIdForPhrases} to ${currentZoneCronoscitaId}`);
      setCurrentCronoscitaIdForPhrases(currentZoneCronoscitaId);
    } else {
      console.log(`✓ Zone unchanged → Keeping current phrases`);
    }
  };

  const handleTextareaClick = (e) => {
    detectCurrentZone(e.target);
  };

  const handleTextareaKeyUp = (e) => {
    // Only detect zone on arrow keys (navigation), not on regular typing
    const isArrowKey = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key);
    
    if (isArrowKey) {
      detectCurrentZone(e.target);
    }
  };

  return (
    <div style={styles.container}>
      <style>{sparkleAnimation}</style>

      {/* Loading State */}
      {loadingExistingReferto && (
        <div style={styles.loadingBanner}>
          <div style={styles.spinner}></div>
          Caricamento valutazione esistente...
        </div>
      )}

      {/* Header with Voice Button and Save Button */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h3 style={styles.title}>
            Valutazione {patologia ? patologia.toUpperCase() : ''}
          </h3>
          
          {/* Voice Transcription Button - next to title */}
          {!isReadOnly && (
            <VoiceTranscriptionButton
              doctorId={doctorId}
              patientCf={patientId}
              cronoscitaId={cronoscitaId}
              textAreaRef={textareaRef}
              onTranscriptionUpdate={handleVoiceTranscriptionUpdate}
              onTextInsert={handleVoiceTranscriptionTextInsert}
              style={{
                ...styles.voiceButton,
                marginLeft: '20px'
              }}
            />
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
            <>💾 Salva Valutazione</>
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
            ref={textareaRef}
            value={referto}
            onChange={handleRefertoChange}
            onClick={handleTextareaClick}
            onKeyUp={handleTextareaKeyUp}
            readOnly={isReadOnly}
            placeholder={
              isReadOnly 
                ? "🔒 Valutazione bloccata - Il prossimo appuntamento è stato programmato" 
                : "Inserisci qui la valutazione medica del paziente..."
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
            Menu Sezioni
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
              💡 Clicca per aggiungere/rimuovere sezioni nella valutazione
            </div>
          )}
        </div>
      </div>

      {/* Frasario Section - Full Width Below Textarea and Sidebar */}
      {!isReadOnly && (
        <div style={styles.frasarioContainer}>
          <div style={styles.frasarioHeader}>
            <h4 style={styles.frasarioTitle}>
              📝 Frasario
            </h4>
            <button
              onClick={() => setShowAddPhrase(!showAddPhrase)}
              style={styles.addPhraseToggle}
              title="Aggiungi nuova frase"
            >
              {showAddPhrase ? '✖' : '+ Frase'}
            </button>
          </div>

          {/* Add New Phrase Form */}
          {showAddPhrase && (
            <div style={styles.addPhraseForm}>
              <input
                type="text"
                value={newPhraseText}
                onChange={(e) => setNewPhraseText(toTitleCase(e.target.value))}
                placeholder="Inserisci Nuova Frase..."
                style={styles.addPhraseInput}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddPhrase();
                  }
                }}
                disabled={addingPhrase}
              />
              <button
                onClick={handleAddPhrase}
                disabled={!newPhraseText.trim() || addingPhrase}
                style={{
                  ...styles.addPhraseButton,
                  opacity: (!newPhraseText.trim() || addingPhrase) ? 0.5 : 1,
                  cursor: (!newPhraseText.trim() || addingPhrase) ? 'not-allowed' : 'pointer'
                }}
              >
                {addingPhrase ? '⏳' : '✓'}
              </button>
            </div>
          )}

          {/* Phrases List */}
          <div style={styles.phrasesList}>
            {loadingPhrases ? (
              <div style={styles.phrasesLoading}>
                <div style={styles.smallSpinner}></div>
                Caricamento frasi...
              </div>
            ) : phrases.length === 0 ? (
              <div style={styles.noPhrases}>
                Nessuna frase salvata
              </div>
            ) : (
              phrases
                .filter(phrase => !usedPhrases.has(phrase.id))
                .map(phrase => (
                  <button
                    key={phrase.id}
                    onClick={() => handlePhraseClick(phrase)}
                    style={styles.phraseButton}
                    title={`Usata ${phrase.usage_count || 0} volte`}
                  >
                    {phrase.phrase_text}
                  </button>
                ))
            )}
          </div>

          {phrases.length > 0 && usedPhrases.size > 0 && (
            <div style={styles.frasarioHint}>
              💡 {usedPhrases.size} frase{usedPhrases.size > 1 ? 'i' : ''} già utilizzat{usedPhrases.size > 1 ? 'e' : 'a'} nella valutazione
            </div>
          )}
        </div>
      )}
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
    letterSpacing: '0.5px',
    textAlign: 'center'
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
  },
  // Frasario Styles
  frasarioContainer: {
    marginTop: '16px',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    border: '1px solid #e5e7eb'
  },
  frasarioHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  frasarioTitle: {
    margin: 0,
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937'
  },
  addPhraseToggle: {
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: '500',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  addPhraseForm: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px'
  },
  addPhraseInput: {
    flex: 1,
    padding: '8px 12px',
    fontSize: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontFamily: 'monospace'
  },
  addPhraseButton: {
    padding: '8px 16px',
    fontSize: '14px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  phrasesList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    minHeight: '60px',
    maxHeight: '200px',
    overflowY: 'auto',
    padding: '8px',
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #e5e7eb'
  },
  phraseButton: {
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: '500',
    backgroundColor: 'white',
    color: '#374151',
    border: '2px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontFamily: 'monospace',
    whiteSpace: 'nowrap'
  },
  phrasesLoading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    color: '#6b7280',
    fontSize: '12px',
    width: '100%',
    padding: '20px'
  },
  noPhrases: {
    width: '100%',
    textAlign: 'center',
    padding: '20px',
    color: '#9ca3af',
    fontSize: '12px'
  },
  frasarioHint: {
    marginTop: '8px',
    padding: '6px',
    fontSize: '11px',
    color: '#6b7280',
    backgroundColor: '#fef3c7',
    borderRadius: '4px',
    textAlign: 'center'
  }
};

export default RefertoSection;


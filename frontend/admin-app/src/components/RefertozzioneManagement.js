// frontend/admin-app/src/components/RefertozzioneManagement.js
// Refertazione Management Component - WITH TWO TABS (Sezioni | Frasario)

import React, { useState, useEffect } from 'react';
import { adminAPI } from '../api';

const RefertozzioneManagement = ({ cronoscita }) => {
  // Tab state
  const [activeTab, setActiveTab] = useState('sezioni');
  
  // Sezioni tab state
  const [sections, setSections] = useState([]);
  const [availableCronoscita, setAvailableCronoscita] = useState([]);
  const [selectedCronoscitaId, setSelectedCronoscitaId] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState(null);
  const [draggedIndex, setDraggedIndex] = useState(null);
  
  // Frasario tab state
  const [phrases, setPhrases] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedFrasarioCronoscitaId, setSelectedFrasarioCronoscitaId] = useState('');
  const [newPhrase, setNewPhrase] = useState('');
  const [phraseToDelete, setPhraseToDelete] = useState(null);
  const [showPhrasesDeleteModal, setShowPhrasesDeleteModal] = useState(false);
  const [draggedPhraseIndex, setDraggedPhraseIndex] = useState(null);
  
  // Shared state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Load data based on active tab
  useEffect(() => {
    if (cronoscita && cronoscita.id) {
      if (activeTab === 'sezioni') {
        loadSections();
        loadAvailableCronoscita();
      } else if (activeTab === 'frasario') {
        loadAvailableCronoscita();
        // Auto-reload doctors if cronoscita is selected
        if (selectedFrasarioCronoscitaId) {
          loadDoctorsForCronoscita(selectedFrasarioCronoscitaId);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cronoscita, activeTab]);

  // Load doctors when Cronoscita is selected in Frasario (and reload on every change)
  useEffect(() => {
    if (activeTab === 'frasario' && selectedFrasarioCronoscitaId) {
      loadDoctorsForCronoscita(selectedFrasarioCronoscitaId);
      setSelectedDoctorId(''); // Reset doctor selection when cronoscita changes
      setPhrases([]); // Clear phrases
      
      // Auto-reload doctors every 10 seconds while in Frasario tab for dynamic updates
      const interval = setInterval(() => {
        if (selectedFrasarioCronoscitaId) {
          console.log('🔄 Auto-reloading doctors for Cronoscita...');
          loadDoctorsForCronoscita(selectedFrasarioCronoscitaId, true); // keepSelection=true
        }
      }, 10000); // 10 seconds - responsive to new doctor enrollments
      
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFrasarioCronoscitaId]);

  // Load phrases when both doctor and cronoscita are selected
  useEffect(() => {
    if (activeTab === 'frasario' && selectedDoctorId && selectedFrasarioCronoscitaId) {
      loadPhrases();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDoctorId, selectedFrasarioCronoscitaId]);

  // ================================
  // DATA LOADING FUNCTIONS
  // ================================

  const loadAvailableCronoscita = async () => {
    try {
      const response = await adminAPI.getCronoscitaList();
      
      if (response.success && response.cronoscita) {
        setAvailableCronoscita(response.cronoscita);
      }
    } catch (err) {
      console.error('Error loading cronoscita list:', err);
    }
  };

  const loadSections = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await adminAPI.getRefertoSectionsForCronoscita(cronoscita.id);
      
      if (response.success) {
        const sortedSections = (response.sections || []).sort((a, b) => a.display_order - b.display_order);
        setSections(sortedSections);
      } else {
        setError('Errore nel caricamento delle sezioni');
      }
    } catch (err) {
      console.error('Error loading referto sections:', err);
      setError(err.message || 'Errore nel caricamento delle sezioni');
    } finally {
      setLoading(false);
    }
  };

  const loadDoctorsForCronoscita = async (cronoscitaId, keepSelection = false) => {
    try {
      // Find the cronoscita name from the selected ID
      const selectedCronoscita = availableCronoscita.find(c => c.id === cronoscitaId);
      
      if (!selectedCronoscita) {
        console.warn('⚠️ Cronoscita not found');
        setDoctors([]);
        return;
      }
      
      const cronoscitaName = selectedCronoscita.nome;
      
      console.log('📡 Loading doctors for Cronoscita ID:', cronoscitaId);
      
      // Use NEW API to get doctors from doctors collection
      const response = await adminAPI.getDoctorsByCronoscita(cronoscitaId);
      
      console.log('👨‍⚕️ Doctors response:', response);
      
      if (response.success && response.doctors) {
        console.log('✅ Loaded', response.doctors.length, 'doctors for', cronoscitaName);
        
        // If keepSelection=true and currently selected doctor not in new list, clear selection
        if (keepSelection && selectedDoctorId) {
          const doctorStillExists = response.doctors.some(d => d.codice_medico === selectedDoctorId);
          if (!doctorStillExists) {
            console.log('⚠️ Selected doctor no longer in list, clearing selection');
            setSelectedDoctorId('');
            setPhrases([]);
          }
        }
        
        setDoctors(response.doctors);
      } else {
        setDoctors([]);
      }
    } catch (err) {
      console.error('Error loading doctors:', err);
      setDoctors([]);
    }
  };

  const loadPhrases = async () => {
    setLoading(true);
    try {
      console.log('📡 Loading phrases for:', {
        doctor: selectedDoctorId,
        cronoscita: selectedFrasarioCronoscitaId
      });
      
      const response = await adminAPI.getDoctorPhrases(selectedDoctorId, selectedFrasarioCronoscitaId);
      
      if (response.success && response.phrases) {
        console.log('✅ Loaded', response.phrases.length, 'phrases');
        setPhrases(response.phrases);
      } else {
        setPhrases([]);
      }
    } catch (err) {
      console.error('Error loading phrases:', err);
      setPhrases([]);
    } finally {
      setLoading(false);
    }
  };

  // ================================
  // SEZIONI TAB HANDLERS
  // ================================

  const generateSectionCode = (name) => {
    return name
      .toUpperCase()
      .replace(/\s+/g, '_')
      .replace(/[^A-Z0-9_]/g, '')
      .substring(0, 50);
  };

  const handleAddSection = async () => {
    if (!selectedCronoscitaId) {
      setError('Seleziona una Cronoscita per creare la sezione');
      return;
    }

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const selectedCronoscita = availableCronoscita.find(c => c.id === selectedCronoscitaId);
      
      if (!selectedCronoscita) {
        setError('Cronoscita selezionata non trovata');
        setLoading(false);
        return;
      }
      
      // Convert to Title Case: "Valutazione Ortopedia" instead of "VALUTAZIONE ORTOPEDIA"
      const cronoscitaNameTitleCase = selectedCronoscita.nome
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      const sectionName = `Valutazione ${cronoscitaNameTitleCase}`;
      const sectionCode = generateSectionCode(sectionName);
      const maxOrder = sections.length > 0 ? Math.max(...sections.map(s => s.display_order)) : 0;
      
      const sectionData = {
        cronoscita_id: cronoscita.id,
        linked_cronoscita_id: selectedCronoscitaId,
        section_name: sectionName,
        section_code: sectionCode,
        description: '',
        display_order: maxOrder + 1,
        is_required: false,
        is_active: true
      };

      const response = await adminAPI.createRefertoSection(sectionData);

      if (response.success) {
        setSuccess('✅ Sezione aggiunta con successo!');
        setSelectedCronoscitaId('');
        loadSections();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.message || 'Errore nella creazione della sezione');
      }
    } catch (err) {
      console.error('Error creating section:', err);
      setError(err.message || 'Errore nella creazione della sezione');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (section) => {
    setSectionToDelete(section);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const response = await adminAPI.deleteRefertoSection(sectionToDelete.id, true);

      if (response.success) {
        setSuccess('✅ Sezione eliminata!');
        setShowDeleteModal(false);
        setSectionToDelete(null);
        loadSections();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.message || 'Errore nell\'eliminazione');
      }
    } catch (err) {
      console.error('Error deleting section:', err);
      setError(err.message || 'Errore nell\'eliminazione');
    } finally {
      setLoading(false);
    }
  };

  // Drag handlers for sections
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.target.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedIndex(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      return;
    }

    const newSections = [...sections];
    const draggedSection = newSections[draggedIndex];
    
    newSections.splice(draggedIndex, 1);
    newSections.splice(dropIndex, 0, draggedSection);
    
    setSections(newSections);
    
    try {
      const updatePromises = newSections.map((section, index) => {
        return adminAPI.updateRefertoSection(section.id, {
          display_order: index + 1
        });
      });
      
      await Promise.all(updatePromises);
      setSuccess('✅ Ordine aggiornato!');
      setTimeout(() => setSuccess(null), 3000);
      
      loadSections();
    } catch (err) {
      console.error('Error updating order:', err);
      setError('Errore nell\'aggiornamento dell\'ordine');
      loadSections();
    }
  };

  // ================================
  // FRASARIO TAB HANDLERS
  // ================================

  const handleAddPhrase = async () => {
    if (!newPhrase.trim()) {
      setError('La frase è obbligatoria');
      return;
    }

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const phraseData = {
        codice_medico: selectedDoctorId,
        cronoscita_id: selectedFrasarioCronoscitaId,
        phrase_text: newPhrase.trim()
      };

      const response = await adminAPI.createDoctorPhrase(phraseData);

      if (response.success) {
        setSuccess('✅ Frase aggiunta con successo!');
        setNewPhrase('');
        loadPhrases();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.message || 'Errore nella creazione della frase');
      }
    } catch (err) {
      console.error('Error creating phrase:', err);
      setError(err.message || 'Errore nella creazione della frase');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePhrase = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const response = await adminAPI.deleteDoctorPhrase(phraseToDelete.id);

      if (response.success) {
        setSuccess('✅ Frase eliminata!');
        setShowPhrasesDeleteModal(false);
        setPhraseToDelete(null);
        loadPhrases();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.message || 'Errore nell\'eliminazione');
      }
    } catch (err) {
      console.error('Error deleting phrase:', err);
      setError(err.message || 'Errore nell\'eliminazione');
    } finally {
      setLoading(false);
    }
  };

  // Drag handlers for phrases
  const handlePhraseDragStart = (e, index) => {
    setDraggedPhraseIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.target.style.opacity = '0.5';
  };

  const handlePhraseDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedPhraseIndex(null);
  };

  const handlePhraseDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handlePhraseDrop = async (e, dropIndex) => {
    e.preventDefault();
    
    if (draggedPhraseIndex === null || draggedPhraseIndex === dropIndex) {
      return;
    }

    const newPhrases = [...phrases];
    const draggedPhrase = newPhrases[draggedPhraseIndex];
    
    newPhrases.splice(draggedPhraseIndex, 1);
    newPhrases.splice(dropIndex, 0, draggedPhrase);
    
    setPhrases(newPhrases);
    
    try {
      // Update each phrase's display_order individually (same as sections)
      const updatePromises = newPhrases.map((phrase, index) => {
        return adminAPI.updateDoctorPhrase(phrase.id, {
          display_order: index + 1
        });
      });
      
      await Promise.all(updatePromises);
      setSuccess('✅ Ordine aggiornato!');
      setTimeout(() => setSuccess(null), 3000);
      
      loadPhrases();
    } catch (err) {
      console.error('Error updating phrase order:', err);
      setError('Errore nell\'aggiornamento dell\'ordine');
      loadPhrases(); // Reload to revert
    }
  };

  // ================================
  // RENDER SEZIONI TAB
  // ================================
  
  const renderSezioni = () => (
    <div>
      <div style={{marginBottom: '24px'}}>
        <h2 style={{margin: '0 0 8px 0', fontSize: '24px', fontWeight: '600'}}>
          ⚕️ Sezioni Valutazione Aggiuntive
        </h2>
        <p style={{margin: 0, color: '#666666'}}>
          Configurazione sezioni per <strong>{cronoscita?.nome_presentante || cronoscita?.nome}</strong>
        </p>
      </div>

      {/* Add New Section */}
      <div style={styles.addSection}>
        <div style={styles.selectWrapper}>
          <label style={styles.selectLabel}>VALUTAZIONE</label>
          <select
            value={selectedCronoscitaId}
            onChange={(e) => setSelectedCronoscitaId(e.target.value)}
            style={styles.cronoscitaSelect}
            disabled={loading}
          >
            <option value="">-- Seleziona Cronoscita --</option>
            {availableCronoscita.map(c => (
              <option key={c.id} value={c.id}>
                {c.nome} {c.id === cronoscita.id ? '(Corrente)' : ''}
              </option>
            ))}
          </select>
        </div>
        <button 
          style={styles.addButton}
          onClick={handleAddSection}
          disabled={loading || !selectedCronoscitaId}
        >
          + Aggiungi Sezione
        </button>
      </div>

      {/* Sections List */}
      {loading && sections.length === 0 ? (
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Caricamento...</p>
        </div>
      ) : sections.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyIcon}>📋</p>
          <p style={styles.emptyText}>Nessuna sezione configurata</p>
          <p style={styles.emptyHint}>Aggiungi la prima sezione sopra</p>
        </div>
      ) : (
        <div style={styles.sectionsList}>
          {sections.map((section, index) => (
            <div
              key={section.id}
              draggable={true}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              style={{
                ...styles.sectionRow,
                ...(draggedIndex === index ? styles.sectionRowDragging : {})
              }}
            >
              <div style={styles.dragHandle}>⋮⋮</div>
              <div style={styles.orderBadge}>{index + 1}</div>
              <div style={styles.sectionName}>
                {section.section_name}
                <span style={styles.linkedBadge}>
                  → {section.linked_cronoscita_nome}
                </span>
              </div>
              <div style={styles.actions}>
                <button
                  style={styles.deleteButton}
                  onClick={() => handleDeleteClick(section)}
                  title="Elimina"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ================================
  // RENDER FRASARIO TAB
  // ================================
  
  const renderFrasario = () => (
    <div>
      <div style={{marginBottom: '24px'}}>
        <h2 style={{margin: '0 0 8px 0', fontSize: '24px', fontWeight: '600'}}>
          📝 Gestione Frasario
        </h2>
        <p style={{margin: 0, color: '#666666'}}>
          Frasi predefinite per medici - organizzate per Cronoscita
        </p>
      </div>

      {/* Cronoscita and Doctor Selectors (Cronoscita FIRST) */}
      <div style={styles.filterSection}>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Cronoscita:</label>
          <select
            value={selectedFrasarioCronoscitaId}
            onChange={(e) => setSelectedFrasarioCronoscitaId(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="">-- Seleziona Cronoscita --</option>
            {availableCronoscita.map(c => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>
            Medico {selectedFrasarioCronoscitaId && doctors.length > 0 && `(${doctors.length})`}:
          </label>
          <select
            value={selectedDoctorId}
            onChange={(e) => setSelectedDoctorId(e.target.value)}
            style={styles.filterSelect}
            disabled={!selectedFrasarioCronoscitaId}
          >
            <option value="">
              {selectedFrasarioCronoscitaId ? '-- Seleziona Medico --' : '(Prima seleziona Cronoscita)'}
            </option>
            {doctors.map(doc => (
              <option key={doc.codice_medico} value={doc.codice_medico}>
                {doc.codice_medico} - {doc.nome_completo}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Add New Phrase */}
      {selectedDoctorId && selectedFrasarioCronoscitaId && (
        <div style={styles.addSection}>
          <input
            type="text"
            value={newPhrase}
            onChange={(e) => setNewPhrase(e.target.value.toUpperCase())}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleAddPhrase();
              }
            }}
            placeholder="Scrivi frase e premi Invio..."
            style={styles.phraseInput}
            disabled={loading}
          />
          <button 
            style={styles.addButton}
            onClick={handleAddPhrase}
            disabled={loading || !newPhrase.trim()}
          >
            + Aggiungi Frase
          </button>
        </div>
      )}

      {/* Phrases List */}
      {!selectedDoctorId || !selectedFrasarioCronoscitaId ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyIcon}>📝</p>
          <p style={styles.emptyText}>Seleziona Medico e Cronoscita per gestire le frasi</p>
        </div>
      ) : loading ? (
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Caricamento frasi...</p>
        </div>
      ) : phrases.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyIcon}>📋</p>
          <p style={styles.emptyText}>Nessuna frase configurata</p>
          <p style={styles.emptyHint}>Aggiungi la prima frase sopra</p>
        </div>
      ) : (
        <div style={styles.sectionsList}>
          {phrases.map((phrase, index) => (
            <div
              key={phrase.id}
              draggable={true}
              onDragStart={(e) => handlePhraseDragStart(e, index)}
              onDragEnd={handlePhraseDragEnd}
              onDragOver={handlePhraseDragOver}
              onDrop={(e) => handlePhraseDrop(e, index)}
              style={{
                ...styles.sectionRow,
                ...(draggedPhraseIndex === index ? styles.sectionRowDragging : {})
              }}
            >
              <div style={styles.dragHandle}>⋮⋮</div>
              <div style={styles.orderBadge}>{index + 1}</div>
              <div style={styles.sectionName}>{phrase.phrase_text}</div>
              <div style={styles.actions}>
                <button
                  style={styles.deleteButton}
                  onClick={() => {
                    setPhraseToDelete(phrase);
                    setShowPhrasesDeleteModal(true);
                  }}
                  title="Elimina"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ================================
  // MAIN RENDER
  // ================================
  
  return (
    <div style={styles.container}>
      {/* Error/Success Messages */}
      {error && (
        <div style={styles.errorBanner}>
          ❌ {error}
        </div>
      )}

      {success && (
        <div style={styles.successBanner}>
          {success}
        </div>
      )}

      {/* Tab Navigation */}
      <div style={styles.tabs}>
        {[
          {id: 'sezioni', label: 'Sezioni Valutazione', icon: '⚕️'},
          {id: 'frasario', label: 'Frasario', icon: '📝'}
        ].map(tab => (
          <button
            key={tab.id}
            style={{
              ...styles.tab,
              ...(activeTab === tab.id ? styles.activeTab : {})
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>
      
      {/* Tab Content */}
      {activeTab === 'sezioni' && renderSezioni()}
      {activeTab === 'frasario' && renderFrasario()}
      
      {/* Delete Confirmation Modal - Sezioni */}
      {showDeleteModal && sectionToDelete && (
        <div style={styles.modalOverlay} onClick={() => setShowDeleteModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3>⚠️ Conferma Eliminazione</h3>
            </div>
            <div style={styles.modalBody}>
              <p>
                Eliminare definitivamente la sezione <strong>{sectionToDelete.section_name}</strong>?
              </p>
              <p style={styles.warningText}>
                ⚠️ Questa azione non può essere annullata. La sezione verrà rimossa permanentemente.
              </p>
            </div>
            <div style={styles.modalFooter}>
              <button 
                style={styles.modalCancelButton}
                onClick={() => setShowDeleteModal(false)}
              >
                Annulla
              </button>
              <button 
                style={styles.modalDeleteButton}
                onClick={handleConfirmDelete}
                disabled={loading}
              >
                {loading ? 'Eliminazione...' : 'Elimina'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal - Phrases */}
      {showPhrasesDeleteModal && phraseToDelete && (
        <div style={styles.modalOverlay} onClick={() => setShowPhrasesDeleteModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3>⚠️ Conferma Eliminazione</h3>
            </div>
            <div style={styles.modalBody}>
              <p>
                Eliminare definitivamente la frase <strong>{phraseToDelete.phrase_text}</strong>?
              </p>
              <p style={styles.warningText}>
                ⚠️ Questa azione non può essere annullata.
              </p>
            </div>
            <div style={styles.modalFooter}>
              <button 
                style={styles.modalCancelButton}
                onClick={() => setShowPhrasesDeleteModal(false)}
              >
                Annulla
              </button>
              <button 
                style={styles.modalDeleteButton}
                onClick={handleDeletePhrase}
                disabled={loading}
              >
                {loading ? 'Eliminazione...' : 'Elimina'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Styles
const styles = {
  container: {
    padding: '20px',
    backgroundColor: '#f9fafb',
    minHeight: '500px'
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    borderBottom: '2px solid #e5e7eb',
    paddingBottom: '0'
  },
  tab: {
    padding: '12px 24px',
    border: 'none',
    backgroundColor: 'transparent',
    fontSize: '15px',
    fontWeight: '500',
    cursor: 'pointer',
    borderBottom: '3px solid transparent',
    transition: 'all 0.2s',
    color: '#6b7280'
  },
  activeTab: {
    color: '#0ea5e9',
    borderBottom: '3px solid #0ea5e9'
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '16px',
    border: '1px solid #fecaca'
  },
  successBanner: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '16px',
    border: '1px solid #a7f3d0'
  },
  filterSection: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '24px',
    padding: '16px',
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #e5e7eb'
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  filterLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  filterSelect: {
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontWeight: '500',
    color: '#1f2937',
    backgroundColor: '#f9fafb',
    cursor: 'pointer'
  },
  addSection: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
    alignItems: 'center'
  },
  selectWrapper: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 16px',
    border: '2px solid #d1d5db',
    borderRadius: '8px',
    backgroundColor: 'white'
  },
  selectLabel: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#374151',
    fontFamily: 'monospace',
    whiteSpace: 'nowrap'
  },
  cronoscitaSelect: {
    flex: 1,
    padding: '8px 12px',
    fontSize: '15px',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    fontWeight: '500',
    color: '#1f2937',
    backgroundColor: '#f9fafb',
    cursor: 'pointer',
    fontFamily: 'monospace'
  },
  phraseInput: {
    flex: 1,
    padding: '14px 16px',
    fontSize: '15px',
    border: '2px solid #d1d5db',
    borderRadius: '8px',
    fontFamily: 'inherit',
    fontWeight: '500'
  },
  addButton: {
    padding: '12px 24px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  loading: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#6b7280'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e5e7eb',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 16px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '2px dashed #e5e7eb'
  },
  emptyIcon: {
    fontSize: '48px',
    margin: '0 0 12px 0'
  },
  emptyText: {
    fontSize: '16px',
    color: '#374151',
    margin: '0 0 4px 0',
    fontWeight: '500'
  },
  emptyHint: {
    fontSize: '14px',
    color: '#9ca3af',
    margin: 0
  },
  sectionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  sectionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '2px solid #e5e7eb',
    cursor: 'grab',
    transition: 'all 0.2s'
  },
  sectionRowDragging: {
    opacity: 0.5,
    border: '2px dashed #3b82f6'
  },
  dragHandle: {
    fontSize: '20px',
    color: '#9ca3af',
    cursor: 'grab',
    userSelect: 'none'
  },
  orderBadge: {
    width: '32px',
    height: '32px',
    backgroundColor: '#3b82f6',
    color: 'white',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '600',
    flexShrink: 0
  },
  sectionName: {
    flex: 1,
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    fontFamily: 'monospace',
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  linkedBadge: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    padding: '4px 10px',
    borderRadius: '4px',
    fontFamily: 'monospace'
  },
  actions: {
    display: 'flex',
    gap: '8px'
  },
  deleteButton: {
    padding: '8px 12px',
    backgroundColor: '#fee2e2',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'all 0.2s'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '400px',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
  },
  modalHeader: {
    padding: '20px',
    borderBottom: '1px solid #e5e7eb'
  },
  modalBody: {
    padding: '20px'
  },
  modalFooter: {
    padding: '20px',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px'
  },
  modalCancelButton: {
    padding: '10px 20px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600'
  },
  modalDeleteButton: {
    padding: '10px 20px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600'
  },
  warningText: {
    color: '#d97706',
    fontSize: '14px',
    marginTop: '12px'
  }
};

export default RefertozzioneManagement;

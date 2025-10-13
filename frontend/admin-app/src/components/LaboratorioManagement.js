// STEP 5: COMPLETELY REPLACE your existing frontend/admin-app/src/components/LaboratorioManagement.js

// frontend/admin-app/src/components/LaboratorioManagement.js
// Updated LaboratorioManagement with Cronoscita support
import React, { useState, useEffect } from 'react';
import { adminAPI } from '../api';

const LaboratorioManagement = ({ cronoscita }) => {
  console.log('🔥 LABORATORIO COMPONENT LOADING - WITH CRONOSCITA:', cronoscita);
  
  const [activeTab, setActiveTab] = useState('catalog');
  const [loading, setLoading] = useState(false);
  
  const [showEditMappingModal, setShowEditMappingModal] = useState(false);
  const [editingMapping, setEditingMapping] = useState(null);

  // Data states
  const [catalog, setCatalog] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [catalogOptions, setCatalogOptions] = useState([]);

  // search varibales
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  // Modal states
  const [showAddExamModal, setShowAddExamModal] = useState(false);
  const [showAddMappingModal, setShowAddMappingModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [examToDelete, setExamToDelete] = useState(null);
  
  const [examForm, setExamForm] = useState({
    codice_catalogo: '',       
    codicereg: '',            
    nome_esame: '',           
    codice_branca: '',   
    descrizione: '',
    cronoscita_id: cronoscita?.id || ''           
  });
  
  const [mappingForm, setMappingForm] = useState({
    codice_catalogo: '',           
    selected_exam: null,           
    struttura_nome: '',           
    codoffering_wirgilio: '',     
    nome_esame_wirgilio: '',
    visualizza_nel_referto: '',
    cronoscita_id: cronoscita?.id || ''       
  });

  // Update forms when cronoscita changes
  useEffect(() => {
    if (cronoscita?.id) {
      setExamForm(prev => ({ ...prev, cronoscita_id: cronoscita.id }));
      setMappingForm(prev => ({ ...prev, cronoscita_id: cronoscita.id }));
    }
  }, [cronoscita?.id]);

  // Load data on component mount and tab changes
  useEffect(() => {
    if (!cronoscita?.id) return;
    
    console.log('🔄 Tab changed to:', activeTab, 'for Cronoscita:', cronoscita.nome);
    loadCatalogOptions();
    if (activeTab === 'catalog') loadCatalogData();
    if (activeTab === 'mappings') loadMappingsData();
  }, [activeTab, cronoscita?.id]);

  const loadCatalogOptions = async () => {
    if (!cronoscita?.id) return;
    
    try {
      console.log('📡 Loading catalog options for Cronoscita:', cronoscita.nome);
      const result = await adminAPI.getCatalogForMappingByCronoscita(cronoscita.id);
      console.log('✅ Catalog options loaded:', result);
      setCatalogOptions(result.options || []);
    } catch (error) {
      console.error('❌ Error loading catalog options:', error);
      setCatalogOptions([]);
    }
  };

  // ADD THIS NEW FUNCTION (around line 80-90)
  const handleSearchPrestazioni = async (searchValue) => {
    if (searchValue.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    
    try {
      setSearchLoading(true);
      console.log('🔍 Auto-searching prestazioni:', searchValue);
      
      const response = await adminAPI.get(`/dashboard/prestazioni/search?query=${searchValue}&limit=20`);
      
      if (response.success) {
        setSearchResults(response.prestazioni || []);
        setShowSearchResults(true);
        console.log('✅ Auto-search results:', response.prestazioni.length);
      }
    } catch (error) {
      console.error('❌ Auto-search error:', error);
      // Don't show alert for auto-search errors - just log them
    } finally {
      setSearchLoading(false);
    }
  };

  // ADD this new debounced search function (prevents too many API calls):
  const [searchTimeout, setSearchTimeout] = useState(null);

  const handleSearchInputChange = (value) => {
    setSearchQuery(value);
    
    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Set new timeout - search after user stops typing for 500ms
    const newTimeout = setTimeout(() => {
      handleSearchPrestazioni(value);
    }, 500);
    
    setSearchTimeout(newTimeout);
  };


  const handleSelectFromSearch = (prestazione) => {
    console.log('📋 Auto-filling from search result:', prestazione);
    
    setExamForm({
      ...examForm,
      codice_catalogo: String(prestazione.codice_catalogo || ''),
      codicereg: String(prestazione.codicereg || ''),
      nome_esame: String(prestazione.nome_esame || ''),
      codice_branca: String(prestazione.codice_branca || '') // Force string conversion
    });
    
    setShowSearchResults(false);
    setSearchQuery('');
  };

  const loadCatalogData = async () => {
    if (!cronoscita?.id) return;
    
    try {
      setLoading(true);
      console.log('📡 Loading catalog data for Cronoscita:', cronoscita.nome);
      const result = await adminAPI.getExamCatalogForCronoscita(cronoscita.id);
      console.log('✅ Catalog data loaded:', result);
      setCatalog(result.catalog || []);
    } catch (error) {
      console.error('❌ Error loading catalog data:', error);
      setCatalog([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMappingsData = async () => {
    if (!cronoscita?.id) return;
    
    try {
      setLoading(true);
      console.log('📡 Loading mappings data for Cronoscita:', cronoscita.nome);
      const result = await adminAPI.getExamMappingsForCronoscita(cronoscita.id);
      console.log('✅ Mappings data loaded:', result);
      setMappings(result.mappings || []);
    } catch (error) {
      console.error('❌ Error loading mappings data:', error);
      setMappings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExam = async (e) => {
    e.preventDefault();
    
    if (!cronoscita?.id) {
      alert('Errore: Cronicità non selezionata');
      return;
    }

    const sanitizedFormData = {
      ...examForm,
      codice_branca: String(examForm.codice_branca).trim(), // Force string and trim whitespace
      codice_catalogo: String(examForm.codice_catalogo).trim(),
      codicereg: String(examForm.codicereg).trim(),
      nome_esame: String(examForm.nome_esame).trim()
    };

    try {
      setLoading(true);
      console.log('📤 Creating exam for Cronoscita:', cronoscita.nome, examForm);
      
      const response = await adminAPI.createExamCatalog(examForm);
      console.log('✅ Exam created:', response);
      
      if (response.success) {
        alert(response.message);
        setShowAddExamModal(false);
        setExamForm({
          codice_catalogo: '',
          codicereg: '',
          nome_esame: '',
          codice_branca: '011',
          descrizione: '',
          cronoscita_id: cronoscita.id
        });
        await loadCatalogData();
        await loadCatalogOptions();
      }
    } catch (error) {
      console.error('❌ Error adding exam:', error);
      alert('Errore durante l\'aggiunta dell\'esame: ' + (error.message || error));
    } finally {
      setLoading(false);
    }
  };

  const handleAddMapping = async (e) => {
    e.preventDefault();
    
    if (!cronoscita?.id) {
      alert('Errore: Cronicità non selezionata');
      return;
    }
    
    if (!mappingForm.selected_exam) {
      alert('Seleziona un esame dal catalogo');
      return;
    }

    if (!mappingForm.visualizza_nel_referto) {
      alert('Seleziona se visualizzare l\'esame nel referto');
      return;
    }

    try {
      setLoading(true);
      console.log('📤 Creating mapping for Cronoscita:', cronoscita.nome, mappingForm);
      
      const mappingData = {
        codice_catalogo: mappingForm.selected_exam.codice_catalogo,
        cronoscita_id: cronoscita.id,
        struttura_nome: mappingForm.struttura_nome,
        codoffering_wirgilio: mappingForm.codoffering_wirgilio,
        nome_esame_wirgilio: mappingForm.nome_esame_wirgilio.toUpperCase(),
        visualizza_nel_referto: mappingForm.visualizza_nel_referto,  // NEW FIELD
        is_active: true
      };
      
      const response = await adminAPI.createExamMapping(mappingData);
      console.log('✅ Mapping created:', response);
      
      if (response.success) {
        alert(response.message);
        setShowAddMappingModal(false);
        setMappingForm({
          codice_catalogo: '',
          selected_exam: null,
          struttura_nome: '',
          codoffering_wirgilio: '',
          nome_esame_wirgilio: '',
          visualizza_nel_referto: '',
          cronoscita_id: cronoscita.id
        });
        await loadMappingsData();
        await loadCatalogData();
      }
    } catch (error) {
      console.error('❌ Error adding mapping:', error);
      
      // Handle validation conflicts (409 status)
      if (error.statusCode === 409) {
        const errorDetails = error.details || [];
        let errorMessage = 'Conflitto nella mappatura:\n\n';
        
        errorDetails.forEach((detail, index) => {
          errorMessage += `${index + 1}. ${detail}\n`;
        });
        
        alert(errorMessage);
      } else {
        alert('Errore durante la creazione mappatura: ' + (error.message || error));
      }
    } finally {
      setLoading(false);
    }

  };

  const handleEditMapping = (mapping) => {
    console.log('✏️ Edit mapping:', mapping);
    
    // Find the corresponding exam in catalogOptions
    const selectedExam = catalogOptions.find(exam => exam.codice_catalogo === mapping.codice_catalogo);
    
    // Populate form with existing data
    setMappingForm({
      codice_catalogo: mapping.codice_catalogo,
      selected_exam: selectedExam || null,
      struttura_nome: mapping.struttura_nome,
      codoffering_wirgilio: mapping.codoffering_wirgilio,
      nome_esame_wirgilio: mapping.nome_esame_wirgilio,
      visualizza_nel_referto: mapping.visualizza_nel_referto || 'S',
      cronoscita_id: cronoscita.id
    });
    
    setEditingMapping(mapping);
    setShowEditMappingModal(true);
  };

  const handleUpdateMapping = async (e) => {
    e.preventDefault();
    
    if (!editingMapping || !cronoscita?.id) {
      alert('Errore: Dati mancanti per l\'aggiornamento');
      return;
    }
    
    if (!mappingForm.selected_exam) {
      alert('Seleziona un esame dal catalogo');
      return;
    }
    
    if (!mappingForm.visualizza_nel_referto) {
      alert('Seleziona se visualizzare l\'esame nel referto');
      return;
    }

    try {
      setLoading(true);
      console.log('📝 Updating mapping:', editingMapping.id, mappingForm);
      
      const mappingData = {
        codice_catalogo: mappingForm.selected_exam.codice_catalogo,
        cronoscita_id: cronoscita.id,
        struttura_nome: mappingForm.struttura_nome,
        codoffering_wirgilio: mappingForm.codoffering_wirgilio,
        nome_esame_wirgilio: mappingForm.nome_esame_wirgilio.toUpperCase(),
        visualizza_nel_referto: mappingForm.visualizza_nel_referto,
        is_active: true
      };
      
      const response = await adminAPI.updateExamMapping(editingMapping.id, mappingData);
      console.log('✅ Mapping updated:', response);
      
      if (response.success) {
        alert(response.message);
        setShowEditMappingModal(false);
        setEditingMapping(null);
        setMappingForm({
          codice_catalogo: '',
          selected_exam: null,
          struttura_nome: '',
          codoffering_wirgilio: '',
          nome_esame_wirgilio: '',
          visualizza_nel_referto: '',
          cronoscita_id: cronoscita.id
        });
        await loadMappingsData();
        await loadCatalogData();
      }
    } catch (error) {
      console.error('❌ Error updating mapping:', error);
      
      // Handle validation conflicts (409 status)  
      if (error.statusCode === 409) {
        const errorDetails = error.details || [];
        let errorMessage = 'Conflitto durante aggiornamento:\n\n';
        
        errorDetails.forEach((detail, index) => {
          errorMessage += `${index + 1}. ${detail}\n`;
        });
        
        errorMessage += '\nCorreggi i conflitti e riprova.';
        alert(errorMessage);
      } else {
        alert('Errore durante l\'aggiornamento: ' + (error.message || error));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setShowEditMappingModal(false);
    setEditingMapping(null);
    setMappingForm({
      codice_catalogo: '',
      selected_exam: null,
      struttura_nome: '',
      codoffering_wirgilio: '',
      nome_esame_wirgilio: '',
      visualizza_nel_referto: '',
      cronoscita_id: cronoscita.id
    });
  };

  const handleDeleteClick = (exam) => {
    console.log('🗑️ Delete request for exam:', exam);
    setExamToDelete(exam);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!examToDelete) return;
    
    try {
      setLoading(true);
      console.log('🗑️ Deleting exam:', examToDelete.codice_catalogo);
      
      const result = await adminAPI.deleteExamCatalog(examToDelete.codice_catalogo, {
        cronoscita_id: cronoscita.id
      });
      
      console.log('✅ Exam deleted:', result);
      alert(`Esame "${examToDelete.nome_esame}" eliminato con successo!`);
      
      // Refresh the catalog data
      await loadCatalogData();
      
      // Close modal
      setShowDeleteModal(false);
      setExamToDelete(null);
      
    } catch (error) {
      console.error('❌ Error deleting exam:', error);
      alert(`Errore durante eliminazione: ${error.message || 'Errore sconosciuto'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setExamToDelete(null);
  };

  const handleDeleteMapping = async (mappingId, examName, structureName) => {
    if (!window.confirm(`Rimuovere la mappatura per l'esame "${examName}" dalla struttura "${structureName}"?\n\nDopo la rimozione, l'esame potrà essere mappato nuovamente.`)) {
      return;
    }
    
    try {
      setLoading(true);
      await adminAPI.delete(`/dashboard/laboratorio/mappings/${mappingId}`);
      
      await loadMappingsData();
      await loadCatalogData();
      
      alert('Mappatura rimossa con successo');
    } catch (error) {
      console.error('❌ Error deleting mapping:', error);
      alert('Errore durante la rimozione: ' + (error.message || error));
    } finally {
      setLoading(false);
    }
  };

  const renderExamSelector = () => (
    <div style={styles.formGroup}>
      <label style={styles.label}>Seleziona Esame dal Catalogo *</label>
      <select
        style={{
          ...styles.input,
          backgroundColor: mappingForm.selected_exam ? '#e8f5e8' : '#ffffff'
        }}
        value={mappingForm.selected_exam?.codice_catalogo || ''}
        onChange={(e) => {
          const selectedExam = catalogOptions.find(opt => opt.codice_catalogo === e.target.value);
          setMappingForm({
            ...mappingForm,
            selected_exam: selectedExam || null,
            codice_catalogo: selectedExam?.codice_catalogo || ''
          });
        }}
        required
      >
        <option value="">-- Seleziona esame --</option>
        {catalogOptions.map(exam => (
          <option key={exam.codice_catalogo} value={exam.codice_catalogo}>
            {exam.display}
          </option>
        ))}
      </select>
      {catalogOptions.length === 0 && (
        <p style={{fontSize: '12px', color: '#dc2626', margin: '4px 0 0 0'}}>
          ⚠️ Nessun esame disponibile nel catalogo. Aggiungi prima degli esami.
        </p>
      )}
    </div>
  );

  const renderCatalog = () => (
    <div>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px'}}>
        <div>
          <h2 style={{margin: '0 0 8px 0', fontSize: '24px', fontWeight: '600'}}>
            📋 Catalogo Esami
          </h2>
          <p style={{margin: 0, color: '#666666'}}>
            Gestione del catalogo esami per <strong>{cronoscita?.nome}</strong>
          </p>
        </div>
        <button 
          style={styles.addButton}
          onClick={() => setShowAddExamModal(true)}
          disabled={loading}
        >
          + Aggiungi Esame
        </button>
      </div>

      {loading ? (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Caricamento catalogo esami...</p>
        </div>
      ) : (
        <div style={styles.tableContainer}>
          <div style={styles.tableHeader}>
            <div style={styles.tableCell}>Codice</div>
            <div style={styles.tableCell}>Nome Esame</div>
            <div style={styles.tableCell}>Codice Reg</div>
            <div style={styles.tableCell}>Branca</div>
            <div style={styles.tableCell}>Mappings</div>
            <div style={styles.tableCell}>Stato</div>
            <div style={styles.tableCell}>Azioni</div>
          </div>
          
          {catalog.length === 0 ? (
            <div style={styles.emptyState}>
              <p>📋 Nessun esame nel catalogo di <strong>{cronoscita?.nome}</strong></p>
              <button 
                style={styles.buttonPrimary}
                onClick={() => setShowAddExamModal(true)}
              >
                Aggiungi Primo Esame
              </button>
            </div>
          ) : (
            catalog.map((exam, index) => (
              <div key={exam.id || index} style={{
                ...styles.tableRow,
                backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9f9f9'
              }}>
                <div style={styles.tableCell}>
                  <code style={{backgroundColor: '#f1f1f1', padding: '2px 6px', borderRadius: '4px'}}>
                    {exam.codice_catalogo}
                  </code>
                </div>
                <div style={styles.tableCell}>
                  <strong>{exam.nome_esame}</strong>
                  {exam.descrizione && (
                    <div style={{fontSize: '12px', color: '#666', marginTop: '4px'}}>
                      {exam.descrizione}
                    </div>
                  )}
                </div>
                <div style={styles.tableCell}>
                  <code style={{fontSize: '12px'}}>{exam.codicereg}</code>
                </div>
                <div style={styles.tableCell}>{exam.codice_branca}</div>
                <div style={styles.tableCell}>
                  <span style={{
                    backgroundColor: exam.mappings_count > 0 ? '#d4edda' : '#f8d7da',
                    color: exam.mappings_count > 0 ? '#155724' : '#721c24',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    {exam.mappings_count || 0} mappings
                  </span>
                </div>
                <div style={styles.tableCell}>
                  <div style={{
                    color: exam.is_enabled ? '#10b981' : '#6b7280',
                    fontWeight: '500'
                  }}>
                    {exam.is_enabled ? '● Abilitato' : '○ Disabilitato'}
                  </div>
                </div>
                <div style={styles.tableCell}>
                  <button
                    onClick={() => handleDeleteClick(exam)}
                    style={styles.buttonDanger}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#b91c1c'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#dc2626'}
                  >
                    Elimina
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );

  const renderMappings = () => (
    <div>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px'}}>
        <div>
          <h2 style={{margin: '0 0 8px 0', fontSize: '24px', fontWeight: '600'}}>
            🔗 Mappature Strutture
          </h2>
          <p style={{margin: 0, color: '#666666'}}>
            Mappature esami → Wirgilio per <strong>{cronoscita?.nome}</strong>
          </p>
        </div>
        <button 
          style={styles.addButton}
          onClick={() => setShowAddMappingModal(true)}
          disabled={loading || catalogOptions.length === 0}
        >
          + Nuova Mappatura
        </button>
      </div>

      {loading ? (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Caricamento mappature...</p>
        </div>
      ) : (
        <div style={styles.tableContainer}>
          <div style={styles.tableHeader}>
            <div style={styles.tableCell}>Esame Catalogo</div>
            <div style={styles.tableCell}>Struttura</div>
            <div style={styles.tableCell}>Codice Wirgilio</div>
            <div style={styles.tableCell}>Nome Wirgilio</div>
            <div style={styles.tableCell}>Referto</div>
            <div style={styles.tableCell}>Stato</div>
            <div style={styles.tableCell}>Azioni</div>
          </div>
          
          {mappings.length === 0 ? (
            <div style={styles.emptyState}>
              <p>🔗 Nessuna mappatura per <strong>{cronoscita?.nome}</strong></p>
              {catalogOptions.length > 0 ? (
                <button 
                  style={styles.buttonPrimary}
                  onClick={() => setShowAddMappingModal(true)}
                >
                  Crea Prima Mappatura
                </button>
              ) : (
                <p style={{color: '#dc2626', fontSize: '14px'}}>
                  ⚠️ Aggiungi prima degli esami al catalogo per creare mappature
                </p>
              )}
            </div>
          ) : (
            // REPLACE the entire mappings.map section in renderMappings() function with this:

            mappings.map((mapping, index) => (
              <div key={mapping.id || index} style={{
                ...styles.tableRow,
                backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9f9f9'
              }}>
                <div style={styles.tableCell}>
                  <strong>{mapping.nome_esame_catalogo || mapping.codice_catalogo}</strong>
                  <div style={{fontSize: '12px', color: '#666', marginTop: '2px'}}>
                    {mapping.codice_catalogo}
                  </div>
                </div>
                <div style={styles.tableCell}>{mapping.struttura_nome}</div>
                <div style={styles.tableCell}>
                  <code style={{backgroundColor: '#e3f2fd', padding: '2px 6px', borderRadius: '4px'}}>
                    {mapping.codoffering_wirgilio}
                  </code>
                </div>
                <div style={styles.tableCell}>
                  <strong>{mapping.nome_esame_wirgilio}</strong>
                </div>
                {/* NEW REFERTO CELL - THIS IS WHAT WAS MISSING */}
                <div style={styles.tableCell}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '500',
                    backgroundColor: mapping.visualizza_nel_referto === 'S' ? '#d1fae5' : '#f3f4f6',
                    color: mapping.visualizza_nel_referto === 'S' ? '#047857' : '#6b7280'
                  }}>
                    {mapping.visualizza_nel_referto === 'S' ? (
                      <>👁️ Timeline</>
                    ) : (
                      <>🔒 Solo Lab</>
                    )}
                  </div>
                </div>
                {/* END NEW REFERTO CELL */}
                <div style={styles.tableCell}>
                    <div style={{display: 'flex', gap: '8px'}}>
                      <button
                        onClick={() => handleEditMapping(mapping)}
                        style={{
                          ...styles.buttonPrimary,
                          fontSize: '12px',
                          padding: '6px 12px',
                          backgroundColor: '#0ea5e9'
                        }}
                        disabled={loading}
                        title="Modifica mappatura"
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#0284c7'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#0ea5e9'}
                      >
                        Modifica
                      </button>
                      <button
                        onClick={() => handleDeleteMapping(mapping.id, mapping.nome_esame_catalogo, mapping.struttura_nome)}
                        style={styles.buttonDanger}
                        disabled={loading}
                        title="Rimuovi mappatura"
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#b91c1c'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#dc2626'}
                      >
                        Rimuovi
                      </button>
                    </div>
                  </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );

  const renderAddExamModal = () => {
    if (!showAddExamModal) return null;
    
    return (
      <div style={styles.modal} onClick={() => setShowAddExamModal(false)}>
        <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
          <h3 style={{margin: '0 0 24px 0', fontSize: '20px'}}>
            Aggiungi Esame al Catalogo - {cronoscita?.nome}
          </h3>
          
          <form onSubmit={handleAddExam}>
            {/* NEW: SEARCH SECTION */}
            <div style={{marginBottom: '24px', padding: '16px', backgroundColor: '#f8f9ff', borderRadius: '8px', border: '1px solid #e1e7ff'}}>
              <h4 style={{margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#4f46e5'}}>
                🔍 Opzione 1: Cerca nel Catalogo Master
              </h4>
              
              <div style={{display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center'}}>
                <input
                  type="text"
                  placeholder="Inizia a digitare per cercare (es. UREA, GLUCOSIO)..."
                  value={searchQuery}
                  onChange={(e) => handleSearchInputChange(e.target.value)}
                  style={{
                    ...styles.input,
                    flex: '1',
                    fontSize: '14px',
                    backgroundColor: searchQuery.length >= 2 ? '#f0f9ff' : '#ffffff'
                  }}
                />
                
                {searchLoading && (
                  <div style={{
                    padding: '8px 16px',
                    color: '#6b7280',
                    fontSize: '14px'
                  }}>
                    🔄 Ricerca...
                  </div>
                )}
              </div>
              
              {/* SEARCH RESULTS */}
              {showSearchResults && (
                <div style={{
                  maxHeight: '200px',
                  overflowY: 'auto',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  backgroundColor: 'white'
                }}>
                  {searchResults.length === 0 ? (
                    <div style={{padding: '12px', textAlign: 'center', color: '#6b7280'}}>
                      Nessun risultato trovato per "{searchQuery}"
                    </div>
                  ) : (
                    searchResults.map((prestazione, index) => (
                      <div
                        key={prestazione.codice_catalogo}
                        onClick={() => handleSelectFromSearch(prestazione)}
                        style={{
                          padding: '12px',
                          borderBottom: index < searchResults.length - 1 ? '1px solid #f3f4f6' : 'none',
                          cursor: 'pointer',
                          backgroundColor: 'white'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                      >
                        <div style={{fontWeight: '600', fontSize: '14px'}}>
                          {prestazione.codice_catalogo} - {prestazione.nome_esame}
                        </div>
                        <div style={{fontSize: '12px', color: '#6b7280', marginTop: '4px'}}>
                          Registro: {prestazione.codicereg} | Branca: {prestazione.codice_branca} - {prestazione.branch_description}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* DIVIDER */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              margin: '24px 0',
              fontSize: '14px',
              color: '#6b7280'
            }}>
              <div style={{flex: '1', height: '1px', backgroundColor: '#e5e7eb'}}></div>
              <span style={{padding: '0 16px', backgroundColor: 'white'}}>OPPURE INSERIMENTO MANUALE</span>
              <div style={{flex: '1', height: '1px', backgroundColor: '#e5e7eb'}}></div>
            </div>

            {/* EXISTING MANUAL FIELDS - Keep exactly as they are */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Codice Catalogo *</label>
              <input
                type="text"
                style={styles.input}
                value={examForm.codice_catalogo}
                onChange={(e) => setExamForm({...examForm, codice_catalogo: e.target.value})}
                placeholder="es. 90271.003"
                required
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Nome Esame *</label>
              <input
                type="text"
                style={styles.input}
                value={examForm.nome_esame}
                onChange={(e) => setExamForm({...examForm, nome_esame: e.target.value})}
                placeholder="es. GLUCOSIO [Siero-Plasma]"
                required
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Codice Reg (CODICEREG) *</label>
              <input
                type="text"
                style={styles.input}
                value={examForm.codicereg}
                onChange={(e) => setExamForm({...examForm, codicereg: e.target.value})}
                placeholder="es. 90.27.1"
                required
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Codice Branca *</label>
              <input
                type="text"
                style={styles.input}
                value={examForm.codice_branca}
                onChange={(e) => setExamForm({...examForm, codice_branca: String(e.target.value)})}
                placeholder="es. 011, 014, 015, etc." 
                required
              />
              <div style={{fontSize: '12px', color: '#6c757d', marginTop: '4px'}}>
                Mantiene zeri iniziali (es. 011, 014, 015)
              </div>
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Note Specialistiche (Opzionale)</label>
              <textarea
                style={{
                  ...styles.input,
                  minHeight: '80px',
                  resize: 'vertical'
                }}
                value={examForm.descrizione}
                onChange={(e) => setExamForm({...examForm, descrizione: e.target.value})}
                placeholder="Note aggiuntive per questa prestazione..."
                rows={3}
              />
            </div>
            
            <div style={{display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px'}}>
              <button
                type="button"
                onClick={() => setShowAddExamModal(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '10px 20px',
                  backgroundColor: loading ? '#9ca3af' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: '600'
                }}
              >
                {loading ? 'Validazione...' : 'Aggiungi e Valida'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderAddMappingModal = () => {
    if (!showAddMappingModal) return null;
    
    return (
      <div style={styles.modal} onClick={() => setShowAddMappingModal(false)}>
        <div style={{
          ...styles.modalContent,
          maxWidth: '600px',
          width: '90%'
        }} onClick={e => e.stopPropagation()}>
          <h3 style={{margin: '0 0 24px 0', fontSize: '22px', color: '#1f2937'}}>
            🔗 Crea Mappatura per {cronoscita?.nome}
          </h3>
          
          <form onSubmit={handleAddMapping}>
            {renderExamSelector()}
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Nome Struttura Sanitaria *</label>
              <input
                type="text"
                style={styles.input}
                value={mappingForm.struttura_nome}
                onChange={(e) => setMappingForm({...mappingForm, struttura_nome: e.target.value})}
                placeholder="es. ASL Roma 1, Ospedale Sant'Andrea"
                required
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Codice Wirgilio (codoffering) *</label>
              <input
                type="text"
                style={styles.input}
                value={mappingForm.codoffering_wirgilio}
                onChange={(e) => setMappingForm({...mappingForm, codoffering_wirgilio: e.target.value})}
                placeholder="es. 301"
                required
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Nome Esame Wirgilio *</label>
              <input
                type="text"
                style={styles.input}
                value={mappingForm.nome_esame_wirgilio}
                onChange={(e) => setMappingForm({...mappingForm, nome_esame_wirgilio: e.target.value.toUpperCase()})}
                placeholder="es. GLUCOSIO"
                required
              />
              <div style={{fontSize: '12px', color: '#6c757d', marginTop: '4px'}}>
                Il nome sarà automaticamente convertito in MAIUSCOLO
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Visualizza nel Referto * <span style={{color: '#dc2626'}}>(Obbligatorio)</span></label>
              <div style={{display: 'flex', gap: '16px', alignItems: 'center', marginTop: '8px'}}>
                <label style={{display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer'}}>
                  <input
                    type="radio"
                    name="visualizza_nel_referto"
                    value="S"
                    checked={mappingForm.visualizza_nel_referto === 'S'}
                    onChange={(e) => setMappingForm(prev => ({...prev, visualizza_nel_referto: e.target.value}))}
                    style={{marginRight: '4px'}}
                  />
                  <span style={{fontSize: '14px', fontWeight: '500', color: '#10b981'}}>
                    ✓ Sì - Mostra nel Timeline
                  </span>
                </label>
                <label style={{display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer'}}>
                  <input
                    type="radio"
                    name="visualizza_nel_referto"
                    value="N"
                    checked={mappingForm.visualizza_nel_referto === 'N'}
                    onChange={(e) => setMappingForm(prev => ({...prev, visualizza_nel_referto: e.target.value}))}
                    style={{marginRight: '4px'}}
                  />
                  <span style={{fontSize: '14px', fontWeight: '500', color: '#6b7280'}}>
                    ✗ No - Solo per Laboratorio
                  </span>
                </label>
              </div>
              <div style={{fontSize: '12px', color: '#666', marginTop: '4px', fontStyle: 'italic'}}>
                Determina se l'esame sarà visibile nel referto paziente del Timeline Service
              </div>
              {!mappingForm.visualizza_nel_referto && (
                <div style={{fontSize: '12px', color: '#dc2626', marginTop: '4px', fontWeight: '500'}}>
                  ⚠️ Seleziona un'opzione per continuare
                </div>
              )}
            </div>
            
            <div style={{display: 'flex', gap: '12px', justifyContent: 'flex-end'}}>
              <button 
                type="button" 
                style={styles.buttonSecondary}
                onClick={() => setShowAddMappingModal(false)}
              >
                Annulla
              </button>
              <button 
                type="submit" 
                style={{
                  ...styles.buttonPrimary,
                  opacity: (loading || !mappingForm.selected_exam || !mappingForm.struttura_nome || !mappingForm.codoffering_wirgilio || !mappingForm.nome_esame_wirgilio) ? 0.6 : 1
                }}
                disabled={loading || !mappingForm.selected_exam || !mappingForm.struttura_nome || !mappingForm.codoffering_wirgilio || !mappingForm.nome_esame_wirgilio}
              >
                {loading ? 'Creando Mapping...' : 'Crea Mapping'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // ADD this function after renderAddMappingModal() function:

  const renderEditMappingModal = () => {
    if (!showEditMappingModal || !editingMapping) return null;
    
    return (
      <div style={styles.modal} onClick={handleCancelEdit}>
        <div style={{
          ...styles.modalContent,
          maxWidth: '600px',
          width: '90%'
        }} onClick={e => e.stopPropagation()}>
          <h3 style={{margin: '0 0 24px 0', fontSize: '22px', color: '#1f2937'}}>
            ✏️ Modifica Mappatura - {cronoscita?.nome}
          </h3>
          
          <div style={{
            backgroundColor: '#f0f9ff',
            padding: '12px 16px',
            borderRadius: '6px',
            marginBottom: '20px',
            border: '1px solid #0ea5e9'
          }}>
            <div style={{fontSize: '14px', fontWeight: '500', color: '#0369a1'}}>
              Mappatura corrente: {editingMapping.nome_esame_catalogo} → {editingMapping.struttura_nome}
            </div>
            <div style={{fontSize: '12px', color: '#0284c7', marginTop: '4px'}}>
              Codice Wirgilio: {editingMapping.codoffering_wirgilio} | Nome: {editingMapping.nome_esame_wirgilio}
            </div>
          </div>
          
          <form onSubmit={handleUpdateMapping}>
            {renderExamSelector()}
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Nome Struttura Sanitaria *</label>
              <input
                type="text"
                style={styles.input}
                value={mappingForm.struttura_nome}
                onChange={(e) => setMappingForm({...mappingForm, struttura_nome: e.target.value})}
                placeholder="es. ASL Roma 1, Ospedale Sant'Andrea"
                required
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Codice Wirgilio (codoffering) *</label>
              <input
                type="text"
                style={styles.input}
                value={mappingForm.codoffering_wirgilio}
                onChange={(e) => setMappingForm({...mappingForm, codoffering_wirgilio: e.target.value})}
                placeholder="es. 301"
                required
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Nome Esame Wirgilio *</label>
              <input
                type="text"
                style={styles.input}
                value={mappingForm.nome_esame_wirgilio}
                onChange={(e) => setMappingForm({...mappingForm, nome_esame_wirgilio: e.target.value.toUpperCase()})}
                placeholder="es. GLUCOSIO"
                required
              />
              <div style={{fontSize: '12px', color: '#6c757d', marginTop: '4px'}}>
                Il nome sarà automaticamente convertito in MAIUSCOLO
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Visualizza nel Referto * <span style={{color: '#dc2626'}}>(Obbligatorio)</span></label>
              <div style={{display: 'flex', gap: '16px', alignItems: 'center', marginTop: '8px'}}>
                <label style={{display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer'}}>
                  <input
                    type="radio"
                    name="edit_visualizza_nel_referto"
                    value="S"
                    checked={mappingForm.visualizza_nel_referto === 'S'}
                    onChange={(e) => setMappingForm(prev => ({...prev, visualizza_nel_referto: e.target.value}))}
                    style={{marginRight: '4px'}}
                  />
                  <span style={{fontSize: '14px', fontWeight: '500', color: '#10b981'}}>
                    ✓ Sì - Mostra nel Timeline
                  </span>
                </label>
                <label style={{display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer'}}>
                  <input
                    type="radio"
                    name="edit_visualizza_nel_referto"
                    value="N"
                    checked={mappingForm.visualizza_nel_referto === 'N'}
                    onChange={(e) => setMappingForm(prev => ({...prev, visualizza_nel_referto: e.target.value}))}
                    style={{marginRight: '4px'}}
                  />
                  <span style={{fontSize: '14px', fontWeight: '500', color: '#6b7280'}}>
                    ✗ No - Solo per Laboratorio
                  </span>
                </label>
              </div>
              <div style={{fontSize: '12px', color: '#666', marginTop: '4px', fontStyle: 'italic'}}>
                Determina se l'esame sarà visibile nel referto paziente del Timeline Service
              </div>
              {!mappingForm.visualizza_nel_referto && (
                <div style={{fontSize: '12px', color: '#dc2626', marginTop: '4px', fontWeight: '500'}}>
                  ⚠️ Seleziona un'opzione per continuare
                </div>
              )}
            </div>
            
            <div style={{display: 'flex', gap: '12px', justifyContent: 'flex-end'}}>
              <button 
                type="button" 
                style={styles.buttonSecondary}
                onClick={handleCancelEdit}
              >
                Annulla
              </button>
              <button 
                type="submit" 
                style={{
                  ...styles.buttonPrimary,
                  backgroundColor: '#0ea5e9',
                  opacity: (loading || !mappingForm.selected_exam || !mappingForm.struttura_nome || !mappingForm.codoffering_wirgilio || !mappingForm.nome_esame_wirgilio || !mappingForm.visualizza_nel_referto) ? 0.6 : 1
                }}
                disabled={loading || !mappingForm.selected_exam || !mappingForm.struttura_nome || !mappingForm.codoffering_wirgilio || !mappingForm.nome_esame_wirgilio || !mappingForm.visualizza_nel_referto}
              >
                {loading ? 'Aggiornando...' : '💾 Salva Modifiche'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Main render
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={{margin: '0 0 8px 0', fontSize: '28px', color: '#1f2937'}}>
          Gestione Prestazioni Mediche
        </h1>
        <p style={{margin: '0', color: '#6b7280', fontSize: '16px'}}>
          Sistema gestione catalogo prestazioni e mappature per <strong>{cronoscita?.nome}</strong> ({cronoscita?.codice})
        </p>
      </div>
      
      <div style={styles.tabs}>
        {[
          {id: 'catalog', label: 'Catalogo Esami', icon: '📋'},
          {id: 'mappings', label: 'Mappature Strutture', icon: '🔗'}
        ].map(tab => (
          <button
            key={tab.id}
            style={{
              ...styles.tab,
              ...(activeTab === tab.id ? styles.activeTab : {})
            }}
            onClick={() => {
              console.log('🔄 Tab clicked:', tab.id);
              setActiveTab(tab.id);
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>
      
      {activeTab === 'catalog' && renderCatalog()}
      {activeTab === 'mappings' && renderMappings()}
      
      {renderAddExamModal()}
      {renderAddMappingModal()}
      {renderEditMappingModal()}
      {/* Delete Confirmation Modal */}
      {showDeleteModal && examToDelete && (
        <div style={styles.modal} onClick={handleCancelDelete}>
          <div style={{
            ...styles.modalContent,
            maxWidth: '500px',
            textAlign: 'center'
          }} onClick={e => e.stopPropagation()}>
            
            <div style={{fontSize: '48px', marginBottom: '16px'}}>⚠️</div>
            
            <h3 style={{margin: '0 0 16px 0', fontSize: '20px', color: '#dc2626'}}>
              Conferma Eliminazione
            </h3>
            
            <p style={{margin: '0 0 8px 0', fontSize: '16px', color: '#374151'}}>
              Sei sicuro di voler eliminare questo esame?
            </p>
            
            <div style={{
              backgroundColor: '#f3f4f6',
              padding: '16px',
              borderRadius: '8px',
              margin: '16px 0',
              textAlign: 'left'
            }}>
              <div><strong>Codice:</strong> {examToDelete.codice_catalogo}</div>
              <div><strong>Nome:</strong> {examToDelete.nome_esame}</div>
              <div><strong>Branca:</strong> {examToDelete.codice_branca}</div>
            </div>
            
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              padding: '12px',
              borderRadius: '6px',
              margin: '16px 0',
              fontSize: '14px',
              color: '#991b1b'
            }}>
              <strong>⚠️ Attenzione:</strong> Questa azione eliminerà anche tutte le mappature associate.
            </div>
            
            <div style={{display: 'flex', gap: '12px', justifyContent: 'center'}}>
              <button onClick={handleCancelDelete} style={styles.buttonSecondary}>
                Annulla
              </button>
              <button 
                onClick={handleConfirmDelete}
                disabled={loading}
                style={{
                  ...styles.buttonDanger,
                  opacity: loading ? 0.6 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Eliminando...' : 'Elimina Definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Styles (keep your existing styles object exactly as it is)
const styles = {
  container: {
    padding: '24px',
    maxWidth: '1400px',
    margin: '0 auto',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  header: {
    marginBottom: '32px',
    borderBottom: '3px solid #0ea5e9',
    paddingBottom: '16px'
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    borderBottom: '1px solid #e5e7eb'
  },
  tab: {
    padding: '12px 24px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '14px',
    color: '#6b7280',
    transition: 'all 0.2s'
  },
  activeTab: {
    color: '#0ea5e9',
    borderBottom: '3px solid #0ea5e9'
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
  tableContainer: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  tableHeader: {
    display: 'flex',
    backgroundColor: '#f9fafb',
    fontWeight: '600',
    fontSize: '13px',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: '0.025em'
  },
  tableRow: {
    display: 'flex',
    borderBottom: '1px solid #f3f4f6'
  },
  tableCell: {
    flex: 1,
    padding: '12px 16px',
    borderRight: '1px solid #f3f4f6'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '48px',
    color: '#6b7280'
  },
  spinner: {
    width: '24px',
    height: '24px',
    border: '3px solid #f3f4f6',
    borderTop: '3px solid #0ea5e9',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  emptyState: {
    textAlign: 'center',
    padding: '48px',
    color: '#6b7280'
  },
  modal: {
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
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '32px',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '90vh',
    overflow: 'auto'
  },
  formGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '500',
    color: '#374151'
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box'
  },
  buttonPrimary: {
    padding: '12px 24px',
    backgroundColor: '#0ea5e9',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  buttonSecondary: {
    padding: '12px 24px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: 'none',
    borderRadius: '6px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  buttonDanger: {
    padding: '8px 16px',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s'
  }
};

export default LaboratorioManagement;
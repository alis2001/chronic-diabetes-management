// frontend/admin-app/src/components/LaboratorioManagement.js
// COMPLETE WORKING IMPLEMENTATION - FIXES ALL ISSUES
import React, { useState, useEffect } from 'react';
import { adminAPI } from '../api';

const LaboratorioManagement = () => {
  console.log('🔥 LABORATORIO COMPONENT LOADING - FIXED VERSION');
  
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  
  // Data states
  const [overview, setOverview] = useState({});
  const [catalog, setCatalog] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [catalogOptions, setCatalogOptions] = useState([]);

  // Modal states
  const [showAddExamModal, setShowAddExamModal] = useState(false);
  const [showAddMappingModal, setShowAddMappingModal] = useState(false);
  
  const [examForm, setExamForm] = useState({
    codice_catalogo: '',       
    codicereg: '',            
    nome_esame: '',           
    codice_branca: '011',     
    descrizione: ''           
    });
  
  const [mappingForm, setMappingForm] = useState({
    codice_catalogo: '',           // Auto-filled from dropdown
    selected_exam: null,           // Full exam object from dropdown
    struttura_nome: '',           // Manual entry
    codoffering_wirgilio: '',     // Manual entry  
    nome_esame_wirgilio: ''       // Manual entry - will be UPPERCASE
    });

  // FIXED: Load data on component mount and tab changes
  useEffect(() => {
    console.log('🔄 Tab changed to:', activeTab);
    loadOverviewData();
    loadCatalogOptions(); // ADD THIS LINE
    if (activeTab === 'catalog') loadCatalogData();
    if (activeTab === 'mappings') loadMappingsData();
  }, [activeTab]);

  // FIXED: Correct API calls using adminAPI.get()
  const loadOverviewData = async () => {
    try {
      setLoading(true);
      console.log('📡 Loading laboratorio overview...');
      const result = await adminAPI.get('/dashboard/laboratorio/overview');
      console.log('✅ Overview loaded:', result);
      setOverview(result);
    } catch (error) {
      console.error('❌ Error loading overview:', error);
      setOverview({});
    } finally {
      setLoading(false);
    }
  };

  const loadCatalogOptions = async () => {
    try {
        console.log('📡 Loading catalog options...');
        const result = await adminAPI.get('/dashboard/laboratorio/catalogo-for-mapping');
        console.log('✅ Catalog options loaded:', result);
        setCatalogOptions(result.options || []);
    } catch (error) {
        console.error('❌ Error loading catalog options:', error);
        setCatalogOptions([]);
    }
  };

  const renderExamSelector = () => (
    <div style={styles.formGroup}>
        <label style={styles.label}>Seleziona Esame dal Catalogo *</label>
        <select
        style={{
            ...styles.input,
            backgroundColor: mappingForm.selected_exam ? '#f0f9ff' : '#ffffff'
        }}
        value={mappingForm.codice_catalogo}
        onChange={(e) => {
            const selectedOption = catalogOptions.find(opt => opt.value === e.target.value);
            setMappingForm({
            ...mappingForm,
            codice_catalogo: e.target.value,
            selected_exam: selectedOption
            });
        }}
        required
        >
        <option value="">-- Seleziona un esame dal catalogo --</option>
        {catalogOptions.map(option => (
            <option key={option.value} value={option.value}>
            {option.label}
            </option>
        ))}
        </select>
        
        {mappingForm.selected_exam && (
        <div style={{
            marginTop: '8px', 
            padding: '12px', 
            backgroundColor: '#f0f9ff', 
            borderRadius: '8px',
            border: '1px solid #bfdbfe',
            fontSize: '13px'
        }}>
            <div style={{fontWeight: '600', color: '#1e40af', marginBottom: '4px'}}>
            ✅ Esame Selezionato:
            </div>
            <div><strong>Codice:</strong> {mappingForm.selected_exam.codice_catalogo}</div>
            <div><strong>Nome:</strong> {mappingForm.selected_exam.nome_esame}</div>
            <div><strong>Codice Reg:</strong> {mappingForm.selected_exam.codicereg}</div>
            <div><strong>Branca:</strong> {mappingForm.selected_exam.codice_branca}</div>
        </div>
        )}
    </div>
    );


  const loadCatalogData = async () => {
    try {
      setLoading(true);
      console.log('📡 Loading catalog data...');
      const result = await adminAPI.get('/dashboard/laboratorio/catalogo');
      console.log('✅ Catalog loaded:', result);
      setCatalog(result.catalog || []);
    } catch (error) {
      console.error('❌ Error loading catalog:', error);
      setCatalog([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMappingsData = async () => {
    try {
      setLoading(true);
      console.log('📡 Loading mappings data...');
      const result = await adminAPI.get('/dashboard/laboratorio/mappings');
      console.log('✅ Mappings loaded:', result);
      setMappings(result.mappings || []);
    } catch (error) {
      console.error('❌ Error loading mappings:', error);
      setMappings([]);
    } finally {
      setLoading(false);
    }
  };

  // FIXED: Complete exam operations
  const handleAddExam = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      console.log('📡 Adding exam:', examForm);
      await adminAPI.post('/dashboard/laboratorio/catalogo', examForm);
      
      setExamForm({
        codice_catalogo: '',
        codice_branca: '',
        nome_esame: '',
        struttura_codice: '011',
        descrizione: ''
      });
      setShowAddExamModal(false);
      
      await loadCatalogData();
      await loadOverviewData();
      
      alert('Esame aggiunto al catalogo con successo!');
    } catch (error) {
      console.error('❌ Error adding exam:', error);
      alert('Errore durante l\'aggiunta dell\'esame: ' + (error.message || error));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExam = async (codice_catalogo, nome_esame) => {
    if (!window.confirm(`Eliminare l'esame "${nome_esame}" dal catalogo?\n\nATTENZIONE: Verranno eliminate anche tutte le mappature associate.`)) {
      return;
    }
    
    try {
      setLoading(true);
      await adminAPI.delete(`/dashboard/laboratorio/catalogo/${codice_catalogo}`);
      
      await loadCatalogData();
      await loadOverviewData();
      
      alert('Esame eliminato dal catalogo');
    } catch (error) {
      console.error('❌ Error deleting exam:', error);
      alert('Errore durante l\'eliminazione: ' + (error.message || error));
    } finally {
      setLoading(false);
    }
  };

  const toggleExamEnabled = async (codice_catalogo, currentStatus) => {
    try {
      setLoading(true);
      await adminAPI.put(`/dashboard/laboratorio/catalogo/${codice_catalogo}`, {
        is_enabled: !currentStatus
      });
      
      await loadCatalogData();
      await loadOverviewData();
    } catch (error) {
      console.error('❌ Error updating exam:', error);
      alert('Errore durante l\'aggiornamento: ' + (error.message || error));
    } finally {
      setLoading(false);
    }
  };

  const handleAddMapping = async (e) => {
    e.preventDefault();
    try {
        setLoading(true);
        console.log('📡 Adding mapping:', mappingForm);
        
        // FORCE UPPERCASE for Wirgilio exam name
        const mappingData = {
        ...mappingForm,
        nome_esame_wirgilio: mappingForm.nome_esame_wirgilio.toUpperCase() // FORCE UPPERCASE
        };
        
        await adminAPI.post('/dashboard/laboratorio/mappings', mappingData);
        
        // Reset form
        setMappingForm({
        codice_catalogo: '',
        selected_exam: null,
        struttura_nome: '',
        codoffering_wirgilio: '',
        nome_esame_wirgilio: ''
        });
        setShowAddMappingModal(false);
        
        await loadMappingsData();
        await loadOverviewData();
        
        alert('Mappatura creata con successo!');
    } catch (error) {
        console.error('❌ Error adding mapping:', error);
        alert('Errore durante la creazione mappatura: ' + (error.message || error));
    } finally {
        setLoading(false);
    }
  };


  // FIXED: No conflicting styles - removed borderBottomColor
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
    overviewGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '20px',
      marginBottom: '24px'
    },
    statCard: {
      background: 'white',
      padding: '24px',
      borderRadius: '12px',
      border: '1px solid #e5e7eb',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    statNumber: {
      fontSize: '32px',
      fontWeight: '700',
      marginBottom: '8px'
    },
    statLabel: {
      color: '#6b7280',
      fontSize: '14px',
      fontWeight: '500'
    },
    buttonPrimary: {
      background: '#0ea5e9',
      color: 'white',
      border: 'none',
      padding: '12px 24px',
      borderRadius: '8px',
      fontWeight: '500',
      cursor: 'pointer',
      fontSize: '14px',
      transition: 'background 0.2s'
    },
    buttonSecondary: {
      background: 'white',
      color: '#374151',
      border: '2px solid #d1d5db',
      padding: '10px 20px',
      borderRadius: '8px',
      fontWeight: '500',
      cursor: 'pointer',
      fontSize: '14px'
    },
    buttonDanger: {
      background: '#ef4444',
      color: 'white',
      border: 'none',
      padding: '8px 16px',
      borderRadius: '6px',
      fontWeight: '500',
      cursor: 'pointer',
      fontSize: '12px'
    },
    table: {
      width: '100%',
      background: 'white',
      borderRadius: '12px',
      overflow: 'hidden',
      border: '1px solid #e5e7eb'
    },
    tableHeader: {
      background: '#f8fafc',
      borderBottom: '1px solid #e5e7eb'
    },
    tableCell: {
      padding: '12px 16px',
      fontSize: '14px',
      borderBottom: '1px solid #f3f4f6'
    },
    modal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    },
    modalContent: {
      background: 'white',
      padding: '32px',
      borderRadius: '12px',
      width: '90%',
      maxWidth: '600px',
      maxHeight: '90vh',
      overflow: 'auto'
    },
    formGroup: {
      marginBottom: '16px'
    },
    label: {
      display: 'block',
      marginBottom: '6px',
      fontWeight: '500',
      fontSize: '14px',
      color: '#374151'
    },
    input: {
      width: '100%',
      padding: '12px',
      border: '2px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '14px',
      boxSizing: 'border-box'
    },
    badge: {
      padding: '4px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '500'
    },
    badgeEnabled: {
      background: '#dcfce7',
      color: '#166534'
    },
    badgeDisabled: {
      background: '#fef2f2',
      color: '#dc2626'
    }
  };

  // FIXED: Complete render functions
  const renderOverview = () => (
    <div>
      <div style={styles.overviewGrid}>
        <div style={styles.statCard}>
          <div style={{...styles.statNumber, color: '#0ea5e9'}}>
            {overview.total_catalog_exams || 0}
          </div>
          <div style={styles.statLabel}>Esami in Catalogo</div>
        </div>
        
        <div style={styles.statCard}>
          <div style={{...styles.statNumber, color: '#10b981'}}>
            {overview.enabled_catalog_exams || 0}
          </div>
          <div style={styles.statLabel}>Esami Abilitati</div>
        </div>
        
        <div style={styles.statCard}>
          <div style={{...styles.statNumber, color: '#f59e0b'}}>
            {overview.total_mappings || 0}
          </div>
          <div style={styles.statLabel}>Mappature Totali</div>
        </div>
        
        <div style={styles.statCard}>
          <div style={{...styles.statNumber, color: '#8b5cf6'}}>
            {overview.strutture_count || 0}
          </div>
          <div style={styles.statLabel}>Strutture Configurate</div>
        </div>
      </div>
    </div>
  );

  const renderCatalog = () => (
    <div>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px'}}>
        <div>
          <h3 style={{margin: '0 0 4px 0', fontSize: '20px'}}>Catalogo Esami Ufficiale</h3>
          <p style={{margin: 0, color: '#6b7280', fontSize: '14px'}}>
            Gestione del catalogo permanente degli esami di laboratorio
          </p>
        </div>
        <button 
          style={styles.buttonPrimary}
          onClick={() => setShowAddExamModal(true)}
          disabled={loading}
        >
          + Aggiungi Esame
        </button>
      </div>
      
      {loading ? (
        <div style={{textAlign: 'center', padding: '40px', color: '#6b7280'}}>
          Caricamento catalogo esami...
        </div>
      ) : (
        <div style={styles.table}>
          <div style={styles.tableHeader}>
            <div style={{display: 'grid', gridTemplateColumns: '120px 120px 3fr 80px 100px 140px', alignItems: 'center'}}>
              <div style={{...styles.tableCell, fontWeight: '600', borderBottom: 'none'}}>Cod. Catalogo</div>
              <div style={{...styles.tableCell, fontWeight: '600', borderBottom: 'none'}}>Cod. Branca</div>
              <div style={{...styles.tableCell, fontWeight: '600', borderBottom: 'none'}}>Nome Esame</div>
              <div style={{...styles.tableCell, fontWeight: '600', borderBottom: 'none'}}>Struttura</div>
              <div style={{...styles.tableCell, fontWeight: '600', borderBottom: 'none'}}>Stato</div>
              <div style={{...styles.tableCell, fontWeight: '600', borderBottom: 'none'}}>Azioni</div>
            </div>
          </div>
          
          {catalog.length === 0 ? (
            <div style={{padding: '40px', textAlign: 'center', color: '#6b7280'}}>
              <p>Il catalogo è vuoto.</p>
              <p style={{fontSize: '14px'}}>Database ha {overview.total_catalog_exams || 0} esami. Ricaricare la pagina.</p>
            </div>
          ) : (
            catalog.map((exam, index) => (
              <div key={exam.id || index} style={{display: 'grid', gridTemplateColumns: '120px 120px 3fr 80px 100px 140px', alignItems: 'center'}}>
                <div style={styles.tableCell}>
                  <code style={{background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px', fontSize: '12px'}}>
                    {exam.codice_catalogo}
                  </code>
                </div>
                <div style={styles.tableCell}>
                  <code style={{fontSize: '12px', color: '#6b7280'}}>
                    {exam.codice_branca}
                  </code>
                </div>
                <div style={styles.tableCell}>
                  <div style={{fontWeight: '500', fontSize: '14px'}}>{exam.nome_esame}</div>
                  {exam.mappings_count > 0 && (
                    <div style={{fontSize: '12px', color: '#6b7280', marginTop: '4px'}}>
                      {exam.mappings_count} mappature attive
                    </div>
                  )}
                </div>
                <div style={styles.tableCell}>
                  <code style={{fontSize: '12px'}}>{exam.struttura_codice}</code>
                </div>
                <div style={styles.tableCell}>
                  <button
                    onClick={() => toggleExamEnabled(exam.codice_catalogo, exam.is_enabled)}
                    style={{
                      ...styles.badge,
                      ...(exam.is_enabled ? styles.badgeEnabled : styles.badgeDisabled),
                      border: 'none',
                      cursor: 'pointer'
                    }}
                    disabled={loading}
                  >
                    {exam.is_enabled ? 'Abilitato' : 'Disabilitato'}
                  </button>
                </div>
                <div style={styles.tableCell}>
                  <button
                    onClick={() => handleDeleteExam(exam.codice_catalogo, exam.nome_esame)}
                    style={styles.buttonDanger}
                    disabled={loading}
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
          <h3 style={{margin: '0 0 4px 0', fontSize: '20px'}}>Mappature Strutture</h3>
          <p style={{margin: 0, color: '#6b7280', fontSize: '14px'}}>
            Collegamento esami con codoffering Wirgilio per struttura
          </p>
        </div>
        <button 
          style={styles.buttonPrimary}
          onClick={() => setShowAddMappingModal(true)}
          disabled={loading}
        >
          + Crea Mappatura
        </button>
      </div>
      
      {loading ? (
        <div style={{textAlign: 'center', padding: '40px', color: '#6b7280'}}>
          Caricamento mappature...
        </div>
      ) : (
        <div style={styles.table}>
          <div style={styles.tableHeader}>
            <div style={{display: 'grid', gridTemplateColumns: '120px 2fr 150px 120px 2fr', alignItems: 'center'}}>
              <div style={{...styles.tableCell, fontWeight: '600', borderBottom: 'none'}}>Cod. Catalogo</div>
              <div style={{...styles.tableCell, fontWeight: '600', borderBottom: 'none'}}>Esame Catalogo</div>
              <div style={{...styles.tableCell, fontWeight: '600', borderBottom: 'none'}}>Struttura</div>
              <div style={{...styles.tableCell, fontWeight: '600', borderBottom: 'none'}}>Codoffering</div>
              <div style={{...styles.tableCell, fontWeight: '600', borderBottom: 'none'}}>Nome Wirgilio</div>
            </div>
          </div>
          
          {mappings.length === 0 ? (
            <div style={{padding: '40px', textAlign: 'center', color: '#6b7280'}}>
              <p>Nessuna mappatura configurata.</p>
              <p style={{fontSize: '14px'}}>Creare mappature per collegare esami del catalogo con i sistemi Wirgilio.</p>
            </div>
          ) : (
            mappings.map((mapping, index) => (
              <div key={mapping.id || index} style={{display: 'grid', gridTemplateColumns: '120px 2fr 150px 120px 2fr', alignItems: 'center'}}>
                <div style={styles.tableCell}>
                  <code style={{background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px', fontSize: '12px'}}>
                    {mapping.codice_catalogo}
                  </code>
                </div>
                <div style={styles.tableCell}>
                  <div style={{fontWeight: '500', fontSize: '14px'}}>{mapping.nome_esame_catalogo}</div>
                </div>
                <div style={styles.tableCell}>
                  <div style={{fontWeight: '500', color: '#0ea5e9'}}>{mapping.struttura_nome}</div>
                </div>
                <div style={styles.tableCell}>
                  <code style={{background: '#fef3c7', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', color: '#92400e'}}>
                    {mapping.codoffering_wirgilio}
                  </code>
                </div>
                <div style={styles.tableCell}>
                  <div style={{fontSize: '14px'}}>{mapping.nome_esame_wirgilio}</div>
                  <div style={{fontSize: '12px', color: mapping.is_active ? '#10b981' : '#6b7280'}}>
                    {mapping.is_active ? '● Attiva' : '○ Inattiva'}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );

  // FIXED: Complete modals
  const renderAddExamModal = () => {
    if (!showAddExamModal) return null;
    
    return (
      <div style={styles.modal} onClick={() => setShowAddExamModal(false)}>
        <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
          <h3 style={{margin: '0 0 24px 0', fontSize: '20px'}}>Aggiungi Esame al Catalogo</h3>
          
          <form onSubmit={handleAddExam}>
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
                <label style={styles.label}>Codice Branca</label>
                <input
                    type="text"
                    style={styles.input}
                    value={examForm.codice_branca}
                    onChange={(e) => setExamForm({...examForm, codice_branca: e.target.value})}
                    placeholder="011"
                    disabled // Always 011 for laboratory
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
              <label style={styles.label}>Descrizione</label>
              <textarea
                style={{...styles.input, minHeight: '80px'}}
                value={examForm.descrizione}
                onChange={(e) => setExamForm({...examForm, descrizione: e.target.value})}
                placeholder="Descrizione aggiuntiva dell'esame..."
              />
            </div>
            
            <div style={{display: 'flex', gap: '12px', justifyContent: 'flex-end'}}>
              <button 
                type="button" 
                style={styles.buttonSecondary}
                onClick={() => setShowAddExamModal(false)}
              >
                Annulla
              </button>
              <button type="submit" style={styles.buttonPrimary} disabled={loading}>
                {loading ? 'Salvando...' : 'Salva Esame'}
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
            🔗 Crea Mappatura Struttura → Wirgilio
            </h3>
            
            <form onSubmit={handleAddMapping}>
            {/* SMART EXAM SELECTOR */}
            {renderExamSelector()}
            
            {/* STRUCTURE NAME */}
            <div style={styles.formGroup}>
                <label style={styles.label}>Nome Struttura Sanitaria *</label>
                <input
                type="text"
                style={styles.input}
                value={mappingForm.struttura_nome}
                onChange={(e) => setMappingForm({...mappingForm, struttura_nome: e.target.value})}
                placeholder="es. Ospedale Napoli 1, ASL Roma Centro, Lab Privato Milano"
                required
                />
                <div style={{fontSize: '12px', color: '#6b7280', marginTop: '4px'}}>
                Nome completo della struttura sanitaria che utilizza questo codoffering
                </div>
            </div>
            
            {/* WIRGILIO CODOFFERING */}
            <div style={styles.formGroup}>
                <label style={styles.label}>Codoffering Wirgilio *</label>
                <input
                type="text"
                style={styles.input}
                value={mappingForm.codoffering_wirgilio}
                onChange={(e) => setMappingForm({
                    ...mappingForm, 
                    codoffering_wirgilio: e.target.value.toUpperCase() // FORCE UPPERCASE
                })}
                placeholder="es. 301, 302, 1054, MY, TR, CM"
                required
                />
                <div style={{fontSize: '12px', color: '#6b7280', marginTop: '4px'}}>
                Codice identificativo dell'esame nel sistema Wirgilio (es: dall'API JSON)
                </div>
            </div>
            
            {/* WIRGILIO EXAM NAME */}
            <div style={styles.formGroup}>
                <label style={styles.label}>Nome Esame Wirgilio *</label>
                <input
                type="text"
                style={styles.input}
                value={mappingForm.nome_esame_wirgilio}
                onChange={(e) => setMappingForm({
                    ...mappingForm, 
                    nome_esame_wirgilio: e.target.value.toUpperCase() // FORCE UPPERCASE WHILE TYPING
                })}
                placeholder="es. GLUCOSIO, UREA, CREATININA, MIOGLOBINA"
                required
                />
                <div style={{fontSize: '12px', color: '#6b7280', marginTop: '4px'}}>
                Nome dell'esame come appare nel sistema Wirgilio (sempre maiuscolo)
                </div>
            </div>
            
            {/* PREVIEW MAPPING */}
            {mappingForm.selected_exam && mappingForm.struttura_nome && mappingForm.codoffering_wirgilio && (
                <div style={{
                marginTop: '16px',
                padding: '16px',
                backgroundColor: '#f0fdf4',
                borderRadius: '8px',
                border: '1px solid #bbf7d0'
                }}>
                <h4 style={{margin: '0 0 12px 0', color: '#166534', fontSize: '16px'}}>
                    📋 Anteprima Mapping:
                </h4>
                <div style={{
                    padding: '12px',
                    backgroundColor: '#ffffff',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'monospace'
                }}>
                    <div style={{marginBottom: '8px'}}>
                    <strong>Catalogo:</strong> <code style={{backgroundColor: '#f3f4f6', padding: '2px 6px', borderRadius: '4px'}}>{mappingForm.selected_exam.codice_catalogo}</code> → <strong>{mappingForm.selected_exam.nome_esame}</strong>
                    </div>
                    <div style={{marginBottom: '8px'}}>
                    <strong>Struttura:</strong> <span style={{color: '#0ea5e9'}}>{mappingForm.struttura_nome}</span>
                    </div>
                    <div style={{marginBottom: '8px'}}>
                    <strong>Wirgilio:</strong> <code style={{backgroundColor: '#fef3c7', padding: '2px 6px', borderRadius: '4px', color: '#92400e'}}>{mappingForm.codoffering_wirgilio}</code> → <strong style={{color: '#dc2626'}}>{mappingForm.nome_esame_wirgilio}</strong>
                    </div>
                </div>
                </div>
            )}
            
            <div style={{display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px'}}>
                <button 
                type="button" 
                style={styles.buttonSecondary}
                onClick={() => {
                    setShowAddMappingModal(false);
                    setMappingForm({
                    codice_catalogo: '',
                    selected_exam: null,
                    struttura_nome: '',
                    codoffering_wirgilio: '',
                    nome_esame_wirgilio: ''
                    });
                }}
                >
                Annulla
                </button>
                <button 
                type="submit" 
                style={{
                    ...styles.buttonPrimary,
                    opacity: (!mappingForm.selected_exam || !mappingForm.struttura_nome || !mappingForm.codoffering_wirgilio || !mappingForm.nome_esame_wirgilio) ? 0.6 : 1
                }}
                disabled={loading || !mappingForm.selected_exam || !mappingForm.struttura_nome || !mappingForm.codoffering_wirgilio || !mappingForm.nome_esame_wirgilio}
                >
                {loading ? 'Creando Mapping...' : '✅ Crea Mapping'}
                </button>
            </div>
            </form>
        </div>
        </div>
    );
  };

  // MAIN RENDER
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={{margin: '0 0 8px 0', fontSize: '28px', color: '#1f2937'}}>
          🔬 Gestione Laboratorio d'Analisi
        </h1>
        <p style={{margin: '0', color: '#6b7280', fontSize: '16px'}}>
          Sistema gestione catalogo esami e mappature strutture Wirgilio
        </p>
      </div>
      
      <div style={styles.tabs}>
        {[
          {id: 'overview', label: 'Panoramica', icon: '📊'},
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
      
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'catalog' && renderCatalog()}
      {activeTab === 'mappings' && renderMappings()}
      
      {renderAddExamModal()}
      {renderAddMappingModal()}
    </div>
  );
};

export default LaboratorioManagement;
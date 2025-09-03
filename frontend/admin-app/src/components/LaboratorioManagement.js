// Complete Laboratory Management Component
import React, { useState, useEffect } from 'react';
import { adminAPI } from '../api';

const LaboratorioManagement = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [overview, setOverview] = useState({});
  const [catalogData, setCatalogData] = useState([]);
  const [mappingsData, setMappingsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const styles = {
    container: {
      padding: '20px',
      maxWidth: '1400px',
      margin: '0 auto'
    },
    header: {
      marginBottom: '30px',
      borderBottom: '3px solid #3b82f6',
      paddingBottom: '15px'
    },
    title: {
      fontSize: '28px',
      fontWeight: '700',
      color: '#1f2937',
      margin: 0,
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    subtitle: {
      fontSize: '16px',
      color: '#6b7280',
      margin: '5px 0 0 0'
    },
    tabContainer: {
      display: 'flex',
      borderBottom: '2px solid #e5e7eb',
      marginBottom: '25px'
    },
    tab: {
      padding: '12px 24px',
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      fontSize: '15px',
      fontWeight: '600',
      color: '#6b7280',
      borderBottom: '3px solid transparent',
      transition: 'all 0.3s ease'
    },
    activeTab: {
      color: '#3b82f6',
      borderBottom: '3px solid #3b82f6'
    },
    overviewGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '20px',
      marginBottom: '30px'
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
      color: '#1f2937',
      margin: '0 0 8px 0'
    },
    statLabel: {
      fontSize: '14px',
      color: '#6b7280',
      fontWeight: '500'
    },
    table: {
      width: '100%',
      backgroundColor: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      overflow: 'hidden'
    },
    tableHeader: {
      backgroundColor: '#f9fafb',
      borderBottom: '1px solid #e5e7eb'
    },
    tableRow: {
      borderBottom: '1px solid #f3f4f6'
    },
    tableCell: {
      padding: '12px 16px',
      fontSize: '14px',
      color: '#374151'
    },
    button: {
      padding: '8px 16px',
      borderRadius: '6px',
      border: 'none',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    },
    primaryButton: {
      backgroundColor: '#3b82f6',
      color: 'white'
    },
    successButton: {
      backgroundColor: '#10b981',
      color: 'white'
    },
    dangerButton: {
      backgroundColor: '#ef4444',
      color: 'white'
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'overview') {
        const overviewData = await adminAPI.getLaboratorioOverview();
        setOverview(overviewData);
      } else if (activeTab === 'catalog') {
        const catalogData = await adminAPI.getExamCatalog();
        setCatalogData(catalogData.catalog);
      } else if (activeTab === 'mappings') {
        const mappingsData = await adminAPI.getExamMappings();
        setMappingsData(mappingsData.mappings);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const renderOverview = () => (
    <div>
      <div style={styles.overviewGrid}>
        <div style={styles.statCard}>
          <div style={{...styles.statNumber, color: '#3b82f6'}}>
            {overview.total_catalog_exams || 0}
          </div>
          <div style={styles.statLabel}>Esami Catalogo Totali</div>
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
      
      <div style={{...styles.statCard, textAlign: 'center'}}>
        <h3 style={{color: '#1f2937', marginBottom: '10px'}}>🔬 Sistema Laboratorio d'Analisi</h3>
        <p style={{color: '#6b7280', fontSize: '14px'}}>
          Gestione catalogo esami e mappature con sistema Wirgilio
        </p>
        <p style={{color: '#6b7280', fontSize: '12px', marginTop: '15px'}}>
          Ultimo aggiornamento: {new Date(overview.last_updated).toLocaleString('it-IT')}
        </p>
      </div>
    </div>
  );

  const renderCatalog = () => (
    <div>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
        <h3 style={{color: '#1f2937', margin: 0}}>Catalogo Esami Ufficiale</h3>
        <button 
          style={{...styles.button, ...styles.primaryButton}}
          onClick={() => setShowAddModal(true)}
        >
          + Aggiungi Esame
        </button>
      </div>
      
      <div style={styles.table}>
        <div style={styles.tableHeader}>
          <div style={{display: 'grid', gridTemplateColumns: '120px 120px 2fr 80px 100px 120px', alignItems: 'center'}}>
            <div style={{...styles.tableCell, fontWeight: '600'}}>Cod. Catalogo</div>
            <div style={{...styles.tableCell, fontWeight: '600'}}>Cod. Branca</div>
            <div style={{...styles.tableCell, fontWeight: '600'}}>Nome Esame</div>
            <div style={{...styles.tableCell, fontWeight: '600'}}>Struttura</div>
            <div style={{...styles.tableCell, fontWeight: '600'}}>Stato</div>
            <div style={{...styles.tableCell, fontWeight: '600'}}>Azioni</div>
          </div>
        </div>
        
        {catalogData.map(exam => (
          <div key={exam.id} style={styles.tableRow}>
            <div style={{display: 'grid', gridTemplateColumns: '120px 120px 2fr 80px 100px 120px', alignItems: 'center'}}>
              <div style={{...styles.tableCell, fontFamily: 'monospace', fontSize: '12px'}}>
                {exam.codice_catalogo}
              </div>
              <div style={{...styles.tableCell, fontFamily: 'monospace', fontSize: '12px'}}>
                {exam.codice_branca}
              </div>
              <div style={styles.tableCell}>{exam.nome_esame}</div>
              <div style={{...styles.tableCell, textAlign: 'center'}}>{exam.struttura_codice}</div>
              <div style={{...styles.tableCell, textAlign: 'center'}}>
                <span style={{
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '600',
                  backgroundColor: exam.is_enabled ? '#dcfce7' : '#fef2f2',
                  color: exam.is_enabled ? '#166534' : '#dc2626'
                }}>
                  {exam.is_enabled ? 'Attivo' : 'Disattivo'}
                </span>
              </div>
              <div style={styles.tableCell}>
                <button style={{...styles.button, ...styles.successButton, marginRight: '5px'}}>
                  Modifica
                </button>
                <button style={{...styles.button, ...styles.dangerButton}}>
                  Elimina
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>
          🔬 Gestione Laboratorio d'Analisi
        </h1>
        <p style={styles.subtitle}>
          Configurazione catalogo esami e mappature Wirgilio API
        </p>
      </div>

      <div style={styles.tabContainer}>
        {[
          {id: 'overview', label: 'Panoramica', icon: '📊'},
          {id: 'catalog', label: 'Catalogo Esami', icon: '📋'},
          {id: 'mappings', label: 'Mappature Wirgilio', icon: '🔗'},
          {id: 'settings', label: 'Configurazione', icon: '⚙️'}
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

      {loading ? (
        <div style={{textAlign: 'center', padding: '50px'}}>
          <div style={{fontSize: '18px', color: '#6b7280'}}>Caricamento...</div>
        </div>
      ) : (
        <>
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'catalog' && renderCatalog()}
          {activeTab === 'mappings' && <div>Mappings tab coming soon...</div>}
          {activeTab === 'settings' && <div>Settings tab coming soon...</div>}
        </>
      )}
    </div>
  );
};

export default LaboratorioManagement;
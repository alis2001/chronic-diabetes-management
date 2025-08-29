// frontend/timeline-app/src/DoctorSelection.js
// Doctor Selection Page - Entry point for multi-doctor system

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MEDICI, timelineAPI } from './api';
import { styles } from './styles';

export const DoctorSelection = () => {
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [serviceHealth, setServiceHealth] = useState(null);
  const navigate = useNavigate();

  React.useEffect(() => {
    checkServiceHealth();
  }, []);

  const checkServiceHealth = async () => {
    try {
      const health = await timelineAPI.health();
      setServiceHealth(health);
    } catch (error) {
      setServiceHealth({ 
        status: 'unhealthy', 
        error: error.message 
      });
    }
  };

  const handleDoctorSelect = (e) => {
    e.preventDefault();
    if (!selectedDoctor) {
      alert('Selezionare un medico');
      return;
    }
    
    // Navigate to doctor workspace
    navigate(`/doctor/${selectedDoctor}/lookup`);
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <h1>Sistema Timeline Paziente</h1>
          <p style={{margin: '5px 0 0 0', fontSize: '16px', opacity: 0.9, fontWeight: '400'}}>
            Seleziona il tuo profilo medico per accedere
          </p>
        </div>
      </div>

      {/* Doctor Selection Card */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2>👨‍⚕️ Selezione Medico</h2>
          <p style={{color: '#86868b', margin: '10px 0 0 0', fontSize: '14px'}}>
            Ogni medico avrà un workspace isolato per la gestione dei pazienti
          </p>
        </div>
        
        <form onSubmit={handleDoctorSelect} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Seleziona il tuo profilo <span style={styles.required}>*</span>
            </label>
            <select
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
              style={styles.select}
              required
            >
              <option value="">-- Seleziona medico --</option>
              {Object.entries(MEDICI).map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </div>
          
          <button type="submit" disabled={!selectedDoctor} style={
            !selectedDoctor ? styles.disabledButton : styles.primaryButton
          }>
            Accedi al Workspace
          </button>
        </form>

        {/* Quick Access Buttons */}
        <div style={{
          marginTop: '30px',
          padding: '20px',
          background: 'rgba(248, 250, 252, 0.6)',
          borderRadius: '12px',
          border: '1px solid rgba(0, 0, 0, 0.05)'
        }}>
          <h4 style={{
            margin: '0 0 15px 0',
            fontSize: '16px',
            fontWeight: '600',
            color: '#1d1d1f'
          }}>
            🚀 Accesso Rapido
          </h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '10px'
          }}>
            {Object.entries(MEDICI).map(([id, name]) => (
              <button
                key={id}
                onClick={() => navigate(`/doctor/${id}/lookup`)}
                style={{
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  background: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.backgroundColor = '#f8fafc';
                }}
                onMouseOut={(e) => {
                  e.target.style.borderColor = '#d1d5db';
                  e.target.style.backgroundColor = 'white';
                }}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Service Status */}
      <div style={{
        marginTop: '30px',
        padding: '20px',
        textAlign: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        borderRadius: '16px',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{
          fontSize: '14px',
          color: '#86868b',
          display: 'flex',
          justifyContent: 'center',
          gap: '20px',
          flexWrap: 'wrap'
        }}>
          <span>
            Servizio: <strong style={{
              color: serviceHealth?.status === 'healthy' ? '#10b981' : '#ff3b30'
            }}>
              {serviceHealth?.status === 'healthy' ? 'Online' : 'Offline'}
            </strong>
          </span>
          
          <span>Multi-Doctor v2.0.0</span>
          
          <span>Build {new Date().toISOString().split('T')[0]}</span>
        </div>

        <div style={{
          marginTop: '15px',
          display: 'flex',
          justifyContent: 'center',
          gap: '20px',
          flexWrap: 'wrap'
        }}>
          <a 
            href="http://localhost:8080/docs" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              color: '#007aff',
              textDecoration: 'none',
              fontSize: '12px',
              fontWeight: '500'
            }}
          >
            API Gateway
          </a>
          
          <a 
            href="http://localhost:8001/docs" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              color: '#007aff',
              textDecoration: 'none',
              fontSize: '12px',
              fontWeight: '500'
            }}
          >
            Timeline API
          </a>
        </div>
      </div>
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';

const DiarioApp = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfData, setPdfData] = useState(null);
  const [loadingPdf, setLoadingPdf] = useState(false);

  const cf = new URLSearchParams(window.location.search).get('cf') || '';
  
  const API_BASE = process.env.REACT_APP_API_GATEWAY_URL || 
                  `http://${window.location.hostname}:8080`;

  useEffect(() => {
    if (cf) {
      fetchDocuments();
    }
  }, [cf]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/diario/documents/${cf}`);
      
      if (!response.ok) throw new Error('Failed to fetch documents');
      
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openPdf = async (fileId) => {
    try {
      setLoadingPdf(true);
      const response = await fetch(`${API_BASE}/api/diario/pdf/${fileId}`);
      
      if (!response.ok) throw new Error('Failed to fetch PDF');
      
      const data = await response.json();
      setPdfData(data.strBase64);
      setShowPdfModal(true);
    } catch (err) {
      alert('Errore nel caricamento PDF: ' + err.message);
    } finally {
      setLoadingPdf(false);
    }
  };

  const closePdfModal = () => {
    setShowPdfModal(false);
    setPdfData(null);
  };

  if (loading) {
    return (
      <div className="diario-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Caricamento documenti...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="diario-container">
        <div className="error-container">
          <p>Errore: {error}</p>
          <button onClick={fetchDocuments} className="btn-primary">
            Riprova
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="diario-container">
      <div className="diario-header">
        <h2>📋 Diario Clinico</h2>
        <p>Documenti per CF: <strong>{cf}</strong></p>
      </div>

      <div className="table-container">
        <div className="table-header">
          <div className="header-cell">Data</div>
          <div className="header-cell">Tipo Documento</div>
          <div className="header-cell">Struttura</div>
          <div className="header-cell">Azioni</div>
        </div>
        
        {documents.length === 0 ? (
          <div className="empty-state">
            <p>Nessun documento trovato</p>
          </div>
        ) : (
          documents.map((doc, index) => (
            <div key={doc._id} className="table-row" style={{
              backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9f9f9'
            }}>
              <div className="table-cell">{doc.datadocumento}</div>
              <div className="table-cell">{doc.desdocumento}</div>
              <div className="table-cell">{doc.strutturadescrizione}</div>
              <div className="table-cell">
                <button 
                  onClick={() => openPdf(doc.fileId)}
                  disabled={loadingPdf}
                  className="btn-view"
                >
                  {loadingPdf ? 'Caricamento...' : 'Visualizza PDF'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showPdfModal && pdfData && (
        <div className="modal-overlay" onClick={closePdfModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Visualizzazione Documento</h3>
              <button onClick={closePdfModal} className="btn-close">×</button>
            </div>
            <div className="pdf-container">
              <iframe
                src={`data:application/pdf;base64,${pdfData}`}
                className="pdf-frame"
                title="PDF Document"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<DiarioApp />);
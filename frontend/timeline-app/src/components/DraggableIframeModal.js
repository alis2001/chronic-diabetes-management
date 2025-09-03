// frontend/timeline-app/src/components/DraggableIframeModal.js
// Seamless Analytics Integration - No Window Chrome, Large Size, Timeline Integration
// Clean iframe that appears as part of the timeline interface

import React, { useRef, useEffect } from 'react';

const DraggableIframeModal = ({ 
  isOpen, 
  onClose, 
  patientId, 
  doctorId,
  title = "🧪 Analytics Laboratorio" 
}) => {
  // Refs
  const iframeRef = useRef(null);

  // Analytics iframe URL with parameters
  const analyticsUrl = `http://localhost:3011?cf=${patientId}&doctor_id=${doctorId}&embedded=true`;
  
  // Large size - full viewport minus margin
  const size = { 
    width: window.innerWidth - 40, 
    height: window.innerHeight - 40 
  };

  // ================================
  // IFRAME COMMUNICATION
  // ================================

  useEffect(() => {
    const handleIframeMessage = (event) => {
      if (event.origin !== 'http://localhost:3011') return;
      
      console.log('📨 Message from Analytics iframe:', event.data);
      
      switch (event.data.type) {
        case 'ANALYTICS_READY':
          console.log('✅ Analytics iframe is ready');
          break;
        case 'ANALYTICS_HEIGHT_CHANGE':
          // Handle dynamic height if needed
          break;
        default:
          break;
      }
    };

    window.addEventListener('message', handleIframeMessage);
    return () => window.removeEventListener('message', handleIframeMessage);
  }, []);

  // ================================
  // STYLES - SEAMLESS INTEGRATION
  // ================================

  const modalStyles = {
    position: 'fixed',
    top: '20px',
    left: '20px',
    width: size.width,
    height: size.height,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: '24px',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 10px 20px rgba(0, 0, 0, 0.1)',
    backdropFilter: 'blur(40px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
    zIndex: 1000
  };

  const iframeStyles = {
    width: '100%',
    height: '100%',
    border: 'none',
    borderRadius: '24px',
    backgroundColor: 'white'
  };

  // ================================
  // RENDER
  // ================================

  if (!isOpen) return null;

  return (
    <div style={modalStyles}>
      <iframe
        ref={iframeRef}
        src={analyticsUrl}
        style={iframeStyles}
        title="Analytics Laboratorio"
        allow="clipboard-read; clipboard-write"
        sandbox="allow-scripts allow-same-origin allow-forms allow-downloads"
      />
    </div>
  );
};

export default DraggableIframeModal;
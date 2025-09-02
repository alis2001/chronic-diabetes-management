// frontend/timeline-app/src/components/DraggableIframeModal.js
// Professional Draggable Modal using react-draggable with iframe handling
// Reliable, performant, and production-ready implementation

import React, { useState, useRef, useEffect } from 'react';
import Draggable from 'react-draggable';

const DraggableIframeModal = ({ 
  isOpen, 
  onClose, 
  patientId, 
  doctorId,
  title = "🧪 Analytics Laboratorio" 
}) => {
  // Modal state
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [size, setSize] = useState({ width: 900, height: 600 });

  // Refs
  const dragRef = useRef(null);
  const iframeRef = useRef(null);

  // Analytics iframe URL with parameters
  const analyticsUrl = `http://localhost:3011?cf=${patientId}&doctor_id=${doctorId}&embedded=true`;

  // ================================
  // WINDOW CONTROLS
  // ================================

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const handleMaximize = () => {
    if (isMaximized) {
      setIsMaximized(false);
      setPosition({ x: 100, y: 100 });
      setSize({ width: 900, height: 600 });
    } else {
      setIsMaximized(true);
      setPosition({ x: 20, y: 20 });
      setSize({ 
        width: window.innerWidth - 40, 
        height: window.innerHeight - 40 
      });
    }
  };

  // ================================
  // DRAG EVENT HANDLERS
  // ================================

  const handleDragStart = (e, data) => {
    setIsDragging(true);
    setPosition({ x: data.x, y: data.y });
  };

  const handleDrag = (e, data) => {
    setPosition({ x: data.x, y: data.y });
  };

  const handleDragStop = (e, data) => {
    setIsDragging(false);
    setPosition({ x: data.x, y: data.y });
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
      }
    };

    window.addEventListener('message', handleIframeMessage);
    return () => window.removeEventListener('message', handleIframeMessage);
  }, []);

  // ================================
  // STYLES
  // ================================

  const modalStyles = {
    width: isMaximized ? size.width : (isMinimized ? 300 : size.width),
    height: isMaximized ? size.height : (isMinimized ? 60 : size.height),
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: isMaximized ? '0px' : '20px',
    boxShadow: isDragging 
      ? '0 25px 50px rgba(0, 0, 0, 0.4), 0 15px 30px rgba(0, 0, 0, 0.2)'
      : '0 20px 40px rgba(0, 0, 0, 0.3), 0 10px 20px rgba(0, 0, 0, 0.15)',
    backdropFilter: 'blur(40px)',
    border: '2px solid rgba(245, 158, 11, 0.3)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    transform: isDragging ? 'scale(1.02)' : 'scale(1)',
    transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    cursor: isDragging ? 'grabbing' : 'default'
  };

  const headerStyles = {
    padding: '20px 25px',
    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(251, 191, 36, 0.05) 100%)',
    borderBottom: '2px solid rgba(245, 158, 11, 0.15)',
    cursor: 'grab',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    MozUserSelect: 'none',
    msUserSelect: 'none'
  };

  const titleStyles = {
    fontSize: '18px',
    fontWeight: '700',
    color: '#d97706',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  };

  const controlsStyles = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  };

  const buttonStyles = {
    width: '28px',
    height: '28px',
    border: 'none',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s ease'
  };

  const minimizeButtonStyles = {
    ...buttonStyles,
    backgroundColor: '#fbbf24',
    color: 'white'
  };

  const maximizeButtonStyles = {
    ...buttonStyles,
    backgroundColor: '#10b981',
    color: 'white'
  };

  const closeButtonStyles = {
    ...buttonStyles,
    backgroundColor: '#ef4444',
    color: 'white'
  };

  const iframeContainerStyles = {
    flex: 1,
    padding: '20px',
    overflow: 'hidden',
    position: 'relative'
  };

  const iframeStyles = {
    width: '100%',
    height: '100%',
    border: 'none',
    borderRadius: '12px',
    backgroundColor: 'white',
    // Critical: Disable pointer events during drag to prevent iframe interference
    pointerEvents: isDragging ? 'none' : 'auto'
  };

  // Overlay to prevent iframe event capture during drag
  const overlayStyles = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    backgroundColor: 'transparent',
    display: isDragging ? 'block' : 'none'
  };

  if (!isOpen) return null;

  return (
    <Draggable
      nodeRef={dragRef}
      handle=".drag-handle"
      position={position}
      onStart={handleDragStart}
      onDrag={handleDrag}
      onStop={handleDragStop}
      bounds="parent"
      disabled={isMaximized}
    >
      <div ref={dragRef} style={modalStyles}>
        {/* Header with drag handle */}
        <div 
          className="drag-handle"
          style={headerStyles}
        >
          <h3 style={titleStyles}>{title}</h3>
          <div style={controlsStyles}>
            <button
              style={minimizeButtonStyles}
              onClick={handleMinimize}
              title={isMinimized ? "Expand" : "Minimize"}
              onMouseOver={(e) => e.target.style.backgroundColor = '#f59e0b'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#fbbf24'}
            >
              {isMinimized ? '📖' : '➖'}
            </button>
            <button
              style={maximizeButtonStyles}
              onClick={handleMaximize}
              title={isMaximized ? "Restore" : "Maximize"}
              onMouseOver={(e) => e.target.style.backgroundColor = '#059669'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#10b981'}
            >
              {isMaximized ? '🗗' : '🗖'}
            </button>
            <button
              style={closeButtonStyles}
              onClick={onClose}
              title="Close"
              onMouseOver={(e) => e.target.style.backgroundColor = '#dc2626'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#ef4444'}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content - Analytics Iframe */}
        {!isMinimized && (
          <div style={iframeContainerStyles}>
            {/* Transparent overlay to prevent iframe interference during drag */}
            <div style={overlayStyles} />
            
            <iframe
              ref={iframeRef}
              src={analyticsUrl}
              style={iframeStyles}
              title="Analytics Laboratorio"
              allow="clipboard-read; clipboard-write"
              sandbox="allow-scripts allow-same-origin allow-forms allow-downloads"
            />
          </div>
        )}
      </div>
    </Draggable>
  );
};

export default DraggableIframeModal;
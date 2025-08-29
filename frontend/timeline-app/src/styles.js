// frontend/timeline-app/src/styles.js
// Complete Professional Healthcare Design - Apple-Inspired Timeline
// 🔥 STEP 1: ONLY Modal styling improvements - no other changes

export const styles = {
  // ================================
  // LAYOUT PRINCIPALE
  // ================================
  
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    lineHeight: '1.6',
    color: '#1d1d1f',
    backgroundColor: '#f0f8ff',
    minHeight: '100vh'
  },

  // ================================
  // HEADER - CLEAN
  // ================================

  header: {
    background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #06b6d4 100%)',
    color: 'white',
    padding: '20px 30px',
    borderRadius: '16px',
    marginBottom: '30px',
    boxShadow: '0 10px 40px rgba(59, 130, 246, 0.2)'
  },

  headerContent: {
    position: 'relative',
    zIndex: 2
  },

  // ================================
  // CARDS & CONTAINERS
  // ================================

  card: {
    background: 'rgba(255, 255, 255, 0.95)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '20px',
    padding: '30px',
    marginBottom: '25px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
    backdropFilter: 'blur(20px)',
    transition: 'all 0.3s ease'
  },

  cardHeader: {
    marginBottom: '25px',
    paddingBottom: '15px',
    borderBottom: '1px solid rgba(0, 0, 0, 0.05)'
  },

  // ================================
  // INNOVATIVE SCROLLABLE TIMELINE
  // ================================

  timelineContainer: {
    background: 'rgba(255, 255, 255, 0.98)',
    borderRadius: '24px',
    padding: '40px 20px',
    margin: '30px 0',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)',
    backdropFilter: 'blur(30px)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    overflow: 'hidden'
  },

  timelineWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    height: '140px',
    width: '100%'
  },

  timelineLine: {
    position: 'absolute',
    top: '50%',
    left: '0',
    right: '0',
    height: '6px',
    background: 'linear-gradient(90deg, #8b5cf6 0%, #10b981 50%, #6b7280 100%)',
    borderRadius: '3px',
    zIndex: 1,
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
  },

  pastSection: {
    display: 'flex',
    alignItems: 'center',
    width: '40%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden'
  },

  pastScrollContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '30px',
    paddingRight: '20px',
    overflowX: 'auto',
    scrollBehavior: 'smooth',
    width: '100%',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none'
  },

  todaySection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '20%',
    height: '100%',
    position: 'relative',
    zIndex: 10
  },

  futureSection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: '40%',
    height: '100%',
    position: 'relative',
    paddingLeft: '20px'
  },

  timelinePoint: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    border: '4px solid white',
    cursor: 'pointer',
    transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '11px',
    color: 'white',
    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
    position: 'relative',
    zIndex: 5,
    flexShrink: 0,
    userSelect: 'none'
  },

  pastPoint: {
    backgroundColor: '#8b5cf6',
    ':hover': {
      transform: 'scale(1.2)',
      boxShadow: '0 12px 35px rgba(139, 92, 246, 0.4)'
    }
  },

  todayPoint: {
    backgroundColor: '#10b981',
    transform: 'scale(1.3)',
    boxShadow: '0 12px 35px rgba(16, 185, 129, 0.4)',
    animation: 'pulseGlow 3s ease-in-out infinite',
    ':hover': {
      transform: 'scale(1.4)',
      boxShadow: '0 15px 45px rgba(16, 185, 129, 0.5)'
    }
  },

  futurePoint: {
    backgroundColor: '#6b7280',
    ':hover': {
      transform: 'scale(1.2)',
      boxShadow: '0 12px 35px rgba(107, 114, 128, 0.4)'
    }
  },

  pointLabel: {
    position: 'absolute',
    bottom: '-45px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(255, 255, 255, 0.95)',
    padding: '6px 12px',
    borderRadius: '16px',
    fontSize: '11px',
    fontWeight: '600',
    color: '#374151',
    border: '1px solid rgba(0, 0, 0, 0.05)',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
    whiteSpace: 'nowrap',
    minWidth: '70px',
    textAlign: 'center',
    backdropFilter: 'blur(10px)'
  },

  scrollIndicator: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.95)',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '16px',
    color: '#6b7280',
    transition: 'all 0.3s ease',
    zIndex: 10,
    backdropFilter: 'blur(10px)',
    ':hover': {
      backgroundColor: 'white',
      borderColor: '#8b5cf6',
      color: '#8b5cf6',
      transform: 'translateY(-50%) scale(1.1)'
    }
  },

  leftScrollIndicator: {
    left: '15px'
  },

  // ================================
  // 🔥 FIXED APPLE-INSPIRED MODAL DESIGN (STEP 1 CHANGES ONLY)
  // ================================

  noteModal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    backdropFilter: 'blur(25px)',
    padding: '20px',
    animation: 'modalFadeIn 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
  },

  noteModalContent: {
    background: 'rgba(255, 255, 255, 0.98)',
    borderRadius: '28px',
    padding: '0',
    width: '90vw',
    height: '85vh',
    maxWidth: '750px',
    maxHeight: '850px',
    minWidth: '600px',
    minHeight: '700px',
    boxShadow: `
      0 50px 100px -20px rgba(0, 0, 0, 0.4),
      0 30px 60px -20px rgba(0, 0, 0, 0.2),
      0 0 0 1px rgba(255, 255, 255, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.5)
    `,
    backdropFilter: 'blur(40px)',
    border: '3px solid rgba(255, 255, 255, 0.4)',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    transform: 'scale(0.85) translateY(30px)',
    animation: 'modalSlideUp 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards'
  },

  noteModalHeader: {
    padding: '40px 40px 35px 40px',
    borderBottom: '2px solid rgba(0, 0, 0, 0.06)',
    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.95) 100%)',
    position: 'relative',
    flexShrink: 0
  },

  noteModalTitle: {
    fontSize: '30px',
    fontWeight: '700',
    color: '#1d1d1f',
    margin: '0 0 12px 0',
    letterSpacing: '-0.02em',
    lineHeight: '1.2'
  },

  noteModalSubtitle: {
    fontSize: '18px',
    color: '#86868b',
    margin: '0',
    fontWeight: '500'
  },

  appleCloseButton: {
    position: 'absolute',
    top: '35px',
    right: '35px',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#ff5f57',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
    color: '#fff',
    fontWeight: '700',
    transition: 'all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    boxShadow: '0 4px 15px rgba(255, 95, 87, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
    ':hover': {
      backgroundColor: '#e04e41',
      transform: 'scale(1.08)',
      boxShadow: '0 6px 20px rgba(255, 95, 87, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
    },
    ':active': {
      transform: 'scale(0.95)'
    }
  },

  noteModalBody: {
    flex: 1,
    padding: '35px 40px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minHeight: 0
  },

  appleNoteTextarea: {
    width: '100%',
    flex: 1,
    padding: '30px',
    border: '2px solid rgba(0, 0, 0, 0.08)',
    borderRadius: '22px',
    fontSize: '18px',
    lineHeight: '1.6',
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
    resize: 'none',
    backgroundColor: 'rgba(245, 245, 247, 0.8)',
    transition: 'all 0.3s ease',
    outline: 'none',
    boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.03)',
    minHeight: '350px',
    ':focus': {
      backgroundColor: 'rgba(245, 245, 247, 0.95)',
      borderColor: 'rgba(0, 125, 251, 0.5)',
      boxShadow: '0 0 0 6px rgba(0, 125, 251, 0.15), inset 0 2px 10px rgba(0, 0, 0, 0.03)'
    },
    '::placeholder': {
      color: '#86868b',
      fontSize: '18px'
    }
  },

  noteModalFooter: {
    padding: '30px 40px 40px 40px',
    borderTop: '2px solid rgba(0, 0, 0, 0.06)',
    background: 'rgba(248, 250, 252, 0.8)',
    display: 'flex',
    gap: '20px',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    flexShrink: 0
  },

  appleCancelButton: {
    padding: '18px 36px',
    border: '2px solid rgba(0, 0, 0, 0.12)',
    borderRadius: '16px',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    color: '#1d1d1f',
    fontSize: '18px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
    ':hover': {
      backgroundColor: 'rgba(0, 0, 0, 0.05)',
      borderColor: 'rgba(0, 0, 0, 0.25)',
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
    }
  },

  appleSaveButton: {
    padding: '18px 36px',
    border: 'none',
    borderRadius: '16px',
    backgroundColor: '#007aff',
    color: 'white',
    fontSize: '18px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    boxShadow: '0 4px 15px rgba(0, 122, 255, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
    ':hover': {
      backgroundColor: '#0051d0',
      transform: 'translateY(-1px)',
      boxShadow: '0 6px 20px rgba(0, 122, 255, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
    },
    ':disabled': {
      backgroundColor: '#86868b',
      cursor: 'not-allowed',
      transform: 'none',
      boxShadow: 'none'
    }
  },

  appleEditButton: {
    padding: '18px 36px',
    border: 'none',
    borderRadius: '16px',
    backgroundColor: '#ff9500',
    color: 'white',
    fontSize: '18px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    boxShadow: '0 4px 15px rgba(255, 149, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
    ':hover': {
      backgroundColor: '#e6830e',
      transform: 'translateY(-1px)',
      boxShadow: '0 6px 20px rgba(255, 149, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
    }
  },

  appleCancelAppointmentButton: {
    padding: '18px 36px',
    border: 'none',
    borderRadius: '16px',
    backgroundColor: '#ff3b30',
    color: 'white',
    fontSize: '18px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    boxShadow: '0 4px 15px rgba(255, 59, 48, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
    ':hover': {
      backgroundColor: '#d70015',
      transform: 'translateY(-1px)',
      boxShadow: '0 6px 20px rgba(255, 59, 48, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
    }
  },

  characterCounter: {
    fontSize: '15px',
    color: '#86868b',
    marginTop: '18px',
    textAlign: 'right',
    fontWeight: '500'
  },

  futureAppointmentWarning: {
    background: 'rgba(255, 204, 0, 0.12)',
    border: '2px solid rgba(255, 204, 0, 0.3)',
    borderRadius: '18px',
    padding: '22px',
    marginBottom: '28px',
    fontSize: '16px',
    color: '#b25000',
    textAlign: 'center',
    fontWeight: '600'
  },

  // ================================
  // REST OF STYLES (UNCHANGED)
  // ================================

  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '25px'
  },

  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },

  label: {
    fontWeight: '600',
    color: '#1d1d1f',
    fontSize: '16px',
    marginBottom: '8px'
  },

  required: {
    color: '#ff3b30',
    marginLeft: '4px'
  },

  input: {
    padding: '16px 20px',
    border: '2px solid #d1d5db',
    borderRadius: '12px',
    fontSize: '16px',
    transition: 'all 0.2s ease',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    ':focus': {
      borderColor: '#007aff',
      outline: 'none',
      boxShadow: '0 0 0 4px rgba(0, 122, 255, 0.15)',
      backgroundColor: 'white'
    }
  },

  select: {
    padding: '16px 20px',
    border: '2px solid #d1d5db',
    borderRadius: '12px',
    fontSize: '16px',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    cursor: 'pointer',
    ':focus': {
      borderColor: '#007aff',
      outline: 'none',
      boxShadow: '0 0 0 4px rgba(0, 122, 255, 0.15)'
    }
  },

  textarea: {
    padding: '16px 20px',
    border: '2px solid #d1d5db',
    borderRadius: '12px',
    fontSize: '16px',
    minHeight: '140px',
    resize: 'vertical',
    fontFamily: 'inherit',
    lineHeight: '1.6',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    ':focus': {
      borderColor: '#007aff',
      outline: 'none',
      boxShadow: '0 0 0 4px rgba(0, 122, 255, 0.15)'
    }
  },

  primaryButton: {
    background: 'linear-gradient(135deg, #007aff 0%, #0051d0 100%)',
    color: 'white',
    padding: '16px 32px',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 20px rgba(0, 122, 255, 0.3)',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 30px rgba(0, 122, 255, 0.4)'
    },
    ':disabled': {
      backgroundColor: '#86868b',
      cursor: 'not-allowed',
      transform: 'none',
      boxShadow: 'none'
    }
  },

  successButton: {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    padding: '16px 32px',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 30px rgba(16, 185, 129, 0.4)'
    }
  },

  secondaryButton: {
    background: 'rgba(255, 255, 255, 0.9)',
    color: '#1d1d1f',
    padding: '16px 32px',
    border: '2px solid #d1d5db',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    ':hover': {
      backgroundColor: 'rgba(0, 0, 0, 0.04)',
      borderColor: '#9ca3af',
      transform: 'translateY(-1px)'
    }
  },

  disabledButton: {
    background: '#f3f4f6',
    color: '#9ca3af',
    padding: '16px 32px',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    cursor: 'not-allowed',
    fontSize: '16px',
    fontWeight: '600',
    opacity: 0.6
  },

  patientInfo: {
    background: 'rgba(255, 255, 255, 0.95)',
    padding: '30px',
    borderRadius: '20px',
    marginBottom: '30px',
    border: '1px solid rgba(0, 0, 0, 0.05)',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)',
    backdropFilter: 'blur(10px)'
  },

  patientInfoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '25px'
  },

  patientInfoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },

  patientInfoLabel: {
    fontSize: '13px',
    color: '#86868b',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },

  patientInfoValue: {
    fontSize: '18px',
    color: '#1d1d1f',
    fontWeight: '600'
  },

  registrationSection: {
    marginBottom: '30px',
    padding: '30px',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: '16px',
    border: '1px solid rgba(0, 0, 0, 0.05)'
  },

  sectionTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1d1d1f',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },

  readOnlyLabel: {
    fontSize: '12px',
    color: '#ff3b30',
    fontWeight: '600',
    background: 'rgba(255, 59, 48, 0.1)',
    padding: '4px 8px',
    borderRadius: '6px'
  },

  editableLabel: {
    fontSize: '12px',
    color: '#10b981',
    fontWeight: '600',
    background: 'rgba(16, 185, 129, 0.1)',
    padding: '4px 8px',
    borderRadius: '6px'
  },

  loadingState: {
    textAlign: 'center',
    padding: '80px',
    color: '#86868b',
    fontSize: '18px'
  },

  errorState: {
    textAlign: 'center',
    padding: '80px',
    color: '#ff3b30',
    fontSize: '18px'
  },

  emptyState: {
    textAlign: 'center',
    padding: '60px',
    color: '#86868b',
    fontStyle: 'italic',
    fontSize: '16px'
  }
};

// ================================
// CSS ANIMATIONS (UNCHANGED)
// ================================

export const globalStyles = `
  @keyframes pulseGlow {
    0%, 100% { 
      opacity: 1; 
      box-shadow: 0 12px 35px rgba(16, 185, 129, 0.4);
    }
    50% { 
      opacity: 0.8; 
      box-shadow: 0 8px 25px rgba(16, 185, 129, 0.6);
    }
  }
  
  @keyframes modalFadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  
  @keyframes modalSlideUp {
    from {
      transform: scale(0.85) translateY(30px);
      opacity: 0;
    }
    to {
      transform: scale(1) translateY(0);
      opacity: 1;
    }
  }
  
  body {
    margin: 0;
    padding: 0;
    background: linear-gradient(135deg, #f0f8ff 0%, #e0f2fe 100%);
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;
  }
  
  * {
    box-sizing: border-box;
  }
  
  /* Hide scrollbar for past appointments */
  .past-scroll-container::-webkit-scrollbar {
    display: none;
  }
  
  .past-scroll-container {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  
  /* Smooth focus transitions */
  input:focus,
  select:focus,
  textarea:focus {
    transition: all 0.2s ease;
  }
  
  /* Button hover effects */
  button:not(:disabled) {
    transform-origin: center;
  }
  
  /* Apple-style selection */
  ::selection {
    background-color: rgba(0, 122, 255, 0.2);
  }

  /* Mobile responsive modal */
  @media (max-width: 768px) {
    .note-modal-content {
      width: 95vw !important;
      height: 90vh !important;
      min-width: unset !important;
    }
  }
`;
import React, { useState, useRef, useEffect } from 'react';
import './ZoomControl.css';

const ZoomControl = ({ className = '', style = {} }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(() => {
    const saved = parseFloat(localStorage.getItem('zoomLevel')) || 1;
    return saved;
  });
  const dropdownRef = useRef(null);

  const zoomLevels = [
    { value: 0.5, label: '50%', icon: '🔍' },
    { value: 0.75, label: '75%', icon: '🔍' },
    { value: 1, label: '100%', icon: '🔍' },
    { value: 1.25, label: '125%', icon: '🔍' },
    { value: 1.5, label: '150%', icon: '🔍' },
    { value: 2, label: '200%', icon: '🔍' }
  ];

  const setZoom = (zoomLevel) => {
    document.body.style.zoom = zoomLevel.toString();
    localStorage.setItem('zoomLevel', zoomLevel);
    setCurrentZoom(zoomLevel);
    setIsOpen(false);
  };

  const increaseZoom = () => {
    const currentIndex = zoomLevels.findIndex(level => level.value === currentZoom);
    if (currentIndex < zoomLevels.length - 1) {
      setZoom(zoomLevels[currentIndex + 1].value);
    }
  };

  const decreaseZoom = () => {
    const currentIndex = zoomLevels.findIndex(level => level.value === currentZoom);
    if (currentIndex > 0) {
      setZoom(zoomLevels[currentIndex - 1].value);
    }
  };

  const resetZoom = () => {
    setZoom(1);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen]);

  // Update current zoom if it changes externally
  useEffect(() => {
    const interval = setInterval(() => {
      const savedZoom = parseFloat(localStorage.getItem('zoomLevel')) || 1;
      if (savedZoom !== currentZoom) {
        setCurrentZoom(savedZoom);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentZoom]);

  const getCurrentZoomLabel = () => {
    const level = zoomLevels.find(level => level.value === currentZoom);
    return level ? level.label : `${Math.round(currentZoom * 100)}%`;
  };

  return (
    <div className={`zoom-control-dropdown ${className}`} style={style} ref={dropdownRef}>
      <button
        className={`btn btn-outline-secondary dropdown-toggle zoom-btn ${isOpen ? 'show' : ''}`}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Zoom control"
      >
        <span className="zoom-icon">🔍</span>
        <span className="zoom-text">{getCurrentZoomLabel()}</span>
      </button>
      
      <div className={`dropdown-menu zoom-dropdown ${isOpen ? 'show' : ''}`}>
        <h6 className="dropdown-header">
          <i className="bi bi-zoom-in me-2"></i>
          Zoom Level
        </h6>
        <div className="dropdown-divider"></div>
        
        {/* Quick actions */}
        <div className="zoom-quick-actions">
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={decreaseZoom}
            disabled={currentZoom <= zoomLevels[0].value}
            title="Zoom Out"
          >
            <i className="bi bi-dash-lg"></i>
          </button>
          <button
            className="btn btn-sm btn-outline-primary"
            onClick={resetZoom}
            title="Reset to 100%"
          >
            <i className="bi bi-arrow-clockwise"></i>
          </button>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={increaseZoom}
            disabled={currentZoom >= zoomLevels[zoomLevels.length - 1].value}
            title="Zoom In"
          >
            <i className="bi bi-plus-lg"></i>
          </button>
        </div>
        
        <div className="dropdown-divider"></div>
        
        {/* Zoom level options */}
        {zoomLevels.map((level) => (
          <button
            key={level.value}
            className={`dropdown-item zoom-option ${currentZoom === level.value ? 'active' : ''}`}
            onClick={() => setZoom(level.value)}
            type="button"
          >
            <span className="zoom-option-icon me-2">{level.icon}</span>
            <div className="zoom-info">
              <span className="zoom-label">{level.label}</span>
              {level.value === 1 && (
                <small className="zoom-default text-muted">Default</small>
              )}
            </div>
            {currentZoom === level.value && (
              <i className="bi bi-check-lg text-success ms-auto"></i>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ZoomControl;

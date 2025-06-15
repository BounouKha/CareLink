import React, { useState, useRef, useEffect } from 'react';
import './AccessibilityControls.css';

const AccessibilityControls = ({ className = '', style = {} }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [contrastMode, setContrastMode] = useState(() => {
    return localStorage.getItem('carelink-contrast-mode') || 'normal';
  });
  const [fontSize, setFontSize] = useState(() => {
    return localStorage.getItem('carelink-font-size') || 'normal';
  });
  const dropdownRef = useRef(null);

  const contrastModes = [
    { value: 'normal', label: 'Normal Contrast', icon: '🎨' },
    { value: 'high', label: 'High Contrast', icon: '⚫' },
    { value: 'yellow-black', label: 'Yellow/Black', icon: '🟨' },
    { value: 'white-blue', label: 'White/Blue', icon: '🔵' }
  ];

  const fontSizes = [
    { value: 'small', label: 'Small Text', multiplier: 0.9 },
    { value: 'normal', label: 'Normal Text', multiplier: 1.0 },
    { value: 'large', label: 'Large Text', multiplier: 1.2 },
    { value: 'extra-large', label: 'Extra Large', multiplier: 1.5 }
  ];

  const applyContrastMode = (mode) => {
    const body = document.body;
    
    // Remove existing contrast classes
    body.classList.remove('contrast-normal', 'contrast-high', 'contrast-yellow-black', 'contrast-white-blue');
    
    // Apply new contrast class
    body.classList.add(`contrast-${mode}`);
    
    setContrastMode(mode);
    localStorage.setItem('carelink-contrast-mode', mode);
    setIsOpen(false);
  };

  const applyFontSize = (size) => {
    const fontData = fontSizes.find(f => f.value === size);
    if (fontData) {
      document.documentElement.style.fontSize = `${fontData.multiplier * 16}px`;
      setFontSize(size);
      localStorage.setItem('carelink-font-size', size);
      setIsOpen(false);
    }
  };

  const resetAccessibility = () => {
    document.body.classList.remove('contrast-normal', 'contrast-high', 'contrast-yellow-black', 'contrast-white-blue');
    document.body.classList.add('contrast-normal');
    document.documentElement.style.fontSize = '16px';
    setContrastMode('normal');
    setFontSize('normal');
    localStorage.setItem('carelink-contrast-mode', 'normal');
    localStorage.setItem('carelink-font-size', 'normal');
    setIsOpen(false);
  };

  // Apply saved settings on mount
  useEffect(() => {
    applyContrastMode(contrastMode);
    const fontData = fontSizes.find(f => f.value === fontSize);
    if (fontData) {
      document.documentElement.style.fontSize = `${fontData.multiplier * 16}px`;
    }
  }, []);

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

  const getCurrentContrastLabel = () => {
    const mode = contrastModes.find(m => m.value === contrastMode);
    return mode ? mode.label : 'Normal';
  };

  const getCurrentFontLabel = () => {
    const font = fontSizes.find(f => f.value === fontSize);
    return font ? font.label : 'Normal';
  };

  return (
    <div className={`accessibility-controls-dropdown ${className}`} style={style} ref={dropdownRef}>
      <button
        className={`btn btn-outline-secondary dropdown-toggle accessibility-btn ${isOpen ? 'show' : ''}`}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Accessibility controls"
        title="Accessibility Settings"
      >
        <span className="accessibility-icon">♿</span>
        <span className="accessibility-text">A11y</span>
      </button>
      
      <div className={`dropdown-menu accessibility-dropdown ${isOpen ? 'show' : ''}`}>
        <h6 className="dropdown-header">
          <i className="bi bi-universal-access me-2"></i>
          Accessibility Settings
        </h6>
        <div className="dropdown-divider"></div>
        
        {/* Contrast Settings */}
        <div className="accessibility-section">
          <h6 className="section-title">Contrast Mode</h6>
          <small className="section-subtitle">Current: {getCurrentContrastLabel()}</small>
          
          {contrastModes.map((mode) => (
            <button
              key={mode.value}
              className={`dropdown-item accessibility-option ${contrastMode === mode.value ? 'active' : ''}`}
              onClick={() => applyContrastMode(mode.value)}
              type="button"
            >
              <span className="option-icon me-2">{mode.icon}</span>
              <div className="option-info">
                <span className="option-label">{mode.label}</span>
              </div>
              {contrastMode === mode.value && (
                <i className="bi bi-check-lg text-success ms-auto"></i>
              )}
            </button>
          ))}
        </div>
        
        <div className="dropdown-divider"></div>
        
        {/* Font Size Settings */}
        <div className="accessibility-section">
          <h6 className="section-title">Font Size</h6>
          <small className="section-subtitle">Current: {getCurrentFontLabel()}</small>
          
          {fontSizes.map((font) => (
            <button
              key={font.value}
              className={`dropdown-item accessibility-option ${fontSize === font.value ? 'active' : ''}`}
              onClick={() => applyFontSize(font.value)}
              type="button"
            >
              <span className="option-icon me-2" style={{fontSize: `${font.multiplier}em`}}>Aa</span>
              <div className="option-info">
                <span className="option-label">{font.label}</span>
                <small className="option-detail">×{font.multiplier}</small>
              </div>
              {fontSize === font.value && (
                <i className="bi bi-check-lg text-success ms-auto"></i>
              )}
            </button>
          ))}
        </div>
        
        <div className="dropdown-divider"></div>
        
        {/* Reset Button */}
        <button
          className="dropdown-item accessibility-reset"
          onClick={resetAccessibility}
          type="button"
        >
          <span className="option-icon me-2">🔄</span>
          <span className="option-label">Reset to Default</span>
        </button>
      </div>
    </div>
  );
};

export default AccessibilityControls;

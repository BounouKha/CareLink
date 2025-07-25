import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './LanguageSwitcher.css';

const LanguageSwitcher = ({ className = '', style = {} }) => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸', nativeName: 'English' },
    { code: 'nl', name: 'Dutch', flag: '🇳🇱', nativeName: 'Nederlands' },
    { code: 'fr', name: 'French', flag: '🇫🇷', nativeName: 'Français' }
  ];

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const changeLanguage = (languageCode) => {
    i18n.changeLanguage(languageCode);
    localStorage.setItem('carelink-language', languageCode);
    setIsOpen(false);
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

  return (
    <div className={`language-switcher-dropdown ${className}`} style={style} ref={dropdownRef}>
      <button
        className={`btn btn-outline-secondary dropdown-toggle language-btn ${isOpen ? 'show' : ''}`}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Select language"
      >
        <span className="flag-icon">{currentLanguage.flag}</span>
        <span className="language-text">{currentLanguage.nativeName}</span>
      </button>
      
      <div className={`dropdown-menu language-dropdown ${isOpen ? 'show' : ''}`}>
        <h6 className="dropdown-header">
          <i className="bi bi-translate me-2"></i>
          Choose Language
        </h6>
        <div className="dropdown-divider"></div>
        {languages.map((language) => (
          <button
            key={language.code}
            className={`dropdown-item language-option ${i18n.language === language.code ? 'active' : ''}`}
            onClick={() => changeLanguage(language.code)}
            type="button"
          >
            <span className="flag-icon me-2">{language.flag}</span>
            <div className="language-info">
              <span className="language-native">{language.nativeName}</span>
              {language.nativeName !== language.name && (
                <small className="language-english text-muted">{language.name}</small>
              )}
            </div>
            {i18n.language === language.code && (
              <i className="bi bi-check-lg text-success ms-auto"></i>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LanguageSwitcher;



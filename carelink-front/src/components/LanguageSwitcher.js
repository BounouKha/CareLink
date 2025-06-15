import React from 'react';
import { useTranslation } from 'react-i18next';
import './LanguageSwitcher.css';

const LanguageSwitcher = ({ className = '', style = {} }) => {
  const { i18n } = useTranslation();

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' }
  ];

  const changeLanguage = (languageCode) => {
    i18n.changeLanguage(languageCode);
    localStorage.setItem('carelink-language', languageCode);
  };

  return (
    <div className={`header-language-switcher ${className}`} style={style}>
      {languages.map((language) => (
        <button
          key={language.code}
          className={`language-flag ${i18n.language === language.code ? 'active' : ''}`}
          onClick={() => changeLanguage(language.code)}
          title={language.name}
          aria-label={`Switch to ${language.name}`}
        >
          <span className="flag">{language.flag}</span>
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;



import React, { useState } from 'react';
import CookieConsent from './CookieConsent';

const CookieSettingsButton = () => {
  const [showBanner, setShowBanner] = useState(false);

  return (
    <>
      <button
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 10000,
          background: '#22C7EE',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: 48,
          height: 48,
          fontSize: 24,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          cursor: 'pointer',
        }}
        aria-label="Cookie Settings"
        onClick={() => setShowBanner(true)}
      >
        🍪
      </button>
      {showBanner && (
        <CookieConsent key="manual-banner" forceShow onClose={() => setShowBanner(false)} />
      )}
    </>
  );
};

export default CookieSettingsButton; 
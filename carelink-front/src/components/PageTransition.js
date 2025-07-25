import React from 'react';
import { usePageTransition } from '../hooks/usePageTransition';
import { SpinnerOnly } from './LoadingComponents';

/**
 * Page Transition Wrapper
 * Shows a loading spinner during page transitions
 */
export const PageTransition = ({ children, delay = 200 }) => {
  const { isTransitioning, isPageReady } = usePageTransition(delay);

  if (isTransitioning) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        animation: 'fadeIn 0.2s ease-out'
      }}>
        <SpinnerOnly size="large" />
      </div>
    );
  }

  return (
    <div style={{
      opacity: isPageReady ? 1 : 0,
      transition: 'opacity 0.3s ease-in-out'
    }}>
      {children}
    </div>
  );
};

export default PageTransition;

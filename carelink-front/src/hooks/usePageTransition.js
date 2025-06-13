import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Hook for managing page transition loading states
 * Shows a loading spinner when navigating between pages
 */
export const usePageTransition = (delay = 300) => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPageReady, setIsPageReady] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Start transition loading when location changes
    setIsTransitioning(true);
    setIsPageReady(false);

    // Simulate page loading time and then show content
    const timer = setTimeout(() => {
      setIsTransitioning(false);
      setIsPageReady(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [location.pathname, delay]);

  // Also provide manual control for pages that need custom loading
  const startTransition = () => {
    setIsTransitioning(true);
    setIsPageReady(false);
  };

  const endTransition = () => {
    setIsTransitioning(false);
    setIsPageReady(true);
  };

  return {
    isTransitioning,
    isPageReady,
    startTransition,
    endTransition
  };
};

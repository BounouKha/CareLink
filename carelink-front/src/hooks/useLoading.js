import { useState } from 'react';

/**
 * Enhanced loading hook for CareLink application
 * Provides comprehensive loading state management with different loading types
 */
export const useLoading = (initialState = false) => {
  const [isLoading, setIsLoading] = useState(initialState);
  const [loadingType, setLoadingType] = useState('default'); // default, skeleton, progress
  const [loadingMessage, setLoadingMessage] = useState('');
  const [progress, setProgress] = useState(0);

  const startLoading = (message = 'Loading...', type = 'default') => {
    setIsLoading(true);
    setLoadingMessage(message);
    setLoadingType(type);
    setProgress(0);
  };

  const stopLoading = () => {
    setIsLoading(false);
    setLoadingMessage('');
    setProgress(0);
  };

  const updateProgress = (value) => {
    setProgress(Math.min(100, Math.max(0, value)));
  };

  const executeWithLoading = async (asyncFunction, message = 'Loading...', type = 'default') => {
    try {
      startLoading(message, type);
      const result = await asyncFunction();
      return result;
    } finally {
      stopLoading();
    }
  };

  return {
    isLoading,
    loadingType,
    loadingMessage,
    progress,
    startLoading,
    stopLoading,
    updateProgress,
    executeWithLoading
  };
};

/**
 * Global loading state for app-wide loading indicators
 */
class LoadingManager {
  constructor() {
    this.listeners = new Set();
    this.loadingStates = new Map();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach(listener => listener(this.getGlobalState()));
  }

  setLoading(key, isLoading, message = '', type = 'default') {
    if (isLoading) {
      this.loadingStates.set(key, { isLoading, message, type });
    } else {
      this.loadingStates.delete(key);
    }
    this.notify();
  }

  getGlobalState() {
    const states = Array.from(this.loadingStates.values());
    return {
      isLoading: states.length > 0,
      hasPageLoading: states.some(s => s.type === 'page'),
      hasModalLoading: states.some(s => s.type === 'modal'),
      messages: states.map(s => s.message).filter(Boolean)
    };
  }
}

export const loadingManager = new LoadingManager();

/**
 * Hook to use global loading state
 */
export const useGlobalLoading = () => {
  const [globalState, setGlobalState] = useState(() => loadingManager.getGlobalState());

  useState(() => {
    return loadingManager.subscribe(setGlobalState);
  }, []);

  const setPageLoading = (isLoading, message = 'Loading page...') => {
    loadingManager.setLoading('page', isLoading, message, 'page');
  };

  const setModalLoading = (key, isLoading, message = 'Loading...') => {
    loadingManager.setLoading(`modal-${key}`, isLoading, message, 'modal');
  };

  const setComponentLoading = (key, isLoading, message = 'Loading...') => {
    loadingManager.setLoading(`component-${key}`, isLoading, message, 'component');
  };

  return {
    ...globalState,
    setPageLoading,
    setModalLoading,
    setComponentLoading
  };
};

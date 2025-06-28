import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import Toast from './Toast';

const ToastManager = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random();
    const newToast = { id, message, type, duration };
    setToasts(prev => [...prev, newToast]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Expose addToast globally
  if (typeof window !== 'undefined') {
    window.showToast = addToast;
  }

  // Use portal to render toasts at document body level
  const toastContainer = (
    <div className="toast-container" style={{ position: 'fixed', top: 0, left: 0, zIndex: 2147483647, pointerEvents: 'none' }}>
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );

  try {
    return createPortal(toastContainer, document.body);
  } catch (error) {
    console.error('[ToastManager] Portal error:', error);
    // Fallback to regular rendering if portal fails
    return toastContainer;
  }
};

export default ToastManager; 
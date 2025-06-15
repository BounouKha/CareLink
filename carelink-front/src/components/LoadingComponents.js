import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Page Loading Overlay - for full page loading
 */
export const PageLoadingOverlay = ({ message = 'Loading...', isVisible = true, silent = false }) => {
  if (!isVisible) return null;

  return (
    <div className="page-loading-overlay">
      <div className="loading-spinner">
        <div className="spinner large"></div>
        {!silent && <p className="loading-text primary">{message}</p>}
      </div>
    </div>
  );
};

/**
 * Modal Loading Overlay - for modal content loading
 */
export const ModalLoadingOverlay = ({ message = 'Loading...', isVisible = true, silent = false }) => {
  if (!isVisible) return null;

  return (
    <div className="modal-loading-overlay">
      <div className="loading-spinner inline">
        <div className="spinner"></div>
        {!silent && <span className="loading-text">{message}</span>}
      </div>
    </div>
  );
};

/**
 * Component Loading Overlay - for individual component loading
 */
export const ComponentLoadingOverlay = ({ message = 'Loading...', isVisible = true, silent = false }) => {
  if (!isVisible) return null;

  return (
    <div className="component-loading-overlay">
      <div className="loading-spinner inline">
        <div className="spinner small"></div>
        {!silent && <span className="loading-text">{message}</span>}
      </div>
    </div>
  );
};

/**
 * Loading Spinner - standalone spinner
 */
export const LoadingSpinner = ({ 
  size = 'default', 
  type = 'default', 
  className = '',
  message = null 
}) => {
  const sizeClass = size === 'small' ? 'small' : size === 'large' ? 'large' : '';
  const typeClass = type === 'dots' ? 'dots' : type === 'pulse' ? 'pulse' : '';
  
  return (
    <div className={`loading-spinner inline ${className}`}>
      <div className={`spinner ${sizeClass} ${typeClass}`}></div>
      {message && <span className="loading-text">{message}</span>}
    </div>
  );
};

/**
 * Spinner Only - just the spinning animation, no text, no container
 */
export const SpinnerOnly = ({ 
  size = 'default', 
  type = 'default', 
  className = '' 
}) => {
  const sizeClass = size === 'small' ? 'small' : size === 'large' ? 'large' : '';
  const typeClass = type === 'dots' ? 'dots' : type === 'pulse' ? 'pulse' : '';
  
  return (
    <div className={`spinner ${sizeClass} ${typeClass} ${className}`}></div>
  );
};

/**
 * Button Loading State - for button loading indicators
 */
export const ButtonLoading = ({ isLoading, children, ...props }) => {
  return (
    <button 
      {...props}
      className={`${props.className || ''} ${isLoading ? 'loading' : ''}`}
      disabled={isLoading || props.disabled}
    >
      <span className="btn-text">{children}</span>
      {isLoading && <div className="btn-spinner"></div>}
    </button>
  );
};

/**
 * Table Loading State
 */
export const TableLoading = ({ message = 'Loading data...', rows = 5 }) => {
  return (
    <div className="table-loading">
      <div className="table-loading-overlay">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p className="loading-text">{message}</p>
        </div>
      </div>
      {/* Skeleton rows */}
      <div className="skeleton-table">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="skeleton-row">
            <div className="skeleton skeleton-text"></div>
            <div className="skeleton skeleton-text"></div>
            <div className="skeleton skeleton-text"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Skeleton Loading for cards/content
 */
export const SkeletonCard = ({ lines = 3, showAvatar = false }) => {
  return (
    <div className="skeleton-card">
      {showAvatar && (
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
          <div className="skeleton skeleton-avatar" style={{ marginRight: '12px' }}></div>
          <div className="skeleton skeleton-text" style={{ width: '40%' }}></div>
        </div>
      )}
      {Array.from({ length: lines }).map((_, index) => (
        <div 
          key={index} 
          className="skeleton skeleton-text"
          style={{ 
            width: index === lines - 1 ? '60%' : '100%',
            marginBottom: index === lines - 1 ? '0' : '8px'
          }}
        ></div>
      ))}
    </div>
  );
};

/**
 * Progress Bar Loading
 */
export const ProgressBar = ({ progress = 0, isIndeterminate = false, message = '' }) => {
  return (
    <div className="loading-spinner">
      {message && <p className="loading-text">{message}</p>}
      <div className={`progress-bar ${isIndeterminate ? 'indeterminate' : ''}`}>
        <div 
          className="progress-bar-fill"
          style={{ width: isIndeterminate ? undefined : `${progress}%` }}
        ></div>
      </div>
      {!isIndeterminate && <p className="loading-text small">{progress}%</p>}
    </div>
  );
};

/**
 * Search Loading Indicator
 */
export const SearchLoading = ({ isLoading, children }) => {
  return (
    <div className={`search-loading ${isLoading ? 'loading' : ''}`}>
      {children}
      {isLoading && (
        <div className="search-loading-indicator">
          <div className="spinner small"></div>
        </div>
      )}
    </div>
  );
};

/**
 * Form Loading State
 */
export const FormLoading = ({ isLoading, children, message = 'Saving...' }) => {
  return (
    <div className={`form-loading ${isLoading ? 'loading' : ''}`} style={{ position: 'relative' }}>
      {children}
      {isLoading && (
        <div className="component-loading-overlay">
          <div className="loading-spinner inline">
            <div className="spinner"></div>
            <span className="loading-text">{message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Calendar Loading State
 */
export const CalendarLoading = ({ message = 'Loading calendar...' }) => {
  return (
    <div className="calendar-loading">
      <div className="loading-spinner">
        <div className="spinner large"></div>
        <p className="loading-text primary">{message}</p>
      </div>
    </div>
  );
};

/**
 * Statistics Loading State
 */
export const StatsLoading = ({ message = 'Loading statistics...' }) => {
  return (
    <div className="stats-loading">
      <div className="loading-spinner">
        <div className="spinner dots"></div>
        <p className="loading-text primary">{message}</p>
      </div>
    </div>
  );
};

/**
 * Generic Loading Wrapper
 */
export const LoadingWrapper = ({ 
  isLoading, 
  type = 'component', 
  message = 'Loading...',
  skeleton = false,
  skeletonProps = {},
  children 
}) => {
  if (!isLoading) return children;

  if (skeleton) {
    return <SkeletonCard {...skeletonProps} />;
  }

  const LoadingComponent = {
    page: PageLoadingOverlay,
    modal: ModalLoadingOverlay,
    component: ComponentLoadingOverlay,
    calendar: CalendarLoading,
    stats: StatsLoading,
    table: TableLoading
  }[type] || ComponentLoadingOverlay;

  return <LoadingComponent message={message} />;
};

export default LoadingWrapper;

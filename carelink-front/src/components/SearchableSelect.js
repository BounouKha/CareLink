import React, { useState, useRef, useEffect } from 'react';
// CSS is now handled by UnifiedBaseLayout.css

const SearchableSelect = ({ 
  label, 
  name, 
  value, 
  onChange, 
  options = [], 
  placeholder = "Select an option...", 
  required = false,
  displayKey = 'name',
  valueKey = 'id',
  formatDisplay = null
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState(options);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Update filtered options when search term or options change
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredOptions(options);
    } else {
      const filtered = options.filter(option => {
        const displayText = formatDisplay 
          ? formatDisplay(option) 
          : option[displayKey] || '';
        return displayText.toLowerCase().includes(searchTerm.toLowerCase());
      });
      setFilteredOptions(filtered);
    }
  }, [searchTerm, options, displayKey, formatDisplay]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get selected option display text
  const getSelectedDisplayText = () => {
    const selectedOption = options.find(option => option[valueKey] === value);
    if (!selectedOption) return '';
    
    return formatDisplay 
      ? formatDisplay(selectedOption) 
      : selectedOption[displayKey] || '';
  };

  const handleInputClick = () => {
    setIsOpen(true);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleOptionSelect = (option) => {
    onChange({
      target: {
        name,
        value: option[valueKey]
      }
    });
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  return (
    <div className="searchable-select" ref={dropdownRef}>
      {label && (
        <label className="searchable-select-label">
          {label} {required && <span className="required">*</span>}
        </label>
      )}
      
      <div className="searchable-select-container">
        <div 
          className={`searchable-select-input ${isOpen ? 'open' : ''}`}
          onClick={handleInputClick}
        >
          <span className="selected-text">
            {getSelectedDisplayText() || placeholder}
          </span>
          <div className="dropdown-arrow">
            <svg width="12" height="8" viewBox="0 0 12 8">
              <path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="2" fill="none"/>
            </svg>
          </div>
        </div>

        {isOpen && (
          <div className="searchable-select-dropdown">
            <div className="search-input-container">
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                onKeyDown={handleKeyDown}
                placeholder="Search..."
                className="search-input"
                autoFocus
              />
            </div>
            
            <div className="options-list">
              {filteredOptions.length > 0 ? (
                filteredOptions.map(option => (
                  <div
                    key={option[valueKey]}
                    className={`option ${option[valueKey] === value ? 'selected' : ''}`}
                    onClick={() => handleOptionSelect(option)}
                  >
                    {formatDisplay ? formatDisplay(option) : option[displayKey]}
                  </div>
                ))
              ) : (
                <div className="no-options">No options found</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Hidden input for form validation */}
      <input
        type="hidden"
        name={name}
        value={value}
        required={required}
      />
    </div>
  );
};

export default SearchableSelect;

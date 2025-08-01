import React, { useState, useEffect } from 'react';
import './RecurringSchedule.css';

const RecurringSchedule = ({ isOpen, onClose, onScheduleCreated, providers = [], preselectedDate, preselectedTime }) => {
  const [formData, setFormData] = useState({
    provider_id: '',
    patient_id: '',
    start_date: '',
    start_time: '',
    end_time: '',
    service_id: '',
    description: ''
  });

  // Recurring settings
  const [recurringData, setRecurringData] = useState({
    frequency: 'weekly', // weekly, bi-weekly, monthly
    weekdays: [1], // Monday=1, Sunday=0
    interval: 1, // Every X weeks/months
    end_type: 'date', // 'date' or 'occurrences'
    end_date: '',
    occurrences: 4
  });

  const [patients, setPatients] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewDates, setPreviewDates] = useState([]);
  
  // Search states
  const [providerSearch, setProviderSearch] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [showPreview, setShowPreview] = useState(true); // Show preview by default

  // Enhanced state for better UX
  const [validationErrors, setValidationErrors] = useState({});
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [showAllPreviews, setShowAllPreviews] = useState(false);

  // Enhanced days of week for selection
  const daysOfWeek = [
    { value: 1, label: 'Monday', short: 'M' },
    { value: 2, label: 'Tuesday', short: 'T' },
    { value: 3, label: 'Wednesday', short: 'W' },
    { value: 4, label: 'Thursday', short: 'T' },
    { value: 5, label: 'Friday', short: 'F' },
    { value: 6, label: 'Saturday', short: 'S' },
    { value: 0, label: 'Sunday', short: 'S' }
  ];

  // Helper function to calculate duration between times
  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return '';
    
    try {
      const start = new Date(`2000-01-01T${startTime}`);
      const end = new Date(`2000-01-01T${endTime}`);
      const diffMs = end.getTime() - start.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      
      if (diffHours < 0) return 'Invalid';
      
      const hours = Math.floor(diffHours);
      const minutes = Math.round((diffHours - hours) * 60);
      
      if (hours === 0) return `${minutes}min`;
      if (minutes === 0) return `${hours}h`;
      return `${hours}h ${minutes}min`;
    } catch (error) {
      return '';
    }
  };

  // Helper function to calculate total duration across all appointments
  const calculateTotalDuration = () => {
    if (!formData.start_time || !formData.end_time || previewDates.length === 0) return 0;
    
    try {
      const start = new Date(`2000-01-01T${formData.start_time}`);
      const end = new Date(`2000-01-01T${formData.end_time}`);
      const diffMs = end.getTime() - start.getTime();
      const hoursPerAppointment = diffMs / (1000 * 60 * 60);
      const totalHours = hoursPerAppointment * previewDates.length;
      
      return Math.round(totalHours * 10) / 10; // Round to 1 decimal place
    } catch (error) {
      return 0;
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPatients();
      fetchServices();
      
      // Smart initialization with preselected values
      if (preselectedDate) {
        const selectedDate = new Date(preselectedDate);
        const dayOfWeek = selectedDate.getDay();
        
        setFormData(prev => ({
          ...prev,
          start_date: preselectedDate,
          start_time: preselectedTime || ''
        }));
        
        // Auto-select the day of week and set smart end date
        setRecurringData(prev => ({
          ...prev,
          weekdays: [dayOfWeek],
          end_date: calculateDefaultEndDate(preselectedDate)
        }));
      } else {
        // Set default start date to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowString = formatDateToString(tomorrow);
        
        setFormData(prev => ({
          ...prev,
          start_date: tomorrowString
        }));
        
        setRecurringData(prev => ({
          ...prev,
          end_date: calculateDefaultEndDate(tomorrowString)
        }));
      }
    }
  }, [isOpen, preselectedDate, preselectedTime]);

  // Helper functions
  const formatDateToString = (date) => {
    return date.toISOString().split('T')[0];
  };

  const calculateDefaultEndDate = (startDate) => {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 28); // 4 weeks
    return formatDateToString(end);
  };
  // Enhanced validation function
  const validateForm = () => {
    const errors = {};
    
    if (!formData.provider_id) errors.provider_id = 'Provider is required';
    if (!formData.patient_id) errors.patient_id = 'Patient is required';
    if (!formData.start_date) errors.start_date = 'Start date is required';
    if (!formData.start_time) errors.start_time = 'Start time is required';
    if (!formData.end_time) errors.end_time = 'End time is required';
    if (recurringData.weekdays.length === 0) errors.weekdays = 'At least one day must be selected';
    
    // Validate time logic
    if (formData.start_time && formData.end_time) {
      const start = new Date(`2000-01-01T${formData.start_time}`);
      const end = new Date(`2000-01-01T${formData.end_time}`);
      if (end <= start) {
        errors.end_time = 'End time must be after start time';
      }
    }
    
    // Validate date logic
    if (formData.start_date && recurringData.end_type === 'date' && recurringData.end_date) {
      const start = new Date(formData.start_date);
      const end = new Date(recurringData.end_date);
      if (end <= start) {
        errors.end_date = 'End date must be after start date';
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Enhanced smart end time calculation
  const calculateEndTime = (startTime, suggestedDuration = 60) => {
    if (!startTime) return '';
    
    try {
      const start = new Date(`2000-01-01T${startTime}`);
      start.setMinutes(start.getMinutes() + suggestedDuration);
      return start.toTimeString().slice(0, 5);
    } catch (error) {
      console.error('Error calculating end time:', error);
      return '';
    }
  };

  // Reset form when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        provider_id: '',
        patient_id: '',
        start_date: '',
        start_time: '',
        end_time: '',
        service_id: '',
        description: ''
      });
      setRecurringData({
        frequency: 'weekly',
        weekdays: [1],
        interval: 1,
        end_type: 'date',
        end_date: '',
        occurrences: 4
      });
      setProviderSearch('');
      setPatientSearch('');
      setError('');
      setPreviewDates([]);
      setShowPreview(true);
      setValidationErrors({});
      setIsGeneratingPreview(false);
    }
  }, [isOpen]);  // Enhanced preview generation with loading states
  const generateRecurringDates = () => {
    const dates = [];
    
    if (!formData.start_date || recurringData.weekdays.length === 0) {
      return dates;
    }

    try {
      const startDate = new Date(formData.start_date);
      
      // Validate start date
      if (isNaN(startDate.getTime())) {
        console.error('Invalid start date:', formData.start_date);
        return dates;
      }

      const endDate = recurringData.end_type === 'date' && recurringData.end_date
        ? new Date(recurringData.end_date)
        : null;

      // Validate end date if provided
      if (endDate && isNaN(endDate.getTime())) {
        console.error('Invalid end date:', recurringData.end_date);
        return dates;
      }

      const maxOccurrences = recurringData.end_type === 'occurrences' 
        ? recurringData.occurrences 
        : 52; // Safety limit to 1 year worth of weeks

      let occurrenceCount = 0;
      let currentDate = new Date(startDate);
      let iterationCount = 0;
      const maxIterations = 365; // Maximum days to search

      // Smart interval calculation based on frequency
      let intervalDays = 1;
      if (recurringData.frequency === 'bi-weekly') {
        intervalDays = 14;
      } else if (recurringData.frequency === 'monthly') {
        intervalDays = 30;
      } else if (recurringData.frequency === 'weekly' && recurringData.interval > 1) {
        intervalDays = 7 * recurringData.interval;
      }

      while (occurrenceCount < maxOccurrences && iterationCount < maxIterations) {
        const dayOfWeek = currentDate.getDay();
        
        // Check if current date matches one of the selected weekdays
        if (recurringData.weekdays.includes(dayOfWeek)) {
          // Check if current date is within the valid range
          if (currentDate >= startDate && (!endDate || currentDate <= endDate)) {
            dates.push(new Date(currentDate));
            occurrenceCount++;
            
            // If we're doing weekly or bi-weekly, skip ahead to avoid duplicate days
            if (recurringData.frequency !== 'monthly' && intervalDays > 1) {
              currentDate.setDate(currentDate.getDate() + intervalDays - 1);
              iterationCount += intervalDays - 1;
            }
          }
        }
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
        iterationCount++;
        
        // Safety check: if we've gone too far past the end date, stop
        if (endDate && currentDate.getTime() - endDate.getTime() > 7 * 24 * 60 * 60 * 1000) {
          break;
        }
      }

      return dates.sort((a, b) => a.getTime() - b.getTime());
    } catch (error) {
      console.error('Error generating recurring dates:', error);
      return [];
    }
  };

  // Enhanced preview update with loading states
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.start_date && recurringData.weekdays.length > 0) {
        setIsGeneratingPreview(true);
        try {
          const dates = generateRecurringDates();
          setPreviewDates(dates);
          
          // Clear any previous validation errors for weekdays if dates were generated
          if (dates.length > 0 && validationErrors.weekdays) {
            setValidationErrors(prev => {
              const newErrors = { ...prev };
              delete newErrors.weekdays;
              return newErrors;
            });
          }
        } catch (error) {
          console.error('Error updating preview dates:', error);
          setPreviewDates([]);
        } finally {
          setTimeout(() => setIsGeneratingPreview(false), 300); // Short delay for smooth UX
        }
      } else {
        setPreviewDates([]);
        setIsGeneratingPreview(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [formData.start_date, recurringData.weekdays, recurringData.end_type, recurringData.end_date, recurringData.occurrences, recurringData.frequency, recurringData.interval]);

  const fetchPatients = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:8000/account/views_patient/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const patientList = data.results || [];
        setPatients(patientList);
      } else {
        console.error('Failed to fetch patients:', response.status);
        setError('Failed to load patients. Please refresh and try again.');
      }
    } catch (err) {
      console.error('Error fetching patients:', err);
      setError('Network error occurred while loading patients.');
    }
  };

  const fetchServices = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:8000/account/services/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setServices(data.results || data || []);
      } else {
        console.error('Failed to fetch services:', response.status);
      }
    } catch (err) {
      console.error('Error fetching services:', err);
    }
  };

  const filteredProviders = providers.filter(provider =>
    provider.name.toLowerCase().includes(providerSearch.toLowerCase()) ||
    provider.service.toLowerCase().includes(providerSearch.toLowerCase())
  );

  const filteredPatients = patients.filter(patient =>
    `${patient.firstname || ''} ${patient.lastname || ''}`.toLowerCase().includes(patientSearch.toLowerCase()) ||
    patient.national_number?.toLowerCase().includes(patientSearch.toLowerCase())
  );

  const selectProvider = (provider) => {
    setFormData(prev => ({ ...prev, provider_id: provider.id }));
    setProviderSearch(`${provider.name} - ${provider.service}`);
    setShowProviderDropdown(false);
  };

  const selectPatient = (patient) => {
    setFormData(prev => ({ ...prev, patient_id: patient.id }));
    setPatientSearch(`${patient.firstname || ''} ${patient.lastname || ''}`);
    setShowPatientDropdown(false);
  };  // Enhanced input handling with validation
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    try {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));

      // Clear validation errors for this field
      if (validationErrors[name]) {
        setValidationErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        });
      }

      // Auto-calculate end time if start time is set and end time is empty
      if (name === 'start_time' && value && !formData.end_time) {
        const endTime = calculateEndTime(value);
        setFormData(prev => ({
          ...prev,
          end_time: endTime
        }));
      }

      // Smart end date calculation when start date changes
      if (name === 'start_date' && value) {
        try {
          const newStartDate = new Date(value);
          if (!isNaN(newStartDate.getTime())) {
            const newEndDate = new Date(newStartDate);
            newEndDate.setDate(newEndDate.getDate() + 28); // 4 weeks later
            
            // Update end_date if it wasn't manually set or if it's before the new start date
            if (!recurringData.end_date || new Date(recurringData.end_date) < newStartDate) {
              setRecurringData(prev => ({
                ...prev,
                end_date: formatDateToString(newEndDate)
              }));
            }
            
            // Auto-select the day of week for the start date
            const dayOfWeek = newStartDate.getDay();
            if (!recurringData.weekdays.includes(dayOfWeek)) {
              setRecurringData(prev => ({
                ...prev,
                weekdays: [...prev.weekdays, dayOfWeek]
              }));
            }
          }
        } catch (dateError) {
          console.error('Error handling start date change:', dateError);
        }
      }
    } catch (error) {
      console.error('Error handling input change:', error);
    }
  };

  // Enhanced recurring data handling
  const handleRecurringChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    try {
      if (name === 'weekdays') {
        const dayValue = parseInt(value);
        if (!isNaN(dayValue)) {
          setRecurringData(prev => ({
            ...prev,
            weekdays: checked 
              ? [...prev.weekdays, dayValue]
              : prev.weekdays.filter(day => day !== dayValue)
          }));
          
          // Clear weekdays validation error
          if (validationErrors.weekdays) {
            setValidationErrors(prev => {
              const newErrors = { ...prev };
              delete newErrors.weekdays;
              return newErrors;
            });
          }
        }
      } else {
        const newValue = type === 'number' ? (isNaN(parseInt(value)) ? 1 : parseInt(value)) : value;
        
        setRecurringData(prev => ({
          ...prev,
          [name]: newValue
        }));
        
        // Clear validation errors for this field
        if (validationErrors[name]) {
          setValidationErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[name];
            return newErrors;
          });
        }
        
        // Smart defaults when frequency changes
        if (name === 'frequency') {
          if (value === 'monthly') {
            setRecurringData(prev => ({
              ...prev,
              interval: 1,
              occurrences: 12
            }));
          } else if (value === 'bi-weekly') {
            setRecurringData(prev => ({
              ...prev,
              interval: 2,
              occurrences: 8
            }));
          } else if (value === 'weekly') {
            setRecurringData(prev => ({
              ...prev,
              interval: 1,
              occurrences: 4
            }));
          }
        }
      }
    } catch (error) {
      console.error('Error handling recurring change:', error);
    }
  };
  // Enhanced form submission with validation
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form before submission
    if (!validateForm()) {
      setError('Please fix the errors above before submitting.');
      return;
    }
    
    if (previewDates.length === 0) {
      setError('No valid dates found. Please check your recurring settings.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('accessToken');
      
      // Prepare enhanced recurring schedule data
      const recurringScheduleData = {
        ...formData,
        recurring_settings: {
          ...recurringData,
          dates: previewDates.map(date => date.toISOString().split('T')[0]),
          total_appointments: previewDates.length
        },
        metadata: {
          created_at: new Date().toISOString(),
          pattern_summary: generatePatternSummary()
        }
      };
      
      const response = await fetch('http://localhost:8000/schedule/recurring-schedule/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(recurringScheduleData)
      });

      if (response.ok) {
        const data = await response.json();
        
        // Show success message with details
        const successMessage = `Successfully created ${previewDates.length} recurring appointments!`;
        
        onScheduleCreated({
          ...data,
          successMessage,
          appointmentCount: previewDates.length
        });
        onClose();
      } else {
        const errorData = await response.json();
        
        // Enhanced error handling
        if (errorData.validation_errors) {
          setValidationErrors(errorData.validation_errors);
          setError('Please fix the validation errors and try again.');
        } else {
          setError(errorData.error || errorData.detail || 'Failed to create recurring schedule');
        }
      }
    } catch (err) {
      console.error('Error creating recurring schedule:', err);
      setError('Network error occurred. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to generate pattern summary
  const generatePatternSummary = () => {
    const days = recurringData.weekdays
      .map(day => daysOfWeek.find(d => d.value === day)?.label || 'Unknown')
      .join(', ');
    
    let frequencyText = recurringData.frequency;
    if (recurringData.frequency === 'weekly' && recurringData.interval > 1) {
      frequencyText = `every ${recurringData.interval} weeks`;
    } else if (recurringData.frequency === 'bi-weekly') {
      frequencyText = 'every 2 weeks';
    }
    
    const endText = recurringData.end_type === 'date' 
      ? `until ${recurringData.end_date}`
      : `for ${recurringData.occurrences} occurrences`;
    
    return `${frequencyText} on ${days}, ${endText}`;
  };

  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="quick-schedule-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Recurring Schedule</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="quick-schedule-form">
          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}
          
          {/* Basic Schedule Information */}
          <div className="form-section">
            <h3>📝 Basic Information</h3>
            
            {/* Provider Selection */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="provider-search">Provider *</label>
                <div className="search-container">
                  <input
                    type="text"
                    id="provider-search"
                    value={providerSearch}
                    onChange={(e) => {
                      setProviderSearch(e.target.value);
                      setShowProviderDropdown(true);
                    }}
                    onFocus={() => setShowProviderDropdown(true)}
                    placeholder="Search providers..."
                    className={validationErrors.provider_id ? 'error' : ''}
                    required
                  />
                  {validationErrors.provider_id && (
                    <span className="validation-error">{validationErrors.provider_id}</span>
                  )}
                  {showProviderDropdown && (
                    <div className="dropdown">
                      {filteredProviders.length > 0 ? filteredProviders.map(provider => (
                        <div
                          key={provider.id}
                          className="dropdown-item"
                          onClick={() => selectProvider(provider)}
                        >
                          <strong>{provider.name}</strong>
                          <span className="provider-service"> - {provider.service}</span>
                        </div>
                      )) : (
                        <div className="dropdown-item no-results">No providers found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Patient Selection */}
              <div className="form-group">
                <label htmlFor="patient-search">Patient *</label>
                <div className="search-container">
                  <input
                    type="text"
                    id="patient-search"
                    value={patientSearch}
                    onChange={(e) => {
                      setPatientSearch(e.target.value);
                      setShowPatientDropdown(true);
                    }}
                    onFocus={() => setShowPatientDropdown(true)}
                    placeholder="Search patients..."
                    className={validationErrors.patient_id ? 'error' : ''}
                    required
                  />
                  {validationErrors.patient_id && (
                    <span className="validation-error">{validationErrors.patient_id}</span>
                  )}
                  {showPatientDropdown && (
                    <div className="dropdown">
                      {filteredPatients.length > 0 ? filteredPatients.map(patient => (
                        <div
                          key={patient.id}
                          className="dropdown-item"
                          onClick={() => selectPatient(patient)}
                        >
                          <strong>{patient.firstname} {patient.lastname}</strong>
                          {patient.national_number && (
                            <span className="patient-id"> - {patient.national_number}</span>
                          )}
                        </div>
                      )) : (
                        <div className="dropdown-item no-results">No patients found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>            {/* Time and Service */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="start_time">Start Time *</label>
                <input
                  type="time"
                  id="start_time"
                  name="start_time"
                  value={formData.start_time}
                  onChange={handleInputChange}
                  className={validationErrors.start_time ? 'error' : ''}
                  required
                />
                {validationErrors.start_time && (
                  <span className="validation-error">{validationErrors.start_time}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="end_time">End Time *</label>
                <input
                  type="time"
                  id="end_time"
                  name="end_time"
                  value={formData.end_time}
                  onChange={handleInputChange}
                  className={validationErrors.end_time ? 'error' : ''}
                  required
                />
                {validationErrors.end_time && (
                  <span className="validation-error">{validationErrors.end_time}</span>
                )}
                {formData.start_time && formData.end_time && (
                  <span className="time-duration">
                    Duration: {calculateDuration(formData.start_time, formData.end_time)}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="service_id">Service</label>
                <select
                  id="service_id"
                  name="service_id"
                  value={formData.service_id}
                  onChange={handleInputChange}
                >
                  <option value="">Select Service (Optional)</option>
                  {services.map(service => (
                    <option key={service.id} value={service.id}>
                      {service.name} - ${service.price}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Additional notes or description..."
                rows="2"
              />
            </div>
          </div>

          {/* Recurring Settings */}
          <div className="form-section">
            <h3>🔄 Recurring Pattern</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="start_date">Start Date *</label>
                <input
                  type="date"
                  id="start_date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  min={formatDateToString(new Date())}
                  className={validationErrors.start_date ? 'error' : ''}
                  required
                />
                {validationErrors.start_date && (
                  <span className="validation-error">{validationErrors.start_date}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="frequency">Frequency *</label>
                <select
                  id="frequency"
                  name="frequency"
                  value={recurringData.frequency}
                  onChange={handleRecurringChange}
                  required
                >
                  <option value="weekly">Weekly</option>
                  <option value="bi-weekly">Bi-weekly (Every 2 weeks)</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              {recurringData.frequency !== 'monthly' && (
                <div className="form-group">
                  <label htmlFor="interval">Every</label>
                  <div className="interval-input">
                    <input
                      type="number"
                      id="interval"
                      name="interval"
                      value={recurringData.interval}
                      onChange={handleRecurringChange}
                      min="1"
                      max="4"
                    />
                    <span>week(s)</span>
                  </div>
                </div>
              )}
            </div>            {/* Days of Week Selection */}
            <div className="form-group">
              <label>Days of Week *</label>
              <div className={`weekdays-selector ${validationErrors.weekdays ? 'error' : ''}`}>
                {daysOfWeek.map(day => (
                  <label key={day.value} className="weekday-checkbox">
                    <input
                      type="checkbox"
                      name="weekdays"
                      value={day.value}
                      checked={recurringData.weekdays.includes(day.value)}
                      onChange={handleRecurringChange}
                    />
                    <span className="weekday-label" title={day.label}>
                      {day.short}
                    </span>
                  </label>
                ))}
              </div>
              {validationErrors.weekdays && (
                <span className="validation-error">{validationErrors.weekdays}</span>
              )}
              <div className="weekdays-helper">
                Selected days: {recurringData.weekdays.length > 0 
                  ? recurringData.weekdays
                      .map(day => daysOfWeek.find(d => d.value === day)?.label)
                      .join(', ')
                  : 'None selected'
                }
              </div>
            </div>

            {/* End Date or Occurrences */}
            <div className="form-row">
              <div className="form-group">
                <label>End Pattern</label>
                <div className="radio-group">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="end_type"
                      value="date"
                      checked={recurringData.end_type === 'date'}
                      onChange={handleRecurringChange}
                    />
                    <span className="radio-label">
                      <span className="radio-icon">📅</span>
                      End by date
                    </span>
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="end_type"
                      value="occurrences"
                      checked={recurringData.end_type === 'occurrences'}
                      onChange={handleRecurringChange}
                    />
                    <span className="radio-label">
                      <span className="radio-icon">🔢</span>
                      After number of occurrences
                    </span>
                  </label>
                </div>
              </div>

              {recurringData.end_type === 'date' ? (
                <div className="form-group">
                  <label htmlFor="end_date">End Date *</label>
                  <input
                    type="date"
                    id="end_date"
                    name="end_date"
                    value={recurringData.end_date}
                    onChange={handleRecurringChange}
                    min={formData.start_date}
                    className={validationErrors.end_date ? 'error' : ''}
                    required
                  />
                  {validationErrors.end_date && (
                    <span className="validation-error">{validationErrors.end_date}</span>
                  )}
                </div>
              ) : (
                <div className="form-group">
                  <label htmlFor="occurrences">Number of Occurrences *</label>
                  <input
                    type="number"
                    id="occurrences"
                    name="occurrences"
                    value={recurringData.occurrences}
                    onChange={handleRecurringChange}
                    min="1"
                    max="52"
                    className={validationErrors.occurrences ? 'error' : ''}
                    required
                  />
                  {validationErrors.occurrences && (
                    <span className="validation-error">{validationErrors.occurrences}</span>
                  )}
                  <div className="input-helper">
                    Estimated duration: {Math.ceil(recurringData.occurrences / recurringData.weekdays.length)} weeks
                  </div>
                </div>
              )}
            </div>
          </div>          {/* Enhanced Preview Section */}
          <div className="form-section">
            <div className="preview-header">
              <h3>📅 Schedule Preview</h3>
              <div className="preview-controls">
                {isGeneratingPreview && (
                  <span className="preview-loading">
                    <span className="loading-spinner"></span>
                    Generating...
                  </span>
                )}
                <button
                  type="button"
                  className="preview-toggle"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  {showPreview ? '👁️ Hide' : '👁️ Show'} Preview ({previewDates.length} appointments)
                </button>
              </div>
            </div>
            
            {previewDates.length > 0 && (
              <div className="preview-summary">
                <div className="summary-item">
                  <span className="summary-label">Pattern:</span>
                  <span className="summary-value">{generatePatternSummary()}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Total Duration:</span>
                  <span className="summary-value">
                    {calculateTotalDuration()} hours across {previewDates.length} appointments
                  </span>
                </div>
              </div>
            )}
            
            {showPreview && (
              <div className="preview-container">
                {previewDates.length > 0 ? (
                  <div className="preview-list">
                    {previewDates.slice(0, 12).map((date, index) => (
                      <div key={index} className="preview-item">
                        <div className="preview-date-info">
                          <span className="preview-date">
                            {date.toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              month: 'short', 
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                          <span className="preview-time">
                            {formData.start_time} - {formData.end_time}
                          </span>
                        </div>
                        <div className="preview-meta">
                          {formData.provider_id && providerSearch && (
                            <span className="preview-provider">{providerSearch}</span>
                          )}
                          {formData.patient_id && patientSearch && (
                            <span className="preview-patient">{patientSearch}</span>
                          )}
                        </div>
                      </div>
                    ))}
                    {previewDates.length > 12 && (
                      <div className="preview-more">
                        <span className="more-icon">📋</span>
                        ... and {previewDates.length - 12} more appointments
                        <button
                          type="button"
                          className="view-all-btn"
                          onClick={() => setShowAllPreviews(!showAllPreviews)}
                        >
                          {showAllPreviews ? 'Show Less' : 'View All'}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="preview-empty">
                    <div className="empty-icon">📅</div>
                    <p>No appointments will be created with current settings.</p>
                    <p className="empty-helper">
                      Please check your date range and selected days of the week.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Enhanced Form Actions */}
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={loading || previewDates.length === 0 || isGeneratingPreview}
            >
              {loading ? (
                <>
                  <span className="loading-spinner small"></span>
                  Creating...
                </>
              ) : (
                <>
                  <span className="btn-icon">🚀</span>
                  Create {previewDates.length} Appointment{previewDates.length !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecurringSchedule;

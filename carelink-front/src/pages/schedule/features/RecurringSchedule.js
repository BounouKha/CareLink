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
  const [showPreview, setShowPreview] = useState(false);

  // Days of week for selection
  const daysOfWeek = [
    { value: 1, label: 'Monday', short: 'Mon' },
    { value: 2, label: 'Tuesday', short: 'Tue' },
    { value: 3, label: 'Wednesday', short: 'Wed' },
    { value: 4, label: 'Thursday', short: 'Thu' },
    { value: 5, label: 'Friday', short: 'Fri' },
    { value: 6, label: 'Saturday', short: 'Sat' },
    { value: 0, label: 'Sunday', short: 'Sun' }
  ];

  useEffect(() => {
    if (isOpen) {
      fetchPatients();
      fetchServices();
      
      // Auto-fill form if preselected values are provided
      if (preselectedDate && preselectedTime) {
        const endTime = calculateEndTime(preselectedTime);
        setFormData(prev => ({ 
          ...prev, 
          start_date: preselectedDate,
          start_time: preselectedTime,
          end_time: endTime
        }));
          // Set default end date to 4 weeks later
        const startDate = new Date(preselectedDate);
        const defaultEndDate = new Date(startDate);
        defaultEndDate.setDate(defaultEndDate.getDate() + 28); // 4 weeks
        
        setRecurringData(prev => ({
          ...prev,
          end_date: formatDateToString(defaultEndDate),
          weekdays: [startDate.getDay() === 0 ? 0 : startDate.getDay()] // Auto-select the clicked day
        }));
      } else {
        // Set default dates
        const today = new Date();
        const fourWeeksLater = new Date();
        fourWeeksLater.setDate(fourWeeksLater.getDate() + 28);
        
        setFormData(prev => ({ ...prev, start_date: formatDateToString(today) }));
        setRecurringData(prev => ({
          ...prev,
          end_date: formatDateToString(fourWeeksLater)
        }));
      }
    }
  }, [isOpen, preselectedDate, preselectedTime]);

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
      setShowPreview(false);
    }
  }, [isOpen]);

  // Helper function to format date without timezone issues
  const formatDateToString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Calculate end time (1 hour after start time)
  const calculateEndTime = (startTime) => {
    if (!startTime) return '';
    
    const [hours, minutes] = startTime.split(':').map(Number);
    const endHour = hours + 1;
    
    // Handle 24-hour wrap around
    const finalHour = endHour >= 24 ? endHour - 24 : endHour;
    
    return `${finalHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };
  // Generate recurring dates based on settings
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
        : 52; // Reduced safety limit to 1 year worth of weeks

      let occurrenceCount = 0;
      let currentDate = new Date(startDate);
      let iterationCount = 0; // Additional safety counter
      const maxIterations = 365; // Maximum days to search

      while (occurrenceCount < maxOccurrences && iterationCount < maxIterations) {
        const dayOfWeek = currentDate.getDay();
        
        // Check if current date matches one of the selected weekdays
        if (recurringData.weekdays.includes(dayOfWeek)) {
          // Check if current date is within the valid range
          if (currentDate >= startDate && (!endDate || currentDate <= endDate)) {
            dates.push(new Date(currentDate));
            occurrenceCount++;
          }
        }
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
        iterationCount++;
        
        // Additional safety check: if we've gone too far past the end date, stop
        if (endDate && currentDate.getTime() - endDate.getTime() > 7 * 24 * 60 * 60 * 1000) {
          break; // Stop if we're more than a week past the end date
        }
      }

      return dates;
    } catch (error) {
      console.error('Error generating recurring dates:', error);
      return [];
    }
  };
  // Update preview when recurring settings change
  useEffect(() => {
    // Add a small delay to prevent rapid re-calculations when user is typing
    const timeoutId = setTimeout(() => {
      if (formData.start_date && recurringData.weekdays.length > 0) {
        try {
          const dates = generateRecurringDates();
          setPreviewDates(dates);
        } catch (error) {
          console.error('Error updating preview dates:', error);
          setPreviewDates([]);
        }
      } else {
        setPreviewDates([]);
      }
    }, 300); // 300ms delay

    return () => clearTimeout(timeoutId);
  }, [formData.start_date, recurringData.weekdays, recurringData.end_type, recurringData.end_date, recurringData.occurrences]);

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
  };
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    try {
      console.log('Input change:', name, value); // Debug log
      
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));

      // Auto-calculate end time if start time is set
      if (name === 'start_time' && value && !formData.end_time) {
        const endTime = calculateEndTime(value);
        setFormData(prev => ({
          ...prev,
          end_time: endTime
        }));
      }

      // If start_date changes, update the default end_date if not manually set
      if (name === 'start_date' && value) {
        try {
          console.log('Start date changing to:', value); // Debug log
          const newStartDate = new Date(value);
          if (!isNaN(newStartDate.getTime())) {
            const newEndDate = new Date(newStartDate);
            newEndDate.setDate(newEndDate.getDate() + 28); // 4 weeks later
            
            // Only update end_date if it wasn't manually set or if it's before the new start date
            if (!recurringData.end_date || new Date(recurringData.end_date) < newStartDate) {
              console.log('Updating end date to:', formatDateToString(newEndDate)); // Debug log
              setRecurringData(prev => ({
                ...prev,
                end_date: formatDateToString(newEndDate)
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
        }
      } else {
        setRecurringData(prev => ({
          ...prev,
          [name]: type === 'number' ? (isNaN(parseInt(value)) ? 1 : parseInt(value)) : value
        }));
      }
    } catch (error) {
      console.error('Error handling recurring change:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('accessToken');
      
      // Prepare recurring schedule data
      const recurringScheduleData = {
        ...formData,
        recurring_settings: {
          ...recurringData,
          dates: previewDates.map(date => date.toISOString().split('T')[0])
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
        onScheduleCreated(data);
        onClose();
      } else {
        const errorData = await response.json();
        setError(errorData.error || errorData.detail || 'Failed to create recurring schedule');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error creating recurring schedule:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="recurring-schedule-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🔄 Create Recurring Schedule</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="recurring-schedule-form">
          {error && <div className="error-message">{error}</div>}
          
          {/* Basic Schedule Information */}
          <div className="form-section">
            <h3>Basic Information</h3>
            
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
                    required
                  />
                  {showProviderDropdown && (
                    <div className="dropdown">
                      {filteredProviders.map(provider => (
                        <div
                          key={provider.id}
                          className="dropdown-item"
                          onClick={() => selectProvider(provider)}
                        >
                          {provider.name} - {provider.service}
                        </div>
                      ))}
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
                    required
                  />
                  {showPatientDropdown && (
                    <div className="dropdown">
                      {filteredPatients.map(patient => (
                        <div
                          key={patient.id}
                          className="dropdown-item"
                          onClick={() => selectPatient(patient)}
                        >
                          {patient.firstname} {patient.lastname}
                          {patient.national_number && (
                            <span className="patient-id"> - {patient.national_number}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Time and Service */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="start_time">Start Time *</label>
                <input
                  type="time"
                  id="start_time"
                  name="start_time"
                  value={formData.start_time}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="end_time">End Time *</label>
                <input
                  type="time"
                  id="end_time"
                  name="end_time"
                  value={formData.end_time}
                  onChange={handleInputChange}
                  required
                />
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
            <h3>Recurring Pattern</h3>
            
            <div className="form-row">              <div className="form-group">
                <label htmlFor="start_date">Start Date *</label>
                <input
                  type="date"
                  id="start_date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  min={formatDateToString(new Date())}
                  required
                />
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
            </div>

            {/* Days of Week Selection */}
            <div className="form-group">
              <label>Days of Week *</label>
              <div className="weekdays-selector">
                {daysOfWeek.map(day => (
                  <label key={day.value} className="weekday-checkbox">
                    <input
                      type="checkbox"
                      name="weekdays"
                      value={day.value}
                      checked={recurringData.weekdays.includes(day.value)}
                      onChange={handleRecurringChange}
                    />
                    <span className="weekday-label">{day.short}</span>
                  </label>
                ))}
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
                    <span>End by date</span>
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="end_type"
                      value="occurrences"
                      checked={recurringData.end_type === 'occurrences'}
                      onChange={handleRecurringChange}
                    />
                    <span>After number of occurrences</span>
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
                    required
                  />
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
                    required
                  />
                </div>
              )}
            </div>
          </div>

          {/* Preview Section */}
          <div className="form-section">
            <div className="preview-header">
              <h3>Schedule Preview</h3>
              <button
                type="button"
                className="preview-toggle"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? 'Hide' : 'Show'} Preview ({previewDates.length} appointments)
              </button>
            </div>
            
            {showPreview && (
              <div className="preview-list">
                {previewDates.slice(0, 10).map((date, index) => (
                  <div key={index} className="preview-item">
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
                ))}
                {previewDates.length > 10 && (
                  <div className="preview-more">
                    ... and {previewDates.length - 10} more appointments
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={loading || previewDates.length === 0}
            >
              {loading ? 'Creating...' : `Create ${previewDates.length} Appointments`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecurringSchedule;

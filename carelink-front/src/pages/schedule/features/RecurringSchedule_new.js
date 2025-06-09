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
    frequency: 'weekly',
    weekdays: [1], // Monday=1, Sunday=0
    end_date: ''
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

  // Days of week for selection
  const daysOfWeek = [
    { value: 1, label: 'Monday', short: 'M' },
    { value: 2, label: 'Tuesday', short: 'T' },
    { value: 3, label: 'Wednesday', short: 'W' },
    { value: 4, label: 'Thursday', short: 'T' },
    { value: 5, label: 'Friday', short: 'F' },
    { value: 6, label: 'Saturday', short: 'S' },
    { value: 0, label: 'Sunday', short: 'S' }
  ];

  // Helper function to calculate end time (1 hour after start time)
  const calculateEndTime = (startTime) => {
    if (!startTime) return '';
    
    const [hours, minutes] = startTime.split(':').map(Number);
    const endHour = hours + 1;
    
    // Handle 24-hour wrap around
    const finalHour = endHour >= 24 ? endHour - 24 : endHour;
    
    return `${finalHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  // Helper function to format date to string
  const formatDateToString = (date) => {
    return date.toISOString().split('T')[0];
  };

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
        
        // Set default end date (4 weeks later)
        const start = new Date(preselectedDate);
        const end = new Date(start);
        end.setDate(end.getDate() + 28);
        setRecurringData(prev => ({
          ...prev,
          end_date: formatDateToString(end)
        }));
      } else {
        // Set default date to today if no preselected date
        const today = new Date().toISOString().split('T')[0];
        setFormData(prev => ({ ...prev, start_date: today }));
        
        // Set default end date (4 weeks later)
        const start = new Date();
        const end = new Date(start);
        end.setDate(end.getDate() + 28);
        setRecurringData(prev => ({
          ...prev,
          end_date: formatDateToString(end)
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
        end_date: ''
      });
      setProviderSearch('');
      setPatientSearch('');
      setError('');
      setPreviewDates([]);
    }
  }, [isOpen]);

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
      setError('Error loading patients. Please check your connection.');
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
    setFormData(prev => ({ ...prev, [name]: value }));

    // Auto-calculate end time if start time is set and end time is empty
    if (name === 'start_time' && value && !formData.end_time) {
      const endTime = calculateEndTime(value);
      setFormData(prev => ({ ...prev, end_time: endTime }));
    }
  };

  const handleRecurringChange = (e) => {
    const { name, value } = e.target;
    setRecurringData(prev => ({ ...prev, [name]: value }));
  };

  // Generate recurring dates
  const generateRecurringDates = () => {
    const dates = [];
    
    if (!formData.start_date || !recurringData.end_date || recurringData.weekdays.length === 0) {
      return dates;
    }

    try {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(recurringData.end_date);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return dates;
      }

      let currentDate = new Date(startDate);
      let iterationCount = 0;
      const maxIterations = 365; // Safety limit

      while (currentDate <= endDate && iterationCount < maxIterations) {
        const dayOfWeek = currentDate.getDay();
        
        if (recurringData.weekdays.includes(dayOfWeek)) {
          dates.push(new Date(currentDate));
        }
        
        // Move to next day based on frequency
        if (recurringData.frequency === 'weekly') {
          currentDate.setDate(currentDate.getDate() + 7);
        } else if (recurringData.frequency === 'bi-weekly') {
          currentDate.setDate(currentDate.getDate() + 14);
        } else {
          currentDate.setDate(currentDate.getDate() + 30); // monthly
        }
        
        iterationCount++;
      }

      return dates.sort((a, b) => a.getTime() - b.getTime());
    } catch (error) {
      console.error('Error generating recurring dates:', error);
      return [];
    }
  };

  // Update preview when settings change
  useEffect(() => {
    if (formData.start_date && recurringData.end_date && recurringData.weekdays.length > 0) {
      const dates = generateRecurringDates();
      setPreviewDates(dates);
    } else {
      setPreviewDates([]);
    }
  }, [formData.start_date, recurringData.end_date, recurringData.weekdays, recurringData.frequency]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (previewDates.length === 0) {
      setError('No valid dates found. Please check your recurring settings.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('accessToken');
      
      const recurringScheduleData = {
        ...formData,
        recurring_settings: {
          ...recurringData,
          dates: previewDates.map(date => date.toISOString().split('T')[0]),
          total_appointments: previewDates.length
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
        const successMessage = `Successfully created ${previewDates.length} recurring appointments!`;
        
        onScheduleCreated({
          ...data,
          successMessage,
          appointmentCount: previewDates.length
        });
        onClose();
      } else {
        const errorData = await response.json();
        setError(errorData.error || errorData.detail || 'Failed to create recurring schedule');
      }
    } catch (err) {
      console.error('Error creating recurring schedule:', err);
      setError('Network error occurred. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  const handleWeekdayToggle = (dayValue) => {
    const newWeekdays = recurringData.weekdays.includes(dayValue)
      ? recurringData.weekdays.filter(d => d !== dayValue)
      : [...recurringData.weekdays, dayValue];
    setRecurringData({ ...recurringData, weekdays: newWeekdays });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="quick-schedule-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Recurring Schedule</h2>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="quick-schedule-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {/* Provider and Patient Row - Matching Quick Schedule EXACTLY */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="provider_search">Provider *</label>
              <div className="searchable-dropdown">
                <input
                  type="text"
                  id="provider_search"
                  placeholder="Search providers..."
                  value={providerSearch}
                  onChange={(e) => setProviderSearch(e.target.value)}
                  onFocus={() => setShowProviderDropdown(true)}
                  onBlur={() => setTimeout(() => setShowProviderDropdown(false), 200)}
                />
                {showProviderDropdown && filteredProviders.length > 0 && (
                  <div className="dropdown-list">
                    {filteredProviders.map(provider => (
                      <div
                        key={provider.id}
                        className="dropdown-item"
                        onClick={() => selectProvider(provider)}
                      >
                        <strong>{provider.name}</strong>
                        <span className="provider-service">{provider.service}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="patient_search">Patient *</label>
              <div className="searchable-dropdown">
                <input
                  type="text"
                  id="patient_search"
                  placeholder="Search patients..."
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  onFocus={() => setShowPatientDropdown(true)}
                  onBlur={() => setTimeout(() => setShowPatientDropdown(false), 200)}
                />
                {showPatientDropdown && (
                  <div className="dropdown-list">
                    {filteredPatients.length > 0 ? (
                      filteredPatients.map(patient => (
                        <div
                          key={patient.id}
                          className="dropdown-item"
                          onClick={() => selectPatient(patient)}
                        >
                          <strong>{patient.firstname} {patient.lastname}</strong>
                          <span className="patient-info">ID: {patient.national_number}</span>
                        </div>
                      ))
                    ) : (
                      <div className="dropdown-item disabled">
                        {patients.length === 0 ? 'Loading patients...' : 'No patients found'}
                        {patients.length > 0 && <span className="patient-count">({patients.length} total patients)</span>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Start Date and Service Row - Matching Quick Schedule EXACTLY */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="start_date">Start Date *</label>
              <input
                type="date"
                id="start_date"
                name="start_date"
                value={formData.start_date}
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

          {/* Start Time and End Time Row - Matching Quick Schedule EXACTLY */}
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
          </div>

          {/* Recurring Settings Row - Clean and Simple */}
          <div className="form-row">
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
                <option value="bi-weekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="end_date">End Date *</label>
              <input
                type="date"
                id="end_date"
                name="end_date"
                value={recurringData.end_date}
                onChange={handleRecurringChange}
                required
              />
            </div>
          </div>

          {/* Days of Week BUTTONS - As Requested */}
          <div className="form-group">
            <label>Days of Week *</label>
            <div className="weekdays-buttons">
              {daysOfWeek.map(day => (
                <button
                  key={day.value}
                  type="button"
                  className={`weekday-btn ${recurringData.weekdays.includes(day.value) ? 'active' : ''}`}
                  onClick={() => handleWeekdayToggle(day.value)}
                  title={day.label}
                >
                  {day.short}
                </button>
              ))}
            </div>
            {previewDates.length > 0 && (
              <div className="preview-info">
                Will create {previewDates.length} appointments
              </div>
            )}
          </div>

          {/* Description - Matching Quick Schedule EXACTLY */}
          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Enter appointment details or notes..."
              rows="3"
            />
          </div>

          {/* Form Actions - Matching Quick Schedule EXACTLY */}
          <div className="form-actions">
            <button type="button" onClick={handleClose} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? 'Creating...' : `Create ${previewDates.length} Appointments`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecurringSchedule;

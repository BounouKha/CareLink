import React, { useState, useEffect } from 'react';
import './QuickSchedule.css';
import { useLoading } from '../../hooks/useLoading';
import { 
  ModalLoadingOverlay, 
  ButtonLoading, 
  FormLoading,
  SearchLoading,
  SpinnerOnly 
} from '../../components/LoadingComponents';

const QuickSchedule = ({ isOpen, onClose, onScheduleCreated, providers = [], preselectedDate, preselectedTime }) => {
  const [formData, setFormData] = useState({
    provider_id: '',
    patient_id: '',
    date: '',
    start_time: '',
    end_time: '',
    service_id: '',
    description: ''
  });
  const [patients, setPatients] = useState([]);
  const [services, setServices] = useState([]);
  const [error, setError] = useState('');
  const [showPastDateConfirm, setShowPastDateConfirm] = useState(false);
  
  // Enhanced loading states
  const { 
    isLoading: isModalLoading, 
    executeWithLoading 
  } = useLoading();
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  
  // Search states
  const [providerSearch, setProviderSearch] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  // Helper function to calculate end time (1 hour after start time)
  const calculateEndTime = (startTime) => {
    if (!startTime) return '';
    
    const [hours, minutes] = startTime.split(':').map(Number);
    const endHour = hours + 1;
    
    // Handle 24-hour wrap around
    const finalHour = endHour >= 24 ? endHour - 24 : endHour;
    
    return `${finalHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };
  useEffect(() => {
    if (isOpen) {      executeWithLoading(async () => {
        setIsDataLoading(true);
        await Promise.all([fetchPatients(), fetchServices()]);
        setIsDataLoading(false);
      }, '', 'modal');
      
      // Auto-fill form if preselected values are provided
      if (preselectedDate && preselectedTime) {
        const endTime = calculateEndTime(preselectedTime);
        setFormData(prev => ({ 
          ...prev, 
          date: preselectedDate,
          start_time: preselectedTime,
          end_time: endTime
        }));
      } else {
        // Set default date to today if no preselected date
        const today = new Date().toISOString().split('T')[0];
        setFormData(prev => ({ ...prev, date: today }));
      }
    }
  }, [isOpen, preselectedDate, preselectedTime]);

  // Reset form when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        provider_id: '',
        patient_id: '',
        date: '',
        start_time: '',
        end_time: '',
        service_id: '',
        description: ''
      });
      setProviderSearch('');
      setPatientSearch('');
      setError('');
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
        // Handle paginated response from ViewsPatient endpoint
        const patientList = data.results || [];
        console.log('Fetched patients:', patientList); // Debug log
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
        setServices(data || []);
      }
    } catch (err) {
      console.error('Error fetching services:', err);    }
  };

  // Search and filter functions
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
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Auto-calculate end time if start time is set (default 1 hour duration)
    if (name === 'start_time' && value && !formData.end_time) {
      const startTime = new Date(`2000-01-01T${value}`);
      startTime.setHours(startTime.getHours() + 1);
      const endTime = startTime.toTimeString().slice(0, 5);
      setFormData(prev => ({
        ...prev,
        end_time: endTime
      }));
    }  };

  // Helper function to check if date is in the past
  const isDateInPast = (dateString) => {
    const today = new Date();
    const selectedDate = new Date(dateString);
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    selectedDate.setHours(0, 0, 0, 0); // Reset time to start of day
    return selectedDate < today;
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if date is in the past
    if (isDateInPast(formData.date)) {
      setShowPastDateConfirm(true);
      return;
    }
    
    await performSubmit();
  };
  const performSubmit = async () => {
    await executeWithLoading(async () => {
      setError('');

      const token = localStorage.getItem('accessToken');
      
      const response = await fetch('http://localhost:8000/schedule/quick-schedule/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        onScheduleCreated(data);
        onClose();
        resetForm();
      } else {
        const errorData = await response.json();        setError(errorData.error || 'Failed to create schedule');
        throw new Error(errorData.error || 'Failed to create schedule');
      }
    }, '', 'modal');
  };

  const resetForm = () => {
    setFormData({
      provider_id: '',
      patient_id: '',
      date: '',
      start_time: '',
      end_time: '',
      service_id: '',
      description: ''
    });
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="quick-schedule-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Quick Schedule</h2>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>        <form onSubmit={handleSubmit} className="quick-schedule-form">
          {/* Simple loading - same as other pages */}
          {(isDataLoading || isModalLoading) && (
            <div className="simple-loading-container">
              <SpinnerOnly size="large" />
            </div>
          )}
          
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}<div className="form-row">
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
                />                {showProviderDropdown && (
                  <div className="dropdown-list">                    {isSearchLoading ? (
                      <div style={{ padding: '8px', textAlign: 'center' }}>
                        <SpinnerOnly size="small" />
                      </div>
                    ) : filteredProviders.length > 0 ? (
                      filteredProviders.map(provider => (
                        <div
                          key={provider.id}
                          className="dropdown-item"
                          onClick={() => selectProvider(provider)}
                        >
                          <strong>{provider.name}</strong>
                          <span className="provider-service">{provider.service}</span>
                        </div>
                      ))
                    ) : (
                      <div className="dropdown-item disabled">No providers found</div>
                    )}
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
                  onBlur={() => setTimeout(() => setShowPatientDropdown(false), 200)}                />                {showPatientDropdown && (
                  <div className="dropdown-list">                    {isDataLoading ? (
                      <div style={{ padding: '8px', textAlign: 'center' }}>
                        <SpinnerOnly size="small" />
                      </div>
                    ) : filteredPatients.length > 0 ? (
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
                        {patients.length === 0 ? 'No patients available' : 'No patients found'}
                        {patients.length > 0 && <span className="patient-count">({patients.length} total patients)</span>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="date">Date *</label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
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
          </div>          <div className="form-actions">
            <button type="button" onClick={handleClose} className="cancel-btn">
              Cancel
            </button>
            <ButtonLoading 
              type="submit" 
              disabled={isModalLoading || isDataLoading} 
              isLoading={isModalLoading}
              className="submit-btn"
            >
              Create Schedule
            </ButtonLoading>
          </div></form>
      </div>

      {/* Past Date Confirmation Dialog */}
      {showPastDateConfirm && (
        <div className="modal-overlay">
          <div className="confirm-modal">
            <h3>⚠️ Attention: Date in the Past</h3>
            <p>
              You are trying to schedule an appointment for a past date ({formData.date}). 
              Are you sure you want to continue?
            </p>
            <div className="confirm-actions">
              <button 
                onClick={() => setShowPastDateConfirm(false)} 
                className="cancel-btn"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setShowPastDateConfirm(false);
                  performSubmit();
                }} 
                className="confirm-btn"
              >
                Yes, Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickSchedule;

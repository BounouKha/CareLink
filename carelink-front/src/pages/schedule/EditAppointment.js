import React, { useState, useEffect } from 'react';
import './EditAppointment.css'; // Modal-specific styles using UnifiedBaseLayout.css
import { useLoading } from '../../hooks/useLoading';
import { useAuthenticatedApi } from '../../hooks/useAuth';
import { useCareTranslation } from '../../hooks/useCareTranslation';
import tokenManager from '../../utils/tokenManager';
import { 
  ModalLoadingOverlay, 
  ButtonLoading, 
  FormLoading,
  SearchLoading,
  SpinnerOnly 
} from '../../components/LoadingComponents';

const EditAppointment = ({ 
  isOpen, 
  appointment, 
  onClose, 
  onAppointmentUpdated, 
  onAppointmentDeleted, 
  providers = [] 
}) => {
  // Translation hook
  const { schedule, common, placeholders, errors: errorsT } = useCareTranslation();
  
  const [formData, setFormData] = useState({
    provider_id: '',
    patient_id: '',
    date: '',
    start_time: '',
    end_time: '',
    service_id: '',
    description: '',
    status: 'scheduled'
  });  const [patients, setPatients] = useState([]);
  const [services, setServices] = useState([]);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteStrategy, setDeleteStrategy] = useState('smart'); // 'smart', 'aggressive', 'conservative'
  const [showPastDateConfirm, setShowPastDateConfirm] = useState(false);
  
  // Enhanced loading states
  const { 
    isLoading: isModalLoading, 
    executeWithLoading 
  } = useLoading();
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  
  // Search states - same as QuickSchedule
  const [providerSearch, setProviderSearch] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  
  // Use modern authentication API
  const { get, put, delete: del } = useAuthenticatedApi();
  
  useEffect(() => {
    if (isOpen && appointment) {
      // Populate form with appointment data
      const timeslot = appointment.timeslots[0]; // Get first timeslot
      
      // Format time strings to remove seconds if present (HH:MM:SS -> HH:MM)
      const formatTimeForInput = (timeStr) => {
        if (!timeStr) return '';
        return timeStr.split(':').slice(0, 2).join(':');
      };
        setFormData({
        provider_id: appointment.provider.id || '',
        patient_id: appointment.patient.id || '',
        date: appointment.date || '',
        start_time: formatTimeForInput(timeslot?.start_time) || '',
        end_time: formatTimeForInput(timeslot?.end_time) || '',
        service_id: timeslot?.service?.id || '',
        description: timeslot?.description || '',
        status: timeslot?.status || 'scheduled'
      });      // Set initial search values - handle actual data structure
      if (appointment.provider && appointment.provider.name) {
        // Provider might not have service field, so handle it gracefully
        const providerService = appointment.provider.service || '';
        setProviderSearch(providerService ? `${appointment.provider.name} - ${providerService}` : appointment.provider.name);
      } else {
        setProviderSearch('');
      }
      
      if (appointment.patient && appointment.patient.name) {
        // Patient data has 'name' field instead of firstname/lastname
        setPatientSearch(appointment.patient.name);
      } else if (appointment.patient && (appointment.patient.firstname || appointment.patient.lastname)) {
        // Fallback: check for firstname/lastname structure
        setPatientSearch(`${appointment.patient.firstname || ''} ${appointment.patient.lastname || ''}`.trim());
      } else {
        setPatientSearch('');
      }        // Load initial data with loading states
      executeWithLoading(async () => {
        setIsDataLoading(true);
        await Promise.all([fetchPatients(), fetchServices()]);
        setIsDataLoading(false);
      }, '', 'modal');
    }
  }, [isOpen, appointment]);
  const fetchPatients = async () => {
    try {
      if (!tokenManager.isAuthenticated()) {
        throw new Error('User not authenticated. Please log in.');
      }

      const data = await get('http://localhost:8000/account/views_patient/');
      setPatients(data.results || []);
    } catch (err) {
      console.error('Error fetching patients:', err);
      if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        tokenManager.handleLogout();
      }
    }
  };
  const fetchServices = async () => {
    try {
      if (!tokenManager.isAuthenticated()) {
        throw new Error('User not authenticated. Please log in.');
      }

      const data = await get('http://localhost:8000/account/services/');
      setServices(data || []);
    } catch (err) {
      console.error('Error fetching services:', err);
      if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        tokenManager.handleLogout();
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));  };

  // Helper function to check if date is in the past
  const isDateInPast = (dateString) => {
    const today = new Date();
    const selectedDate = new Date(dateString);
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    selectedDate.setHours(0, 0, 0, 0); // Reset time to start of day
    return selectedDate < today;
  };
  const handleUpdate = async (e) => {
    e.preventDefault();
    
    // Check if date is in the past
    if (isDateInPast(formData.date)) {
      setShowPastDateConfirm(true);
      return;
    }
    
    await performUpdate();
  };  const performUpdate = async () => {
    await executeWithLoading(async () => {
      setError('');

      if (!tokenManager.isAuthenticated()) {
        throw new Error('User not authenticated. Please log in.');
      }
      
      // Ensure time format is HH:MM (remove seconds if present)
      const formatTimeForSubmit = (timeStr) => {
        if (!timeStr) return timeStr;
        return timeStr.split(':').slice(0, 2).join(':');
      };
      
      const submitData = {
        ...formData,
        start_time: formatTimeForSubmit(formData.start_time),
        end_time: formatTimeForSubmit(formData.end_time)
      };
      
      const data = await put(`http://localhost:8000/schedule/appointment/${appointment.id}/`, submitData);
      onAppointmentUpdated(data);
      onClose();
    }, '', 'modal');
  };const handleDelete = async () => {
    setIsDeleteLoading(true);
    
    try {
      await executeWithLoading(async () => {
        setError('');

        if (!tokenManager.isAuthenticated()) {
          throw new Error('User not authenticated. Please log in.');
        }
        
        // Get the first timeslot ID to pass to the backend
        const timeslot = appointment.timeslots[0];
        const timeslotId = timeslot?.id;
        
        // Build the URL with deletion strategy and timeslot_id parameters
        let deleteUrl = `http://localhost:8000/schedule/appointment/${appointment.id}/`;
        const params = new URLSearchParams();
        
        if (timeslotId) {
          params.append('timeslot_id', timeslotId);
        }
        params.append('strategy', deleteStrategy);
        
        if (params.toString()) {
          deleteUrl += `?${params.toString()}`;
        }
        
        const data = await del(deleteUrl);
        console.log('Deletion result:', data);
        onAppointmentDeleted();
        onClose();
      }, '', 'modal');
    } catch (err) {
      setError('Network error occurred');
      console.error('Error deleting appointment:', err);
    } finally {
      setIsDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  };const handleClose = () => {
    onClose();
  };
  // Search and filter functions - handle actual data structure
  const filteredProviders = providers.filter(provider =>
    provider.name.toLowerCase().includes(providerSearch.toLowerCase()) ||
    (provider.service && provider.service.toLowerCase().includes(providerSearch.toLowerCase()))
  );
  
  const filteredPatients = patients.filter(patient => {
    const searchTerm = patientSearch.toLowerCase();
    // Handle both 'name' field and 'firstname lastname' structure
    if (patient.name) {
      return patient.name.toLowerCase().includes(searchTerm);
    } else {
      const fullName = `${patient.firstname || ''} ${patient.lastname || ''}`.toLowerCase();
      return fullName.includes(searchTerm) ||
        (patient.national_number && patient.national_number.toLowerCase().includes(searchTerm));
    }
  });

  const selectProvider = (provider) => {
    setFormData(prev => ({ ...prev, provider_id: provider.id }));
    const providerService = provider.service || '';
    setProviderSearch(providerService ? `${provider.name} - ${providerService}` : provider.name);
    setShowProviderDropdown(false);
  };

  const selectPatient = (patient) => {
    setFormData(prev => ({ ...prev, patient_id: patient.id }));
    // Handle both data structures
    const patientName = patient.name || `${patient.firstname || ''} ${patient.lastname || ''}`.trim();
    setPatientSearch(patientName);
    setShowPatientDropdown(false);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="edit-appointment-modal" onClick={(e) => e.stopPropagation()}>        <div className="modal-header">
          <h2>{schedule('editAppointment')}</h2>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div><div className="edit-appointment-form">
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
          )}

          <form onSubmit={handleUpdate}>            <div className="form-row">              <div className="form-group">
                <label htmlFor="provider_search">{schedule('provider')} *</label>
                <div className="searchable-dropdown">
                  <input
                    type="text"
                    id="provider_search"
                    placeholder={schedule('searchProviders')}
                    value={providerSearch}
                    onChange={(e) => setProviderSearch(e.target.value)}
                    onFocus={() => setShowProviderDropdown(true)}
                    onBlur={() => setTimeout(() => setShowProviderDropdown(false), 200)}                  />
                  {showProviderDropdown && (
                    <div className="dropdown-list">                      {isDataLoading ? (
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
                            <span className="provider-service">{provider.service || placeholders('noServiceSpecified')}</span>
                          </div>
                        ))
                      ) : (
                        <div className="dropdown-item disabled">{placeholders('noProvidersFound')}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>              <div className="form-group">
                <label htmlFor="patient_search">{schedule('patient')} *</label>
                <div className="searchable-dropdown">
                  <input
                    type="text"
                    id="patient_search"
                    placeholder={schedule('searchPatients')}
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    onFocus={() => setShowPatientDropdown(true)}
                    onBlur={() => setTimeout(() => setShowPatientDropdown(false), 200)}
                  />{showPatientDropdown && (
                    <div className="dropdown-list">                      {isDataLoading ? (
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
                            <strong>
                              {patient.name || `${patient.firstname || ''} ${patient.lastname || ''}`.trim()}
                            </strong>
                            {patient.national_number && (
                              <span className="patient-info">ID: {patient.national_number}</span>
                            )}
                          </div>
                        ))
                      ) : (                        <div className="dropdown-item disabled">
                          {patients.length === 0 ? placeholders('noPatientsAvailable') : placeholders('noPatientsFound')}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>            {/* Created By and Created At Information - Non-editable */}
            {appointment && (
              <div className="form-row">
                <div className="form-group">
                  <label>{schedule('createdBy')}</label>
                  <div className="read-only-field">
                    <span className="created-by-info">
                      {appointment.created_by?.name || placeholders('unknownUser')}
                      {appointment.created_by?.email && (
                        <span className="creator-email"> ({appointment.created_by.email})</span>
                      )}
                    </span>
                  </div>
                </div>                <div className="form-group">
                  <label>{schedule('createdAt')}</label>
                  <div className="read-only-field">
                    <span className="created-at-info">
                      {appointment.created_at ? 
                        new Date(appointment.created_at).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false
                        }) : placeholders('unknownDate')
                      }
                    </span>
                  </div>
                </div>
              </div>
            )}            <div className="form-row">
              <div className="form-group">
                <label>{schedule('date')} *</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>{schedule('service')}</label>
                <select
                  name="service_id"
                  value={formData.service_id}
                  onChange={handleInputChange}
                >
                  <option value="">{schedule('selectService')}</option>
                  {services.map(service => (
                    <option key={service.id} value={service.id}>
                      {service.name} - €{service.price}
                    </option>
                  ))}
                </select>
              </div>
            </div>            <div className="form-row">
              <div className="form-group">
                <label>{schedule('startTime')} *</label>
                <input
                  type="time"
                  name="start_time"
                  value={formData.start_time}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>{schedule('endTime')} *</label>
                <input
                  type="time"
                  name="end_time"
                  value={formData.end_time}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>{common('status')}</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                >
                  <option value="scheduled">{schedule('statusOptions.scheduled')}</option>
                  <option value="confirmed">{schedule('statusOptions.confirmed')}</option>
                  <option value="in_progress">{schedule('statusOptions.inProgress')}</option>
                  <option value="completed">{schedule('statusOptions.completed')}</option>
                  <option value="cancelled">{schedule('statusOptions.cancelled')}</option>
                  <option value="no_show">{schedule('statusOptions.noShow')}</option>
                </select>
              </div>
            </div>            <div className="form-group">
              <label>{schedule('notes')}</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="3"
                placeholder={placeholders('addNotesOrInstructions')}
              />
            </div>            <div className="form-actions">
              <div className="primary-actions">
                <button type="button" onClick={onClose} className="cancel-btn">
                  {common('cancel')}
                </button>
                <ButtonLoading 
                  type="submit" 
                  disabled={isModalLoading || isDataLoading} 
                  isLoading={isModalLoading}
                  className="update-btn"
                >
                  {schedule('updateAppointment')}
                </ButtonLoading>
              </div>
              
              <div className="danger-actions">
                <button 
                  type="button" 
                  onClick={() => setShowDeleteConfirm(true)}
                  className="delete-btn"
                  disabled={isModalLoading || isDataLoading}
                >
                  {schedule('deleteAppointment')}
                </button>
              </div>
            </div>
          </form>        </div>        {/* Past Date Confirmation Dialog */}
        {showPastDateConfirm && (
          <div className="modal-overlay" onClick={(e) => e.stopPropagation()}>
            <div className="delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
              <h3>⚠️ {schedule('pastDateConfirmation.title')}</h3>
              <p>
                {schedule('pastDateConfirmation.editMessage', { date: formData.date })} 
              </p>
              <div className="confirm-actions">
                <button 
                  onClick={() => setShowPastDateConfirm(false)} 
                  className="cancel-btn"
                >
                  {common('cancel')}
                </button>
                <button 
                  onClick={() => {
                    setShowPastDateConfirm(false);
                    performUpdate();
                  }} 
                  className="confirm-delete-btn"
                >
                  {schedule('pastDateConfirmation.yesContinue')}
                </button>
              </div>
            </div>
          </div>
        )}        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="modal-overlay" onClick={(e) => e.stopPropagation()}>
            <div className="delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
              <h3>{schedule('confirmDeletion')}</h3>
              <p>{schedule('deleteConfirmationMessage')}</p>
                <div className="form-group">
                <label>{schedule('deletionStrategy')}</label>
                <select
                  value={deleteStrategy}
                  onChange={(e) => setDeleteStrategy(e.target.value)}
                  className="strategy-select"
                >
                  <option value="smart">{schedule('deleteStrategies.smart')}</option>
                  <option value="aggressive">{schedule('deleteStrategies.aggressive')}</option>
                  <option value="conservative">{schedule('deleteStrategies.conservative')}</option>
                </select>
                <div className="strategy-explanation">
                  {deleteStrategy === 'smart' && (
                    <small>{schedule('deleteStrategies.smartDescription')}</small>
                  )}
                  {deleteStrategy === 'aggressive' && (
                    <small>{schedule('deleteStrategies.aggressiveDescription')}</small>
                  )}
                  {deleteStrategy === 'conservative' && (
                    <small>{schedule('deleteStrategies.conservativeDescription')}</small>
                  )}
                </div>
              </div>              <div className="confirm-actions">
                <button 
                  onClick={() => setShowDeleteConfirm(false)} 
                  className="cancel-btn"
                >
                  {common('cancel')}
                </button>
                <ButtonLoading 
                  onClick={handleDelete} 
                  className="confirm-delete-btn"
                  disabled={isDeleteLoading || isModalLoading}
                  isLoading={isDeleteLoading}
                >
                  {schedule('yesDelete')}
                </ButtonLoading>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditAppointment;

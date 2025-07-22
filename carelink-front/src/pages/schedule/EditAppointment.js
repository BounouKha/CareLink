import React, { useState, useEffect } from 'react';
import './EditAppointment.css'; // Modal-specific styles using UnifiedBaseLayout.css
import { useLoading } from '../../hooks/useLoading';
import { useAuthenticatedApi } from '../../hooks/useAuth';
import { useCareTranslation } from '../../hooks/useCareTranslation';
import { useConflictManager } from '../../hooks/useConflictManager';
import ConflictManager from '../../components/ConflictManager';
import InamiMedicalCareModal from '../../components/InamiMedicalCareModal';
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
    status: 'scheduled',
    prescription_id: ''
  });

  const [patients, setPatients] = useState([]);
  const [services, setServices] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteStrategy, setDeleteStrategy] = useState('smart'); // 'smart', 'aggressive', 'conservative'
  const [showPastDateConfirm, setShowPastDateConfirm] = useState(false);
  
  // Comments viewing state
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  
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
  
  // INAMI modal states
  const [showInamiModal, setShowInamiModal] = useState(false);
  const [inamiData, setInamiData] = useState(null);

  // Custom pricing states
  const [showCustomPricing, setShowCustomPricing] = useState(false);
  const [customPrice, setCustomPrice] = useState('');
  const [priceType, setPriceType] = useState('hourly');
  const [hasCustomPrice, setHasCustomPrice] = useState(false);
  const [priceNotes, setPriceNotes] = useState('');

  // Conflict management
  const {
    isCheckingConflicts,
    conflicts,
    showConflictDialog,
    checkConflicts,
    handleConflictResolution,
    resetConflicts
  } = useConflictManager();
  
  // Use modern authentication API
  const { get, post, put, delete: del } = useAuthenticatedApi();
  
  useEffect(() => {
    if (isOpen && appointment) {
      console.log('[EditAppointment] Received appointment data:', appointment);
      
      // Populate form with appointment data
      const timeslot = appointment.timeslots[0]; // Get first timeslot
      console.log('[EditAppointment] First timeslot data:', timeslot);
      
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
        status: timeslot?.status || 'scheduled',
        prescription_id: timeslot?.prescription?.service_demand_id || ''
      });

      // Initialize INAMI data if it exists for Service 3
      console.log('[EditAppointment] Checking INAMI data - Service ID:', timeslot?.service?.id);
      console.log('[EditAppointment] INAMI data from timeslot:', timeslot?.inami_data);
      
      if ((timeslot?.service?.id === 3 || timeslot?.service?.id === '3') && timeslot?.inami_data) {
        console.log('[EditAppointment] Initializing INAMI data:', timeslot.inami_data);
        setInamiData(timeslot.inami_data);
      } else {
        console.log('[EditAppointment] No INAMI data to initialize - Service 3?', (timeslot?.service?.id === 3 || timeslot?.service?.id === '3'), 'Has INAMI data?', !!timeslot?.inami_data);
        setInamiData(null);
      }      // Set initial search values - handle actual data structure
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
          await Promise.all([
            fetchPatients(), 
            fetchServices(),
            appointment.patient?.id ? fetchPrescriptions(appointment.patient.id) : Promise.resolve()
          ]);
          
          // Check custom pricing if patient and service are selected and it's service 1 or 2
          const serviceId = timeslot?.service?.id;
          const patientId = appointment.patient?.id;
          if (patientId && serviceId && (serviceId === 1 || serviceId === '1' || serviceId === 2 || serviceId === '2')) {
            await checkCustomPricing(patientId, serviceId);
          }
          
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

  const fetchPrescriptions = async (patientId = null) => {
    try {
      if (!tokenManager.isAuthenticated()) {
        throw new Error('User not authenticated. Please log in.');
      }

      const url = patientId 
        ? `http://localhost:8000/schedule/prescriptions/?patient_id=${patientId}`
        : 'http://localhost:8000/schedule/prescriptions/';
      
      const data = await get(url);
      setPrescriptions(data.prescriptions || []);
      console.log('Fetched prescriptions:', data.prescriptions);
    } catch (err) {
      console.error('Error fetching prescriptions:', err);
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
    }));

    // Show INAMI modal for Service 3 (Soins Infirmiers)
    if (name === 'service_id' && (value === '3' || value === 3) && !inamiData) {
      console.log('[EditAppointment] Service 3 selected, opening INAMI modal');
      setShowInamiModal(true);
    }

    // Clear INAMI data if service changes from 3 to something else
    if (name === 'service_id' && value !== '3' && value !== 3 && inamiData) {
      setInamiData(null);
    }

    // Clear prescription selection if service changes away from Service 3
    if (name === 'service_id' && value !== '3' && value !== 3 && formData.prescription_id) {
      setFormData(prev => ({ ...prev, prescription_id: '' }));
    }

    // Check for custom pricing when both patient and service are selected
    if (name === 'service_id' && formData.patient_id && value) {
      checkCustomPricing(formData.patient_id, value);
    }
    
    // Clear custom pricing states if service changes away from 1 or 2
    if (name === 'service_id' && value !== '1' && value !== 1 && value !== '2' && value !== 2) {
      setShowCustomPricing(false);
      setHasCustomPrice(false);
      setCustomPrice('');
      setPriceNotes('');
    }

    // Fetch prescriptions and check custom pricing when patient is selected
    if (name === 'patient_id') {
      fetchPrescriptions(value);
      
      // Clear custom pricing states when patient changes
      setShowCustomPricing(false);
      setHasCustomPrice(false);
      setCustomPrice('');
      setPriceNotes('');
      
      // If service is already selected, check custom pricing
      if (formData.service_id) {
        checkCustomPricing(value, formData.service_id);
      }
    }
  };

  // INAMI Modal Handlers
  const handleInamiSave = (inamiConfigData) => {
    console.log('[EditAppointment] INAMI configuration saved:', inamiConfigData);
    setInamiData(inamiConfigData);
    setShowInamiModal(false);
  };

  const handleInamiClose = () => {
    setShowInamiModal(false);
    // If no INAMI data is configured and it's a new Service 3 selection, reset service
    if (!inamiData && (formData.service_id === '3' || formData.service_id === 3)) {
      // Check if this is a new selection (no previous INAMI data from appointment)
      const timeslot = appointment?.timeslots?.[0];
      if (!timeslot?.inami_data) {
        setFormData(prev => ({ ...prev, service_id: '' }));
      }
    }
  };

  const openInamiConfiguration = () => {
    console.log('[EditAppointment] Opening INAMI configuration modal');
    setShowInamiModal(true);
  };

  // Helper function to check if date is in the past
  const isDateInPast = (dateString) => {
    const today = new Date();
    const selectedDate = new Date(dateString);
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    selectedDate.setHours(0, 0, 0, 0); // Reset time to start of day
    return selectedDate < today;
  };  const handleUpdate = async (e) => {
    e.preventDefault();
    
    // Check if date is in the past
    if (isDateInPast(formData.date)) {
      setShowPastDateConfirm(true);
      return;
    }
    
    await performUpdate(false); // false = don't force update
  };

  const performUpdate = async (forceUpdate = false) => {
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

      // Include INAMI data for Service 3 appointments
      if ((formData.service_id === '3' || formData.service_id === 3) && inamiData) {
        submitData.inami_data = inamiData;
        console.log('[EditAppointment] Including INAMI data in submission:', inamiData);
      }

      // Include prescription data if selected
      if (formData.prescription_id) {
        submitData.prescription_id = formData.prescription_id;
        console.log('[EditAppointment] Including prescription ID in submission:', formData.prescription_id);
      }

      // Include custom pricing data if available
      if (hasCustomPrice && customPrice && (formData.service_id === '1' || formData.service_id === 1 || formData.service_id === '2' || formData.service_id === 2)) {
        submitData.custom_price = customPrice;
        submitData.price_type = priceType;
        if (priceNotes) {
          submitData.price_notes = priceNotes;
        }
        console.log('[EditAppointment] Including custom pricing data:', { customPrice, priceType, priceNotes });
      }      // Check for conflicts first (unless forcing update)
      if (!forceUpdate) {
        // Add exclude IDs to exclude current appointment from conflict check
        const timeslot = appointment.timeslots[0]; // Get first timeslot
        const excludeIds = {
          exclude_schedule_id: appointment.id, // Exclude current appointment
          exclude_timeslot_id: timeslot?.id // Exclude current timeslot
        };
        
        const result = await checkConflicts(submitData, excludeIds);
        if (result.hasConflicts) {
          return; // Conflict dialog will be shown by useConflictManager
        }
      }

      // Add force_update parameter if needed
      const finalSubmitData = forceUpdate ? { ...submitData, force_update: true } : submitData;
      
      const data = await put(`http://localhost:8000/schedule/appointment/${appointment.id}/`, finalSubmitData);
      onAppointmentUpdated(data);
      resetConflicts();
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
  };  const handleClose = () => {
    onClose();
  };

  // Function to fetch comments for this appointment
  const fetchComments = async () => {
    if (!appointment || !appointment.timeslots || !appointment.timeslots[0]) {
      return;
    }

    setCommentsLoading(true);
    try {
      const timeslotId = appointment.timeslots[0].id;
      const response = await get(`http://localhost:8000/account/coordinator-comments/${timeslotId}/`);
      
      if (response.comments) {
        setComments(response.comments);
      } else {
        setComments([]);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  };

  // Handle conflict resolution
  const onConflictResolution = (resolution, force = false) => {
    // Handle resolution types and force flag
    const result = handleConflictResolution(resolution, force);
    
    if (resolution === 'confirm' || force === true) {
      // Force update when confirmed or force is true
      performUpdate(true); // Force update
    }
    // For 'cancel', the dialog just closes
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
    setFormData(prev => ({ ...prev, patient_id: patient.id, prescription_id: '' }));
    // Handle both data structures
    const patientName = patient.name || `${patient.firstname || ''} ${patient.lastname || ''}`.trim();
    setPatientSearch(patientName);
    setShowPatientDropdown(false);
    
    // Fetch prescriptions for this patient
    fetchPrescriptions(patient.id);
  };

  // Custom pricing functions (same as QuickSchedule)
  const checkCustomPricing = async (patientId, serviceId) => {
    try {
      const response = await get(`http://localhost:8000/schedule/patient-service-price/?patient_id=${patientId}&service_id=${serviceId}`);
      
      if (response.has_custom_price) {
        setHasCustomPrice(true);
        setCustomPrice(response.custom_price);
        setPriceType(response.price_type);
        setPriceNotes(response.notes || '');
        console.log('[EditAppointment] Found custom price:', response.custom_price);
      } else {
        setHasCustomPrice(false);
        setCustomPrice('');
        setPriceNotes('');
        
        // For service ID 1 or 2 (family help), show pricing options
        if (serviceId === '1' || serviceId === 1 || serviceId === '2' || serviceId === 2) {
          setShowCustomPricing(true);
        }
      }
    } catch (error) {
      console.error('[EditAppointment] Error checking custom pricing:', error);
    }
  };

  const saveCustomPricing = async () => {
    try {
      const response = await post('http://localhost:8000/schedule/patient-service-price/', {
        patient_id: formData.patient_id,
        service_id: formData.service_id,
        custom_price: customPrice,
        price_type: priceType,
        notes: priceNotes
      });
      
      if (response.success) {
        setHasCustomPrice(true);
        setShowCustomPricing(false);
        console.log('[EditAppointment] Custom price saved:', customPrice);
      }
    } catch (error) {
      console.error('[EditAppointment] Error saving custom price:', error);
      setError('Failed to save custom pricing');
    }
  };

  // Add custom pricing event handlers
  const handleEditCustomPrice = () => {
    setShowCustomPricing(true);
  };

  const handleCancelCustomPricing = () => {
    setShowCustomPricing(false);
    // Reset to original values if canceling edit
    if (hasCustomPrice) {
      // Keep the existing values if we already have a custom price
    } else {
      setCustomPrice('');
      setPriceNotes('');
    }
  };

  const handleSaveCustomPricing = () => {
    saveCustomPricing();
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
                  )}                </div>
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
                      {service.id === 3 ? `${service.name} (Soins Infirmiers INAMI)` : service.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Prescription Selector - only show for Service 3 (infirmier) when patient is selected */}
              {formData.patient_id && prescriptions.length > 0 && (formData.service_id === '3' || formData.service_id === 3) && (
                <div className="form-group">
                  <label htmlFor="prescription_id">Link to Prescription (Optional)</label>
                  <select
                    name="prescription_id"
                    value={formData.prescription_id}
                    onChange={handleInputChange}
                  >
                    <option value="">No Prescription</option>
                    {prescriptions.map(prescription => (
                      <option key={prescription.id} value={prescription.id}>
                        {prescription.title} - {prescription.service_name} 
                        {prescription.linked_timeslots_count > 0 ? ` (${prescription.linked_timeslots_count} timeslots)` : ''}
                        {prescription.priority === 'Urgent' ? ' 🔴' : ''}
                      </option>
                    ))}
                  </select>
                  {formData.prescription_id && (
                    <small className="form-hint">
                      📋 This appointment will be linked to the selected prescription
                    </small>
                  )}
                </div>
              )}
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
            </div>

            {/* Custom Pricing Section - for service ID 1 or 2 (family help services) */}
            {(formData.service_id === '1' || formData.service_id === 1 || formData.service_id === '2' || formData.service_id === 2) && formData.patient_id && (
              <div className="custom-pricing-section">
                <div className="custom-pricing-header">
                  <h4>💰 Custom Pricing</h4>
                  {hasCustomPrice && (
                    <button 
                      type="button" 
                      className="edit-price-btn"
                      onClick={() => setShowCustomPricing(true)}
                      title="Edit custom price for this patient-service combination"
                    >
                      ✏️ Edit Price
                    </button>
                  )}
                </div>
                
                {showCustomPricing ? (
                  <div className="pricing-configuration">
                    <div className="pricing-status">
                      <span className="status-indicator configuring">
                        ⚙️ {hasCustomPrice ? 'Edit Custom Price' : 'Set Custom Price'}
                      </span>
                    </div>
                    <div className="pricing-form">
                      <div className="form-row">
                        <div className="form-group">
                          <label>Price (€)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Enter price"
                            value={customPrice}
                            onChange={(e) => setCustomPrice(e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <label>Price Type</label>
                          <select 
                            value={priceType} 
                            onChange={(e) => setPriceType(e.target.value)}
                          >
                            <option value="hourly">Per Hour</option>
                            <option value="fixed">Fixed Price</option>
                          </select>
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Notes (Optional)</label>
                        <textarea
                          placeholder="Additional notes about this pricing..."
                          value={priceNotes}
                          onChange={(e) => setPriceNotes(e.target.value)}
                          rows="2"
                        />
                      </div>
                      <div className="pricing-actions">
                        <button 
                          type="button" 
                          className="save-price-btn"
                          onClick={saveCustomPricing}
                          disabled={!customPrice}
                        >
                          Save Price
                        </button>
                        <button 
                          type="button" 
                          className="cancel-price-btn"
                          onClick={() => setShowCustomPricing(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : hasCustomPrice ? (
                  <div className="pricing-summary">
                    <div className="pricing-status">
                      <span className="status-indicator configured">
                        ✅ Custom Price Set
                      </span>
                    </div>
                    <div className="pricing-details">
                      <div className="detail-item">
                        <strong>Price:</strong> €{customPrice} ({priceType})
                      </div>
                      {priceNotes && (
                        <div className="detail-item">
                          <strong>Notes:</strong> {priceNotes}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="pricing-summary">
                    <div className="pricing-status">
                      <span className="status-indicator not-configured">
                        ⚠️ No Custom Price Set
                      </span>
                    </div>
                    <p className="pricing-note">
                      Set a custom price for this patient-service combination.
                    </p>
                    <button 
                      type="button" 
                      className="set-price-btn"
                      onClick={() => setShowCustomPricing(true)}
                    >
                      Set Custom Price
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* INAMI Configuration Section for Service 3 */}
            {(formData.service_id === '3' || formData.service_id === 3) && (
              <div className="inami-configuration-section">
                <div className="inami-header">
                  <h4>Configuration INAMI</h4>
                  <button 
                    type="button" 
                    className="configure-inami-btn"
                    onClick={openInamiConfiguration}
                  >
                    {inamiData ? 'Reconfigurer INAMI' : 'Configurer INAMI'}
                  </button>
                </div>
                
                {inamiData ? (
                  <div className="inami-summary">
                    <div className="inami-status">
                      <span className="status-indicator configured">
                        ✅ INAMI Configuré
                      </span>
                    </div>
                    <div className="inami-details">
                      <div className="detail-item">
                        <strong>Type:</strong> {inamiData.care_type_label}
                      </div>
                      <div className="detail-item">
                        <strong>Code INAMI:</strong> {inamiData.inami_code}
                      </div>
                      <div className="detail-item">
                        <strong>Coût total:</strong> €{inamiData.total_price}
                      </div>
                      <div className="detail-item patient-copay-highlight">
                        <strong>À payer par le patient:</strong> €{inamiData.patient_copay}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="inami-summary">
                    <div className="inami-status">
                      <span className="status-indicator not-configured">
                        ⚠️ INAMI Non Configuré
                      </span>
                    </div>
                    <p className="configuration-note">
                      La configuration INAMI est requise pour les soins infirmiers.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Prescription Summary Section */}
            {formData.prescription_id && (
              <div className="prescription-summary-section">
                <div className="prescription-header">
                  <h4>📋 Prescription Linked</h4>
                </div>
                {(() => {
                  const selectedPrescription = prescriptions.find(p => p.id.toString() === formData.prescription_id);
                  return selectedPrescription ? (
                    <div className="prescription-summary">
                      <div className="prescription-status">
                        <span className="status-indicator configured">
                          ✅ Prescription Linked
                        </span>
                      </div>
                      <div className="prescription-details">
                        <div className="detail-item">
                          <strong>Title:</strong> {selectedPrescription.title}
                        </div>
                        <div className="detail-item">
                          <strong>Service:</strong> {selectedPrescription.service_name}
                        </div>
                        <div className="detail-item">
                          <strong>Priority:</strong> {selectedPrescription.priority}
                          {selectedPrescription.priority === 'Urgent' && ' 🔴'}
                        </div>
                        {selectedPrescription.instructions && (
                          <div className="detail-item">
                            <strong>Instructions:</strong> {selectedPrescription.instructions}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label>{schedule('notes')}</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder={placeholders('addNotesOrInstructions')}
                />
              </div>
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
              
              <div className="secondary-actions">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowComments(true);
                    fetchComments();
                  }}
                  className="view-comments-btn"
                  disabled={isModalLoading || isDataLoading}
                >
                  💬 View Comments
                </button>
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
                {schedule('pastDateConfirmation.editMessage').replace('{date}', new Date(formData.date).toLocaleDateString())}
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
        )}{/* Delete Confirmation Modal */}
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
              </div>            </div>
          </div>
        )}        {/* INAMI Medical Care Configuration Modal */}
        <InamiMedicalCareModal
          isOpen={showInamiModal}
          onClose={handleInamiClose}
          onSave={handleInamiSave}
          initialData={inamiData}
          patientData={patients.find(p => p.id === parseInt(formData.patient_id))}
          prescriptionData={prescriptions.find(p => p.id === parseInt(formData.prescription_id))}
        />

        {/* Conflict Management Dialog */}
        <ConflictManager
          isOpen={showConflictDialog}
          conflicts={conflicts?.conflicts}
          onConfirm={(force) => onConflictResolution('confirm', force)}
          onCancel={(action) => onConflictResolution(action || 'cancel')}
          schedulingData={conflicts?.scheduling_data}
        />
        
        {/* Comments Viewing Modal */}
        {showComments && (
          <div className="modal-overlay" onClick={() => setShowComments(false)}>
            <div className="comments-view-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>💬 Patient Comments</h3>
                <button 
                  className="close-btn" 
                  onClick={() => setShowComments(false)}
                >
                  ×
                </button>
              </div>
              
              <div className="modal-body">
                <div className="appointment-info">
                  <p><strong>Patient:</strong> {appointment?.patient?.name || `${appointment?.patient?.firstname || ''} ${appointment?.patient?.lastname || ''}`.trim()}</p>
                  <p><strong>Date:</strong> {appointment?.date}</p>
                  <p><strong>Time:</strong> {appointment?.timeslots?.[0]?.start_time} - {appointment?.timeslots?.[0]?.end_time}</p>
                </div>
                
                <div className="comments-content">
                  {commentsLoading ? (
                    <div className="loading-center">
                      <SpinnerOnly size="medium" />
                    </div>
                  ) : comments.length > 0 ? (
                    <div className="comments-list">
                      {comments.map((comment, index) => (
                        <div key={comment.id || index} className="comment-item">
                          <div className="comment-header">
                            <div className="comment-meta">
                              <span className="comment-author">
                                {comment.created_by_name} ({comment.created_by_role})
                              </span>
                              <span className="comment-date">
                                {new Date(comment.created_at).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            {comment.is_edited && (
                              <span className="edited-badge">Edited</span>
                            )}
                          </div>
                          <div className="comment-text">
                            {comment.comment}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-comments">
                      <p>No comments have been added to this appointment yet.</p>
                    </div>
                  )}
                </div>
                
                <div className="modal-footer">
                  <button 
                    className="close-btn-footer" 
                    onClick={() => setShowComments(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditAppointment;

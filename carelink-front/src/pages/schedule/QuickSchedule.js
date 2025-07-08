import React, { useState, useEffect } from 'react';
import './QuickSchedule.css';
import { useLoading } from '../../hooks/useLoading';
import { useAuthenticatedApi } from '../../hooks/useAuth';
import tokenManager from '../../utils/tokenManager';
import { useCareTranslation } from '../../hooks/useCareTranslation';
import { useConflictManager } from '../../hooks/useConflictManager';
import ConflictManager from '../../components/ConflictManager';
import InamiMedicalCareModal from '../../components/InamiMedicalCareModal';
import { 
  ModalLoadingOverlay, 
  ButtonLoading, 
  FormLoading,
  SearchLoading,
  SpinnerOnly 
} from '../../components/LoadingComponents';

const QuickSchedule = ({ isOpen, onClose, onScheduleCreated, providers = [], preselectedDate, preselectedTime }) => {
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
    prescription_id: ''
  });  const [patients, setPatients] = useState([]);
  const [services, setServices] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPastDateConfirm, setShowPastDateConfirm] = useState(false);
    // Enhanced loading states
  const { 
    isLoading: isModalLoading, 
    executeWithLoading 
  } = useLoading();
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);

  // Use modern authentication API
  const { get, post } = useAuthenticatedApi();
    // Search states
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
  } = useConflictManager();  // Helper function to calculate end time (30 minutes after start time)
  const calculateEndTime = (startTime) => {
    if (!startTime) return '';
    
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + 30; // Add 30 minutes instead of 60
    
    const endHour = Math.floor(totalMinutes / 60);
    const endMinute = totalMinutes % 60;
    
    // Handle 24-hour wrap around
    const finalHour = endHour >= 24 ? endHour - 24 : endHour;
    
    return `${finalHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
  };useEffect(() => {
    if (isOpen) {      executeWithLoading(async () => {
        setIsDataLoading(true);
        await Promise.all([fetchPatients(), fetchServices()]);
        setIsDataLoading(false);
      }, '', 'modal');
      
      // Debug log the preselected values
      console.log('QuickSchedule opened with:', { preselectedDate, preselectedTime });
      
      // Auto-fill form if preselected values are provided
      if (preselectedDate && preselectedTime) {
        // Ensure the time format is HH:MM (not HH:MM:SS)
        const formattedTime = preselectedTime.split(':').slice(0, 2).join(':');
        const endTime = calculateEndTime(formattedTime);
        
        console.log('Setting preselected data:', {
          date: preselectedDate,
          start_time: formattedTime,
          end_time: endTime
        });
        
        setFormData(prev => ({ 
          ...prev, 
          date: preselectedDate,
          start_time: formattedTime,
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
        description: '',
        prescription_id: ''
      });
      setProviderSearch('');
      setPatientSearch('');
      setPrescriptions([]);
      setError('');
    }
  }, [isOpen]);

const fetchPatients = async () => {
    try {
      if (!tokenManager.isAuthenticated()) {
        throw new Error('User not authenticated. Please log in.');
      }

      const data = await get('http://localhost:8000/account/views_patient/');
      // Handle paginated response from ViewsPatient endpoint
      const patientList = data.results || [];
      console.log('Fetched patients:', patientList); // Debug log
      setPatients(patientList);
    } catch (err) {
      console.error('Error fetching patients:', err);
      if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        tokenManager.handleLogout();
      } else {
        setError('Error loading patients. Please check your connection.');
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
      console.log('[QuickSchedule] fetchPrescriptions called with patientId:', patientId);
      
      if (!tokenManager.isAuthenticated()) {
        throw new Error('User not authenticated. Please log in.');
      }

      const url = patientId 
        ? `http://localhost:8000/schedule/prescriptions/?patient_id=${patientId}`
        : 'http://localhost:8000/schedule/prescriptions/';
      
      console.log('[QuickSchedule] Fetching prescriptions from URL:', url);
      const data = await get(url);
      console.log('[QuickSchedule] Prescription API response:', data);
      
      setPrescriptions(data.prescriptions || []);
      console.log('[QuickSchedule] Set prescriptions state:', data.prescriptions || []);
    } catch (err) {
      console.error('[QuickSchedule] Error fetching prescriptions:', err);
      if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        tokenManager.handleLogout();
      }
    }
  };

  // Custom pricing functions
  const checkCustomPricing = async (patientId, serviceId) => {
    try {
      const response = await get(`http://localhost:8000/schedule/patient-service-price/?patient_id=${patientId}&service_id=${serviceId}`);
      
      if (response.has_custom_price) {
        setHasCustomPrice(true);
        setCustomPrice(response.custom_price);
        setPriceType(response.price_type);
        setPriceNotes(response.notes || '');
        console.log('[QuickSchedule] Found custom price:', response.custom_price);
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
      console.error('[QuickSchedule] Error checking custom pricing:', error);
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
        console.log('[QuickSchedule] Custom price saved:', customPrice);
      }
    } catch (error) {
      console.error('[QuickSchedule] Error saving custom price:', error);
      setError('Failed to save custom pricing');
    }
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
    
    // Check for provider absence if date is already selected
    if (formData.date) {
      console.log(`[QuickSchedule] Provider selected, checking absence for date: ${formData.date}`);
      checkProviderAbsence(provider.id, formData.date);
    } else {
      console.log(`[QuickSchedule] Provider selected but no date selected yet`);
    }
  };

  const checkProviderAbsence = async (providerId, date) => {
    try {
      console.log(`[QuickSchedule] Checking absence for provider ${providerId} on ${date}`);
      
      const response = await get(`http://localhost:8000/account/providers/${providerId}/absence-check/?dates=${date}`);
      console.log(`[QuickSchedule] Absence check response:`, response);
      
      if (response.absence_data && response.absence_data[date]) {
        const absence = response.absence_data[date];
        console.log(`[QuickSchedule] Absence data for ${date}:`, absence);
        
        // Only show warning if the provider is actually absent
        if (absence.is_absent) {
          const absenceType = absence.absence_type || 'absence';
          const providerName = providers.find(p => p.id === providerId)?.name || 'Provider';
          
          const message = `⚠️ ${providerName} is absent on ${new Date(date).toLocaleDateString()} (${absenceType}). Do you want to schedule anyway?`;
          
          if (window.showToast) {
            window.showToast(message, 'warning', 8000);
          }
          
          console.log(`[QuickSchedule] Provider absence detected:`, absence);
        } else {
          console.log(`[QuickSchedule] Provider is available on ${date}`);
        }
      } else {
        console.log(`[QuickSchedule] No absence data found for ${date}`);
      }
    } catch (error) {
      console.error('[QuickSchedule] Error checking provider absence:', error);
    }
  };

  const selectPatient = (patient) => {
    console.log('[QuickSchedule] Patient selected:', patient);
    setFormData(prev => ({ ...prev, patient_id: patient.id, prescription_id: '' }));
    setPatientSearch(`${patient.firstname || ''} ${patient.lastname || ''}`);
    setShowPatientDropdown(false);
    
    // Fetch prescriptions for this patient
    console.log('[QuickSchedule] Fetching prescriptions for patient ID:', patient.id);
    fetchPrescriptions(patient.id);
  };

  const clearPatient = () => {
    setFormData(prev => ({ ...prev, patient_id: '', prescription_id: '' }));
    setPatientSearch('');
    setShowPatientDropdown(false);
    setPrescriptions([]); // Clear prescriptions when patient is cleared
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Auto-calculate end time if start time is set (default 30 minute duration)
    if (name === 'start_time' && value && !formData.end_time) {
      const endTime = calculateEndTime(value);
      setFormData(prev => ({
        ...prev,
        end_time: endTime
      }));
    }

    // Check for provider absence when date changes
    if (name === 'date' && value && formData.provider_id) {
      console.log(`[QuickSchedule] Date changed to ${value}, checking absence for provider ${formData.provider_id}`);
      checkProviderAbsence(formData.provider_id, value);
    }

    // Show INAMI modal for Service 3 (Soins Infirmiers)
    if (name === 'service_id' && value === '3') {
      console.log('[QuickSchedule] Service 3 selected, opening INAMI modal');
      setShowInamiModal(true);
    }

    // Clear INAMI data if service changes from 3 to something else
    if (name === 'service_id' && value !== '3' && inamiData) {
      setInamiData(null);
    }

    // Check for custom pricing when both patient and service are selected
    if (name === 'service_id' && formData.patient_id && value) {
      checkCustomPricing(formData.patient_id, value);
    }

    // Fetch prescriptions when patient is selected
    if (name === 'patient_id') {
      fetchPrescriptions(value);
      
      // If service is already selected, check custom pricing
      if (formData.service_id) {
        checkCustomPricing(value, formData.service_id);
      }
    }
  };

  // INAMI Modal Handlers
  const handleInamiSave = (inamiConfigData) => {
    console.log('[QuickSchedule] INAMI configuration saved:', inamiConfigData);
    setInamiData(inamiConfigData);
    setShowInamiModal(false);
  };

  const handleInamiClose = () => {
    setShowInamiModal(false);
    // If no INAMI data is configured, reset service selection
    if (!inamiData) {
      setFormData(prev => ({ ...prev, service_id: '' }));
    }
  };

  const openInamiConfiguration = () => {
    console.log('[QuickSchedule] Opening INAMI configuration modal');
    setShowInamiModal(true);
  };

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
  };  const performSubmit = async (forceSchedule = false) => {
    // Frontend validation - patient_id is optional for blocked time
    const requiredFields = ['provider_id', 'date', 'start_time', 'end_time'];
    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
      setError(schedule('errors.fillRequiredFields', { fields: missingFields.join(', ') }));
      console.error('Missing form data:', formData);
      return;
    }

    // Validate time format and duration
    if (formData.start_time && formData.end_time) {
      const start = new Date(`2000-01-01T${formData.start_time}`);
      const end = new Date(`2000-01-01T${formData.end_time}`);
      const durationMinutes = (end - start) / (1000 * 60);
      
      if (durationMinutes <= 0) {
        setError('End time must be after start time');
        return;
      }
      
      if (durationMinutes < 15) {
        setError('Minimum appointment duration is 15 minutes');
        return;
      }
      
      // Optional: Check if times align with 30-minute intervals
      const startMinutes = start.getMinutes();
      const endMinutes = end.getMinutes();
      if (startMinutes % 30 !== 0 || endMinutes % 30 !== 0) {
        console.warn('Times do not align with 30-minute intervals');
      }
    }

    await executeWithLoading(async () => {
      setError('');

      if (!tokenManager.isAuthenticated()) {
        throw new Error('User not authenticated. Please log in.');
      }
      
      // If not forcing, check for conflicts first
      if (!forceSchedule) {
        try {
          const result = await checkConflicts(formData);
          if (result.hasConflicts) {
            // Conflicts detected, dialog will be shown by the hook
            return;
          }
        } catch (error) {
          console.error('Error checking conflicts:', error);
          // Continue with scheduling if conflict check fails
        }
      }
      
      // Prepare submission data (include force_schedule if needed)
      let submitData = forceSchedule 
        ? { ...formData, force_schedule: true } 
        : { ...formData };

      // Include INAMI data for Service 3 appointments
      if (formData.service_id === '3' && inamiData) {
        submitData.inami_data = inamiData;
        console.log('[QuickSchedule] Including INAMI data in submission:', inamiData);
      }

      // Include prescription data if selected
      if (formData.prescription_id) {
        submitData.prescription_id = formData.prescription_id;
        console.log('[QuickSchedule] Including prescription ID in submission:', formData.prescription_id);
      }
      
      // Debug log the form data being sent
      console.log('Submitting form data:', submitData);
        const data = await post('http://localhost:8000/schedule/quick-schedule/', submitData);
      
      // Show success feedback
      setSuccess(true);
      
      // Provide specific feedback based on appointment type
      if (!formData.patient_id) {
        console.log('🚫 Blocked time created successfully!', {
          provider: submitData.provider_id,
          date: submitData.date,
          time: `${submitData.start_time} - ${submitData.end_time}`,
          description: submitData.description || 'Blocked Time'
        });
      } else {
        console.log('✅ Patient appointment created successfully!', data);
      }
      
      // Add a small delay to show success feedback before closing
      setTimeout(() => {
        onScheduleCreated(data);
        onClose();
        resetForm();
        resetConflicts();
        setSuccess(false);
      }, 1000);
    }, '', 'modal');
  };

  // Handle conflict resolution
  const handleConflictAction = (action) => {
    const resolution = handleConflictResolution(action);
    
    if (resolution.action === 'proceed') {
      // User wants to proceed with scheduling despite conflicts
      performSubmit(true);
    } else if (resolution.action === 'modify') {
      // User wants to modify the time - just close the dialog
      // They can then adjust the form and try again
    }
    // If action is 'cancel', the dialog is already closed
  };
  const resetForm = () => {
    setFormData({
      provider_id: '',
      patient_id: '',
      date: '',
      start_time: '',
      end_time: '',
      service_id: '',
      description: '',
      prescription_id: ''
    });
    setError('');
    setPrescriptions([]);
    resetConflicts();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>      <div className="quick-schedule-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{schedule('quickSchedule')}</h2>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div><form onSubmit={handleSubmit} className="quick-schedule-form">
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
          )}          <div className="form-row">
            <div className="form-group">
              <label htmlFor="provider_search">{schedule('provider')} * {formData.provider_id ? '✅' : '❌'}</label>
              <div className="searchable-dropdown">
                <input
                  type="text"
                  id="provider_search"
                  placeholder={schedule('searchProviders')}
                  value={providerSearch}
                  onChange={(e) => setProviderSearch(e.target.value)}
                  onFocus={() => setShowProviderDropdown(true)}
                  onBlur={() => setTimeout(() => setShowProviderDropdown(false), 200)}
                />{showProviderDropdown && (
                  <div className="dropdown-list">
                    {isSearchLoading ? (
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
                      <div className="dropdown-item disabled">{schedule('noProvidersFound')}</div>
                    )}
                  </div>
                )}
              </div>
            </div>            <div className="form-group">
              <label htmlFor="patient_search">
                {schedule('patient')} {formData.patient_id ? '✅' : ''}                <small style={{ fontWeight: 'normal', color: '#666', marginLeft: '8px' }}>
                  ({schedule('optionalForBlockedTime')})
                </small>
              </label>
              <div className="searchable-dropdown" style={{ position: 'relative' }}>
                <input
                  type="text"
                  id="patient_search"
                  placeholder={formData.patient_id ? schedule('searchPatientsSchedule') : schedule('searchPatientsOrLeaveEmptyForBlockedTime')}
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  onFocus={() => setShowPatientDropdown(true)}
                  onBlur={() => setTimeout(() => setShowPatientDropdown(false), 200)}                />                {formData.patient_id && (
                  <button
                    type="button"
                    className="clear-button"
                    onClick={clearPatient}
                    style={{ 
                      position: 'absolute', 
                      right: '8px', 
                      top: '50%', 
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#999',
                      cursor: 'pointer',
                      fontSize: '16px'
                    }}
                    title={schedule('clearPatient')}
                  >
                    ✕
                  </button>
                )}
                {showPatientDropdown && (
                  <div className="dropdown-list">                    {isDataLoading ? (
                      <div style={{ padding: '8px', textAlign: 'center' }}>
                        <SpinnerOnly size="small" />
                      </div>                    ) : filteredPatients.length > 0 ? (
                      <>
                        {/* Option to clear patient for blocked time */}
                        <div
                          className="dropdown-item"
                          onClick={() => clearPatient()}
                          style={{ borderBottom: '1px solid #eee', marginBottom: '4px', color: '#007bff', fontWeight: 'bold' }}
                        >
                          🚫 {schedule('clearPatientBlockTime')}
                        </div>
                        {/* Regular patient options */}
                        {filteredPatients.map(patient => (
                          <div
                            key={patient.id}
                            className="dropdown-item"
                            onClick={() => {
                              console.log('[QuickSchedule] Dropdown clicked for patient:', patient);
                              selectPatient(patient);
                            }}
                          >
                            <strong>{patient.firstname} {patient.lastname}</strong>
                            <span className="patient-info">ID: {patient.national_number}</span>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div className="dropdown-item disabled">
                        {patients.length === 0 ? schedule('noPatientsAvailable') : schedule('noPatientsFound')}
                        {patients.length > 0 && <span className="patient-count">({patients.length} total patients)</span>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>          <div className="form-row">
            <div className="form-group">
              <label htmlFor="date">{schedule('date')} *</label>
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
              <label htmlFor="service_id">{schedule('service')}</label>
              <select
                id="service_id"
                name="service_id"
                value={formData.service_id}
                onChange={handleInputChange}
              >
                <option value="">{schedule('selectServiceOptional')}</option>
                {services.map(service => (
                  <option key={service.id} value={service.id}>
                    {service.id === 3 ? `${service.name} (Soins Infirmiers INAMI)` : service.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Pricing Section - show when service 1 or 2 (aide menager/aide familial) is selected and patient is selected */}
            {formData.patient_id && (formData.service_id === '1' || formData.service_id === '2') && (
              <div className="form-group">
                <label>Service Pricing (Family Help / Aide Familial)</label>
                
                {hasCustomPrice ? (
                  <div style={{ padding: '10px', background: '#e8f5e8', border: '1px solid #4caf50', borderRadius: '4px' }}>
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <strong>€{customPrice}/{priceType}</strong>
                        {priceNotes && <small className="d-block text-muted">{priceNotes}</small>}
                      </div>
                      <button 
                        type="button" 
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => setShowCustomPricing(true)}
                      >
                        Edit Price
                      </button>
                    </div>
                  </div>
                ) : showCustomPricing ? (
                  <div style={{ padding: '10px', background: '#fff8e1', border: '1px solid #ff9800', borderRadius: '4px' }}>
                    <div className="row">
                      <div className="col-md-6">
                        <label>Price (€0.94 - €9.97)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.94"
                          max="9.97"
                          className="form-control"
                          value={customPrice}
                          onChange={(e) => setCustomPrice(e.target.value)}
                          placeholder="Enter price"
                        />
                      </div>
                      <div className="col-md-6">
                        <label>Price Type</label>
                        <select
                          className="form-control"
                          value={priceType}
                          onChange={(e) => setPriceType(e.target.value)}
                        >
                          <option value="hourly">Per Hour</option>
                          <option value="session">Per Session</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-2">
                      <label>Notes (Optional)</label>
                      <textarea
                        className="form-control"
                        rows="2"
                        value={priceNotes}
                        onChange={(e) => setPriceNotes(e.target.value)}
                        placeholder="Why this price? (e.g., social benefits, income level)"
                      />
                    </div>
                    <div className="mt-2">
                      <button 
                        type="button" 
                        className="btn btn-sm btn-success me-2"
                        onClick={saveCustomPricing}
                        disabled={!customPrice || customPrice < 0.94 || customPrice > 9.97}
                      >
                        Save Price
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-sm btn-secondary"
                        onClick={() => setShowCustomPricing(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '10px', background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '4px' }}>
                    <em>First time scheduling family help for this patient</em>
                    <button 
                      type="button" 
                      className="btn btn-sm btn-outline-primary ms-2"
                      onClick={() => setShowCustomPricing(true)}
                    >
                      Set Price
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Prescription Selector - only show when patient is selected */}
            {formData.patient_id && (
              <div className="form-group">
                <label htmlFor="prescription_id">Link to Prescription (Optional)</label>
                {/* Debug info */}
                <small style={{color: 'blue', display: 'block'}}>
                  Debug: Patient ID: {formData.patient_id}, Prescriptions found: {prescriptions.length}
                </small>
                
                {prescriptions.length > 0 ? (
                  <select
                    id="prescription_id"
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
                ) : (
                  <div style={{padding: '8px', background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '4px'}}>
                    <em>No prescriptions available for this patient</em>
                  </div>
                )}
                
                {formData.prescription_id && (
                  <small className="form-hint">
                    📋 This appointment will be linked to the selected prescription
                  </small>
                )}
              </div>
            )}
          </div>          <div className="form-row">            <div className="form-group">
              <label htmlFor="start_time">{schedule('startTime')} *</label>              <input
                type="time"
                id="start_time"
                name="start_time"
                value={formData.start_time}
                onChange={handleInputChange}
                step="1800"
                required
              />
              <small className="form-hint">⏰ Default: 30 minutes</small>
            </div>

            <div className="form-group">
              <label htmlFor="end_time">{schedule('endTime')} *</label>              <input
                type="time"
                id="end_time"
                name="end_time"
                value={formData.end_time}
                onChange={handleInputChange}
                step="1800"
                required
              />
            </div>
          </div>

          {/* INAMI Configuration Section for Service 3 */}
          {formData.service_id === '3' && (
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

          <div className="form-group">
            <label htmlFor="description">{placeholders('enterDescription')}</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder={schedule('enterAppointmentDetails')}
              rows="3"
            />
          </div>          <div className="form-actions">
            <button type="button" onClick={handleClose} className="cancel-btn">
              {common('cancel')}
            </button>            <ButtonLoading 
              type="submit" 
              disabled={isModalLoading || isDataLoading} 
              isLoading={isModalLoading}
              className={`submit-btn ${success ? 'success' : ''}`}
            >
              {success ? '✅ ' + schedule('appointmentCreated') : schedule('createSchedule')}
            </ButtonLoading>
          </div></form>
      </div>          {/* Past Date Confirmation Dialog */}
      {showPastDateConfirm && (
        <div className="modal-overlay">
          <div className="confirm-modal">
            <h3>{schedule('pastDateConfirmation.title')}</h3>            <p>
              {schedule('pastDateConfirmation.message').replace('{date}', new Date(formData.date).toLocaleDateString())}
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
                  performSubmit();
                }} 
                className="confirm-btn"
              >
                {schedule('pastDateConfirmation.yesContinue')}
              </button>
            </div>
          </div>
        </div>      )}      {/* Conflict Management Dialog */}
      <ConflictManager
        isOpen={showConflictDialog}
        conflicts={conflicts?.conflicts || []}
        onConfirm={() => handleConflictAction('confirm')}
        onCancel={() => handleConflictAction('cancel')}
        schedulingData={conflicts?.schedulingData || formData}
      />

      {/* INAMI Medical Care Configuration Modal */}
      <InamiMedicalCareModal
        isOpen={showInamiModal}
        onClose={handleInamiClose}
        onSave={handleInamiSave}
        initialData={inamiData}
        patientData={patients.find(p => p.id === parseInt(formData.patient_id))}
        prescriptionData={prescriptions.find(p => p.id === parseInt(formData.prescription_id))}
      />
    </div>
  );
};

export default QuickSchedule;

import React, { useState, useEffect } from 'react';
import './RecurringSchedule.css';
import { useLoading } from '../../../hooks/useLoading';
import { useAuthenticatedApi } from '../../../hooks/useAuth';
import tokenManager from '../../../utils/tokenManager';
import { useCareTranslation } from '../../../hooks/useCareTranslation';
import { useConflictManager } from '../../../hooks/useConflictManager';
import ConflictManager from '../../../components/ConflictManager';
import InamiMedicalCareModal from '../../../components/InamiMedicalCareModal';
import { 
  ModalLoadingOverlay, 
  ButtonLoading, 
  FormLoading,
  LoadingSpinner,
  SearchLoading,
  SpinnerOnly
} from '../../../components/LoadingComponents';

const RecurringSchedule = ({ isOpen, onClose, onScheduleCreated, providers = [], preselectedDate, preselectedTime }) => {  // Translation hook
  const { schedule, common, placeholders, errors: errorsT, getCurrentLanguage } = useCareTranslation();
  // Helper function to get correct plural form based on language
  const getPluralForm = (count, type = 'week') => {
    const currentLanguage = getCurrentLanguage();
    if (count <= 1) return '';
    
    switch (currentLanguage) {
      case 'nl':
        return type === 'week' ? 'en' : 'en'; // wek -> weken, maand -> maanden
      case 'fr':
        return 's'; // semaine -> semaines, mois -> mois (but template handles this)
      case 'en':
      default:
        return 's'; // week -> weeks, month -> months
    }
  };  // Conflict management
  const {
    isCheckingConflicts,
    conflicts,
    showConflictDialog,
    checkConflicts,
    handleConflictResolution,
    resetConflicts
  } = useConflictManager();
  // Add state for conflicts
  const [conflictData, setConflictData] = useState(null);
  const [showRecurringConflictDialog, setShowRecurringConflictDialog] = useState(false);

  const [formData, setFormData] = useState({
    provider_id: '',
    patient_id: '',
    start_date: '',
    start_time: '',
    end_time: '',
    service_id: '',
    description: '',
    prescription_id: ''
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
    // Enhanced loading states
  const { 
    isLoading: isModalLoading, 
    startLoading, 
    stopLoading, 
    executeWithLoading 
  } = useLoading();
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  
  // Search states
  const [providerSearch, setProviderSearch] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);  const [showPreview, setShowPreview] = useState(true); // Show preview by default

  // Enhanced state for better UX
  const [validationErrors, setValidationErrors] = useState({});
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [showAllPreviews, setShowAllPreviews] = useState(false);

  // INAMI modal states
  const [showInamiModal, setShowInamiModal] = useState(false);
  const [inamiData, setInamiData] = useState(null);
  
  // Prescription states
  const [prescriptions, setPrescriptions] = useState([]);
  
  // Custom pricing states
  const [showCustomPricing, setShowCustomPricing] = useState(false);
  const [customPrice, setCustomPrice] = useState('');
  const [priceType, setPriceType] = useState('hourly');
  const [hasCustomPrice, setHasCustomPrice] = useState(false);
  const [priceNotes, setPriceNotes] = useState('');

  // Use modern authentication API
  const { get, post } = useAuthenticatedApi();
  // Enhanced days of week for selection with better display - using translations
  const daysOfWeek = [
    { value: 1, label: schedule('dayLabels.monday'), short: schedule('dayShort.mon'), initial: 'M', color: '#3b82f6' },
    { value: 2, label: schedule('dayLabels.tuesday'), short: schedule('dayShort.tue'), initial: 'T', color: '#8b5cf6' },
    { value: 3, label: schedule('dayLabels.wednesday'), short: schedule('dayShort.wed'), initial: 'W', color: '#06b6d4' },
    { value: 4, label: schedule('dayLabels.thursday'), short: schedule('dayShort.thu'), initial: 'T', color: '#10b981' },
    { value: 5, label: schedule('dayLabels.friday'), short: schedule('dayShort.fri'), initial: 'F', color: '#f59e0b' },
    { value: 6, label: schedule('dayLabels.saturday'), short: schedule('dayShort.sat'), initial: 'S', color: '#ef4444' },
    { value: 0, label: schedule('dayLabels.sunday'), short: schedule('dayShort.sun'), initial: 'S', color: '#ec4899' }
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
    if (isOpen) {      executeWithLoading(async () => {
        setIsDataLoading(true);
        await Promise.all([fetchPatients(), fetchServices(), fetchPrescriptions()]);
        setIsDataLoading(false);
      }, '', 'modal');
      
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
  };  // Enhanced validation function
  const validateForm = () => {
    const errors = {};
    
    if (!formData.provider_id) errors.provider_id = schedule('errors.providerRequired');
    if (!formData.patient_id) errors.patient_id = schedule('errors.patientRequired');
    if (!formData.start_date) errors.start_date = schedule('errors.startDateRequired');
    if (!formData.start_time) errors.start_time = schedule('errors.startTimeRequired');
    if (!formData.end_time) errors.end_time = schedule('errors.endTimeRequired');
    if (recurringData.weekdays.length === 0) errors.weekdays = schedule('errors.atLeastOneDayRequired');
      // Validate time logic
    if (formData.start_time && formData.end_time) {
      const start = new Date(`2000-01-01T${formData.start_time}`);
      const end = new Date(`2000-01-01T${formData.end_time}`);
      if (end <= start) {
        errors.end_time = schedule('errors.endTimeAfterStart');
      }
    }
    
    // Validate date logic
    if (formData.start_date && recurringData.end_type === 'date' && recurringData.end_date) {
      const start = new Date(formData.start_date);
      const end = new Date(recurringData.end_date);
      if (end <= start) {
        errors.end_date = schedule('errors.endDateAfterStart');
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  // Enhanced smart end time calculation
  const calculateEndTime = (startTime, suggestedDuration = 30) => {
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

  // Custom pricing functions
  const checkCustomPricing = async (patientId, serviceId) => {
    try {
      console.log('[RecurringSchedule] Checking custom pricing for patient:', patientId, 'service:', serviceId);
      const response = await get(`http://localhost:8000/schedule/patient-service-price/?patient_id=${patientId}&service_id=${serviceId}`);
      
      console.log('[RecurringSchedule] Custom pricing response:', response);
      
      if (response.has_custom_price) {
        setHasCustomPrice(true);
        setCustomPrice(response.custom_price);
        setPriceType(response.price_type);
        setPriceNotes(response.notes || '');
        setShowCustomPricing(false); // Don't show the form if we already have a price
        console.log('[RecurringSchedule] Found custom price:', response.custom_price);
      } else {
        setHasCustomPrice(false);
        setCustomPrice('');
        setPriceNotes('');
        setShowCustomPricing(false); // Don't automatically show the form
        console.log('[RecurringSchedule] No custom price found for this patient-service combination');
      }
    } catch (error) {
      console.error('[RecurringSchedule] Error checking custom pricing:', error);
      setHasCustomPrice(false);
      setCustomPrice('');
      setPriceNotes('');
      setShowCustomPricing(false);
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
        console.log('[RecurringSchedule] Custom price saved:', customPrice);
      }
    } catch (error) {
      console.error('[RecurringSchedule] Error saving custom price:', error);
      setError('Failed to save custom pricing');
    }
  };

  // INAMI Modal Handlers
  const handleInamiSave = (inamiConfigData) => {
    console.log('[RecurringSchedule] INAMI configuration saved:', inamiConfigData);
    setInamiData(inamiConfigData);
    setShowInamiModal(false);
  };

  const handleInamiClose = () => {
    setShowInamiModal(false);
  };

  // Fix missing INAMI configuration function
  const openInamiConfiguration = () => {
    console.log('[RecurringSchedule] Opening INAMI configuration modal');
    setShowInamiModal(true);
  };

  // Search and filter functions (missing in RecurringSchedule)
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
    console.log('[RecurringSchedule] Provider selected:', provider);
  };

  const selectPatient = (patient) => {
    console.log('[RecurringSchedule] Patient selected:', patient);
    setFormData(prev => ({ ...prev, patient_id: patient.id, prescription_id: '' }));
    setPatientSearch(`${patient.firstname || ''} ${patient.lastname || ''}`);
    setShowPatientDropdown(false);
    
    // Fetch prescriptions for this patient
    console.log('[RecurringSchedule] Fetching prescriptions for patient ID:', patient.id);
    fetchPrescriptions(patient.id);
    
    // If service is already selected, check custom pricing
    if (formData.service_id) {
      checkCustomPricing(patient.id, formData.service_id);
    }
  };

  // Enhanced input handling with INAMI and custom pricing
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Show INAMI modal for Service 3 (Soins Infirmiers)
    if (name === 'service_id' && (value === '3' || value === 3) && !inamiData) {
      console.log('[RecurringSchedule] Service 3 selected, opening INAMI modal');
      setShowInamiModal(true);
    }

    // Clear INAMI data if service changes from 3 to something else
    if (name === 'service_id' && value !== '3' && value !== 3 && inamiData) {
      setInamiData(null);
    }

    // Check for custom pricing when both patient and service are selected
    if (name === 'service_id' && formData.patient_id && value) {
      checkCustomPricing(formData.patient_id, value);
    }

    // Fetch prescriptions and check custom pricing when patient is selected
    if (name === 'patient_id') {
      fetchPrescriptions(value);
      
      // If service is already selected, check custom pricing
      if (formData.service_id) {
        checkCustomPricing(value, formData.service_id);
      }
    }

    // Auto-calculate end time if start time is set and end time is empty
    if (name === 'start_time' && value && !formData.end_time) {
      const endTime = calculateEndTime(value);
      setFormData(prev => ({
        ...prev,
        end_time: endTime
      }));
    }

    // Clear validation errors for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
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
  };
  // Handle recurring schedule form changes
  const handleRecurringChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'weekdays') {
      // Handle checkbox for days of week
      const dayValue = parseInt(value);
      setRecurringData(prev => ({
        ...prev,
        weekdays: checked 
          ? [...prev.weekdays, dayValue]
          : prev.weekdays.filter(day => day !== dayValue)
      }));
    } else {
      // Handle regular inputs (frequency, interval, end_type, end_date, occurrences)
      const newValue = type === 'number' ? parseInt(value) : value;
      setRecurringData(prev => ({
        ...prev,
        [name]: newValue
      }));
    }
  };
  // Enhanced form submission with validation and loading states
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form before submission
    if (!validateForm()) {
      setError(schedule('errors.fixErrorsBeforeSubmitting'));
      return;
    }
    
    if (previewDates.length === 0) {
      setError(schedule('errors.noValidDatesFound'));
      return;
    }
    
    // Prepare recurring schedule data
    const recurringScheduleData = {
      ...formData,
      date: formData.start_date, // Add date field for conflict checking
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

    // Include INAMI data for Service 3 appointments
    if ((formData.service_id === '3' || formData.service_id === 3) && inamiData) {
      recurringScheduleData.inami_data = inamiData;
      console.log('[RecurringSchedule] Including INAMI data in submission:', inamiData);
    }

    // Include prescription data if selected
    if (formData.prescription_id) {
      recurringScheduleData.prescription_id = formData.prescription_id;
      console.log('[RecurringSchedule] Including prescription ID in submission:', formData.prescription_id);
    }

    // Include custom pricing data if available
    if (hasCustomPrice && customPrice && (formData.service_id === '1' || formData.service_id === 1 || formData.service_id === '2' || formData.service_id === 2)) {
      recurringScheduleData.custom_price = customPrice;
      recurringScheduleData.price_type = priceType;
      if (priceNotes) {
        recurringScheduleData.price_notes = priceNotes;
      }
      console.log('[RecurringSchedule] Including custom pricing data:', { customPrice, priceType, priceNotes });
    }

    await executeWithLoading(async () => {
      setError('');
      
      if (!tokenManager.isAuthenticated()) {
        throw new Error('User not authenticated. Please log in.');
      }
      
      // Check for conflicts with all dates in the recurring schedule
      try {
        let hasAnyConflicts = false;
        let allConflicts = [];
        
        // Check conflicts for each date in the recurring schedule
        for (const date of previewDates) {
          const dateString = date.toISOString().split('T')[0];
          const conflictCheckData = {
            provider_id: formData.provider_id,
            patient_id: formData.patient_id,
            date: dateString,
            start_time: formData.start_time,
            end_time: formData.end_time
          };
          
          const conflictResult = await post('http://localhost:8000/schedule/check-conflicts/', conflictCheckData);
          
          if (conflictResult.has_conflicts) {
            hasAnyConflicts = true;
            // Add date context to each conflict
            conflictResult.conflicts.forEach(conflict => {
              allConflicts.push({
                ...conflict,
                conflictDate: dateString,
                conflictDateFormatted: date.toLocaleDateString(),
                attempted_schedule: {
                  date: dateString,
                  start_time: formData.start_time,
                  end_time: formData.end_time,
                  provider_name: providerSearch,
                  patient_name: patientSearch,
                  duration: calculateDuration(formData.start_time, formData.end_time)
                }
              });
            });
          }
        }
        
        // If conflicts found, show the conflict dialog with proper data structure
        if (hasAnyConflicts) {
          setConflictData({
            has_conflicts: true,
            conflicts: allConflicts,
            scheduling_data: {
              provider_id: formData.provider_id,
              provider_name: providerSearch,
              patient_id: formData.patient_id,
              patient_name: patientSearch,
              date: formData.start_date,
              start_time: formData.start_time,
              end_time: formData.end_time,
              recurring_dates: previewDates.map(date => date.toISOString().split('T')[0]),
              total_dates: previewDates.length,
              pattern_summary: generatePatternSummary(),
              duration: calculateDuration(formData.start_time, formData.end_time)
            },
            severity: allConflicts.some(c => c.severity === 'high') ? 'high' : 
                     allConflicts.some(c => c.severity === 'medium') ? 'medium' : 'low',
            conflict_count: allConflicts.length
          });
          setShowRecurringConflictDialog(true);
          return; // Stop here and wait for user decision
        }
        
      } catch (error) {
        console.error('Error checking conflicts:', error);
        // Don't block scheduling if conflict check fails
        setError('Warning: Could not check for conflicts. Proceeding with scheduling...');
      }

      // If no conflicts or conflict check failed, proceed with submission
      try {
        console.log('[RecurringSchedule] About to send request with data:', JSON.stringify(recurringScheduleData, null, 2));
        const data = await post('http://localhost:8000/schedule/recurring-schedule/', recurringScheduleData);
        
        // Show success message with details
        const successMessage = `Successfully created ${previewDates.length} recurring appointments!`;
        
        onScheduleCreated({
          ...data,
          successMessage,
          appointmentCount: previewDates.length
        });
        resetConflicts();
        onClose();
        
      } catch (error) {
        if (error.status === 409) {
          // Handle conflict response from backend
          const conflictData = error.response || error.data;
          if (conflictData && conflictData.has_conflicts) {
            // Format backend conflicts for display
            const formattedConflicts = conflictData.conflicts.map(conflict => ({
              ...conflict,
              attempted_schedule: {
                date: formData.start_date,
                start_time: formData.start_time,
                end_time: formData.end_time,
                provider_name: providerSearch,
                patient_name: patientSearch,
                duration: calculateDuration(formData.start_time, formData.end_time)
              }
            }));
            
            setConflictData({
              ...conflictData,
              conflicts: formattedConflicts,
              scheduling_data: {
                ...conflictData.scheduling_data,
                provider_name: providerSearch,
                patient_name: patientSearch,
                duration: calculateDuration(formData.start_time, formData.end_time),
                pattern_summary: generatePatternSummary()
              }
            });
            setShowRecurringConflictDialog(true);
            return; // Don't proceed until user resolves conflicts
          }
        }
        // Re-throw other errors
        throw error;
      }
    }, `Creating ${previewDates.length} appointments...`, 'form');
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
    // Handle conflict resolution for recurring schedules
  const onRecurringConflictResolution = (resolution) => {
    setShowRecurringConflictDialog(false);
    
    if (resolution === 'confirm' || resolution === 'force') {
      // User wants to proceed despite conflicts, so submit with force_schedule flag
      executeWithLoading(async () => {
        setError('');
        
        // Prepare recurring schedule data with force_schedule flag
        const recurringScheduleData = {
          ...formData,
          date: formData.start_date,
          recurring_settings: {
            ...recurringData,
            dates: previewDates.map(date => date.toISOString().split('T')[0]),
            total_appointments: previewDates.length
          },
          metadata: {
            created_at: new Date().toISOString(),
            pattern_summary: generatePatternSummary()
          },
          force_schedule: true // Add this flag
        };

        // Include INAMI data for Service 3 appointments
        if ((formData.service_id === '3' || formData.service_id === 3) && inamiData) {
          recurringScheduleData.inami_data = inamiData;
          console.log('[RecurringSchedule - Conflict Resolution] Including INAMI data in submission:', inamiData);
        }

        // Include prescription data if selected
        if (formData.prescription_id) {
          recurringScheduleData.prescription_id = formData.prescription_id;
          console.log('[RecurringSchedule - Conflict Resolution] Including prescription ID in submission:', formData.prescription_id);
        }

        // Include custom pricing data if available
        if (hasCustomPrice && customPrice && (formData.service_id === '1' || formData.service_id === 1 || formData.service_id === '2' || formData.service_id === 2)) {
          recurringScheduleData.custom_price = customPrice;
          recurringScheduleData.price_type = priceType;
          if (priceNotes) {
            recurringScheduleData.price_notes = priceNotes;
          }
          console.log('[RecurringSchedule - Conflict Resolution] Including custom pricing data:', { customPrice, priceType, priceNotes });
        }
        
        try {
          console.log('[RecurringSchedule - Conflict Resolution] About to send request with data:', JSON.stringify(recurringScheduleData, null, 2));
          const data = await post('http://localhost:8000/schedule/recurring-schedule/', recurringScheduleData);
          
          // Show success message
          const successMessage = `Successfully created ${previewDates.length} recurring appointments (conflicts overridden)!`;
          
          onScheduleCreated({
            ...data,
            successMessage,
            appointmentCount: previewDates.length
          });
          setConflictData(null);
          onClose();
        } catch (error) {
          console.error('Error creating recurring schedule with force:', error);
          setError('Failed to create appointments. Please try again.');
        }
      }, 'Creating appointments (overriding conflicts)...', 'form');
    } else {
      // For cancel, just clear the conflict data
      setConflictData(null);
    }
  };

  if (!isOpen) 
    return null;
  return (
    <div className="modal-overlay" onClick={onClose}>      <div className="quick-schedule-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{schedule('recurringSchedule')}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div><form onSubmit={handleSubmit} className="quick-schedule-form">
          {/* Simple loading - same as other pages */}
          {(isDataLoading || isModalLoading) && (
            <div className="simple-loading-container">
              <SpinnerOnly size="large" />
            </div>
          )}
          
          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}
            {/* Basic Schedule Information */}
          <div className="form-section">
            <h3>📝 {schedule('basicInformation')}</h3>
            
            {/* Provider Selection */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="provider-search">{schedule('provider')} *</label>
                <div className="searchable-dropdown">
                  <input
                    type="text"
                    id="provider-search"
                    value={providerSearch}
                    onChange={(e) => {
                      setProviderSearch(e.target.value);
                      setShowProviderDropdown(e.target.value.length > 0);
                    }}
                    onBlur={() => setTimeout(() => setShowProviderDropdown(false), 150)}
                    placeholder={schedule('searchProviders')}
                    className={validationErrors.provider_id ? 'error' : ''}
                    required
                  />
                  {validationErrors.provider_id && (
                    <span className="validation-error">{validationErrors.provider_id}</span>
                  )}                  {showProviderDropdown && providerSearch.length > 0 && (
                    <div className="dropdown-list">
                      {isSearchLoading ? (
                        <SearchLoading message="Searching providers..." />
                      ) : filteredProviders.length > 0 ? filteredProviders.slice(0, 8).map(provider => (
                        <div
                          key={provider.id}
                          className="dropdown-item"
                          onClick={() => selectProvider(provider)}
                        >
                          <strong>{provider.name}</strong>
                          <span className="provider-service"> - {provider.service}</span>
                        </div>                      )) : (
                        <div className="dropdown-item no-results">{schedule('noProvidersFound')}</div>
                      )}
                      {filteredProviders.length > 8 && (
                        <div className="dropdown-item more-results">
                          {schedule('andMoreResults', { count: filteredProviders.length - 8 })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>              {/* Patient Selection */}
              <div className="form-group">
                <label htmlFor="patient-search">{schedule('patient')} *</label>
                <div className="searchable-dropdown">
                  <input
                    type="text"
                    id="patient-search"
                    value={patientSearch}
                    onChange={(e) => {
                      setPatientSearch(e.target.value);
                      setShowPatientDropdown(e.target.value.length > 0);
                    }}
                    onBlur={() => setTimeout(() => setShowPatientDropdown(false), 150)}
                    placeholder={schedule('searchPatientsSchedule')}
                    className={validationErrors.patient_id ? 'error' : ''}
                    required
                  />
                  {validationErrors.patient_id && (
                    <span className="validation-error">{validationErrors.patient_id}</span>
                  )}                  {showPatientDropdown && patientSearch.length > 0 && (
                    <div className="dropdown-list">
                      {isSearchLoading ? (
                        <SearchLoading message="Searching patients..." />
                      ) : filteredPatients.length > 0 ? filteredPatients.slice(0, 8).map(patient => (
                        <div
                          key={patient.id}
                          className="dropdown-item"
                          onClick={() => selectPatient(patient)}
                        >
                          <strong>{patient.firstname} {patient.lastname}</strong>
                          {patient.national_number && (
                            <span className="patient-info">ID: {patient.national_number}</span>
                          )}
                        </div>                      )) : (
                        <div className="dropdown-item no-results">{schedule('noPatientsFound')}</div>
                      )}
                      {filteredPatients.length > 8 && (
                        <div className="dropdown-item more-results">
                          {schedule('andMoreResults', { count: filteredPatients.length - 8 })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>            {/* Time and Service */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="start_time">{schedule('startTime')} *</label>                <input
                  type="time"
                  id="start_time"
                  name="start_time"
                  value={formData.start_time}
                  onChange={handleInputChange}
                  className={validationErrors.start_time ? 'error' : ''}
                  step="1800"
                  required
                />
                <small className="form-hint">⏰ Default: 30 minutes</small>
                {validationErrors.start_time && (
                  <span className="validation-error">{validationErrors.start_time}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="end_time">{schedule('endTime')} *</label>                <input
                  type="time"
                  id="end_time"
                  name="end_time"
                  value={formData.end_time}
                  onChange={handleInputChange}
                  className={validationErrors.end_time ? 'error' : ''}
                  step="1800"
                  required
                />
                {validationErrors.end_time && (
                  <span className="validation-error">{validationErrors.end_time}</span>
                )}                {formData.start_time && formData.end_time && (
                  <span className="time-duration">
                    {schedule('duration')}: {calculateDuration(formData.start_time, formData.end_time)}
                  </span>
                )}
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
                      {service.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Prescription Selection - show when patient is selected */}
            {formData.patient_id && (
              <div className="form-group">
                <label htmlFor="prescription_id">📋 Link to Prescription (Optional)</label>
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
                  <div style={{ 
                    padding: '8px', 
                    background: '#f8f9fa', 
                    border: '1px solid #dee2e6', 
                    borderRadius: '4px',
                    fontSize: '14px',
                    color: '#6c757d'
                  }}>
                    No prescriptions available for this patient
                  </div>
                )}
                
                {formData.prescription_id && (
                  <small className="form-hint">
                    📋 This appointment will be linked to the selected prescription
                  </small>
                )}
              </div>
            )}

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
                        ✅ INAMI Configured
                      </span>
                    </div>
                    <div className="inami-details">
                      <div className="detail-item">
                        <strong>Type:</strong> {inamiData.care_type}
                      </div>
                      <div className="detail-item">
                        <strong>Location:</strong> {inamiData.care_location}
                      </div>
                      <div className="detail-item">
                        <strong>Duration:</strong> {inamiData.care_duration} minutes
                      </div>
                      <div className="detail-item">
                        <strong>Code INAMI:</strong> {inamiData.inami_code}
                      </div>
                      <div className="detail-item">
                        <strong>Patient Payment:</strong> €{inamiData.patient_copay}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="inami-summary">
                    <div className="inami-status">
                      <span className="status-indicator not-configured">
                        ⚠️ INAMI Not Configured
                      </span>
                    </div>
                    <p className="inami-note">
                      INAMI configuration is required for nursing care services (Service 3).
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
                        {selectedPrescription.priority && (
                          <div className="detail-item">
                            <strong>Priority:</strong> {selectedPrescription.priority}
                            {selectedPrescription.priority === 'Urgent' && ' 🔴'}
                          </div>
                        )}
                        {selectedPrescription.linked_timeslots_count > 0 && (
                          <div className="detail-item">
                            <strong>Linked Timeslots:</strong> {selectedPrescription.linked_timeslots_count}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="prescription-summary">
                      <div className="prescription-status">
                        <span className="status-indicator not-configured">
                          ⚠️ Prescription Not Found
                        </span>
                      </div>
                      <p className="prescription-note">
                        The selected prescription could not be found.
                      </p>
                    </div>
                  );
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
                placeholder={schedule('additionalNotes')}
                rows="2"
              />
            </div>
          </div>

          {/* Recurring Settings */}
          <div className="form-section">
            <h3>🔄 {schedule('recurringPattern')}</h3>
              <div className="form-row">
              <div className="form-group">
                <label htmlFor="start_date">{schedule('date')} *</label>
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
                <label htmlFor="frequency">{schedule('frequency')} *</label>
                <select
                  id="frequency"
                  name="frequency"
                  value={recurringData.frequency}
                  onChange={handleRecurringChange}
                  required
                >
                  <option value="weekly">{schedule('weekly')}</option>
                  <option value="bi-weekly">{schedule('biWeekly')}</option>
                  <option value="monthly">{schedule('monthly')}</option>
                </select>
              </div>              {recurringData.frequency !== 'monthly' && (
                <div className="form-group">
                  <label htmlFor="interval">{schedule('interval')}</label>
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
                    <span>{schedule('weekS')}</span>
                  </div>
                </div>
              )}
            </div>            {/* Days of Week Selection */}
            <div className="form-group">
              <label>{schedule('daysOfWeek')} *</label>
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
              )}              <div className="weekdays-helper">
                {schedule('selectedDays')}: {recurringData.weekdays.length > 0 
                  ? recurringData.weekdays
                      .map(day => daysOfWeek.find(d => d.value === day)?.label)
                      .join(', ')
                  : schedule('noneSelected')
                }
              </div>
            </div>

            {/* End Date or Occurrences */}
            <div className="form-row">
              <div className="form-group">
                <label>{schedule('endPattern')}</label>
                <div className="radio-group">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="end_type"
                      value="date"
                      checked={recurringData.end_type === 'date'}
                      onChange={handleRecurringChange}
                    />
                    <span className="radio-label">                      <span className="radio-icon">📅</span>
                      {schedule('endByDate')}
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
                      {schedule('afterOccurrences')}
                    </span>
                  </label>
                </div>
              </div>              {recurringData.end_type === 'date' ? (
                <div className="form-group">
                  <label htmlFor="end_date">{schedule('endDate')} *</label>
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
                  <label htmlFor="occurrences">{schedule('numberOfOccurrences')} *</label>
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
                    {schedule('estimatedDuration')}: {Math.ceil(recurringData.occurrences / recurringData.weekdays.length)} {schedule('weeks')}
                  </div>
                </div>
              )}
            </div>
          </div>          {/* Enhanced Preview Section */}
          <div className="form-section">            <div className="enhanced-preview-header">
              <div className="preview-title">
                <h3>📅 {schedule('schedulePreview')}</h3>
                <div className="preview-badge">
                  {previewDates.length} {schedule('appointment')}{previewDates.length !== 1 ? 's' : ''}
                </div>
              </div>
              <div className="preview-controls">
                {isGeneratingPreview && (
                  <div className="preview-loading">
                    <div className="loading-spinner small"></div>
                    <span>{schedule('generating')}</span>
                  </div>
                )}
                <button
                  type="button"
                  className="preview-toggle"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  <span className="toggle-icon">{showPreview ? '🙈' : '👁️'}</span>
                  {showPreview ? schedule('hidePreview') : schedule('showPreview')}
                </button>
              </div>
            </div>
            
            {previewDates.length > 0 && (
              <div className="preview-stats-grid">                <div className="stat-card pattern">
                  <div className="stat-icon">🔄</div>
                  <div className="stat-content">
                    <div className="stat-label">{schedule('pattern')}</div>
                    <div className="stat-value">{generatePatternSummary()}</div>
                  </div>
                </div>
                <div className="stat-card duration">
                  <div className="stat-icon">⏱️</div>
                  <div className="stat-content">
                    <div className="stat-label">{schedule('totalDuration')}</div>
                    <div className="stat-value">{calculateTotalDuration()} {schedule('hours')}</div>
                  </div>
                </div>
                <div className="stat-card frequency">
                  <div className="stat-icon">📊</div>
                  <div className="stat-content">
                    <div className="stat-label">{schedule('frequency')}</div>                    <div className="stat-value">
                      {recurringData.frequency === 'weekly' ? 
                        schedule('everyWeeks', { 
                          count: recurringData.interval, 
                          plural: getPluralForm(recurringData.interval, 'week')
                        }) :
                       recurringData.frequency === 'bi-weekly' ? 
                        schedule('biWeekly') :
                       schedule('everyMonths', { 
                         count: recurringData.interval, 
                         plural: getPluralForm(recurringData.interval, 'month')
                       })}
                    </div>
                  </div>
                </div>
                <div className="stat-card timeline">
                  <div className="stat-icon">📅</div>
                  <div className="stat-content">
                    <div className="stat-label">{schedule('timeline')}</div>
                    <div className="stat-value">
                      {previewDates.length > 0 && 
                        `${previewDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - 
                         ${previewDates[previewDates.length - 1].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                      }
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {showPreview && (
              <div className="preview-container">
                {previewDates.length > 0 ? (
                  <div className="enhanced-preview-list">                    <div className="preview-list-header">
                      <h4>{schedule('upcomingAppointments')}</h4>
                      <div className="list-controls">
                        {previewDates.length > 6 && (
                          <button
                            type="button"
                            className="expand-toggle"
                            onClick={() => setShowAllPreviews(!showAllPreviews)}
                          >
                            {showAllPreviews ? schedule('showLess') : `${schedule('showAll')} ${previewDates.length}`}
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="preview-grid">
                      {(showAllPreviews ? previewDates : previewDates.slice(0, 6)).map((date, index) => {
                        const isToday = date.toDateString() === new Date().toDateString();
                        const isPast = date < new Date() && !isToday;
                        const duration = calculateDuration(formData.start_time, formData.end_time);
                        
                        return (
                          <div key={index} className={`preview-card ${isToday ? 'today' : ''} ${isPast ? 'past' : ''}`}>
                            <div className="card-header">
                              <div className="date-info">
                                <div className="weekday">
                                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                                </div>
                                <div className="date">
                                  {date.toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric'
                                  })}
                                </div>
                                <div className="year">
                                  {date.getFullYear()}
                                </div>
                              </div>
                              <div className="appointment-number">#{index + 1}</div>
                            </div>
                            
                            <div className="card-body">
                              <div className="time-info">
                                <div className="time-range">
                                  <span className="start-time">{formData.start_time}</span>
                                  <span className="time-separator">→</span>
                                  <span className="end-time">{formData.end_time}</span>
                                </div>
                                <div className="duration-badge">{duration}</div>
                              </div>
                              
                              {(formData.provider_id || formData.patient_id) && (
                                <div className="participants">
                                  {formData.provider_id && providerSearch && (
                                    <div className="participant provider">
                                      <span className="participant-icon">👩‍⚕️</span>
                                      <span className="participant-name">{providerSearch}</span>
                                    </div>
                                  )}
                                  {formData.patient_id && patientSearch && (
                                    <div className="participant patient">
                                      <span className="participant-icon">👤</span>
                                      <span className="participant-name">{patientSearch}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {formData.service_id && (
                                <div className="service-info">
                                  <span className="service-icon">🔧</span>
                                  <span className="service-name">
                                    {services.find(s => s.id == formData.service_id)?.name || 'Service'}
                                  </span>
                                </div>
                              )}
                            </div>
                              {(isToday || isPast) && (
                              <div className="card-status">
                                {isToday && <span className="status-badge today">{schedule('today')}</span>}
                                {isPast && <span className="status-badge past">{schedule('pastDate')}</span>}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    {!showAllPreviews && previewDates.length > 6 && (                      <div className="preview-footer">
                        <div className="remaining-count">
                          +{previewDates.length - 6} {schedule('moreAppointments')}
                        </div>
                        <button
                          type="button"
                          className="view-all-btn"
                          onClick={() => setShowAllPreviews(true)}
                        >
                          {schedule('viewAllAppointments')}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="preview-empty">
                    <div className="empty-illustration">
                      <div className="empty-icon">📅</div>
                      <div className="empty-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>                    <div className="empty-content">
                      <h4>{schedule('noAppointmentsScheduled')}</h4>
                      <p>{schedule('adjustSettings')}</p>
                      <ul className="empty-suggestions">
                        <li>{schedule('selectAtLeastOneDay')}</li>
                        <li>{schedule('setValidDateRange')}</li>
                        <li>{schedule('checkRecurrencePattern')}</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>          {/* Enhanced Form Actions */}          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isModalLoading}>
              {common('cancel')}
            </button>
            <ButtonLoading 
              type="submit"
              className="btn-primary"
              isLoading={isModalLoading}
              disabled={previewDates.length === 0 || isGeneratingPreview}
              loadingText={`${schedule('creatingAppointments').replace('{{count}}', previewDates.length)}...`}
            >
              <span className="btn-icon">🚀</span>
              {schedule('createAppointments').replace('{{count}}', previewDates.length).replace('{{plural}}', previewDates.length !== 1 ? 's' : '')}
            </ButtonLoading>          </div>
        </form>        {/* Conflict Management Dialog */}
        <ConflictManager
          isOpen={showRecurringConflictDialog}
          conflicts={conflictData?.conflicts || []}
          onConfirm={(force) => onRecurringConflictResolution('confirm')}
          onCancel={() => onRecurringConflictResolution('cancel')}
          schedulingData={conflictData?.scheduling_data}
          conflictSeverity={conflictData?.severity}
          conflictCount={conflictData?.conflict_count}
          isRecurring={true}
          recurringInfo={{
            totalDates: conflictData?.scheduling_data?.total_dates || previewDates.length,
            patternSummary: conflictData?.scheduling_data?.pattern_summary || generatePatternSummary(),
            conflictedDates: conflictData?.conflicts?.map(c => c.conflictDate).filter((date, index, self) => self.indexOf(date) === index) || []
          }}
        />

        {/* INAMI Medical Care Modal */}
        <InamiMedicalCareModal
          isOpen={showInamiModal}
          onClose={handleInamiClose}
          onSave={handleInamiSave}
          initialData={inamiData}
          patientData={patients.find(p => p.id === formData.patient_id)}
          prescriptionData={prescriptions.find(p => p.id === formData.prescription_id)}
        />
      </div>
    </div>
  );
};

export default RecurringSchedule;

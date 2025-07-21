import React, { useState, useEffect } from 'react';
import ContractStatusBadge from './ContractStatusBadge';
import { formatRole, getViewableContractFields, canEditContracts } from '../../utils/roleUtils';
import { useAuthenticatedApi } from '../../hooks/useAuth';
import { useCareTranslation } from '../../hooks/useCareTranslation';
import './ProviderDetail.css';
import ContractForm from './ContractForm';

/**
 * WeeklyScheduleGrid Component
 * Displays the weekly schedule in a calendar grid format with proper time span handling
 */
const WeeklyScheduleGrid = ({ scheduleData, absenceData }) => {
    const { providers: providersT } = useCareTranslation();
    const timeSlots = [
        '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', 
        '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', 
        '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', 
        '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', 
        '22:00', '22:30', '23:00', '23:30', '00:00',
    ];

    const getDayData = (dayKey) => {
        return scheduleData.schedule_data[dayKey] || { appointments: [] };
    };

    // Check if a day is absent
    const isDayAbsent = (dayKey) => {
        return absenceData && absenceData[dayKey] && absenceData[dayKey].is_absent;
    };

    // Get absence info for a day
    const getAbsenceInfo = (dayKey) => {
        return absenceData && absenceData[dayKey] ? absenceData[dayKey] : null;
    };

    // Convert time string to minutes since midnight for calculations
    const timeToMinutes = (timeString) => {
        if (!timeString) return 0;
        const [hours, minutes] = timeString.split(':').map(Number);
        return hours * 60 + minutes;
    };

    // Check if a time slot should show an appointment
    const getAppointmentForSlot = (dayKey, timeSlot) => {
        const dayData = getDayData(dayKey);
        const slotMinutes = timeToMinutes(timeSlot);
        
        return dayData.appointments.find(apt => {
            const startMinutes = timeToMinutes(apt.start_time);
            const endMinutes = timeToMinutes(apt.end_time);
            
            // Check if this time slot falls within the appointment duration
            // The slot is 30 minutes long, so we check if it overlaps with the appointment
            const slotEndMinutes = slotMinutes + 30;
            
            return startMinutes <= slotMinutes && endMinutes > slotMinutes;
        });
    };

    // Check if this is the starting slot for an appointment (to show full info)
    const isAppointmentStart = (dayKey, timeSlot, appointment) => {
        if (!appointment) return false;
        const slotMinutes = timeToMinutes(timeSlot);
        const startMinutes = timeToMinutes(appointment.start_time);
        return slotMinutes === startMinutes;
    };

    // Calculate how many slots this appointment spans
    const getAppointmentSpan = (appointment) => {
        if (!appointment || !appointment.start_time || !appointment.end_time) return 1;
        
        const startMinutes = timeToMinutes(appointment.start_time);
        const endMinutes = timeToMinutes(appointment.end_time);
        const durationMinutes = endMinutes - startMinutes;
        
        // Each slot is 30 minutes, so calculate how many slots it spans
        return Math.ceil(durationMinutes / 30);
    };

    const getAppointmentStatusClass = (status) => {
        switch (status) {
            case 'completed': return 'completed';
            case 'cancelled': return 'cancelled';
            case 'confirmed': return 'confirmed';
            case 'no_show': return 'no-show';
            case 'in_progress': return 'in-progress';
            case 'scheduled': return 'scheduled';
            default: return 'scheduled';
        }
    };    // Format status text for display
    const formatStatus = (status) => {
        const statusKey = status || 'scheduled';
        return providersT(`appointmentStatuses.${statusKey}`) || statusKey;
    };

    const isToday = (dateString) => {
        const today = new Date().toISOString().split('T')[0];
        return dateString === today;
    };

    const sortedDays = Object.keys(scheduleData.schedule_data).sort();

    return (        <div className="weekly-schedule-grid">
            {/* Time column header */}
            <div className="schedule-time-header">{providersT('time')}</div>
            
            {/* Day headers */}
            {sortedDays.map(dayKey => {
                const dayData = getDayData(dayKey);
                const date = new Date(dayKey);
                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                const dayNumber = date.getDate();
                const isAbsent = isDayAbsent(dayKey);
                const absenceInfo = getAbsenceInfo(dayKey);
                
                return (
                    <div 
                        key={dayKey} 
                        className={`schedule-day-header ${isToday(dayKey) ? 'today' : ''} ${isAbsent ? 'absent-day' : ''}`}
                        title={isAbsent ? `${absenceInfo?.absence_type || 'Absent'} - ${absenceInfo?.absence_reason || 'No reason provided'}` : ''}
                    >
                        <div>{dayName}</div>
                        <div>{dayNumber}</div>
                        {isAbsent && (
                            <div className="absence-indicator">
                                {absenceInfo?.absence_type === 'partial' ? '⚠️' : '🚫'}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Time slots and appointments */}
            {timeSlots.map((timeSlot, slotIndex) => (
                <React.Fragment key={timeSlot}>
                    {/* Time label */}
                    <div className="schedule-time-label">
                        {timeSlot}
                    </div>
                    
                    {/* Day columns for this time slot */}
                    {sortedDays.map(dayKey => {
                        const appointment = getAppointmentForSlot(dayKey, timeSlot);
                        const isStart = appointment && isAppointmentStart(dayKey, timeSlot, appointment);
                        const span = appointment ? getAppointmentSpan(appointment) : 1;
                        const isAbsent = isDayAbsent(dayKey);
                        
                        return (
                            <div key={`${dayKey}-${timeSlot}`} className={`schedule-time-slot ${isAbsent ? 'absent-slot' : ''}`}>
                                {appointment ? (
                                    isStart ? (
                                        // Show full appointment details only at the start slot
                                        <div 
                                            className={`schedule-appointment ${getAppointmentStatusClass(appointment.status)}`}
                                            style={{ 
                                                height: `${span * 60 - 4}px`, // 60px per slot minus padding
                                                zIndex: 2 
                                            }}
                                            title={`${appointment.patient.name} - ${appointment.service.name} (${appointment.start_time} - ${appointment.end_time}) - Status: ${appointment.status || 'scheduled'}`}
                                        >
                                            <div className="appointment-patient-name">
                                                <span className={`appointment-status-icon ${appointment.status || 'scheduled'}`}></span>
                                                {appointment.patient.name}
                                            </div>
                                            <div className="appointment-service">
                                                {appointment.service.name}
                                            </div>
                                            <div className="appointment-time">
                                                {appointment.start_time} - {appointment.end_time}
                                            </div>                                            <div className="appointment-status">
                                                {formatStatus(appointment.status)}
                                            </div>
                                        </div>
                                    ) : (
                                        // For continuation slots, show a subtle indicator
                                        <div className="schedule-appointment-continuation">
                                            {/* Empty - the appointment block above will cover this */}
                                        </div>
                                    )
                                ) : (
                                    <div className="schedule-empty-slot">
                                        {/* Empty slot */}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </React.Fragment>
            ))}
        </div>
    );
};

/**
 * ProviderDetail Component
 * Displays detailed provider information with role-based contract access
 */
const ProviderDetail = ({ 
    providerId, 
    onClose, 
    userRole,
    onContractUpdate 
}) => {    const [provider, setProvider] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [scheduleData, setScheduleData] = useState(null);
    const [scheduleLoading, setScheduleLoading] = useState(false);
    const [scheduleError, setScheduleError] = useState(null);
    const [absences, setAbsences] = useState([]);
    const [absencesLoading, setAbsencesLoading] = useState(false);
    const [absencesError, setAbsencesError] = useState(null);
    const [currentWeekStart, setCurrentWeekStart] = useState(() => {
        const now = new Date();
        console.log(`[ProviderDetail] Current date from browser: ${now.toISOString().split('T')[0]}`);
        console.log(`[ProviderDetail] Current date local: ${now.toLocaleDateString()}`);
        console.log(`[ProviderDetail] Current day of week: ${now.getDay()} (0=Sunday, 1=Monday, etc.)`);
        
        const initialWeek = getWeekStart(now);
        console.log('[ProviderDetail] Initial week start:', initialWeek.toISOString().split('T')[0]);
        return initialWeek;
    });
    
    // Add absence data state for schedule highlighting
    const [absenceData, setAbsenceData] = useState({});
    const [absenceDataLoading, setAbsenceDataLoading] = useState(false);
    const [absenceDataError, setAbsenceDataError] = useState(null);
    
    // Absence form state
    const [showAbsenceForm, setShowAbsenceForm] = useState(false);
    const [absenceForm, setAbsenceForm] = useState({
        start_date: '',
        end_date: '',
        start_time: '',
        end_time: '',
        absence_type: 'vacation',
        status: 'scheduled',
        reason: '',
        period_type: 'full_day' // 'full_day', 'half_day_am', 'half_day_pm', 'custom_hours'
    });
    const [savingAbsence, setSavingAbsence] = useState(false);
    const { get, post } = useAuthenticatedApi();
    const { common, providers: providersT } = useCareTranslation();    const viewableFields = getViewableContractFields({ role: userRole });
    const canEdit = canEditContracts({ role: userRole });

    console.log('[ProviderDetail] User role:', userRole, 'canEdit:', canEdit);

    // Helper function to get start of week (Sunday - matching ScheduleCalendar)
    function getWeekStart(date) {
        console.log(`[ProviderDetail] getWeekStart called with date: ${date.toISOString().split('T')[0]}`);
        console.log(`[ProviderDetail] getWeekStart - date.getDay(): ${date.getDay()}`);
        
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day; // Sunday = 0, so week starts on Sunday
        
        console.log(`[ProviderDetail] getWeekStart - day: ${day}, diff: ${diff}, current date: ${d.getDate()}`);
        
        const result = new Date(d.setDate(diff));
        console.log(`[ProviderDetail] getWeekStart result: ${result.toISOString().split('T')[0]}`);
        
        return result;
    }

    // Helper function to format date range for display
    function formatWeekRange(weekStart) {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        const options = { month: 'short', day: 'numeric' };
        const startStr = weekStart.toLocaleDateString('en-US', options);
        const endStr = weekEnd.toLocaleDateString('en-US', options);
        const year = weekStart.getFullYear();
        
        return `${startStr} - ${endStr}, ${year}`;
    }

    useEffect(() => {
        fetchProviderDetails();
    }, [providerId]);    useEffect(() => {
        console.log(`[ProviderDetail] useEffect triggered - activeTab: ${activeTab}, provider: ${!!provider}, currentWeekStart: ${currentWeekStart.toISOString().split('T')[0]}`);
        if (activeTab === 'schedule' && provider) {
            console.log(`[ProviderDetail] Calling fetchScheduleData from useEffect`);
            fetchScheduleData();
        }
    }, [activeTab, provider, currentWeekStart]);

    useEffect(() => {
        if (activeTab === 'absent' && provider) {
            fetchAbsences();
        }
    }, [activeTab, provider]);

    const fetchProviderDetails = async () => {
        try {
            setLoading(true);
            console.log(`[ProviderDetail] Fetching details for provider ID: ${providerId}`);
              const data = await get(`http://localhost:8000/account/providers/${providerId}/`);
            console.log(`[ProviderDetail] Provider details received:`, data);
            console.log(`[ProviderDetail] Service data:`, data.service);
            
            setProvider(data);
        } catch (err) {
            console.error('Error fetching provider details:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchAbsenceData = async () => {
        setAbsenceDataLoading(true);
        setAbsenceDataError(null);
        
        try {
            // Calculate dates directly from currentWeekStart instead of relying on scheduleData
            const dates = [];
            for (let i = 0; i < 7; i++) {
                const date = new Date(currentWeekStart);
                date.setDate(currentWeekStart.getDate() + i);
                dates.push(date.toISOString().split('T')[0]);
            }
            
            const datesString = dates.join(',');
            console.log(`[ProviderDetail] Fetching absence data for dates: ${datesString}`);
            console.log(`[ProviderDetail] Current week start: ${currentWeekStart.toISOString().split('T')[0]}`);
            
            const data = await get(`http://localhost:8000/account/providers/${providerId}/absence-check/?dates=${datesString}`);
            console.log('Absence data fetched:', data);
            
            setAbsenceData(data.absence_data || {});
            
        } catch (error) {
            console.error('Error fetching absence data:', error);
            setAbsenceDataError(error.message);
        } finally {
            setAbsenceDataLoading(false);
        }
    };

    const fetchScheduleData = async () => {
        try {
            setScheduleLoading(true);
            setScheduleError(null);
            
            const weekStartDate = currentWeekStart.toISOString().split('T')[0];
            const weekEndDate = new Date(currentWeekStart);
            weekEndDate.setDate(currentWeekStart.getDate() + 6);
            const weekEndDateStr = weekEndDate.toISOString().split('T')[0];
            
            console.log(`[ProviderDetail] Fetching schedule for provider ID: ${providerId}`);
            console.log(`[ProviderDetail] Week range: ${weekStartDate} to ${weekEndDateStr}`);
            console.log(`[ProviderDetail] API request: /schedule/?start_date=${weekStartDate}`);
            
            const data = await get(`http://localhost:8000/account/providers/${providerId}/schedule/?start_date=${weekStartDate}`);
            console.log(`[ProviderDetail] Schedule data received:`, data);
            console.log(`[ProviderDetail] Backend week range: ${data.week_range?.start_date} to ${data.week_range?.end_date}`);
            
            setScheduleData(data);
            
            // Fetch absence data after schedule data is loaded
            setTimeout(() => fetchAbsenceData(), 100);
            
        } catch (err) {
            console.error('Error fetching schedule data:', err);
            setScheduleError(err.message);
        } finally {
            setScheduleLoading(false);
        }
    };

    const fetchAbsences = async () => {
        try {
            setAbsencesLoading(true);
            setAbsencesError(null);
            console.log(`[ProviderDetail] Fetching absences for provider ID: ${providerId}`);
            
            const data = await get(`http://localhost:8000/account/providers/${providerId}/absences/`);
            console.log(`[ProviderDetail] Absences data received:`, data);
            
            setAbsences(data.absences || []);
        } catch (err) {
            console.error('Error fetching absences:', err);
            setAbsencesError(err.message);
        } finally {
            setAbsencesLoading(false);
        }
    };

    const navigateWeek = (direction) => {
        // Create a completely new Date object to avoid mutation
        const newWeekStart = new Date(currentWeekStart.getTime());
        newWeekStart.setDate(newWeekStart.getDate() + (direction * 7));
        
        console.log(`[ProviderDetail] navigateWeek called with direction: ${direction}`);
        console.log(`[ProviderDetail] Current week start: ${currentWeekStart.toISOString().split('T')[0]}`);
        console.log(`[ProviderDetail] New week start: ${newWeekStart.toISOString().split('T')[0]}`);
        console.log(`[ProviderDetail] Date objects are equal: ${currentWeekStart.getTime() === newWeekStart.getTime()}`);
        
        setCurrentWeekStart(newWeekStart);
    };

    const formatDate = (dateString) => {
        if (!dateString) return providersT('notAvailable');
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };    const formatDateTime = (dateString) => {
        if (!dateString) return providersT('notAvailable');
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Absence form functions
    const resetAbsenceForm = () => {
        setAbsenceForm({
            start_date: '',
            end_date: '',
            start_time: '',
            end_time: '',
            absence_type: 'vacation',
            status: 'scheduled',
            reason: '',
            period_type: 'full_day'
        });
    };

    const handleAbsenceFormChange = (field, value) => {
        setAbsenceForm(prev => ({
            ...prev,
            [field]: value
        }));

        // Auto-set end_date if period_type changes and only start_date is set
        if (field === 'period_type' && absenceForm.start_date && !absenceForm.end_date) {
            setAbsenceForm(prev => ({
                ...prev,
                end_date: prev.start_date
            }));
        }

        // Set default times based on period type
        if (field === 'period_type') {
            switch (value) {
                case 'half_day_am':
                    setAbsenceForm(prev => ({
                        ...prev,
                        start_time: '08:00',
                        end_time: '12:00'
                    }));
                    break;
                case 'half_day_pm':
                    setAbsenceForm(prev => ({
                        ...prev,
                        start_time: '12:00',
                        end_time: '18:00'
                    }));
                    break;
                case 'full_day':
                    setAbsenceForm(prev => ({
                        ...prev,
                        start_time: '',
                        end_time: ''
                    }));
                    break;
                default:
                    break;
            }
        }
    };

    const handleSaveAbsence = async () => {
        setSavingAbsence(true);
        try {
            // Validate form
            if (!absenceForm.start_date) {
                setAbsencesError(providersT('absenceValidation.startDateRequired'));
                return;
            }

            if (!absenceForm.end_date) {
                setAbsencesError(providersT('absenceValidation.endDateRequired'));
                return;
            }

            if (absenceForm.period_type === 'custom_hours') {
                if (!absenceForm.start_time || !absenceForm.end_time) {
                    setAbsencesError(providersT('absenceValidation.timesRequired'));
                    return;
                }
            }

            // Prepare data for submission
            const submissionData = {
                start_date: absenceForm.start_date,
                end_date: absenceForm.end_date,
                absence_type: absenceForm.absence_type,
                status: absenceForm.status,
                reason: absenceForm.reason
            };

            // Add time fields if needed
            if (absenceForm.period_type !== 'full_day' && absenceForm.start_time && absenceForm.end_time) {
                submissionData.start_time = absenceForm.start_time;
                submissionData.end_time = absenceForm.end_time;
                submissionData.period_type = absenceForm.period_type;
            }

            console.log('[ProviderDetail] Submitting absence:', submissionData);

            // Use authenticated API call
            const responseData = await post(
                `http://localhost:8000/account/providers/${providerId}/absences/`,
                submissionData
            );
            console.log('[ProviderDetail] Absence created:', responseData);

            // Refresh absences list
            await fetchAbsences();
            
            // Reset form and close
            resetAbsenceForm();
            setShowAbsenceForm(false);
            setAbsencesError(null);

        } catch (err) {
            console.error('Error saving absence:', err);
            setAbsencesError(err.message);
        } finally {
            setSavingAbsence(false);
        }
    };

    const openAbsenceForm = () => {
        resetAbsenceForm();
        setShowAbsenceForm(true);
        setAbsencesError(null);
    };

    const closeAbsenceForm = () => {
        setShowAbsenceForm(false);
        resetAbsenceForm();
        setAbsencesError(null);
    };    const getContractsByStatus = () => {
        if (!provider?.contracts) return {};
        
        return provider.contracts.reduce((acc, contract) => {
            const status = contract.status || 'unknown';
            if (!acc[status]) acc[status] = [];
            acc[status].push(contract);
            return acc;
        }, {});
    };

    const [editingContractId, setEditingContractId] = useState(null);
    // Add state for creating new contracts
    const [showCreateContractForm, setShowCreateContractForm] = useState(false);

    // Handler for editing contract
    const handleContractUpdate = (contractId) => {
        setEditingContractId(contractId);
    };

    const handleCancelEditContract = () => {
        setEditingContractId(null);
    };

    const handleContractSave = async () => {
        setEditingContractId(null);
        await fetchProviderDetails();
    };

    // Add handler for creating new contracts
    const handleCreateContract = () => {
        setShowCreateContractForm(true);
    };

    const handleCancelCreateContract = () => {
        setShowCreateContractForm(false);
    };

    const handleContractCreated = async () => {
        setShowCreateContractForm(false);
        // Refresh provider data to show the new contract
        await fetchProviderDetails();
        if (onContractUpdate) {
            onContractUpdate();
        }
    };

    const renderContractRow = (contract) => (
        <tr key={contract.id} className="contract-row">
            <td>
                <ContractStatusBadge 
                    status={contract.status}
                    complianceStatus={contract.compliance_status}
                    size="small"
                />
            </td>
            {viewableFields.includes('contract_type') && (
                <td>{contract.department || providersT('notAvailable')}</td>
            )}
            {viewableFields.includes('weekly_hours') && (
                <td>{contract.weekly_hours ? `${contract.weekly_hours}h` : providersT('notAvailable')}</td>
            )}
            {viewableFields.includes('start_date') && (
                <td>{formatDate(contract.start_date)}</td>
            )}
            {viewableFields.includes('end_date') && (
                <td>{formatDate(contract.end_date)}</td>
            )}
            {canEdit && viewableFields.includes('created_at') && (
                <td>{formatDateTime(contract.created_at)}</td>
            )}
            {canEdit && (
                <td>
                    <button 
                        className="btn-small btn-outline contract-edit-btn"
                        onClick={() => handleContractUpdate(contract.id)}
                        type="button"
                    >
                        Edit
                    </button>
                </td>
            )}
        </tr>
    );

    if (loading) {
        return (
            <div className="provider-detail-modal-wrapper">
                <div className="provider-modal-content">
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading provider details...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="provider-detail-modal-wrapper">
                <div className="provider-modal-content">
                    <div className="error-state">
                        <h3>Error Loading Provider</h3>
                        <p>{error}</p>                        <button className="btn-primary" onClick={onClose}>
                            {common('close')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!provider) {
        return null;
    }

    const contractsByStatus = getContractsByStatus();
    const totalContracts = provider.contracts?.length || 0;
    const activeContracts = contractsByStatus.active?.length || 0;    const editingContract = editingContractId ? provider.contracts.find(c => c.id === editingContractId) : null;

    return (
        <div className="provider-detail-modal-wrapper" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="provider-modal-content">
                {/* Modal Header */}
                <div className="provider-modal-header">                    <div className="provider-title-section">
                        <h2>{provider.user?.full_name || `${provider.user?.firstname} ${provider.user?.lastname}` || provider.user?.email || 'Unknown Provider'}</h2>                        <span className={`provider-status-badge ${provider.user?.is_active ? 'active' : 'inactive'}`}>
                            {provider.user?.is_active ? providersT('activeProvider') : providersT('inactiveProvider')}
                        </span>
                    </div>
                    <button className="provider-modal-close-btn" onClick={onClose} aria-label="Close">
                        ×
                    </button>
                </div>                {/* Tab Navigation */}
                <div className="provider-tab-navigation">
                    <button 
                        className={`provider-tab-button ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        {providersT('overview')}
                    </button>
                    <button 
                        className={`provider-tab-button ${activeTab === 'contracts' ? 'active' : ''}`}
                        onClick={() => setActiveTab('contracts')}
                    >
                        {providersT('contracts')} ({totalContracts})
                    </button>                    <button 
                        className={`provider-tab-button ${activeTab === 'schedule' ? 'active' : ''}`}
                        onClick={() => setActiveTab('schedule')}
                    >
                        {providersT('schedule')}
                    </button>
                    <button 
                        className={`provider-tab-button ${activeTab === 'absent' ? 'active' : ''}`}
                        onClick={() => setActiveTab('absent')}
                    >
                        {providersT('absent')}
                    </button>
                    {provider.statistics && (
                        <button 
                            className={`provider-tab-button ${activeTab === 'statistics' ? 'active' : ''}`}
                            onClick={() => setActiveTab('statistics')}
                        >
                            {providersT('statistics')}
                        </button>
                    )}
                </div>

                {/* Tab Content */}
                <div className="provider-tab-content">
                    {activeTab === 'overview' && (
                        <div className="provider-overview-tab">
                            {/* Basic Information */}
                            <div className="provider-info-section">                                <h3>{providersT('basicInformation')}</h3>
                                <div className="provider-info-grid">
                                    <div className="provider-info-item">
                                        <label>{providersT('fullName')}:</label>
                                        <span>{provider.user?.firstname} {provider.user?.lastname}</span>
                                    </div>
                                    <div className="provider-info-item">
                                        <label>Email:</label>
                                        <span>{provider.user?.email}</span>
                                    </div>                                    <div className="provider-info-item">
                                        <label>{providersT('service')}:</label>
                                        <span>{provider.service?.description || provider.service?.name || providersT('noServiceAssigned')}</span>
                                    </div>
                                    <div className="provider-info-item">
                                        <label>Status:</label>
                                        <span className={provider.user?.is_active ? 'provider-status-active' : 'provider-status-inactive'}>
                                            {provider.user?.is_active ? providersT('active') : providersT('inactive')}
                                        </span>
                                    </div>                                    <div className="provider-info-item">
                                        <label>{providersT('memberSince')}:</label>
                                        <span>{formatDate(provider.user?.created_at)}</span>
                                    </div>
                                </div>
                            </div>                            {/* Contract Summary */}
                            <div className="provider-info-section">
                                <h3>{providersT('contractSummary')}</h3>
                                <div className="provider-contract-summary-grid">                                    <div className="provider-summary-card">
                                        <div className="provider-summary-number">{totalContracts}</div>
                                        <div className="provider-summary-label">{providersT('totalContracts')}</div>
                                    </div>
                                    <div className="provider-summary-card active">
                                        <div className="provider-summary-number">{activeContracts}</div>
                                        <div className="provider-summary-label">{providersT('activeContracts')}</div>
                                    </div>                                    <div className="provider-summary-card">
                                        <div className="provider-summary-number">{contractsByStatus.expired?.length || 0}</div>
                                        <div className="provider-summary-label">{providersT('expiredContracts')}</div>
                                    </div>
                                    <div className="provider-summary-card weekly-hours-summary">
                                        <div className="provider-summary-number">{scheduleData?.statistics?.total_weekly_hours || provider.statistics?.total_weekly_hours || 0}h</div>
                                        <div className="provider-summary-label">{providersT('weeklyHours')}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'contracts' && (
                        <div className="contracts-tab">
                            {totalContracts === 0 ? (
                                <div className="empty-state">
                                    <p>{providersT('noContractsFound')}</p>
                                    {canEdit && (
                                        <button 
                                            className="btn-primary"
                                            onClick={handleCreateContract}
                                        >
                                            {providersT('createContract')}
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="contracts-table-container">
                                    {/* Add a "Create New Contract" button at the top of the table */}
                                    {canEdit && (
                                        <div className="contracts-actions">
                                            <button 
                                                className="btn-primary"
                                                onClick={handleCreateContract}
                                            >
                                                {providersT('createContract')}
                                            </button>
                                        </div>
                                    )}
                                    
                                    <table className="contracts-table">
                                        <thead>
                                            <tr>
                                                <th>Status</th>
                                                {viewableFields.includes('contract_type') && <th>{providersT('department')}</th>}
                                                {viewableFields.includes('weekly_hours') && <th>{providersT('weeklyHours')}</th>}
                                                {viewableFields.includes('start_date') && <th>{providersT('startDate')}</th>}
                                                {viewableFields.includes('end_date') && <th>{providersT('endDate')}</th>}
                                                {canEdit && viewableFields.includes('created_at') && <th>{providersT('created')}</th>}
                                                {canEdit && <th>{providersT('actions')}</th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {provider.contracts.map(renderContractRow)}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'statistics' && provider.statistics && (
                        <div className="statistics-tab">
                            <div className="stats-grid">
                                <div className="stat-card">
                                    <h4>Contract Statistics</h4>
                                    <div className="stat-items">
                                        <div className="stat-item">
                                            <span className="stat-label">Total Contracts:</span>
                                            <span className="stat-value">{provider.statistics.total_contracts || 0}</span>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-label">Active Contracts:</span>
                                            <span className="stat-value">{provider.statistics.active_contracts || 0}</span>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-label">Expired Contracts:</span>
                                            <span className="stat-value">{provider.statistics.expired_contracts || 0}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="stat-card">
                                    <h4>Hours & Workload</h4>
                                    <div className="stat-items">
                                        <div className="stat-item">
                                            <span className="stat-label">Total Weekly Hours:</span>
                                            <span className="stat-value">{provider.statistics.total_weekly_hours || 0}h</span>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-label">Average Contract Duration:</span>
                                            <span className="stat-value">{provider.statistics.avg_contract_duration || 0} days</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'schedule' && (
                        <div className="schedule-tab">
                            <div className="schedule-header">
                                <div className="schedule-current-week">
                                    {scheduleData?.week_range ? 
                                        `${scheduleData.week_range.week_start_display} - ${scheduleData.week_range.week_end_display}` :
                                        formatWeekRange(currentWeekStart)
                                    }
                                </div>                                <div className="schedule-nav">
                                    <button 
                                        className="schedule-nav-btn" 
                                        onClick={() => navigateWeek(-1)}
                                        disabled={scheduleLoading}
                                    >
                                        ← {providersT('previousWeek')}
                                    </button>
                                    <button 
                                        className="schedule-nav-btn" 
                                        onClick={() => {
                                            const currentWeek = getWeekStart(new Date());
                                            console.log('[ProviderDetail] This Week clicked - calculated week start:', currentWeek.toISOString().split('T')[0]);
                                            setCurrentWeekStart(currentWeek);
                                        }}
                                        disabled={scheduleLoading}
                                    >
                                        {providersT('thisWeek')}
                                    </button>
                                    <button 
                                        className="schedule-nav-btn" 
                                        onClick={() => navigateWeek(1)}
                                        disabled={scheduleLoading}
                                    >
                                        {providersT('nextWeek')} →
                                    </button>
                                </div>
                            </div>                            {scheduleLoading && (
                                <div className="schedule-loading">
                                    <div className="spinner"></div>
                                    <p>{providersT('loadingSchedule')}</p>
                                </div>
                            )}

                            {scheduleError && (
                                <div className="schedule-error">
                                    <h4>{providersT('errorLoadingSchedule')}</h4>
                                    <p>{scheduleError}</p>
                                    <button className="btn-primary" onClick={fetchScheduleData}>
                                        {providersT('retrySchedule')}
                                    </button>
                                </div>
                            )}

                            {!scheduleLoading && !scheduleError && scheduleData && (
                                <div className="weekly-schedule-container">                                    {Object.keys(scheduleData.schedule_data).length === 0 || 
                                     Object.values(scheduleData.schedule_data).every(day => day.appointments.length === 0) ? (
                                        <div className="schedule-no-data">
                                            <h4>{providersT('noAppointmentsThisWeek')}</h4>
                                            <p>{providersT('noAppointmentsForWeek').replace('{weekRange}', 
                                                scheduleData?.week_range ? 
                                                    `${scheduleData.week_range.week_start_display} - ${scheduleData.week_range.week_end_display}` :
                                                    formatWeekRange(currentWeekStart)
                                            )}</p>
                                        </div>) : (
                                        <WeeklyScheduleGrid scheduleData={scheduleData} absenceData={absenceData} />
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'absent' && (
                        <div className="provider-absent-tab">
                            <div className="absent-header">
                                <h3>{providersT('absenceTitle')}</h3>
                                <p className="absent-subtitle">{providersT('absenceSubtitle')}</p>
                            </div>

                            {absencesLoading && (
                                <div className="absences-loading">
                                    <div className="spinner"></div>
                                    <p>{providersT('loadingAbsences')}</p>
                                </div>
                            )}

                            {absencesError && (
                                <div className="absences-error">
                                    <h4>{providersT('errorLoadingAbsences')}</h4>
                                    <p>{absencesError}</p>
                                    <button className="btn-primary" onClick={fetchAbsences}>
                                        {common('retry')}
                                    </button>
                                </div>
                            )}

                            {!absencesLoading && !absencesError && (
                                <div className="absences-container">                                    {/* Absence Actions */}
                                    {canEdit && (
                                        <div className="absence-actions">
                                            {!showAbsenceForm ? (
                                                <button className="btn-primary" onClick={openAbsenceForm}>
                                                    {providersT('addAbsence')}
                                                </button>
                                            ) : (
                                                <div className="absence-form-container">
                                                    <div className="absence-form-header">
                                                        <h4>{providersT('addNewAbsence')}</h4>
                                                        <button className="btn-secondary" onClick={closeAbsenceForm}>
                                                            {common('cancel')}
                                                        </button>
                                                    </div>

                                                    <form className="absence-form" onSubmit={(e) => e.preventDefault()}>
                                                        {/* Period Type Selection */}
                                                        <div className="form-group">
                                                            <label>{providersT('absencePeriodType')}</label>
                                                            <div className="period-type-buttons">
                                                                <button
                                                                    type="button"
                                                                    className={`period-btn ${absenceForm.period_type === 'full_day' ? 'active' : ''}`}
                                                                    onClick={() => handleAbsenceFormChange('period_type', 'full_day')}
                                                                >
                                                                    {providersT('periodTypes.fullDay')}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className={`period-btn ${absenceForm.period_type === 'half_day_am' ? 'active' : ''}`}
                                                                    onClick={() => handleAbsenceFormChange('period_type', 'half_day_am')}
                                                                >
                                                                    {providersT('periodTypes.halfDayAM')}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className={`period-btn ${absenceForm.period_type === 'half_day_pm' ? 'active' : ''}`}
                                                                    onClick={() => handleAbsenceFormChange('period_type', 'half_day_pm')}
                                                                >
                                                                    {providersT('periodTypes.halfDayPM')}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className={`period-btn ${absenceForm.period_type === 'custom_hours' ? 'active' : ''}`}
                                                                    onClick={() => handleAbsenceFormChange('period_type', 'custom_hours')}
                                                                >
                                                                    {providersT('periodTypes.customHours')}
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Date Range */}
                                                        <div className="form-row">
                                                            <div className="form-group">
                                                                <label>{providersT('startDate')} *</label>
                                                                <input
                                                                    type="date"
                                                                    value={absenceForm.start_date}
                                                                    onChange={(e) => handleAbsenceFormChange('start_date', e.target.value)}
                                                                    required
                                                                />
                                                            </div>
                                                            <div className="form-group">
                                                                <label>{providersT('endDate')} *</label>
                                                                <input
                                                                    type="date"
                                                                    value={absenceForm.end_date}
                                                                    onChange={(e) => handleAbsenceFormChange('end_date', e.target.value)}
                                                                    min={absenceForm.start_date}
                                                                    required
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Time Range (only for partial days and custom hours) */}
                                                        {(absenceForm.period_type === 'half_day_am' || 
                                                          absenceForm.period_type === 'half_day_pm' || 
                                                          absenceForm.period_type === 'custom_hours') && (
                                                            <div className="form-row">
                                                                <div className="form-group">
                                                                    <label>{providersT('startTime')} *</label>
                                                                    <input
                                                                        type="time"
                                                                        value={absenceForm.start_time}
                                                                        onChange={(e) => handleAbsenceFormChange('start_time', e.target.value)}
                                                                        required
                                                                    />
                                                                </div>
                                                                <div className="form-group">
                                                                    <label>{providersT('endTime')} *</label>
                                                                    <input
                                                                        type="time"
                                                                        value={absenceForm.end_time}
                                                                        onChange={(e) => handleAbsenceFormChange('end_time', e.target.value)}
                                                                        min={absenceForm.start_time}
                                                                        required
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Absence Type */}
                                                        <div className="form-group">
                                                            <label>{providersT('absenceType')} *</label>
                                                            <select
                                                                value={absenceForm.absence_type}
                                                                onChange={(e) => handleAbsenceFormChange('absence_type', e.target.value)}
                                                                required
                                                            >
                                                                <option value="vacation">{providersT('absenceTypes.vacation')}</option>
                                                                <option value="sick_leave">{providersT('absenceTypes.sickLeave')}</option>
                                                                <option value="personal">{providersT('absenceTypes.personal')}</option>
                                                                <option value="training">{providersT('absenceTypes.training')}</option>
                                                                <option value="meeting">{providersT('absenceTypes.meeting')}</option>
                                                                <option value="other">{providersT('absenceTypes.other')}</option>
                                                            </select>
                                                        </div>

                                                        {/* Status */}
                                                        <div className="form-group">
                                                            <label>{providersT('absenceStatus')} *</label>
                                                            <select
                                                                value={absenceForm.status}
                                                                onChange={(e) => handleAbsenceFormChange('status', e.target.value)}
                                                                required
                                                            >
                                                                <option value="scheduled">{providersT('absenceStatuses.scheduled')}</option>
                                                                <option value="confirmed">{providersT('absenceStatuses.confirmed')}</option>
                                                                <option value="pending">{providersT('absenceStatuses.pending')}</option>
                                                                <option value="cancelled">{providersT('absenceStatuses.cancelled')}</option>
                                                            </select>
                                                        </div>

                                                        {/* Reason */}
                                                        <div className="form-group">
                                                            <label>{providersT('absenceReason')}</label>
                                                            <textarea
                                                                value={absenceForm.reason}
                                                                onChange={(e) => handleAbsenceFormChange('reason', e.target.value)}
                                                                placeholder={providersT('absenceReasonPlaceholder')}
                                                                rows="3"
                                                            />
                                                        </div>

                                                        {/* Form Actions */}
                                                        <div className="form-actions">
                                                            <button
                                                                type="button"
                                                                className="btn-secondary"
                                                                onClick={closeAbsenceForm}
                                                                disabled={savingAbsence}
                                                            >
                                                                {common('cancel')}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="btn-primary"
                                                                onClick={handleSaveAbsence}
                                                                disabled={savingAbsence || !absenceForm.start_date || !absenceForm.end_date}
                                                            >
                                                                {savingAbsence ? common('saving') : common('save')}
                                                            </button>
                                                        </div>
                                                    </form>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Absences List */}
                                    {absences.length === 0 ? (
                                        <div className="no-absences">
                                            <h4>{providersT('noAbsencesFound')}</h4>
                                            <p>{providersT('noAbsencesFoundDescription')}</p>
                                        </div>
                                    ) : (
                                        <div className="absences-list">
                                            {absences.map(absence => (
                                                <div key={absence.id} className="absence-card">
                                                    <div className="absence-header">
                                                        <div className="absence-type">
                                                            <span className={`absence-type-badge ${absence.absence_type}`}>
                                                                {providersT(`absenceTypes.${absence.absence_type}`)}
                                                            </span>
                                                            <span className={`absence-status-badge ${absence.status}`}>
                                                                {providersT(`absenceStatuses.${absence.status}`)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="absence-period">
                                                        <strong>{providersT('absencePeriod')}:</strong>
                                                        <span>{formatDate(absence.start_date)} - {formatDate(absence.end_date)}</span>
                                                    </div>
                                                    {absence.reason && (
                                                        <div className="absence-reason">
                                                            <strong>{providersT('absenceReason')}:</strong>
                                                            <p>{absence.reason}</p>
                                                        </div>
                                                    )}
                                                    <div className="absence-meta">
                                                        <small>
                                                            {common('create')}: {absence.created_by || common('notAvailable')} - {formatDateTime(absence.created_at)}
                                                        </small>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                {/* Modal Footer */}
                <div className="modal-footer">
                    <button className="btn-secondary" onClick={onClose}>
                        {common('close')}
                    </button>
                </div>
                {/* Floating contract form card for editing */}
                {editingContract && (
                    <div className="contract-edit-floating-card" onClick={(e) => e.target === e.currentTarget && handleCancelEditContract()}>
                        <ContractForm
                            contract={editingContract}
                            provider={provider}
                            onSave={handleContractSave}
                            onCancel={handleCancelEditContract}
                        />
                    </div>
                )}

                {/* Floating contract form card for creating new contracts */}
                {showCreateContractForm && (
                    <div className="contract-edit-floating-card" onClick={(e) => e.target === e.currentTarget && handleCancelCreateContract()}>
                        <ContractForm
                            contract={null}
                            provider={provider}
                            onSave={handleContractCreated}
                            onCancel={handleCancelCreateContract}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProviderDetail;
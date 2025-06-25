import React, { useState, useEffect } from 'react';
import ContractStatusBadge from './ContractStatusBadge';
import { formatRole, getViewableContractFields, canEditContracts } from '../../utils/roleUtils';
import { useAuthenticatedApi } from '../../hooks/useAuth';
import { useCareTranslation } from '../../hooks/useCareTranslation';
import './ProviderDetail.css';

/**
 * WeeklyScheduleGrid Component
 * Displays the weekly schedule in a calendar grid format with proper time span handling
 */
const WeeklyScheduleGrid = ({ scheduleData }) => {
    const { providers: providersT } = useCareTranslation();
    const timeSlots = [
        '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
        '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
        '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', 
        '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30',
        '00:00',
    ];

    const getDayData = (dayKey) => {
        return scheduleData.schedule_data[dayKey] || { appointments: [] };
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
                
                return (
                    <div 
                        key={dayKey} 
                        className={`schedule-day-header ${isToday(dayKey) ? 'today' : ''}`}
                    >
                        <div>{dayName}</div>
                        <div>{dayNumber}</div>
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
                        
                        return (
                            <div key={`${dayKey}-${timeSlot}`} className="schedule-time-slot">
                                {appointment ? (
                                    isStart ? (                                        // Show full appointment details only at the start slot
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
}) => {
    const [provider, setProvider] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [scheduleData, setScheduleData] = useState(null);
    const [scheduleLoading, setScheduleLoading] = useState(false);
    const [scheduleError, setScheduleError] = useState(null);
    const [currentWeekStart, setCurrentWeekStart] = useState(getWeekStart(new Date()));// Use the same authenticated API as the main component
    const { get } = useAuthenticatedApi();
    const { common, providers: providersT } = useCareTranslation();

    const viewableFields = getViewableContractFields({ role: userRole });
    const canEdit = canEditContracts({ role: userRole });

    // Helper function to get start of week (Monday)
    function getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        return new Date(d.setDate(diff));
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
    }, [providerId]);

    useEffect(() => {
        if (activeTab === 'schedule' && provider) {
            fetchScheduleData();
        }
    }, [activeTab, provider, currentWeekStart]);

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

    const fetchScheduleData = async () => {
        try {
            setScheduleLoading(true);
            setScheduleError(null);
            console.log(`[ProviderDetail] Fetching schedule for provider ID: ${providerId}, week: ${currentWeekStart.toISOString().split('T')[0]}`);
            
            const data = await get(`http://localhost:8000/account/providers/${providerId}/schedule/?start_date=${currentWeekStart.toISOString().split('T')[0]}`);
            console.log(`[ProviderDetail] Schedule data received:`, data);
            
            setScheduleData(data);
        } catch (err) {
            console.error('Error fetching schedule data:', err);
            setScheduleError(err.message);
        } finally {
            setScheduleLoading(false);
        }
    };

    const navigateWeek = (direction) => {
        const newWeekStart = new Date(currentWeekStart);
        newWeekStart.setDate(newWeekStart.getDate() + (direction * 7));
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

    const getContractsByStatus = () => {
        if (!provider?.contracts) return {};
        
        return provider.contracts.reduce((acc, contract) => {
            const status = contract.status || 'unknown';
            if (!acc[status]) acc[status] = [];
            acc[status].push(contract);
            return acc;
        }, {});
    };

    const renderContractRow = (contract) => (
        <tr key={contract.id} className="contract-row">
            <td>
                <ContractStatusBadge 
                    status={contract.status}
                    complianceStatus={contract.compliance_status}
                    size="small"
                />
            </td>            {viewableFields.includes('contract_type') && (
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
                <td>                    <button 
                        className="btn-small btn-outline"
                        onClick={() => onContractUpdate && onContractUpdate(contract.id)}
                    >
                        Edit
                    </button>
                </td>
            )}
        </tr>
    );    if (loading) {
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
    const activeContracts = contractsByStatus.active?.length || 0;    return (
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
                                        <button className="btn-primary">
                                            {providersT('createContract')}
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="contracts-table-container">
                                    <table className="contracts-table">                                        <thead>                                            <tr>
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
                                    {formatWeekRange(currentWeekStart)}
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
                                        onClick={() => setCurrentWeekStart(getWeekStart(new Date()))}
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
                                            <p>{providersT('noAppointmentsForWeek').replace('{weekRange}', formatWeekRange(currentWeekStart))}</p>
                                        </div>) : (
                                        <WeeklyScheduleGrid scheduleData={scheduleData} />
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="modal-footer">                    <button className="btn-secondary" onClick={onClose}>
                        {common('close')}
                    </button>
                    {canEdit && (                        <button className="btn-primary" onClick={() => console.log('Edit provider')}>
                            {providersT('editProvider')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProviderDetail;

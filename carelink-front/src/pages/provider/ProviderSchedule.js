import React, { useState, useEffect } from 'react';
import BaseLayout from '../../auth/layout/BaseLayout';
import { useAuthenticatedApi } from '../../hooks/useAuth';
import { useCareTranslation } from '../../hooks/useCareTranslation';
import { SpinnerOnly } from '../../components/LoadingComponents';
import PatientInfoModal from '../../components/PatientInfoModal';
import './ProviderSchedule.css';

/**
 * WeeklyScheduleGrid Component
 * Displays the weekly schedule in a calendar grid format with proper time span handling
 */
const WeeklyScheduleGrid = ({ scheduleData, absenceData, onAppointmentClick }) => {
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
    };

    // Format status text for display
    const formatStatus = (status) => {
        const statusKey = status || 'scheduled';
        return providersT(`appointmentStatuses.${statusKey}`) || statusKey;
    };

    const isToday = (dateString) => {
        const today = new Date().toISOString().split('T')[0];
        return dateString === today;
    };

    const sortedDays = Object.keys(scheduleData.schedule_data).sort();

    return (
        <div className="weekly-schedule-grid">
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
            {timeSlots.map(timeSlot => (
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
                                            onClick={() => onAppointmentClick && onAppointmentClick(appointment)}
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
                                            </div>
                                            <div className="appointment-status">
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

// Helper to get the start of the week (Monday)
const getWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    // Monday = 1, Sunday = 0
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
};

const ProviderSchedule = () => {
    // Initialize currentWeek to the start of the current week
    const [currentWeek, setCurrentWeek] = useState(getWeekStart(new Date()));
    const [scheduleData, setScheduleData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [absenceData, setAbsenceData] = useState({});
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [showPatientModal, setShowPatientModal] = useState(false);
    
    const { get } = useAuthenticatedApi();
    const { schedule, common, providers: providersT } = useCareTranslation();

    useEffect(() => {
        fetchScheduleData();
    }, [currentWeek]);

    const fetchScheduleData = async () => {
        setLoading(true);
        setError(null);
        
        try {
            // Always use the start of the week for fetching
            const weekStart = getWeekStart(currentWeek);
            const startDate = weekStart.toISOString().split('T')[0];
            const data = await get(`http://localhost:8000/account/providers/my-schedule/?start_date=${startDate}`);
            setScheduleData(data);
            // Fetch absence data for the same week
            await fetchAbsenceData(startDate);
        } catch (err) {
            console.error('Error fetching schedule data:', err);
            if (err.message && err.message.includes('403')) {
                setError('Access denied. This schedule view is only available for providers.');
            } else if (err.message && err.message.includes('500')) {
                setError('Server error. Please try again later.');
            } else {
                setError(err.message || 'Failed to fetch schedule data');
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchAbsenceData = async (startDate) => {
        try {
            // Get the end date (7 days from start)
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 6);
            const endDateStr = endDate.toISOString().split('T')[0];
            const absenceResponse = await get(`http://localhost:8000/account/providers/my-absences/?start_date=${startDate}&end_date=${endDateStr}`);
            setAbsenceData(absenceResponse.absence_data || {});
        } catch (err) {
            console.error('Error fetching absence data:', err);
            setAbsenceData({});
        }
    };

    // Updated week navigation to always use week start
    const navigateWeek = (direction) => {
        const weekStart = getWeekStart(currentWeek);
        weekStart.setDate(weekStart.getDate() + (direction * 7));
        setCurrentWeek(new Date(weekStart));
    };

    const formatWeekRange = (weekStart) => {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        
        const startStr = weekStart.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
        });
        const endStr = weekEnd.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
        });
        
        return `${startStr} - ${endStr}`;
    };

    const handleAppointmentClick = (appointment) => {
        console.log('Appointment clicked:', appointment);
        setSelectedAppointment(appointment);
        setShowPatientModal(true);
    };

    const handleCloseModal = () => {
        setShowPatientModal(false);
        setSelectedAppointment(null);
    };

    if (loading) {
        return (
            <BaseLayout>
                <div className="container-fluid py-4">
                    <div className="row justify-content-center">
                        <div className="col-lg-8">
                            <div className="text-center py-5">
                                <SpinnerOnly size="large" />
                                <p className="mt-3 text-muted">{schedule('loadingSchedule')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </BaseLayout>
        );
    }

    if (error) {
        return (
            <BaseLayout>
                <div className="container-fluid py-4">
                    <div className="row justify-content-center">
                        <div className="col-lg-8">
                            <div className="alert alert-danger">
                                <h5>{schedule('errorLoadingSchedule')}</h5>
                                <p>{error}</p>
                                <button 
                                    className="btn btn-primary" 
                                    onClick={fetchScheduleData}
                                >
                                    {schedule('retrySchedule')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </BaseLayout>
        );
    }

    if (!scheduleData) {
        return (
            <BaseLayout>
                <div className="container-fluid py-4">
                    <div className="row justify-content-center">
                        <div className="col-lg-8">
                            <div className="alert alert-info">
                                <h5>{schedule('noScheduleData')}</h5>
                                <p>{schedule('noScheduleDataDescription')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </BaseLayout>
        );
    }

    const totalAppointments = scheduleData.statistics?.total_appointments || 0;
    const totalHours = scheduleData.statistics?.total_weekly_hours || 0;
    const completionRate = scheduleData.statistics?.completion_rate || 0;

    return (
        <BaseLayout>
            <div className="container-fluid py-4">
                <div className="row">
                    <div className="col-12">
                        {/* Header */}
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <div>
                                <h2 className="mb-1">{schedule('mySchedule')}</h2>
                                <p className="text-muted mb-0">
                                    {scheduleData.week_range?.week_start_display} - {scheduleData.week_range?.week_end_display}
                                </p>
                            </div>
                            <div className="d-flex gap-2">
                                <button 
                                    className="btn btn-outline-primary"
                                    onClick={() => navigateWeek(-1)}
                                >
                                    <i className="fas fa-chevron-left me-1"></i>
                                    {schedule('previousWeek')}
                                </button>
                                <button 
                                    className="btn btn-outline-primary"
                                    onClick={() => {
                                        const currentWeek = getWeekStart(new Date());
                                        setCurrentWeek(currentWeek);
                                    }}
                                >
                                    {schedule('thisWeek')}
                                </button>
                                <button 
                                    className="btn btn-outline-primary"
                                    onClick={() => navigateWeek(1)}
                                >
                                    {schedule('nextWeek')}
                                    <i className="fas fa-chevron-right ms-1"></i>
                                </button>
                            </div>
                        </div>

                        {/* Statistics */}
                        <div className="row mb-4">
                            <div className="col-md-3">
                                <div className="card bg-primary text-white">
                                    <div className="card-body text-center">
                                        <h4 className="mb-1">{totalAppointments}</h4>
                                        <p className="mb-0">{schedule('totalAppointments')}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="card bg-success text-white">
                                    <div className="card-body text-center">
                                        <h4 className="mb-1">{totalHours}h</h4>
                                        <p className="mb-0">{schedule('weeklyHours')}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="card bg-info text-white">
                                    <div className="card-body text-center">
                                        <h4 className="mb-1">{completionRate}%</h4>
                                        <p className="mb-0">{schedule('completionRate')}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="card bg-warning text-white">
                                    <div className="card-body text-center">
                                        <h4 className="mb-1">{scheduleData.provider?.service?.name || 'General'}</h4>
                                        <p className="mb-0">{schedule('service')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Weekly Schedule Grid */}
                        <div className="weekly-schedule-container">
                            {Object.keys(scheduleData.schedule_data).length === 0 || 
                             Object.values(scheduleData.schedule_data).every(day => day.appointments.length === 0) ? (
                                <div className="schedule-no-data">
                                    <h4>{providersT('noAppointmentsThisWeek')}</h4>
                                    <p>{providersT('noAppointmentsForWeek').replace('{weekRange}', 
                                        scheduleData?.week_range ? 
                                            `${scheduleData.week_range.week_start_display} - ${scheduleData.week_range.week_end_display}` :
                                            formatWeekRange(getWeekStart(currentWeek))
                                    )}</p>
                                </div>
                            ) : (
                                <WeeklyScheduleGrid 
                            scheduleData={scheduleData} 
                            absenceData={absenceData} 
                            onAppointmentClick={handleAppointmentClick} 
                        />
                            )}
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Patient Information Modal */}
            {showPatientModal && selectedAppointment && (
                <PatientInfoModal 
                    appointment={selectedAppointment}
                    onClose={handleCloseModal}
                />
            )}
        </BaseLayout>
    );
};

export default ProviderSchedule; 
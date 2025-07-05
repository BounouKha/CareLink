import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ScheduleChangeRequestModal from './ScheduleChangeRequestModal';

const PatientAppointmentCard = ({ appointment, onRequestSubmitted }) => {
    const { t } = useTranslation();
    const [showChangeRequestModal, setShowChangeRequestModal] = useState(false);

    const getStatusBadgeClass = (status) => {
        switch (status?.toLowerCase()) {
            case 'confirmed': return 'badge bg-success';
            case 'pending': return 'badge bg-warning text-dark';
            case 'cancelled': return 'badge bg-danger';
            case 'completed': return 'badge bg-primary';
            case 'no_show': return 'badge bg-secondary';
            default: return 'badge bg-secondary';
        }
    };

    const getStatusText = (status) => {
        switch (status?.toLowerCase()) {
            case 'confirmed': return t('appointment.status.confirmed', 'Confirmed');
            case 'pending': return t('appointment.status.pending', 'Pending');
            case 'cancelled': return t('appointment.status.cancelled', 'Cancelled');
            case 'completed': return t('appointment.status.completed', 'Completed');
            case 'no_show': return t('appointment.status.noShow', 'No Show');
            default: return t('appointment.status.unknown', 'Unknown');
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatTime = (timeString) => {
        if (!timeString) return '';
        const time = new Date(`2000-01-01T${timeString}`);
        return time.toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const calculateDuration = (startTime, endTime) => {
        if (!startTime || !endTime) return 'N/A';
        
        try {
            const start = new Date(`2000-01-01T${startTime}`);
            const end = new Date(`2000-01-01T${endTime}`);
            const diffMs = end - start;
            const diffMinutes = Math.floor(diffMs / (1000 * 60));
            
            if (diffMinutes < 60) {
                return `${diffMinutes} ${t('common.minutes', 'minutes')}`;
            } else {
                const hours = Math.floor(diffMinutes / 60);
                const minutes = diffMinutes % 60;
                if (minutes === 0) {
                    return `${hours} ${t('common.hour', 'hour')}${hours > 1 ? 's' : ''}`;
                } else {
                    return `${hours} ${t('common.hour', 'hour')}${hours > 1 ? 's' : ''} ${minutes} ${t('common.minutes', 'minutes')}`;
                }
            }
        } catch (error) {
            return 'N/A';
        }
    };

    const isPastAppointment = (date, time) => {
        const appointmentDateTime = new Date(`${date}T${time}`);
        return appointmentDateTime < new Date();
    };

    const canRequestChanges = (appointment) => {
        // Don't allow changes for past appointments or cancelled/completed appointments
        if (isPastAppointment(appointment.date, appointment.start_time)) {
            return false;
        }
        
        const status = appointment.status?.toLowerCase();
        return status !== 'cancelled' && status !== 'completed';
    };

    const handleRequestChanges = () => {
        setShowChangeRequestModal(true);
    };

    const handleRequestSubmitted = (result) => {
        if (onRequestSubmitted) {
            onRequestSubmitted(result);
        }
        setShowChangeRequestModal(false);
    };

    return (
        <>
            <div className="card mb-3 appointment-card">
                <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                        <div>
                            <h5 className="card-title mb-1">
                                <i className="bi bi-calendar-date me-2 text-primary"></i>
                                {formatDate(appointment.date)}
                            </h5>
                            <div className="text-muted">
                                <i className="bi bi-clock me-2"></i>
                                {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
                                <span className="ms-2">
                                    ({calculateDuration(appointment.start_time, appointment.end_time)})
                                </span>
                            </div>
                        </div>
                        <span className={getStatusBadgeClass(appointment.status)}>
                            {getStatusText(appointment.status)}
                        </span>
                    </div>

                    <div className="row mb-3">
                        <div className="col-md-6">
                            <div className="d-flex align-items-center mb-2">
                                <i className="bi bi-person-heart me-2 text-info"></i>
                                <div>
                                    <small className="text-muted">{t('appointment.provider', 'Provider')}</small>
                                    <div className="fw-bold">{appointment.provider_name || t('common.notAssigned', 'Not assigned')}</div>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="d-flex align-items-center mb-2">
                                <i className="bi bi-person me-2 text-success"></i>
                                <div>
                                    <small className="text-muted">{t('appointment.patient', 'Patient')}</small>
                                    <div className="fw-bold">{appointment.patient_name || t('common.unknown', 'Unknown')}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {appointment.service && (
                        <div className="mb-3">
                            <div className="d-flex align-items-center">
                                <i className="bi bi-heart-pulse me-2 text-warning"></i>
                                <div>
                                    <small className="text-muted">{t('appointment.service', 'Service')}</small>
                                    <div className="fw-bold">{appointment.service}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {appointment.notes && (
                        <div className="mb-3">
                            <div className="d-flex align-items-start">
                                <i className="bi bi-sticky me-2 text-secondary"></i>
                                <div>
                                    <small className="text-muted">{t('appointment.notes', 'Notes')}</small>
                                    <div className="text-muted">{appointment.notes}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="d-flex justify-content-between align-items-center">
                        <div className="text-muted small">
                            <i className="bi bi-info-circle me-1"></i>
                            {t('appointment.appointmentId', 'Appointment ID')}: {appointment.id}
                        </div>
                        
                        {canRequestChanges(appointment) && (
                            <button
                                className="btn btn-outline-primary btn-sm"
                                onClick={handleRequestChanges}
                                title={t('appointment.requestChanges', 'Request Changes')}
                            >
                                <i className="bi bi-pencil me-2"></i>
                                {t('appointment.requestChanges', 'Request Changes')}
                            </button>
                        )}
                    </div>

                    {isPastAppointment(appointment.date, appointment.start_time) && (
                        <div className="alert alert-info mt-3 mb-0" role="alert">
                            <i className="bi bi-info-circle me-2"></i>
                            {t('appointment.pastAppointment', 'This is a past appointment. Changes cannot be requested.')}
                        </div>
                    )}

                    {(appointment.status?.toLowerCase() === 'cancelled' || appointment.status?.toLowerCase() === 'completed') && (
                        <div className="alert alert-secondary mt-3 mb-0" role="alert">
                            <i className="bi bi-info-circle me-2"></i>
                            {t('appointment.noChangesAllowed', 'Changes cannot be requested for this appointment.')}
                        </div>
                    )}
                </div>
            </div>

            {/* Schedule Change Request Modal */}
            <ScheduleChangeRequestModal
                isOpen={showChangeRequestModal}
                onClose={() => setShowChangeRequestModal(false)}
                appointment={appointment}
                onSuccess={handleRequestSubmitted}
            />
        </>
    );
};

export default PatientAppointmentCard; 
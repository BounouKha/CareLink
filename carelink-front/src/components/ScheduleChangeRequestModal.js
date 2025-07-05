import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import tokenManager from '../utils/tokenManager';

const ScheduleChangeRequestModal = ({ isOpen, onClose, appointment, onSuccess }) => {
    const { t } = useTranslation();
    const [requestType, setRequestType] = useState('cancel');
    const [reason, setReason] = useState('');
    const [requesterNotes, setRequesterNotes] = useState('');
    const [requestedDate, setRequestedDate] = useState('');
    const [requestedStartTime, setRequestedStartTime] = useState('');
    const [requestedEndTime, setRequestedEndTime] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const requestData = {
                schedule: appointment.id,
                request_type: requestType,
                reason: reason,
                requester_notes: requesterNotes
            };

            // Add requested date/time for reschedule requests
            if (requestType === 'reschedule') {
                if (!requestedDate) {
                    setError(t('scheduleChangeRequest.errors.dateRequired', 'Please select a requested date'));
                    setLoading(false);
                    return;
                }
                requestData.requested_date = requestedDate;
            }

            if (requestType === 'reschedule' || requestType === 'modify_time') {
                if (!requestedStartTime || !requestedEndTime) {
                    setError(t('scheduleChangeRequest.errors.timeRequired', 'Please select requested start and end times'));
                    setLoading(false);
                    return;
                }
                requestData.requested_start_time = requestedStartTime;
                requestData.requested_end_time = requestedEndTime;
            }

            const response = await tokenManager.authenticatedFetch(
                'http://localhost:8000/account/schedule-change-requests/',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestData)
                }
            );

            if (response.ok) {
                const result = await response.json();
                
                // Show success message
                if (onSuccess) {
                    onSuccess(result);
                }
                
                // Close modal
                onClose();
                
                // Reset form
                resetForm();
                
                // Show success notification
                alert(t('scheduleChangeRequest.success', 'Your request has been submitted successfully. A helpdesk ticket has been created and coordinators will review your request.'));
            } else {
                const errorData = await response.json();
                setError(errorData.error || t('scheduleChangeRequest.errors.submitFailed', 'Failed to submit request'));
            }
        } catch (err) {
            console.error('Error submitting schedule change request:', err);
            setError(t('scheduleChangeRequest.errors.networkError', 'Network error. Please try again.'));
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setRequestType('cancel');
        setReason('');
        setRequesterNotes('');
        setRequestedDate('');
        setRequestedStartTime('');
        setRequestedEndTime('');
        setError('');
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const formatDateTime = (date, time) => {
        if (!date || !time) return '';
        return new Date(`${date}T${time}`).toLocaleString();
    };

    if (!isOpen || !appointment) return null;

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-dialog modal-lg modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
                <div className="modal-content">
                    <div className="modal-header">
                        <h2 className="modal-title">
                            <i className="bi bi-calendar-date me-2"></i>
                            {t('scheduleChangeRequest.title', 'Request Schedule Change')}
                        </h2>
                        <button type="button" className="close-btn" onClick={handleClose}>
                            <i className="bi bi-x"></i>
                        </button>
                    </div>

                    <div className="modal-body">
                        {/* Current Appointment Info */}
                        <div className="mb-4">
                            <h5 className="border-bottom pb-2 mb-3">
                                <i className="bi bi-info-circle me-2 text-info"></i>
                                {t('scheduleChangeRequest.currentAppointment', 'Current Appointment')}
                            </h5>
                            <div className="row">
                                <div className="col-md-6">
                                    <strong>{t('scheduleChangeRequest.date', 'Date')}:</strong> {appointment.date}
                                </div>
                                <div className="col-md-6">
                                    <strong>{t('scheduleChangeRequest.time', 'Time')}:</strong> {appointment.start_time} - {appointment.end_time}
                                </div>
                                <div className="col-md-6">
                                    <strong>{t('scheduleChangeRequest.provider', 'Provider')}:</strong> {appointment.provider_name}
                                </div>
                                <div className="col-md-6">
                                    <strong>{t('scheduleChangeRequest.patient', 'Patient')}:</strong> {appointment.patient_name}
                                </div>
                            </div>
                        </div>

                        {/* Request Form */}
                        <form onSubmit={handleSubmit}>
                            {/* Request Type */}
                            <div className="mb-3">
                                <label className="form-label">
                                    <i className="bi bi-list me-2"></i>
                                    {t('scheduleChangeRequest.requestType', 'Request Type')} <span className="text-danger">*</span>
                                </label>
                                <select 
                                    className="form-select"
                                    value={requestType}
                                    onChange={(e) => setRequestType(e.target.value)}
                                    required
                                >
                                    <option value="cancel">{t('scheduleChangeRequest.types.cancel', 'Cancel Appointment')}</option>
                                    <option value="reschedule">{t('scheduleChangeRequest.types.reschedule', 'Reschedule Appointment')}</option>
                                    <option value="modify_time">{t('scheduleChangeRequest.types.modifyTime', 'Modify Time Only')}</option>
                                </select>
                            </div>

                            {/* Reason */}
                            <div className="mb-3">
                                <label className="form-label">
                                    <i className="bi bi-question-circle me-2"></i>
                                    {t('scheduleChangeRequest.reason', 'Reason')} <span className="text-danger">*</span>
                                </label>
                                <select 
                                    className="form-select"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    required
                                >
                                    <option value="">{t('scheduleChangeRequest.selectReason', 'Select a reason')}</option>
                                    <option value="personal_emergency">{t('scheduleChangeRequest.reasons.personalEmergency', 'Personal Emergency')}</option>
                                    <option value="illness">{t('scheduleChangeRequest.reasons.illness', 'Illness')}</option>
                                    <option value="work_conflict">{t('scheduleChangeRequest.reasons.workConflict', 'Work Conflict')}</option>
                                    <option value="transportation_issue">{t('scheduleChangeRequest.reasons.transportationIssue', 'Transportation Issue')}</option>
                                    <option value="family_emergency">{t('scheduleChangeRequest.reasons.familyEmergency', 'Family Emergency')}</option>
                                    <option value="schedule_conflict">{t('scheduleChangeRequest.reasons.scheduleConflict', 'Schedule Conflict')}</option>
                                    <option value="other">{t('scheduleChangeRequest.reasons.other', 'Other')}</option>
                                </select>
                            </div>

                            {/* Additional Notes */}
                            <div className="mb-3">
                                <label className="form-label">
                                    <i className="bi bi-chat-dots me-2"></i>
                                    {t('scheduleChangeRequest.additionalNotes', 'Additional Notes')}
                                </label>
                                <textarea
                                    className="form-control"
                                    rows="3"
                                    value={requesterNotes}
                                    onChange={(e) => setRequesterNotes(e.target.value)}
                                    placeholder={t('scheduleChangeRequest.notesPlaceholder', 'Please provide any additional details about your request...')}
                                />
                            </div>

                            {/* Requested Date/Time for Reschedule */}
                            {requestType === 'reschedule' && (
                                <div className="mb-3">
                                    <h6 className="border-bottom pb-2 mb-3">
                                        <i className="bi bi-calendar me-2 text-primary"></i>
                                        {t('scheduleChangeRequest.requestedDateTime', 'Requested Date & Time')}
                                    </h6>
                                    <div className="row">
                                        <div className="col-md-4">
                                            <label className="form-label">
                                                {t('scheduleChangeRequest.requestedDate', 'Requested Date')} <span className="text-danger">*</span>
                                            </label>
                                            <input
                                                type="date"
                                                className="form-control"
                                                value={requestedDate}
                                                onChange={(e) => setRequestedDate(e.target.value)}
                                                min={new Date().toISOString().split('T')[0]}
                                                required
                                            />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">
                                                {t('scheduleChangeRequest.requestedStartTime', 'Start Time')} <span className="text-danger">*</span>
                                            </label>
                                            <input
                                                type="time"
                                                className="form-control"
                                                value={requestedStartTime}
                                                onChange={(e) => setRequestedStartTime(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">
                                                {t('scheduleChangeRequest.requestedEndTime', 'End Time')} <span className="text-danger">*</span>
                                            </label>
                                            <input
                                                type="time"
                                                className="form-control"
                                                value={requestedEndTime}
                                                onChange={(e) => setRequestedEndTime(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Time Modification for modify_time */}
                            {requestType === 'modify_time' && (
                                <div className="mb-3">
                                    <h6 className="border-bottom pb-2 mb-3">
                                        <i className="bi bi-clock me-2 text-primary"></i>
                                        {t('scheduleChangeRequest.requestedTime', 'Requested Time')}
                                    </h6>
                                    <div className="row">
                                        <div className="col-md-6">
                                            <label className="form-label">
                                                {t('scheduleChangeRequest.requestedStartTime', 'Start Time')} <span className="text-danger">*</span>
                                            </label>
                                            <input
                                                type="time"
                                                className="form-control"
                                                value={requestedStartTime}
                                                onChange={(e) => setRequestedStartTime(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">
                                                {t('scheduleChangeRequest.requestedEndTime', 'End Time')} <span className="text-danger">*</span>
                                            </label>
                                            <input
                                                type="time"
                                                className="form-control"
                                                value={requestedEndTime}
                                                onChange={(e) => setRequestedEndTime(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Error Display */}
                            {error && (
                                <div className="alert alert-danger" role="alert">
                                    <i className="bi bi-exclamation-triangle me-2"></i>
                                    {error}
                                </div>
                            )}

                            {/* Info Message */}
                            <div className="alert alert-info" role="alert">
                                <i className="bi bi-info-circle me-2"></i>
                                {t('scheduleChangeRequest.infoMessage', 'Your request will be reviewed by coordinators and a helpdesk ticket will be created. You will be notified of any updates.')}
                            </div>

                            {/* Buttons */}
                            <div className="d-flex justify-content-end gap-2">
                                <button 
                                    type="button" 
                                    className="btn btn-secondary"
                                    onClick={handleClose}
                                    disabled={loading}
                                >
                                    <i className="bi bi-x me-2"></i>
                                    {t('common.cancel', 'Cancel')}
                                </button>
                                <button 
                                    type="submit" 
                                    className="btn btn-primary"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                            {t('common.submitting', 'Submitting...')}
                                        </>
                                    ) : (
                                        <>
                                            <i className="bi bi-send me-2"></i>
                                            {t('scheduleChangeRequest.submit', 'Submit Request')}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScheduleChangeRequestModal; 
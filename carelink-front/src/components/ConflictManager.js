import React from 'react';
import { useCareTranslation } from '../hooks/useCareTranslation';
import './ConflictManager.css';

const ConflictManager = ({ 
  isOpen, 
  conflicts, 
  onConfirm, 
  onCancel, 
  schedulingData 
}) => {
  const { schedule, common } = useCareTranslation();

  if (!isOpen || !conflicts) return null;

  const formatTime = (time) => {
    if (!time) return '';
    return typeof time === 'string' ? time : time.toString();
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString();
  };

  const getConflictIcon = (type) => {
    switch (type) {
      case 'provider': return '👩‍⚕️';
      case 'patient': return '👤';
      case 'room': return '🏥';
      default: return '⚠️';
    }
  };

  const getConflictTitle = (type) => {
    switch (type) {
      case 'provider': return schedule('providerConflict');
      case 'patient': return schedule('patientConflict');
      case 'room': return schedule('roomConflict');
      default: return schedule('scheduleConflict');
    }
  };

  return (
    <div className="conflict-manager-overlay">
      <div className="conflict-manager-modal">
        <div className="conflict-header">
          <div className="conflict-title">
            <span className="conflict-icon">⚠️</span>
            <h3>{schedule('conflictDetected')}</h3>
          </div>
          <button 
            className="close-btn"
            onClick={onCancel}
            title={common('close')}
          >
            ×
          </button>
        </div>

        <div className="conflict-content">
          <div className="attempted-schedule">
            <h4>{schedule('attemptedSchedule')}</h4>
            <div className="schedule-details">
              <div className="detail-row">
                <span className="detail-label">{schedule('date')}:</span>
                <span className="detail-value">{formatDate(schedulingData?.date)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">{schedule('time')}:</span>
                <span className="detail-value">
                  {formatTime(schedulingData?.start_time)} - {formatTime(schedulingData?.end_time)}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">{schedule('provider')}:</span>
                <span className="detail-value">{schedulingData?.provider_name}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">{schedule('patient')}:</span>
                <span className="detail-value">{schedulingData?.patient_name}</span>
              </div>
            </div>
          </div>

          <div className="conflicts-list">
            <h4>{schedule('conflictsFound')}</h4>
            {conflicts.map((conflict, index) => (
              <div key={index} className={`conflict-item ${conflict.type}`}>
                <div className="conflict-item-header">
                  <span className="conflict-type-icon">
                    {getConflictIcon(conflict.type)}
                  </span>
                  <span className="conflict-type-title">
                    {getConflictTitle(conflict.type)}
                  </span>
                  <span className="conflict-severity">
                    {conflict.severity === 'high' ? '🔴' : 
                     conflict.severity === 'medium' ? '🟡' : '🟢'}
                  </span>
                </div>
                
                <div className="conflict-details">
                  <p className="conflict-message">{conflict.message}</p>
                  
                  {conflict.existing_appointment && (
                    <div className="existing-appointment">
                      <h5>{schedule('existingAppointment')}</h5>
                      <div className="appointment-info">
                        <div className="info-row">
                          <span>{schedule('time')}:</span>
                          <span>
                            {formatTime(conflict.existing_appointment.start_time)} - 
                            {formatTime(conflict.existing_appointment.end_time)}
                          </span>
                        </div>
                        {conflict.existing_appointment.patient_name && (
                          <div className="info-row">
                            <span>{schedule('patient')}:</span>
                            <span>{conflict.existing_appointment.patient_name}</span>
                          </div>
                        )}
                        {conflict.existing_appointment.provider_name && (
                          <div className="info-row">
                            <span>{schedule('provider')}:</span>
                            <span>{conflict.existing_appointment.provider_name}</span>
                          </div>
                        )}
                        {conflict.existing_appointment.service && (
                          <div className="info-row">
                            <span>{schedule('service')}:</span>
                            <span>{conflict.existing_appointment.service}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {conflict.suggestions && conflict.suggestions.length > 0 && (
                    <div className="conflict-suggestions">
                      <h5>{schedule('suggestions')}</h5>
                      <ul>
                        {conflict.suggestions.map((suggestion, idx) => (
                          <li key={idx}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="conflict-actions">
            <div className="action-explanation">
              <p>{schedule('conflictActionExplanation')}</p>
            </div>
            
            <div className="action-buttons">
              <button 
                className="btn-cancel"
                onClick={onCancel}
              >
                <span className="btn-icon">❌</span>
                {common('cancel')}
              </button>
              
              <button 
                className="btn-modify"
                onClick={() => onCancel('modify')}
              >
                <span className="btn-icon">✏️</span>
                {schedule('modifyTime')}
              </button>
                <button 
                className="btn-force"
                onClick={() => onConfirm(true)} // Pass 'true' to indicate forced schedule
                title={schedule('forceScheduleTooltip')}
              >
                <span className="btn-icon">⚡</span>
                {schedule('forceSchedule')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConflictManager;

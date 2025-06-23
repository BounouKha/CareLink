import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './PatientTimeline.css';

const PatientTimeline = ({ patient, isOpen, onClose }) => {
    const { t, i18n } = useTranslation();
    const [timelineData, setTimelineData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({
        type: 'all', // all, medical, internal, profile, appointment, service
        dateRange: '30', // 7, 30, 90, 365, all
        author: 'all'
    });

    const timelineTypes = [
        { value: 'all', label: t('timeline.filters.all'), icon: '📋', color: '#6c757d' },
        { value: 'medical', label: t('timeline.filters.medical'), icon: '🏥', color: '#dc3545' },
        { value: 'internal', label: t('timeline.filters.internal'), icon: '📝', color: '#ffc107' },
        { value: 'profile', label: t('timeline.filters.profile'), icon: '👤', color: '#17a2b8' },
        { value: 'appointment', label: t('timeline.filters.appointment'), icon: '📅', color: '#28a745' },
        { value: 'service', label: t('timeline.filters.service'), icon: '🔧', color: '#6f42c1' }
    ];useEffect(() => {
        if (isOpen && patient) {
            fetchTimelineData();
        }    }, [isOpen, patient, filters]);    // Helper function to translate timeline entry titles
    const getTranslatedTitle = (entry) => {
        if (entry.title_key) {
            // Handle interpolation for dynamic titles
            switch (entry.title_key) {
                case 'timeline.appointment.title':
                    const provider = entry.details?.provider || t('timeline.common.unknownProvider');
                    return t(entry.title_key, { provider });
                case 'timeline.service.title':
                case 'timeline.service.reviewed':
                case 'timeline.service.completed':
                    const title = entry.details?.title || 'Service';
                    return t(entry.title_key, { title });
                default:
                    return t(entry.title_key);
            }
        }
        return entry.title; // fallback to original title
    };    // Helper function to translate timeline entry descriptions
    const getTranslatedDescription = (entry) => {
        if (entry.description_key) {
            switch (entry.description_key) {
                case 'timeline.appointment.scheduledFor':
                    const date = entry.details?.date || new Date(entry.details?.schedule_date).toLocaleDateString();
                    const time = entry.details?.time || '';
                    return t(entry.description_key, { date, time });
                default:
                    return t(entry.description_key);
            }
        }
        return entry.description; // fallback to original description
    };

    const fetchTimelineData = async () => {
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found');
            }

            const params = new URLSearchParams({
                ...(filters.type !== 'all' && { type: filters.type }),
                ...(filters.dateRange !== 'all' && { days: filters.dateRange }),
                ...(filters.author !== 'all' && { author: filters.author })
            });

            const response = await fetch(
                `http://localhost:8000/account/patient/${patient.id}/timeline/?${params}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch timeline: ${response.status}`);
            }

            const data = await response.json();
            if (data.status === 'success') {
                setTimelineData(data.timeline || []);
            } else {
                throw new Error(data.message || 'Failed to fetch timeline');
            }
        } catch (err) {
            setError(err.message);
            console.error('Timeline fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        
        // Compare dates properly by getting the start of each day
        const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const nowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        const diffTime = Math.abs(nowStart - dateStart);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        console.log(`[DEBUG] formatDate: dateString=${dateString}, date=${date}, now=${now}, diffDays=${diffDays}`);
        
        if (diffDays === 0) return t('timeline.time.today');
        if (diffDays === 1) return t('timeline.time.yesterday');
        if (diffDays <= 7) return t('timeline.time.daysAgo', { count: diffDays });
        
        // Use current language for date formatting
        const locale = i18n.language || 'en';
        return date.toLocaleDateString(locale, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getTypeConfig = (type) => {
        return timelineTypes.find(t => t.value === type) || timelineTypes[0];
    };

    const renderTimelineEntry = (entry) => {
        const typeConfig = getTypeConfig(entry.type);
        
        return (
            <div key={`${entry.type}-${entry.id}-${entry.timestamp}`} className="timeline-entry">
                <div className="timeline-marker" style={{ backgroundColor: typeConfig.color }}>
                    <span className="timeline-icon">{typeConfig.icon}</span>
                </div>
                
                <div className="timeline-content">
                    <div className="timeline-header">
                        <div className="timeline-title">                            <h6 className="mb-1">{getTranslatedTitle(entry)}</h6>
                            <span className="timeline-type-badge" style={{ backgroundColor: typeConfig.color }}>
                                {typeConfig.label}
                            </span>
                        </div>
                        <div className="timeline-meta">
                            <small className="text-muted">
                                {formatDate(entry.timestamp)}
                            </small>
                            {entry.author && (
                                <small className="text-muted ms-2">
                                    {t('timeline.common.by')} {entry.author.name} ({entry.author.role})
                                </small>
                            )}
                        </div>
                    </div>
                      {(entry.description || entry.description_key) && (
                        <p className="timeline-description mb-2">{getTranslatedDescription(entry)}</p>
                    )}
                    
                    {entry.details && Object.keys(entry.details).length > 0 && (
                        <div className="timeline-details">
                            {entry.type === 'medical' && (
                                <div className="medical-details">
                                    {entry.details.diagnosis && <div><strong>Diagnosis:</strong> {entry.details.diagnosis}</div>}
                                    {entry.details.treatment && <div><strong>Treatment:</strong> {entry.details.treatment}</div>}
                                    {entry.details.medication && <div><strong>Medication:</strong> {entry.details.medication}</div>}
                                </div>
                            )}
                            
                            {entry.type === 'profile' && (
                                <div className="profile-changes">
                                    {entry.details.changes && entry.details.changes.map((change, index) => (
                                        <div key={index} className="change-item">
                                            <strong>{change.field}:</strong> {change.old_value} → {change.new_value}
                                        </div>
                                    ))}
                                </div>
                            )}
                              {entry.type === 'appointment' && (
                                <div className="appointment-details">
                                    {entry.details.date && <div><strong>{t('timeline.common.date')}:</strong> {entry.details.date}</div>}
                                    {entry.details.status && <div><strong>{t('common.status')}:</strong> {entry.details.status}</div>}
                                    {entry.details.service && <div><strong>{t('timeline.common.service')}:</strong> {entry.details.service}</div>}
                                </div>
                            )}
                        </div>
                    )}
                      {entry.importance === 'high' && (
                        <div className="importance-indicator high">
                            <i className="fas fa-exclamation-circle"></i> {t('timeline.common.highPriority')}
                        </div>
                    )}</div>
            </div>
        );
    };

    return (        <>
            {/* Modal backdrop */}
            <div className="patient-timeline-backdrop" onClick={onClose}></div>
            
            {/* Modal */}
            <div className="patient-timeline-modal">
                <div className="patient-timeline-dialog">
                    <div className="patient-timeline-content">
                        <div className="patient-timeline-header">                            <h5 className="modal-title mb-0">
                                <i className="fas fa-clock me-2"></i>
                                {t('timeline.title')} - {patient?.firstname || t('timeline.common.unknown')} {patient?.lastname || t('patients.patient')}
                            </h5>
                            <button type="button" className="btn-close" onClick={onClose}></button>                        </div>
                        
                        <div className="patient-timeline-body">
                            {/* Filters */}
                        <div className="timeline-filters border-bottom p-3">
                            <div className="row g-3">                                <div className="col-md-4">
                                    <label className="form-label small">{t('common.type')}</label>
                                    <select 
                                        className="form-select form-select-sm"
                                        value={filters.type}
                                        onChange={(e) => handleFilterChange('type', e.target.value)}
                                    >
                                        {timelineTypes.map(type => (
                                            <option key={type.value} value={type.value}>
                                                {type.icon} {type.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div className="col-md-4">
                                    <label className="form-label small">{t('timeline.filters.dateRange')}</label>
                                    <select 
                                        className="form-select form-select-sm"
                                        value={filters.dateRange}
                                        onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                                    >
                                        <option value="7">{t('timeline.filters.lastDays', { days: 7 })}</option>
                                        <option value="30">{t('timeline.filters.lastDays', { days: 30 })}</option>
                                        <option value="90">{t('timeline.filters.lastDays', { days: 90 })}</option>
                                        <option value="365">{t('timeline.filters.lastDays', { days: 365 })}</option>
                                        <option value="all">{t('timeline.filters.allTime')}</option>
                                    </select>
                                </div>
                                
                                <div className="col-md-4">
                                    <label className="form-label small">{t('common.actions')}</label>
                                    <div className="d-flex gap-2">                                        <button 
                                            className="btn btn-outline-primary btn-sm"
                                            onClick={fetchTimelineData}
                                            disabled={loading}
                                        >
                                            <i className="fas fa-sync-alt me-1"></i>
                                            {t('common.refresh')}
                                        </button>
                                        <button className="btn btn-outline-secondary btn-sm">
                                            <i className="fas fa-download me-1"></i>
                                            {t('common.export')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Timeline Content */}
                        <div className="timeline-container p-4">
                            {loading && (                                <div className="text-center py-5">
                                    <div className="spinner-border text-primary" role="status">
                                        <span className="visually-hidden">{t('timeline.loading')}</span>
                                    </div>
                                    <p className="mt-2 text-muted">{t('timeline.loading')}</p>
                                </div>
                            )}
                            
                            {error && (
                                <div className="alert alert-danger">
                                    <i className="fas fa-exclamation-triangle me-2"></i>
                                    {error}
                                </div>
                            )}
                            
                            {!loading && !error && timelineData.length === 0 && (
                                <div className="text-center py-5">
                                    <i className="fas fa-clock text-muted" style={{ fontSize: '3rem' }}></i>
                                    <h5 className="mt-3 text-muted">{t('timeline.noData')}</h5>
                                    <p className="text-muted">{t('timeline.noActivities')}</p>
                                </div>
                            )}
                            
                            {!loading && !error && timelineData.length > 0 && (
                                <div className="timeline">
                                    {timelineData.map(renderTimelineEntry)}
                                </div>
                            )}
                        </div>                        </div>
                        
                        <div className="patient-timeline-footer">                            <div className="timeline-summary">
                                <small className="text-muted">
                                    {t('common.showing')} {timelineData.length} {t('timeline.filters.all').toLowerCase()}
                                    {filters.type !== 'all' && ` • ${getTypeConfig(filters.type).label}`}
                                    {filters.dateRange !== 'all' && ` • ${t('timeline.filters.lastDays', { days: filters.dateRange })}`}
                                </small>
                            </div>
                            <button type="button" className="btn btn-secondary" onClick={onClose}>
                                {t('common.close')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default PatientTimeline;

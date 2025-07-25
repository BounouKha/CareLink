import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { apiCall } from '../../utils/tokenManager';
import './ProviderForm.css';

const ProviderForm = ({ provider, onSave, onCancel }) => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        user_id: '',
        service_id: '',
        is_internal: true
    });
    const [availableUsers, setAvailableUsers] = useState([]);
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        fetchAvailableUsers();
        fetchServices();
        
        if (provider) {
            setFormData({
                user_id: provider.user?.id || '',                service_id: provider.service?.id || '',
                is_internal: provider.is_internal
            });
        }
    }, [provider]);

    const fetchAvailableUsers = async () => {
        try {
            const response = await apiCall('/account/providers/available-users/');
            setAvailableUsers(response);
        } catch (err) {
            console.error('Error fetching available users:', err);
        }
    };

    const fetchServices = async () => {
        try {
            const response = await apiCall('/account/services/');
            setServices(response);
        } catch (err) {
            console.error('Error fetching services:', err);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: null
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.user_id) {
            newErrors.user_id = t('providers.error.user_required');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        setLoading(true);
        try {
            const payload = {
                ...formData,
                service_id: formData.service_id || null
            };

            let response;            if (provider) {
                // Update existing provider
                response = await apiCall(`/account/providers/${provider.id}/`, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });
            } else {
                // Create new provider
                response = await apiCall('/account/providers/', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
            }

            onSave();
        } catch (err) {
            console.error('Error saving provider:', err);
            if (err.response?.data) {
                const serverErrors = {};
                Object.keys(err.response.data).forEach(key => {
                    serverErrors[key] = Array.isArray(err.response.data[key]) 
                        ? err.response.data[key][0] 
                        : err.response.data[key];
                });
                setErrors(serverErrors);
            } else {
                setErrors({ general: t('providers.error.save_failed') });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="provider-form-modal">
                <div className="form-header">
                    <h2>
                        {provider ? t('providers.edit_provider') : t('providers.create_provider')}
                    </h2>
                    <button onClick={onCancel} className="close-btn">
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="provider-form">
                    {errors.general && (
                        <div className="error-message general-error">
                            {errors.general}
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="user_id" className="form-label">
                            {t('providers.user')} <span className="required">*</span>
                        </label>
                        <select
                            id="user_id"
                            name="user_id"
                            value={formData.user_id}
                            onChange={handleChange}
                            className={`form-select ${errors.user_id ? 'error' : ''}`}
                            disabled={provider} // Don't allow changing user for existing provider
                        >
                            <option value="">{t('providers.select_user')}</option>
                            {provider && provider.user && (
                                <option value={provider.user.id}>
                                    {provider.user.firstname} {provider.user.lastname} ({provider.user.email})
                                </option>
                            )}
                            {!provider && availableUsers.map(user => (
                                <option key={user.id} value={user.id}>
                                    {user.firstname} {user.lastname} ({user.email})
                                </option>
                            ))}
                        </select>
                        {errors.user_id && (
                            <span className="error-text">{errors.user_id}</span>
                        )}
                    </div>

                    <div className="form-group">
                        <label htmlFor="service_id" className="form-label">
                            {t('providers.primary_service')}
                        </label>
                        <select
                            id="service_id"
                            name="service_id"
                            value={formData.service_id}
                            onChange={handleChange}
                            className={`form-select ${errors.service_id ? 'error' : ''}`}
                        >
                            <option value="">{t('providers.no_service')}</option>
                            {services.map(service => (
                                <option key={service.id} value={service.id}>
                                    {service.name} - {service.description}
                                </option>
                            ))}
                        </select>
                        {errors.service_id && (
                            <span className="error-text">{errors.service_id}</span>
                        )}
                    </div>

                    <div className="form-group">
                        <div className="checkbox-group">
                            <input
                                type="checkbox"
                                id="is_internal"
                                name="is_internal"
                                checked={formData.is_internal}
                                onChange={handleChange}
                                className="checkbox-input"
                            />
                            <label htmlFor="is_internal" className="checkbox-label">
                                {t('providers.is_internal')}
                            </label>
                        </div>
                        <small className="form-help">
                            {t('providers.is_internal_help')}
                        </small>
                    </div>

                    <div className="form-actions">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="cancel-btn"
                            disabled={loading}
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="submit"
                            className="save-btn"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <div className="btn-spinner"></div>
                                    {t('common.saving')}
                                </>
                            ) : (
                                provider ? t('common.update') : t('common.create')
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProviderForm;

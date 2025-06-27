import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthenticatedApi } from '../../hooks/useAuth';
// import './ContractForm.css'; // Removed because file does not exist

const CONTRACT_TYPE_OPTIONS = [
    { value: 'CDI', label: 'CDI' },
    { value: 'CDD', label: 'CDD' },
    { value: 'CDR', label: 'CDR' },
    { value: 'Intérim', label: 'Intérim' },
    { value: 'Bénévole', label: 'Bénévole' },
    { value: 'Autre', label: 'Autre' },
];
const STATUS_OPTIONS = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'suspended', label: 'Suspended' },
    { value: 'terminated', label: 'Terminated' },
    { value: 'pending', label: 'Pending' },
];

const ContractForm = ({ contract, provider, onSave, onCancel }) => {
    const { t } = useTranslation();
    const { get, post, put } = useAuthenticatedApi();
    const [formData, setFormData] = useState({
        salary: '',
        hour_quantity: '',
        type_contract: 'CDI',
        service_id: '',
        user_id: '',
        contract_reference: '',
        department: '',
        end_date: '',
        hourly_rate: '',
        notes: '',
        start_date: '',
        status: 'pending',
        weekly_hours: '',
    });
    const [users, setUsers] = useState([]);
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    // Determine if we are editing
    const isEdit = !!contract;

    console.log('[ContractForm] Rendered. isEdit:', isEdit);

    useEffect(() => {
        console.log('ContractForm debug - contract prop:', contract); // Debug log
        console.log('ContractForm debug - provider prop:', provider); // Debug log
        if (!isEdit) {
            fetchUsers();
            fetchServices();
        }
        if (contract) {
            console.log('[ContractForm] Setting formData from contract:', contract);
            setFormData({
                salary: contract.salary || '',
                hour_quantity: contract.hour_quantity || '',
                type_contract: contract.type_contract || 'CDI',
                contract_reference: contract.contract_reference || '',
                department: contract.department || '',
                end_date: contract.end_date || '',
                hourly_rate: contract.hourly_rate || '',
                notes: contract.notes || '',
                start_date: contract.start_date || '',
                status: contract.status || 'pending',
                weekly_hours: contract.weekly_hours || '',
                user: contract.user || '', // Use contract.user (ID)
                service: contract.service || '', // Use contract.service (ID)
            });
        } else if (provider) {
            setFormData(prev => ({
                ...prev,
                user: provider.user?.id || '',
            }));
        }
    }, [contract, provider, isEdit]);

    const fetchUsers = async () => {
        try {
            const response = await get('/account/providers/available-users/');
            console.log('[ContractForm] Users fetched:', response);
            const providerResponse = await get('/account/providers/');
            console.log('[ContractForm] Providers fetched:', providerResponse);
            const allUsers = [...response];
            if (providerResponse.results) {
                providerResponse.results.forEach(prov => {
                    if (prov.user && !allUsers.find(u => u.id === prov.user.id)) {
                        allUsers.push({
                            id: prov.user.id,
                            firstname: prov.user.firstname,
                            lastname: prov.user.lastname,
                            email: prov.user.email,
                            full_name: `${prov.user.firstname} ${prov.user.lastname}`
                        });
                    }
                });
            }
            // Ensure all users have full_name, firstname, and lastname
            allUsers.forEach(u => {
                if (!u.full_name && u.firstname && u.lastname) {
                    u.full_name = `${u.firstname} ${u.lastname}`;
                }
                if (!u.firstname && u.full_name) {
                    const parts = u.full_name.split(' ');
                    u.firstname = parts[0];
                    u.lastname = parts.slice(1).join(' ');
                }
            });
            setUsers(allUsers);
        } catch (err) {
            console.error('[ContractForm] Error fetching users:', err);
        }
    };
    const fetchServices = async () => {
        try {
            const response = await get('/account/services/');
            console.log('[ContractForm] Services fetched:', response);
            setServices(response);
        } catch (err) {
            console.error('[ContractForm] Error fetching services:', err);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: null
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};
        
        // In edit mode, user and service are already set and displayed as plain text
        if (!isEdit) {
            if (!formData.user) newErrors.user_id = t('contracts.error.user_required');
            if (!formData.service) newErrors.service_id = t('contracts.error.service_required');
        }
        
        if (!formData.salary || formData.salary <= 0) newErrors.salary = t('contracts.error.salary_required');
        if (!formData.hour_quantity || formData.hour_quantity <= 0) newErrors.hour_quantity = t('contracts.error.hours_required');
        if (!formData.type_contract) newErrors.type_contract = t('contracts.error.type_required');
        if (formData.start_date && formData.end_date && formData.start_date >= formData.end_date) newErrors.end_date = t('contracts.error.end_date_invalid');
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log('[ContractForm] handleSubmit called');
        if (!validateForm()) return;
        setLoading(true);
        try {
            // Build payload with correct user and service IDs
            const payload = {
                ...formData,
                user: formData.user, // This should be the user ID
                service: formData.service, // This should be the service ID
            };
            
            // Remove any _id fields from payload
            delete payload.user_id;
            delete payload.service_id;
            
            console.log('[ContractForm] Contract data being used:', contract);
            console.log('[ContractForm] FormData:', formData);
            console.log('[ContractForm] Final payload:', payload);
            
            if (isEdit) {
                await put(`http://localhost:8000/account/contracts/${contract.id}/`, payload);
            } else {
                await post('http://localhost:8000/account/contracts/', payload);
            }
            if (onSave) onSave();
        } catch (err) {
            console.error('[ContractForm] Error saving contract:', err);
            setErrors(prev => ({ ...prev, general: err.message || 'Failed to save contract.' }));
        } finally {
            setLoading(false);
        }
    };

    // Helper to get provider name/email for display
    const getProviderDisplay = () => {
        // Use provider.user if available (from /account/providers/<id>/)
        if (provider && provider.user && provider.user.firstname) {
            return `${provider.user.firstname} ${provider.user.lastname} (${provider.user.email})`;
        }
        // Try contract.user (object)
        if (isEdit && contract && contract.user && contract.user.firstname) {
            return `${contract.user.firstname} ${contract.user.lastname} (${contract.user.email})`;
        }
        // Fallback: look up in users array by user_id
        const userId = contract?.user || formData.user;
        const user = users.find(u => String(u.id) === String(userId));
        if (user) {
            return `${user.firstname} ${user.lastname} (${user.email})`;
        }
        return '';
    };

    // Helper to get service name for display
    const getServiceDisplay = () => {
        // Use provider.service if available (from /account/providers/<id>/)
        if (provider && provider.service && provider.service.name) {
            return provider.service.name;
        }
        // Try contract.service (object)
        if (isEdit && contract && contract.service && contract.service.name) {
            return contract.service.name;
        }
        // Fallback: look up in services array by service_id
        const serviceId = contract?.service || formData.service;
        const service = services.find(s => String(s.id) === String(serviceId));
        if (service) {
            return service.name;
        }
        return '';
    };

    return (
        <div className="contract-edit-form-container" style={{ background: '#fff', padding: 24, borderRadius: 8 }}>
            <div className="form-header">
                <h2>
                    {contract ? t('contracts.edit_contract') : t('contracts.create_contract')}
                </h2>
                <button onClick={onCancel} className="close-btn">
                    <i className="fas fa-times"></i>
                </button>
            </div>

            <form onSubmit={handleSubmit} className="contract-form">
                {errors.general && (
                    <div className="error-message general-error">
                        {errors.general}
                    </div>
                )}

                <div className="form-grid">
                    {/* Basic Information */}
                    <div className="form-section">
                        <h3>{t('contracts.basic_info')}</h3>
                        
                        <div className="form-group">
                            <label htmlFor="user_id" className="form-label">
                                {t('contracts.provider')} <span className="required">*</span>
                            </label>
                            {isEdit ? (
                                <div style={{ padding: '8px 0', fontWeight: 500 }}>{getProviderDisplay()}</div>
                            ) : (
                                <select
                                    id="user_id"
                                    name="user_id"
                                    value={formData.user_id}
                                    onChange={handleChange}
                                    className={`form-select ${errors.user_id ? 'error' : ''}`}
                                >
                                    <option value="">{t('contracts.select_provider')}</option>
                                    {users.map(user => (
                                        <option key={user.id} value={user.id}>
                                            {user.full_name} ({user.email})
                                        </option>
                                    ))}
                                </select>
                            )}
                            {errors.user_id && <span className="error-text">{errors.user_id}</span>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="service_id" className="form-label">
                                {t('contracts.service')}
                            </label>
                            {isEdit ? (
                                <div style={{ padding: '8px 0', fontWeight: 500 }}>{getServiceDisplay()}</div>
                            ) : (
                                <select
                                    id="service_id"
                                    name="service_id"
                                    value={String(formData.service_id || '')}
                                    onChange={handleChange}
                                    className="form-select"
                                >
                                    <option value="">{t('contracts.selectService')}</option>
                                    {services.map(service => (
                                        <option key={service.id} value={String(service.id)}>
                                            {service.name}
                                        </option>
                                    ))}
                                </select>
                            )}
                            {errors.service_id && <div className="form-error">{errors.service_id}</div>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="type_contract" className="form-label">
                                {t('contracts.type')} <span className="required">*</span>
                            </label>
                            <select
                                id="type_contract"
                                name="type_contract"
                                value={formData.type_contract}
                                onChange={handleChange}
                                className={`form-select ${errors.type_contract ? 'error' : ''}`}
                            >
                                {CONTRACT_TYPE_OPTIONS.map(type => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </select>
                            {errors.type_contract && <span className="error-text">{errors.type_contract}</span>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="status" className="form-label">
                                {t('contracts.status')}
                            </label>
                            <select
                                id="status"
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="form-select"
                            >
                                {STATUS_OPTIONS.map(status => (
                                    <option key={status.value} value={status.value}>
                                        {status.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Financial Information */}
                    <div className="form-section">
                        <h3>{t('contracts.financial_info')}</h3>
                        
                        <div className="form-group">
                            <label htmlFor="salary" className="form-label">
                                {t('contracts.salary')} (€) <span className="required">*</span>
                            </label>
                            <input
                                type="number"
                                id="salary"
                                name="salary"
                                value={formData.salary}
                                onChange={handleChange}
                                className={`form-input ${errors.salary ? 'error' : ''}`}
                                min="0"
                                step="1"
                            />
                            {errors.salary && <span className="error-text">{errors.salary}</span>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="hourly_rate" className="form-label">
                                {t('contracts.hourly_rate')} (€)
                            </label>
                            <input
                                type="number"
                                id="hourly_rate"
                                name="hourly_rate"
                                value={formData.hourly_rate}
                                onChange={handleChange}
                                className="form-input"
                                min="0"
                                step="0.01"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="hour_quantity" className="form-label">
                                {t('contracts.total_hours')} <span className="required">*</span>
                            </label>
                            <input
                                type="number"
                                id="hour_quantity"
                                name="hour_quantity"
                                value={formData.hour_quantity}
                                onChange={handleChange}
                                className={`form-input ${errors.hour_quantity ? 'error' : ''}`}
                                min="0"
                            />
                            {errors.hour_quantity && <span className="error-text">{errors.hour_quantity}</span>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="weekly_hours" className="form-label">
                                {t('contracts.weekly_hours')}
                            </label>
                            <input
                                type="number"
                                id="weekly_hours"
                                name="weekly_hours"
                                value={formData.weekly_hours}
                                onChange={handleChange}
                                className="form-input"
                                min="0"
                                max="168"
                            />
                        </div>
                    </div>

                    {/* Contract Details */}
                    <div className="form-section">
                        <h3>{t('contracts.contract_details')}</h3>
                        
                        <div className="form-group">
                            <label htmlFor="contract_reference" className="form-label">
                                {t('contracts.reference')}
                            </label>
                            <input
                                type="text"
                                id="contract_reference"
                                name="contract_reference"
                                value={formData.contract_reference}
                                onChange={handleChange}
                                className={`form-input ${errors.contract_reference ? 'error' : ''}`}
                            />
                            {errors.contract_reference && <span className="error-text">{errors.contract_reference}</span>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="start_date" className="form-label">
                                {t('contracts.start_date')}
                            </label>
                            <input
                                type="date"
                                id="start_date"
                                name="start_date"
                                value={formData.start_date}
                                onChange={handleChange}
                                className="form-input"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="end_date" className="form-label">
                                {t('contracts.end_date')}
                            </label>
                            <input
                                type="date"
                                id="end_date"
                                name="end_date"
                                value={formData.end_date}
                                onChange={handleChange}
                                className={`form-input ${errors.end_date ? 'error' : ''}`}
                            />
                            {errors.end_date && <span className="error-text">{errors.end_date}</span>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="department" className="form-label">
                                {t('contracts.department')}
                            </label>
                            <input
                                type="text"
                                id="department"
                                name="department"
                                value={formData.department}
                                onChange={handleChange}
                                className="form-input"
                            />
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="form-section full-width">
                        <h3>{t('contracts.notes')}</h3>
                        <div className="form-group">
                            <label htmlFor="notes" className="form-label">
                                {t('contracts.additional_notes')}
                            </label>
                            <textarea
                                id="notes"
                                name="notes"
                                value={formData.notes}
                                onChange={handleChange}
                                className="form-textarea"
                                rows="4"
                                placeholder={t('contracts.notes_placeholder')}
                            />
                        </div>
                    </div>
                </div>

                {/* Form actions */}
                <div className="contract-form-actions">
                    {isEdit ? (
                        <>
                            <button
                                type="button"
                                className="btn-secondary contract-cancel-btn"
                                onClick={onCancel}
                                disabled={loading}
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                type="submit"
                                className="btn-primary contract-update-btn"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <div className="btn-spinner"></div>
                                        {t('common.saving')}
                                    </>
                                ) : (
                                    t('common.update')
                                )}
                            </button>
                        </>
                    ) : (
                        <button
                            type="submit"
                            className="btn-primary contract-create-btn"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <div className="btn-spinner"></div>
                                    {t('common.creating')}
                                </>
                            ) : (
                                t('common.create')
                            )}
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
};

export default ContractForm;

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { apiCall } from '../../utils/tokenManager';
import './ContractForm.css';

const ContractForm = ({ contract, provider, onSave, onCancel }) => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        user_id: '',
        service_id: '',
        salary: '',
        hour_quantity: '',
        type_contract: 'CDI',
        start_date: '',
        end_date: '',
        contract_reference: '',
        hourly_rate: '',
        weekly_hours: '',
        department: '',
        supervisor_id: '',
        status: 'pending',
        notes: ''
    });
    const [users, setUsers] = useState([]);
    const [services, setServices] = useState([]);
    const [supervisors, setSupervisors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        fetchUsers();
        fetchServices();
        fetchSupervisors();
        
        if (contract) {
            setFormData({
                user_id: contract.user?.id || '',
                service_id: contract.service?.id || '',
                salary: contract.salary || '',
                hour_quantity: contract.hour_quantity || '',
                type_contract: contract.type_contract || 'CDI',
                start_date: contract.start_date || '',
                end_date: contract.end_date || '',
                contract_reference: contract.contract_reference || '',
                hourly_rate: contract.hourly_rate || '',
                weekly_hours: contract.weekly_hours || '',
                department: contract.department || '',
                supervisor_id: contract.supervisor?.id || '',
                status: contract.status || 'pending',
                notes: contract.notes || ''
            });
        } else if (provider) {
            // Pre-fill with provider info for new contracts
            setFormData(prev => ({
                ...prev,
                user_id: provider.user?.id || ''
            }));
        }
    }, [contract, provider]);    const fetchUsers = async () => {
        try {
            const response = await apiCall('/account/providers/available-users/');
            // Also include existing provider users
            const providerResponse = await apiCall('/account/providers/');
            const allUsers = [...response];
            
            // Add existing provider users if not already included
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
            
            setUsers(allUsers);
        } catch (err) {
            console.error('Error fetching users:', err);
        }
    };    const fetchServices = async () => {
        try {
            const response = await apiCall('/account/services/');
            setServices(response);
        } catch (err) {
            console.error('Error fetching services:', err);
        }
    };

    const fetchSupervisors = async () => {
        try {
            // Fetch users who can be supervisors (Coordinators, Administrators, Administrative)
            const response = await apiCall('/account/users/');
            const supervisorUsers = response.filter(user => 
                ['Coordinator', 'Administrator', 'Administrative'].includes(user.role)
            );
            setSupervisors(supervisorUsers);
        } catch (err) {
            console.error('Error fetching supervisors:', err);
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
            newErrors.user_id = t('contracts.error.user_required');
        }

        if (!formData.salary || formData.salary <= 0) {
            newErrors.salary = t('contracts.error.salary_required');
        }

        if (!formData.hour_quantity || formData.hour_quantity <= 0) {
            newErrors.hour_quantity = t('contracts.error.hours_required');
        }

        if (!formData.type_contract) {
            newErrors.type_contract = t('contracts.error.type_required');
        }

        if (formData.start_date && formData.end_date && formData.start_date >= formData.end_date) {
            newErrors.end_date = t('contracts.error.end_date_invalid');
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
                salary: parseInt(formData.salary),
                hour_quantity: parseInt(formData.hour_quantity),
                hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
                weekly_hours: formData.weekly_hours ? parseInt(formData.weekly_hours) : null,
                service_id: formData.service_id || null,
                supervisor_id: formData.supervisor_id || null,
                start_date: formData.start_date || null,
                end_date: formData.end_date || null
            };            let response;
            if (contract) {
                // Update existing contract
                response = await apiCall(`/account/contracts/${contract.id}/`, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });
            } else {
                // Create new contract
                response = await apiCall('/account/contracts/', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
            }

            onSave();
        } catch (err) {
            console.error('Error saving contract:', err);
            if (err.response?.data) {
                const serverErrors = {};
                Object.keys(err.response.data).forEach(key => {
                    serverErrors[key] = Array.isArray(err.response.data[key]) 
                        ? err.response.data[key][0] 
                        : err.response.data[key];
                });
                setErrors(serverErrors);
            } else {
                setErrors({ general: t('contracts.error.save_failed') });
            }
        } finally {
            setLoading(false);
        }
    };

    const contractTypes = [
        { value: 'CDI', label: 'CDI' },
        { value: 'CDD', label: 'CDD' },
        { value: 'CDR', label: 'CDR' },
        { value: 'Intérim', label: 'Intérim' },
        { value: 'Bénévole', label: 'Bénévole' },
        { value: 'Autre', label: 'Autre' }
    ];

    const statusOptions = [
        { value: 'pending', label: t('contracts.status.pending') },
        { value: 'active', label: t('contracts.status.active') },
        { value: 'inactive', label: t('contracts.status.inactive') },
        { value: 'suspended', label: t('contracts.status.suspended') },
        { value: 'terminated', label: t('contracts.status.terminated') }
    ];

    return (
        <div className="modal-overlay">
            <div className="contract-form-modal">
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
                                <select
                                    id="user_id"
                                    name="user_id"
                                    value={formData.user_id}
                                    onChange={handleChange}
                                    className={`form-select ${errors.user_id ? 'error' : ''}`}
                                    disabled={contract} // Don't allow changing user for existing contract
                                >
                                    <option value="">{t('contracts.select_provider')}</option>
                                    {users.map(user => (
                                        <option key={user.id} value={user.id}>
                                            {user.full_name} ({user.email})
                                        </option>
                                    ))}
                                </select>
                                {errors.user_id && <span className="error-text">{errors.user_id}</span>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="service_id" className="form-label">
                                    {t('contracts.service')}
                                </label>
                                <select
                                    id="service_id"
                                    name="service_id"
                                    value={formData.service_id}
                                    onChange={handleChange}
                                    className="form-select"
                                >
                                    <option value="">{t('contracts.no_service')}</option>
                                    {services.map(service => (
                                        <option key={service.id} value={service.id}>
                                            {service.name}
                                        </option>
                                    ))}
                                </select>
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
                                    {contractTypes.map(type => (
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
                                    {statusOptions.map(status => (
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

                            <div className="form-group">
                                <label htmlFor="supervisor_id" className="form-label">
                                    {t('contracts.supervisor')}
                                </label>
                                <select
                                    id="supervisor_id"
                                    name="supervisor_id"
                                    value={formData.supervisor_id}
                                    onChange={handleChange}
                                    className="form-select"
                                >
                                    <option value="">{t('contracts.no_supervisor')}</option>
                                    {supervisors.map(supervisor => (
                                        <option key={supervisor.id} value={supervisor.id}>
                                            {supervisor.firstname} {supervisor.lastname} ({supervisor.role})
                                        </option>
                                    ))}
                                </select>
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
                                contract ? t('common.update') : t('common.create')
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ContractForm;

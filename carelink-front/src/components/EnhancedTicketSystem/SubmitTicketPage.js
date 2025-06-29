import React, { useState, useEffect, useContext } from 'react';
import { useCareTranslation } from '../../hooks/useCareTranslation';
import BaseLayout from '../../auth/layout/BaseLayout';
import { AdminContext } from '../../auth/login/AdminContext';
import './TicketDashboard.css';

const SubmitTicketPage = () => {
    const { t } = useCareTranslation();
    const { userData } = useContext(AdminContext);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: '',
        priority: 'Medium',
        assigned_team: ''
    });
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [categories, setCategories] = useState([]);
    const [priorities, setPriorities] = useState([]);
    const [teams, setTeams] = useState([]);
    const [success, setSuccess] = useState(false);

    // Get user role from userData
    const userRole = userData?.user?.role;

    console.log('[SubmitTicketPage] userData from AdminContext:', userData);
    console.log('[SubmitTicketPage] user role:', userRole);

    useEffect(() => {
        fetchOptions();
    }, []);

    const fetchOptions = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) return;

            const [categoriesRes, prioritiesRes, teamsRes] = await Promise.all([
                fetch('http://localhost:8000/account/enhanced-tickets/categories/', {
                    headers: { 'Authorization': `Bearer ${token}` },
                }),
                fetch('http://localhost:8000/account/enhanced-tickets/priorities/', {
                    headers: { 'Authorization': `Bearer ${token}` },
                }),
                fetch('http://localhost:8000/account/enhanced-tickets/teams/', {
                    headers: { 'Authorization': `Bearer ${token}` },
                }),
            ]);

            if (categoriesRes.ok) {
                const categoriesData = await categoriesRes.json();
                setCategories(categoriesData);
            }

            if (prioritiesRes.ok) {
                const prioritiesData = await prioritiesRes.json();
                setPriorities(prioritiesData);
            }

            if (teamsRes.ok) {
                const teamsData = await teamsRes.json();
                setTeams(teamsData);
            }
        } catch (err) {
            console.error('Error fetching options:', err);
        }
    };

    // Filter teams based on user role
    const getFilteredTeams = () => {
        if (userRole === 'Coordinator') {
            // Coordinators can submit tickets to Administrator, Technical, Billing, Support teams
            return teams.filter(team => 
                ['Administrator', 'Technical', 'Billing', 'Support'].includes(team.value)
            );
        } else if (userRole === 'Administrator' || userRole === 'Administrative') {
            // Administrators can submit tickets to Coordinator, Technical, Billing, Support teams
            return teams.filter(team => 
                ['Coordinator', 'Technical', 'Billing', 'Support'].includes(team.value)
            );
        }
        return teams; // Show all teams for superusers/staff
    };

    const filteredTeams = getFilteredTeams();

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
        
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: ''
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};
        
        if (!formData.title.trim()) {
            newErrors.title = 'Title is required';
        }
        
        if (!formData.description.trim()) {
            newErrors.description = 'Description is required';
        }
        
        if (!formData.category) {
            newErrors.category = 'Category is required';
        }
        
        if (!formData.assigned_team) {
            newErrors.assigned_team = 'Team assignment is required';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }
        
        setSubmitting(true);
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found');
            }

            const response = await fetch('http://localhost:8000/account/enhanced-tickets/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                throw new Error('Failed to create ticket');
            }

            const newTicket = await response.json();
            console.log('Ticket created successfully:', newTicket);
            
            setSuccess(true);
            setFormData({ title: '', description: '', category: '', priority: 'Medium', assigned_team: '' });
            
            // Reset success message after 3 seconds
            setTimeout(() => setSuccess(false), 3000);
        } catch (error) {
            console.error('Error creating ticket:', error);
            setErrors({ submit: error.message });
        } finally {
            setSubmitting(false);
        }
    };

    const handleReset = () => {
        setFormData({ title: '', description: '', category: '', priority: 'Medium', assigned_team: '' });
        setErrors({});
        setSuccess(false);
    };

    const getRoleBadgeClass = (role) => {
        switch (role) {
            case 'Coordinator': return 'badge bg-success';
            case 'Administrator': 
            case 'Administrative': return 'badge bg-danger';
            default: return 'badge bg-light text-dark';
        }
    };

    const getRoleIcon = (role) => {
        switch (role) {
            case 'Coordinator': return 'fa-user-tie';
            case 'Administrator': 
            case 'Administrative': return 'fa-user-shield';
            default: return 'fa-user';
        }
    };

    return (
        <BaseLayout>
            <div className="submit-ticket-page">
                <div className="submit-ticket-header">
                    <h1 className="submit-ticket-title">
                        {t('submitTicket') || 'Submit New Ticket'}
                    </h1>
                    <p className="submit-ticket-subtitle">
                        {t('submitTicketDescription') || 'Create a new support ticket or request'}
                    </p>
                    <span className={getRoleBadgeClass(userRole)}>
                        <i className={`fas ${getRoleIcon(userRole)} me-2`}></i>
                        {userRole}
                    </span>
                </div>

                {success && (
                    <div className="alert alert-success">
                        <i className="fas fa-check-circle me-2"></i>
                        {t('ticketSubmittedSuccess') || 'Ticket submitted successfully!'}
                    </div>
                )}

                <div className="submit-ticket-content">
                    <div className="row justify-content-center">
                        <div className="col-lg-8">
                            <div className="card">
                                <div className="card-body">
                                    <form onSubmit={handleSubmit}>
                                        <div className="row">
                                            <div className="col-12 mb-3">
                                                <label className="form-label">
                                                    {t('title') || 'Title'} *
                                                </label>
                                                <input
                                                    type="text"
                                                    className={`form-control ${errors.title ? 'is-invalid' : ''}`}
                                                    value={formData.title}
                                                    onChange={(e) => handleInputChange('title', e.target.value)}
                                                    placeholder={t('titlePlaceholder') || 'Enter ticket title'}
                                                    disabled={submitting}
                                                />
                                                {errors.title && <div className="invalid-feedback">{errors.title}</div>}
                                            </div>
                                            
                                            <div className="col-12 mb-3">
                                                <label className="form-label">
                                                    {t('description') || 'Description'} *
                                                </label>
                                                <textarea
                                                    className={`form-control ${errors.description ? 'is-invalid' : ''}`}
                                                    rows="4"
                                                    value={formData.description}
                                                    onChange={(e) => handleInputChange('description', e.target.value)}
                                                    placeholder={t('descriptionPlaceholder') || 'Describe the issue or request'}
                                                    disabled={submitting}
                                                ></textarea>
                                                {errors.description && <div className="invalid-feedback">{errors.description}</div>}
                                            </div>
                                            
                                            <div className="col-md-6 mb-3">
                                                <label className="form-label">
                                                    {t('category') || 'Category'} *
                                                </label>
                                                <select
                                                    className={`form-select ${errors.category ? 'is-invalid' : ''}`}
                                                    value={formData.category}
                                                    onChange={(e) => handleInputChange('category', e.target.value)}
                                                    disabled={submitting}
                                                >
                                                    <option value="">{t('selectCategory') || 'Select category'}</option>
                                                    {categories.map(category => (
                                                        <option key={category.value} value={category.value}>
                                                            {category.label}
                                                        </option>
                                                    ))}
                                                </select>
                                                {errors.category && <div className="invalid-feedback">{errors.category}</div>}
                                            </div>
                                            
                                            <div className="col-md-6 mb-3">
                                                <label className="form-label">
                                                    {t('priority') || 'Priority'}
                                                </label>
                                                <select
                                                    className="form-select"
                                                    value={formData.priority}
                                                    onChange={(e) => handleInputChange('priority', e.target.value)}
                                                    disabled={submitting}
                                                >
                                                    {priorities.map(priority => (
                                                        <option key={priority.value} value={priority.value}>
                                                            {priority.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            
                                            <div className="col-12 mb-3">
                                                <label className="form-label">
                                                    {t('assignedTeam') || 'Assigned Team'} *
                                                </label>
                                                <select
                                                    className={`form-select ${errors.assigned_team ? 'is-invalid' : ''}`}
                                                    value={formData.assigned_team}
                                                    onChange={(e) => handleInputChange('assigned_team', e.target.value)}
                                                    disabled={submitting}
                                                >
                                                    <option value="">{t('selectTeam') || 'Select team'}</option>
                                                    {filteredTeams.map(team => (
                                                        <option key={team.value} value={team.value}>
                                                            {team.label}
                                                        </option>
                                                    ))}
                                                </select>
                                                {errors.assigned_team && <div className="invalid-feedback">{errors.assigned_team}</div>}
                                            </div>
                                        </div>

                                        {errors.submit && (
                                            <div className="alert alert-danger">
                                                <i className="fas fa-exclamation-triangle me-2"></i>
                                                {errors.submit}
                                            </div>
                                        )}

                                        <div className="d-flex justify-content-end gap-2">
                                            <button
                                                type="button"
                                                className="btn btn-secondary"
                                                onClick={handleReset}
                                                disabled={submitting}
                                            >
                                                <i className="fas fa-undo me-2"></i>
                                                {t('reset') || 'Reset'}
                                            </button>
                                            <button
                                                type="submit"
                                                className="btn btn-primary"
                                                disabled={submitting}
                                            >
                                                {submitting ? (
                                                    <>
                                                        <i className="fas fa-spinner fa-spin me-2"></i>
                                                        {t('submitting') || 'Submitting...'}
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className="fas fa-paper-plane me-2"></i>
                                                        {t('submitTicket') || 'Submit Ticket'}
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </BaseLayout>
    );
};

export default SubmitTicketPage; 
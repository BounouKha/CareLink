import React, { useState, useEffect } from 'react';
import { useCareTranslation } from '../../hooks/useCareTranslation';

const TicketCreateModal = ({ 
    isOpen, 
    onClose, 
    onSubmit, 
    categories, 
    priorities, 
    teams, 
    userData
}) => {
    const { common } = useCareTranslation();
    
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: '',
        priority: 'Medium',
        assigned_team: ''
    });
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    // Get user role from props
    const getUserRole = () => {
        return userData?.user?.role || '';
    };
    
    const userRole = getUserRole();
    
    // Debug logging
    console.log('[TicketCreateModal] User role:', userRole);
    console.log('[TicketCreateModal] Available teams:', teams);
    console.log('[TicketCreateModal] User data:', userData);
    
    // Filter teams based on user role
    const getFilteredTeams = () => {
        console.log('=== TICKET CREATE MODAL DEBUG ===');
        console.log('[TicketCreateModal] User role:', userRole);
        console.log('[TicketCreateModal] User data:', userData);
        console.log('[TicketCreateModal] Available teams (raw):', teams);
        console.log('[TicketCreateModal] Teams length:', teams?.length);
        
        let filtered = [];
        
        if (userRole === 'Coordinator') {
            // Coordinators can create tickets for both Administrator and Coordinator teams
            filtered = teams.filter(team => team.value === 'Administrator' || team.value === 'Coordinator');
            console.log('[TicketCreateModal] COORDINATOR - Filtered teams:', filtered);
            console.log('[TicketCreateModal] COORDINATOR - Team values found:', filtered.map(t => t.value));
        } else if (userRole === 'Administrator' || userRole === 'Administrative') {
            // Administrators can ONLY create tickets for Coordinator team
            filtered = teams.filter(team => team.value === 'Coordinator');
            console.log('[TicketCreateModal] ADMIN - Filtered teams:', filtered);
        } else {
            // Regular users can create tickets for both teams
            filtered = teams.filter(team => team.value === 'Administrator' || team.value === 'Coordinator');
            console.log('[TicketCreateModal] REGULAR USER - Filtered teams:', filtered);
        }
        
        console.log('[TicketCreateModal] Final filtered teams:', filtered);
        console.log('[TicketCreateModal] Final team count:', filtered.length);
        console.log('=== END DEBUG ===');
        
        return filtered;
    };
    
    const filteredTeams = getFilteredTeams();
    console.log('[TicketCreateModal] Final filtered teams:', filteredTeams);

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
            await onSubmit(formData);
            handleClose();
        } catch (error) {
            console.error('Error creating ticket:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        setFormData({ title: '', description: '', category: '', priority: 'Medium', assigned_team: '' });
        setErrors({});
        setSubmitting(false);
        onClose();
    };

    // Auto-set team based on user role when modal opens
    useEffect(() => {
        if (isOpen) {
            const userRole = getUserRole();
            let defaultTeam = '';
            
            console.log('[TicketCreateModal] Modal opened, user role:', userRole);
            
            if (userRole === 'Coordinator') {
                // Coordinators can choose between Administrator and Coordinator teams
                // Default to Administrator for now, but they can change it
                defaultTeam = 'Administrator';
                console.log('[TicketCreateModal] Setting default team to Administrator for Coordinator (can be changed)');
            } else if (userRole === 'Administrator' || userRole === 'Administrative') {
                // Administrators create tickets for Coordinator team
                defaultTeam = 'Coordinator';
                console.log('[TicketCreateModal] Setting default team to Coordinator for Administrator');
            }
            
            if (defaultTeam) {
                console.log('[TicketCreateModal] Setting form data with default team:', defaultTeam);
                setFormData(prev => ({ ...prev, assigned_team: defaultTeam }));
            } else {
                console.log('[TicketCreateModal] No default team set for role:', userRole);
            }
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-dialog modal-lg">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">
                            {common('createNewTicket') || 'Create New Ticket'}
                        </h5>
                        <button 
                            type="button" 
                            className="btn-close" 
                            onClick={handleClose}
                            disabled={submitting}
                        ></button>
                    </div>
                    
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            <div className="row">
                                <div className="col-12 mb-3">
                                    <label className="form-label">
                                        {common('title') || 'Title'} *
                                    </label>
                                    <input
                                        type="text"
                                        className={`form-control ${errors.title ? 'is-invalid' : ''}`}
                                        value={formData.title}
                                        onChange={(e) => handleInputChange('title', e.target.value)}
                                        placeholder={common('titlePlaceholder') || 'Enter ticket title'}
                                        disabled={submitting}
                                    />
                                    {errors.title && <div className="invalid-feedback">{errors.title}</div>}
                                </div>
                                
                                <div className="col-12 mb-3">
                                    <label className="form-label">
                                        {common('description') || 'Description'} *
                                    </label>
                                    <textarea
                                        className={`form-control ${errors.description ? 'is-invalid' : ''}`}
                                        rows="4"
                                        value={formData.description}
                                        onChange={(e) => handleInputChange('description', e.target.value)}
                                        placeholder={common('descriptionPlaceholder') || 'Describe the issue or request'}
                                        disabled={submitting}
                                    ></textarea>
                                    {errors.description && <div className="invalid-feedback">{errors.description}</div>}
                                </div>
                                
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">
                                        {common('category') || 'Category'} *
                                    </label>
                                    <select
                                        className={`form-select ${errors.category ? 'is-invalid' : ''}`}
                                        value={formData.category}
                                        onChange={(e) => handleInputChange('category', e.target.value)}
                                        disabled={submitting}
                                    >
                                        <option value="">{common('selectCategory') || 'Select Category'}</option>
                                        {categories.map(cat => (
                                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                                        ))}
                                    </select>
                                    {errors.category && <div className="invalid-feedback">{errors.category}</div>}
                                </div>
                                
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">
                                        {common('priority') || 'Priority'}
                                    </label>
                                    <select
                                        className="form-select"
                                        value={formData.priority}
                                        onChange={(e) => handleInputChange('priority', e.target.value)}
                                        disabled={submitting}
                                    >
                                        {priorities.map(pri => (
                                            <option key={pri.value} value={pri.value}>{pri.label}</option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div className="col-12 mb-3">
                                    <label className="form-label">
                                        {common('assignedTeam') || 'Assigned Team'} *
                                    </label>
                                    <select
                                        className={`form-select ${errors.assigned_team ? 'is-invalid' : ''}`}
                                        value={formData.assigned_team}
                                        onChange={(e) => handleInputChange('assigned_team', e.target.value)}
                                        disabled={submitting}
                                    >
                                        <option value="">{common('selectTeam') || 'Select Team'}</option>
                                        {(() => {
                                            console.log('[TicketCreateModal] Rendering teams dropdown with:', filteredTeams);
                                            return filteredTeams.map(team => {
                                                console.log('[TicketCreateModal] Rendering team option:', team);
                                                return (
                                                    <option key={team.value} value={team.value}>
                                                        {team.label}
                                                    </option>
                                                );
                                            });
                                        })()}
                                    </select>
                                    {errors.assigned_team && <div className="invalid-feedback">{errors.assigned_team}</div>}
                                </div>
                            </div>
                        </div>
                        
                        <div className="modal-footer">
                            <button 
                                type="button" 
                                className="btn btn-secondary" 
                                onClick={handleClose}
                                disabled={submitting}
                            >
                                {common('cancel') || 'Cancel'}
                            </button>
                            <button 
                                type="submit" 
                                className="btn btn-primary"
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                        {common('creating') || 'Creating...'}
                                    </>
                                ) : (
                                    common('createTicket') || 'Create Ticket'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default TicketCreateModal; 
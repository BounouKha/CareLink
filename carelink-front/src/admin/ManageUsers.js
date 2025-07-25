import React, { useEffect, useState, useCallback } from 'react';
import './ManageUsers.css';
import BaseLayout from '../auth/layout/BaseLayout';
import EditUserModal from './EditUserModal';
import CreateUserModal from './CreateUserModal';
import CreateProfileModal from './CreateProfileModal';
import AddRelationModal from './AddRelationModal';
import NewEntryModal from './NewEntryModal';
import { useAuthenticatedApi } from '../hooks/useAuth';
import { useCareTranslation } from '../hooks/useCareTranslation';
import tokenManager from '../utils/tokenManager';

const ManageUsers = () => {    const [displayedUsers, setDisplayedUsers] = useState([]); // Users to display on current page
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [editingUser, setEditingUser] = useState(null);
    const [message, setMessage] = useState(null);
    const [messageType, setMessageType] = useState(null); // 'success' or 'error'
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [showCreateProfileModal, setShowCreateProfileModal] = useState(false);    
    const [showAddRelationModal, setShowAddRelationModal] = useState(false);
    const [showNewEntryModal, setShowNewEntryModal] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [selectedFamilyPatientId, setSelectedFamilyPatientId] = useState(null);
    const [selectedRole, setSelectedRole] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchField, setSearchField] = useState('all');    
    const [loading, setLoading] = useState(false);
    const USERS_PER_PAGE = 50;
    
    // Use translation hooks
    const { admin, common, placeholders, errors, success } = useCareTranslation();
    
    // Use modern authentication API
    const { get, post, delete: del } = useAuthenticatedApi();

    // Debug effect to track modal state changes
    useEffect(() => {
        console.log('[DEBUG] Modal state changed:', {
            showAddRelationModal,
            selectedFamilyPatientId,
            selectedUserId
        });
    }, [showAddRelationModal, selectedFamilyPatientId, selectedUserId]);    // Fetch users for current page only (server-side pagination)
    const fetchUsers = useCallback(async (pageNum = 1, search = '', searchField = 'all') => {
        setLoading(true);
        try {
            // Check authentication first
            if (!tokenManager.isAuthenticated()) {
                throw new Error('User not authenticated. Please log in.');
            }

            // Build URL with page and search parameters
            let url = `http://localhost:8000/account/users/?page=${pageNum}`;
            if (search && search.trim()) {
                url += `&search=${encodeURIComponent(search)}`;
                if (searchField && searchField !== 'all') {
                    url += `&search_field=${searchField}`;
                }
            }

            console.log(`[ManageUsers] Fetching page ${pageNum}...`, { search, searchField, url });
            const data = await get(url);
            
            console.log(`[ManageUsers] Received ${data.results.length} users, total: ${data.count}`);
            
            // Update state with server response
            setDisplayedUsers(data.results);
            setTotalPages(Math.ceil(data.count / 50)); // Assuming 50 users per page from backend
            setPage(pageNum);
            
        } catch (err) {
            console.error('[ManageUsers] Error fetching users:', err);
            setError(err.message);
            
            // Handle authentication errors
            if (err.message.includes('401') || err.message.includes('Unauthorized')) {
                tokenManager.handleLogout();
            }
        } finally {
            setLoading(false);
        }
    }, [get]); // Only depend on the get function// Load initial data on component mount ONLY
    useEffect(() => {
        console.log('[ManageUsers] Initial load - fetching page 1');
        fetchUsers(1, '', 'all'); // Load first page with no search
    }, []); // Empty dependency - runs only once on mount

    // Handle search with debouncing (separate from initial load)
    useEffect(() => {
        // Don't run search on initial mount (when searchTerm is still empty)
        if (searchTerm === '') return;
        
        console.log('[ManageUsers] Search effect triggered:', { searchTerm, searchField });
        const timeoutId = setTimeout(() => {
            fetchUsers(1, searchTerm, searchField); // Always go to page 1 when searching
        }, 300); // 300ms debounce

        return () => clearTimeout(timeoutId);
    }, [searchTerm, searchField]); // Only run when search actually changes// Handle page changes
    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages && newPage !== page) {
            fetchUsers(newPage, searchTerm, searchField);
        }
    };

    const handleEdit = (user) => {
        setEditingUser(user);
        setIsEditModalOpen(true);
    };    const handleUpdate = async (updatedUser) => {
        try {
            if (!tokenManager.isAuthenticated()) {
                throw new Error('User not authenticated. Please log in.');
            }            // Refresh current page data
            await fetchUsers(page, searchTerm, searchField);
            setMessage('User updated successfully!');
            setMessageType('success');
            setTimeout(() => setMessage(null), 3000);
            setIsEditModalOpen(false);
        } catch (err) {
            console.error('[ManageUsers] Error updating user:', err);
            setMessage(err.message);
            setMessageType('error');
            setTimeout(() => setMessage(null), 3000);
            
            // Handle authentication errors
            if (err.message.includes('401') || err.message.includes('Unauthorized')) {
                tokenManager.handleLogout();
            }
        }
    };

    const handleError = (errorMessage) => {
        setMessage(errorMessage);
        setMessageType('error');
        setTimeout(() => setMessage(null), 3000); // Clear message after 3 seconds
    };    const handleCreateUser = async (newUser) => {
        try {
            if (!tokenManager.isAuthenticated()) {
                throw new Error('User not authenticated. Please log in.');
            }            // Refresh current page data
            await fetchUsers(page, searchTerm, searchField);
            setMessage('User created successfully!');
            setMessageType('success');
            setTimeout(() => setMessage(null), 3000);
            setIsCreateModalOpen(false);
        } catch (err) {
            console.error('[ManageUsers] Error creating user:', err);
            setMessage(err.message);
            setMessageType('error');
            setTimeout(() => setMessage(null), 3000);
            
            // Handle authentication errors
            if (err.message.includes('401') || err.message.includes('Unauthorized')) {
                tokenManager.handleLogout();
            }
        }
    };const checkProfileExistence = async (userId, role) => {
        try {
            if (!tokenManager.isAuthenticated()) {
                throw new Error('User not authenticated. Please log in.');
            }

            const data = await get(`http://localhost:8000/account/users/${userId}/check/${role}/`);
            return data;
        } catch (err) {
            console.error('[ManageUsers] Error checking profile existence:', err);
            handleError(err.message);
            
            // Handle authentication errors
            if (err.message.includes('401') || err.message.includes('Unauthorized')) {
                tokenManager.handleLogout();
            }
            return null;
        }
    };    // Fetch family patient profile ID from user ID
    const fetchFamilyPatientId = async (userId) => {
        try {
            console.log('[DEBUG] fetchFamilyPatientId called with userId:', userId);
            
            if (!tokenManager.isAuthenticated()) {
                throw new Error('User not authenticated. Please log in.');
            }

            // Use the FamilyPatientViewSet to get all family patient records
            const data = await get(`http://localhost:8000/account/familypatient/`);
            console.log('[DEBUG] All family patient profiles:', data);
            
            // Find the family patient record that matches the user ID
            const familyPatients = data.results || data;
            const userFamilyPatient = familyPatients.find(fp => 
                fp.user && fp.user.id === userId
            );
            
            if (userFamilyPatient && userFamilyPatient.id) {
                console.log('[DEBUG] Found family patient profile:', userFamilyPatient);
                return userFamilyPatient.id;
            } else {
                console.log('[DEBUG] No family patient profile found for user:', userId);
                return null; // Return null instead of throwing error
            }
        } catch (err) {
            console.error('[DEBUG] Error in fetchFamilyPatientId:', err);
            return null; // Return null on error so calling function can handle the message
        }
    };

    const handleCreateProfileClick = async (userId, role) => {
        if (!role) {
            alert('Select a Role Before Creating a Profile');
            return;
        }

        const result = await checkProfileExistence(userId, role);

        if (result && result.message === 'Profile for this role already exists.') {
            alert(result.message);
            return;
        } else if (result && result.message === 'No profile found for this role. User can complete a form.') {
            alert(result.message);
        }

        setSelectedUserId(userId);
        setShowCreateProfileModal(true);
        setSelectedRole(role);
    };

    const handleProfileCreated = (data) => {
        console.log('Profile created:', data);
        setShowCreateProfileModal(false);
        setSelectedUserId(null);
        // Refresh user list or perform other actions
    };    const handleDelete = async (userId) => {
        try {
            if (!tokenManager.isAuthenticated()) {
                throw new Error('User not authenticated. Please log in.');
            }

            // Check for unpaid invoices
            const invoiceData = await get(`http://localhost:8000/account/check-unpaid-invoices/${userId}/`);
            
            if (invoiceData.hasUnpaidInvoices) {
                const confirmProceed = window.confirm('This user has unpaid invoices. Are you sure you want to proceed with deletion?');
                if (!confirmProceed) return;
            }

            // Proceed with deletion
            const confirmDelete = window.confirm('Are you sure you want to delete this user?');
            if (!confirmDelete) return;

            const deleteData = await del(`http://localhost:8000/account/delete-user/${userId}/`);
            
            setMessage(deleteData.message);
            setMessageType('success');
            setTimeout(() => setMessage(null), 3000);              // Refresh current page data after deletion
            await fetchUsers(page, searchTerm, searchField);
        } catch (err) {
            console.error('[ManageUsers] Error deleting user:', err);
            setMessage(err.message);
            setMessageType('error');
            setTimeout(() => setMessage(null), 3000);
            
            // Handle authentication errors
            if (err.message.includes('401') || err.message.includes('Unauthorized')) {
                tokenManager.handleLogout();
            }
        }
    };    return (
        <div className="admin-users-container">
            <div className="admin-users-header">
                <h1>{admin('manageUsers')}</h1>
                <p className="admin-users-subtitle">{admin('manageUsersSubtitle')}</p>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {message && <div className={`alert alert-${messageType}`}>{message}</div>}

            <div className="admin-users-controls">
                <div className="search-section">
                    <div className="search-controls">
                        <select 
                            value={searchField} 
                            onChange={(e) => setSearchField(e.target.value)}
                            className="search-filter"
                        >
                            <option value="all">{admin('allFields')}</option>
                            <option value="email">{common('email')}</option>
                            <option value="name">{common('name')}</option>
                            <option value="national_number">{admin('nationalNumber')}</option>
                        </select>
                        <div className="search-input-container">
                            <input
                                type="text"
                                placeholder={placeholders('searchUsers')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                            <div className="search-icon">🔍</div>
                        </div>
                    </div>                    <div className="results-info">
                        {loading ? common('loading') : `${admin('showing')} ${displayedUsers.length} ${admin('users')} (${admin('page')} ${page} ${common('of')} ${totalPages})`}
                    </div>
                </div>

                <button
                    className="btn btn-primary btn-create"
                    onClick={() => setIsCreateModalOpen(true)}
                >
                    + {admin('createUser')}
                </button>
            </div><div className="users-grid">
                {loading ? (
                    <div className="loading-container">
                        <div className="loading-spinner">⟳</div>
                        <p>Loading users...</p>
                    </div>
                ) : displayedUsers.length > 0 ? (
                    displayedUsers.map((user) => (
                        <div key={user.id} className="user-card">
                            <div className="user-card-header">
                                <div className="user-avatar">
                                    {user.firstname?.charAt(0)}{user.lastname?.charAt(0)}
                                </div>                                <div className="user-info">
                                    <h3>{user.firstname} {user.lastname}</h3>
                                    <p className="user-email">{user.email}</p>                                    <span className={`user-role role-${user.role?.toLowerCase().replace(' ', '-')}`}>
                                        {user.role}
                                    </span>
                                    {user.role === 'Family Patient' && (
                                        <button 
                                            className="btn btn-sm btn-success bg-opacity-20 text-dark ms-2 border-0"                                            onClick={async () => {
                                                console.log('[DEBUG] New entry button clicked for user:', user.id);
                                                
                                                setSelectedUserId(user.id);
                                                
                                                // Fetch the actual family patient profile ID
                                                const familyPatientId = await fetchFamilyPatientId(user.id);
                                                
                                                if (familyPatientId) {
                                                    setSelectedFamilyPatientId(familyPatientId);
                                                    setShowNewEntryModal(true);} else {
                                                    console.log('[DEBUG] No family patient profile found, showing error message');
                                                    // Show beautiful and friendly message to create profile first
                                                    setMessage(
                                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
                                                            <div style={{ 
                                                                backgroundColor: '#3498db', 
                                                                borderRadius: '50%', 
                                                                width: '40px', 
                                                                height: '40px', 
                                                                display: 'flex', 
                                                                alignItems: 'center', 
                                                                justifyContent: 'center',
                                                                flexShrink: 0
                                                            }}>
                                                                <i className="fas fa-user-plus" style={{ fontSize: '18px', color: 'white' }}></i>
                                                            </div>
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ 
                                                                    fontSize: '16px', 
                                                                    fontWeight: 'bold', 
                                                                    color: '#0369a1', 
                                                                    marginBottom: '8px' 
                                                                }}>
                                                                    🔧 Profile Setup Required
                                                                </div>
                                                                <div style={{ fontSize: '14px', lineHeight: '1.5', color: '#0369a1' }}>
                                                                    <strong>{user.firstname} {user.lastname}</strong> needs a Family Patient profile to add new entries.
                                                                    <br />
                                                                    <span style={{ marginTop: '8px', display: 'inline-block' }}>
                                                                        👉 Click the 
                                                                        <span style={{ 
                                                                            background: '#17a2b8', 
                                                                            color: 'white', 
                                                                            padding: '3px 8px', 
                                                                            borderRadius: '4px', 
                                                                            fontSize: '12px',
                                                                            fontWeight: 'bold',
                                                                            margin: '0 4px'
                                                                        }}>
                                                                            Profile
                                                                        </span> 
                                                                        button below to create one first.
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                    setMessageType('info');
                                                    // Scroll to top to make sure user sees the message
                                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                                    // Give users more time to read the detailed message
                                                    setTimeout(() => setMessage(null), 10000);
                                                }
                                            }}
                                            title="Add new patient relationships"
                                        >
                                            <i className="fas fa-plus me-1"></i>
                                            New entry
                                        </button>
                                    )}
                                </div>
                            </div>
                            
                            <div className="user-details">
                                <div className="detail-item">
                                    <span className="detail-label">ID:</span>
                                    <span className="detail-value">{user.id}</span>
                                </div>
                                {user.national_number && (
                                    <div className="detail-item">
                                        <span className="detail-label">National #:</span>
                                        <span className="detail-value">{user.national_number}</span>
                                    </div>
                                )}
                                <div className="detail-item">
                                    <span className="detail-label">Status:</span>
                                    <span className={`status-badge ${user.is_active ? 'active' : 'inactive'}`}>
                                        {user.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            </div>

                            <div className="user-actions">
                                <button 
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => handleEdit(user)}
                                >
                                    Edit
                                </button>
                                <button 
                                    className="btn btn-info btn-sm"
                                    onClick={() => handleCreateProfileClick(user.id, user.role)}
                                >
                                    Profile
                                </button>
                                <button 
                                    className="btn btn-danger btn-sm"
                                    onClick={() => handleDelete(user.id)}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="no-users-found">
                        <div className="no-users-icon">👥</div>
                        <h3>No users found</h3>
                        <p>Try adjusting your search criteria or create a new user.</p>
                    </div>
                )}
            </div>            {totalPages > 1 && (
                <div className="pagination">                    <button 
                        onClick={() => {
                            handlePageChange(page - 1);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }} 
                        disabled={page <= 1}
                        className="btn btn-secondary"
                    >
                        ← Previous
                    </button>
                    <span className="pagination-info">Page {page} of {totalPages}</span>
                    <button 
                        onClick={() => {
                            handlePageChange(page + 1);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }} 
                        disabled={page >= totalPages}
                        className="btn btn-secondary"
                    >
                        Next →
                    </button>
                </div>
            )}

            {isEditModalOpen && (
                <EditUserModal
                    user={editingUser}
                    onClose={() => setIsEditModalOpen(false)}
                    onSave={handleUpdate}
                />
            )}
            {isCreateModalOpen && (
                <CreateUserModal
                    onClose={() => setIsCreateModalOpen(false)}
                    onSave={handleCreateUser}
                />
            )}            {showCreateProfileModal && (
                <CreateProfileModal
                    userId={selectedUserId}
                    role={selectedRole}
                    onClose={() => setShowCreateProfileModal(false)}
                    onProfileCreated={handleProfileCreated}
                />
            )}            {showNewEntryModal && (
                <NewEntryModal
                    show={showNewEntryModal}
                    familyPatientId={selectedFamilyPatientId}
                    onClose={() => {
                        setShowNewEntryModal(false);
                        setSelectedFamilyPatientId(null);
                        setSelectedUserId(null);
                    }}
                    onSuccess={() => {
                        setMessage('New patient relationships added successfully!');
                        setMessageType('success');
                        setTimeout(() => setMessage(null), 5000);
                        setShowNewEntryModal(false);
                        setSelectedFamilyPatientId(null);
                        setSelectedUserId(null);
                    }}
                />            )}{showAddRelationModal && (
                <>
                    {/* Test with a very simple div first */}
                    <div style={{
                        position: 'fixed',
                        top: '50px',
                        right: '50px',
                        backgroundColor: 'red',
                        color: 'white',
                        padding: '20px',
                        zIndex: 10000,
                        fontSize: '20px',
                        border: '5px solid yellow'
                    }}>
                        MODAL IS OPEN!
                    </div>
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999
                    }}>
                        <div style={{
                            backgroundColor: 'white',
                            padding: '20px',
                            borderRadius: '8px',
                            minWidth: '300px'
                        }}>
                            <h3>DEBUG: Add Relation Modal</h3>
                            <p>Family Patient ID: {selectedFamilyPatientId}</p>
                            <button 
                                onClick={() => setShowAddRelationModal(false)}
                                style={{ padding: '10px 20px', marginTop: '10px' }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default ManageUsers;

import React, { useEffect, useState } from 'react';
import './ManageUsers.css';
import BaseLayout from '../auth/layout/BaseLayout';
import EditUserModal from './EditUserModal';
import CreateUserModal from './CreateUserModal';
import CreateProfileModal from './CreateProfileModal';
import AddRelationModal from './AddRelationModal';
import NewEntryModal from './NewEntryModal';

const ManageUsers = () => {
    const [allUsers, setAllUsers] = useState([]); // Store all users from all pages
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [displayedUsers, setDisplayedUsers] = useState([]); // Users to display on current page
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [editingUser, setEditingUser] = useState(null);
    const [message, setMessage] = useState(null);
    const [messageType, setMessageType] = useState(null); // 'success' or 'error'
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [showCreateProfileModal, setShowCreateProfileModal] = useState(false);    const [showAddRelationModal, setShowAddRelationModal] = useState(false);
    const [showNewEntryModal, setShowNewEntryModal] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [selectedFamilyPatientId, setSelectedFamilyPatientId] = useState(null);
    const [selectedRole, setSelectedRole] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchField, setSearchField] = useState('all');    const [loading, setLoading] = useState(false);
    const USERS_PER_PAGE = 50;

    // Debug effect to track modal state changes
    useEffect(() => {
        console.log('[DEBUG] Modal state changed:', {
            showAddRelationModal,
            selectedFamilyPatientId,
            selectedUserId
        });
    }, [showAddRelationModal, selectedFamilyPatientId, selectedUserId]);

    // Fetch all users from all pages
    const fetchAllUsers = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found. Please log in.');
            }

            let allUsersData = [];
            let currentPage = 1;
            let hasMorePages = true;

            while (hasMorePages) {
                const response = await fetch(`http://localhost:8000/account/users/?page=${currentPage}`, {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch users.');
                }

                const data = await response.json();
                allUsersData = [...allUsersData, ...data.results];
                
                // Check if there are more pages
                hasMorePages = !!data.next;
                currentPage++;
            }

            setAllUsers(allUsersData);
            setFilteredUsers(allUsersData);
            
            // Calculate total pages for filtered results
            const totalFilteredPages = Math.ceil(allUsersData.length / USERS_PER_PAGE);
            setTotalPages(totalFilteredPages);
            
            // Set displayed users for current page
            const startIndex = (page - 1) * USERS_PER_PAGE;
            const endIndex = startIndex + USERS_PER_PAGE;
            setDisplayedUsers(allUsersData.slice(startIndex, endIndex));
            
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Filter users and update pagination
    const updateDisplayedUsers = (filtered, currentPage) => {
        const totalFilteredPages = Math.ceil(filtered.length / USERS_PER_PAGE);
        setTotalPages(totalFilteredPages);
        
        // If current page exceeds total pages, reset to page 1
        const validPage = currentPage > totalFilteredPages ? 1 : currentPage;
        if (validPage !== currentPage) {
            setPage(validPage);
        }
        
        const startIndex = (validPage - 1) * USERS_PER_PAGE;
        const endIndex = startIndex + USERS_PER_PAGE;
        setDisplayedUsers(filtered.slice(startIndex, endIndex));
    };

    // Filter users based on search term and field
    useEffect(() => {
        if (!searchTerm) {
            setFilteredUsers(allUsers);
            updateDisplayedUsers(allUsers, page);
            return;
        }

        const filtered = allUsers.filter(user => {
            const searchLower = searchTerm.toLowerCase();
            
            switch (searchField) {
                case 'email':
                    return user.email?.toLowerCase().includes(searchLower);
                case 'name':
                    return `${user.firstname} ${user.lastname}`.toLowerCase().includes(searchLower);
                case 'national_number':
                    return user.national_number?.toLowerCase().includes(searchLower);
                case 'all':
                default:
                    return (
                        user.email?.toLowerCase().includes(searchLower) ||
                        `${user.firstname} ${user.lastname}`.toLowerCase().includes(searchLower) ||
                        user.national_number?.toLowerCase().includes(searchLower)
                    );
            }
        });
        
        setFilteredUsers(filtered);
        updateDisplayedUsers(filtered, 1); // Reset to page 1 when searching
        if (page !== 1) {
            setPage(1);
        }
    }, [searchTerm, searchField, allUsers]);

    // Update displayed users when page changes
    useEffect(() => {
        updateDisplayedUsers(filteredUsers, page);
    }, [page]);

    useEffect(() => {
        fetchAllUsers();
    }, []);

    const handleEdit = (user) => {
        setEditingUser(user);
        setIsEditModalOpen(true);
    };    const handleUpdate = async (updatedUser) => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found. Please log in.');
            }

            // Refresh all users data
            await fetchAllUsers();
            setMessage('User updated successfully!');
            setMessageType('success');
            setTimeout(() => setMessage(null), 3000);
            setIsEditModalOpen(false);
        } catch (err) {
            setMessage(err.message);
            setMessageType('error');
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const handleError = (errorMessage) => {
        setMessage(errorMessage);
        setMessageType('error');
        setTimeout(() => setMessage(null), 3000); // Clear message after 3 seconds
    };    const handleCreateUser = async (newUser) => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found. Please log in.');
            }

            // Refresh all users data
            await fetchAllUsers();
            setMessage('User created successfully!');
            setMessageType('success');
            setTimeout(() => setMessage(null), 3000);
            setIsCreateModalOpen(false);
        } catch (err) {
            setMessage(err.message);
            setMessageType('error');
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const checkProfileExistence = async (userId, role) => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found. Please log in.');
            }

            const response = await fetch(`http://localhost:8000/account/users/${userId}/check/${role}/`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to check profile existence.');
            }

            return data;
        } catch (err) {
            handleError(err.message);
            return null;
        }
    };    // Fetch family patient profile ID from user ID
    const fetchFamilyPatientId = async (userId) => {
        try {
            console.log('[DEBUG] fetchFamilyPatientId called with userId:', userId);
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found. Please log in.');
            }

            // Use the FamilyPatientViewSet to get all family patient records
            const response = await fetch(`http://localhost:8000/account/familypatient/`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                console.error('[DEBUG] API response not OK:', response.status);
                throw new Error('Failed to fetch family patient profiles.');
            }

            const data = await response.json();
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
    };

    const handleDelete = async (userId) => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found. Please log in.');
            }

            // Check for unpaid invoices
            const invoiceResponse = await fetch(`http://localhost:8000/account/check-unpaid-invoices/${userId}/`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!invoiceResponse.ok) {
                throw new Error('Failed to check unpaid invoices.');
            }

            const invoiceData = await invoiceResponse.json();
            if (invoiceData.hasUnpaidInvoices) {
                const confirmProceed = window.confirm('This user has unpaid invoices. Are you sure you want to proceed with deletion?');
                if (!confirmProceed) return;
            }

            // Proceed with deletion
            const confirmDelete = window.confirm('Are you sure you want to delete this user?');
            if (!confirmDelete) return;

            const deleteResponse = await fetch(`http://localhost:8000/account/delete-user/${userId}/`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!deleteResponse.ok) {
                throw new Error('Failed to delete user.');
            }

            const deleteData = await deleteResponse.json();
            setMessage(deleteData.message);
            setMessageType('success');
            setTimeout(() => setMessage(null), 3000);            // Refresh all users data after deletion
            await fetchAllUsers();
            setMessage(deleteData.message);
            setMessageType('success');
            setTimeout(() => setMessage(null), 3000);
        } catch (err) {
            setMessage(err.message);
            setMessageType('error');
            setTimeout(() => setMessage(null), 3000);
        }
    };    return (
        <div className="admin-users-container">
            <div className="admin-users-header">
                <h1>Manage Users</h1>
                <p className="admin-users-subtitle">Manage user accounts, roles, and profiles</p>
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
                            <option value="all">All Fields</option>
                            <option value="email">Email</option>
                            <option value="name">Name</option>
                            <option value="national_number">National Number</option>
                        </select>
                        <div className="search-input-container">
                            <input
                                type="text"
                                placeholder={`Search users by ${searchField === 'all' ? 'email, name, or national number' : searchField}...`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                            <div className="search-icon">🔍</div>
                        </div>
                    </div>                    <div className="results-info">
                        {loading ? 'Loading...' : `Showing ${displayedUsers.length} of ${filteredUsers.length} users (Total: ${allUsers.length})`}
                    </div>
                </div>

                <button
                    className="btn btn-primary btn-create"
                    onClick={() => setIsCreateModalOpen(true)}
                >
                    + Create New User
                </button>
            </div>            <div className="users-grid">
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
                                    {console.log('[DEBUG] Checking if user is Family Patient:', { userId: user.id, userName: user.firstname + ' ' + user.lastname, userRole: user.role, isFamilyPatient: user.role === 'Family Patient' })}
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
                <div className="pagination">
                    <button 
                        onClick={() => {
                            setPage(page - 1);
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
                            setPage(page + 1);
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
                />
            )}{showAddRelationModal && (
                <>
                    {console.log('[DEBUG] Rendering AddRelationModal with:', { showAddRelationModal, selectedFamilyPatientId })}
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

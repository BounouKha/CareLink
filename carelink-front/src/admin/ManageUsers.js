import React, { useEffect, useState } from 'react';
import './ManageUsers.css';
import BaseLayout from '../auth/layout/BaseLayout';
import EditUserModal from './EditUserModal';
import CreateUserModal from './CreateUserModal';
import CreateProfileModal from './CreateProfileModal';

const ManageUsers = () => {
    const [users, setUsers] = useState([]);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [editingUser, setEditingUser] = useState(null);
    const [message, setMessage] = useState(null);
    const [messageType, setMessageType] = useState(null); // 'success' or 'error'
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [showCreateProfileModal, setShowCreateProfileModal] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [selectedRole, setSelectedRole] = useState(null);
    const [hasNextPage, setHasNextPage] = useState(false);
    const [hasPreviousPage, setHasPreviousPage] = useState(false);

    const fetchUsers = async (page) => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found. Please log in.');
            }

            const response = await fetch(`http://localhost:8000/account/users/?page=${page}`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch users.');
            }

            const data = await response.json();
            setUsers(data.results);
            setHasNextPage(!!data.next); // Check if there is a next page
            setHasPreviousPage(!!data.previous); // Check if there is a previous page
        } catch (err) {
            setError(err.message);
        }
    };

    useEffect(() => {
        fetchUsers(page);
    }, [page]);

    const handleEdit = (user) => {
        setEditingUser(user);
        setIsEditModalOpen(true);
    };

    const handleUpdate = async (updatedUser) => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found. Please log in.');
            }

            const response = await fetch('http://localhost:8000/account/users/', {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch updated users.');
            }

            const data = await response.json();
            setUsers(data.results);
            setMessage('User updated successfully!');
            setMessageType('success');
            setTimeout(() => setMessage(null), 3000);
            setIsEditModalOpen(false);

            // Refresh user list and reset to the first page
            setPage(1);
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
    };

    const handleCreateUser = async (newUser) => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found. Please log in.');
            }

            const response = await fetch('http://localhost:8000/account/users/', {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch updated users.');
            }

            const data = await response.json();
            setUsers(data.results);
            setMessage('User created successfully!');
            setMessageType('success');
            setTimeout(() => setMessage(null), 3000);
            setIsCreateModalOpen(false);

            // Refresh user list and reset to the first page
            setPage(1);
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
            setTimeout(() => setMessage(null), 3000);

            // Refresh user list and reset to the first page
            fetchUsers(1);
        } catch (err) {
            setMessage(err.message);
            setMessageType('error');
            setTimeout(() => setMessage(null), 3000);
        }
    };

    return (
        <BaseLayout>
            <div className="admin-section">
                <h2>Admin Panel</h2>
                <div className="manage-users">
                    <h1>Manage Users</h1>
                    {error && <p className="error">{error}</p>}
                    {message && (
                        <p className={`message ${messageType}`}>{message}</p>
                    )}
                    <div className="create-user-container">
                        <button
                            className="create-user-button"
                            onClick={() => setIsCreateModalOpen(true)}
                        >
                            Create User
                        </button>
                    </div>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Array.isArray(users) && users.length > 0 ? (
                                    users.map((user) => (
                                        <tr key={user.id}>
                                            <td>{user.id}</td>
                                            <td>{user.firstname} {user.lastname}</td>
                                            <td>{user.email}</td>
                                            <td>{user.role}</td>
                                            <td>
                                                <button onClick={() => handleEdit(user)}>Edit</button>
                                                <button onClick={() => handleCreateProfileClick(user.id, user.role)}>Create Profile</button>
                                                <button onClick={() => handleDelete(user.id)}>Delete</button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5">No users available.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="pagination">
                        <button onClick={() => setPage(page - 1)} disabled={!hasPreviousPage}>Previous</button>
                        <button onClick={() => setPage(page + 1)} disabled={!hasNextPage}>Next</button>
                    </div>
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
                    )}
                    {showCreateProfileModal && (
                        <CreateProfileModal
                            userId={selectedUserId}
                            role={selectedRole}
                            onClose={() => setShowCreateProfileModal(false)}
                            onProfileCreated={handleProfileCreated}
                        />
                    )}
                </div>
            </div>
        </BaseLayout>
    );
};

export default ManageUsers;

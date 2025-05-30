import React, { useEffect, useState } from 'react';
import './ManageUsers.css';
import BaseLayout from '../auth/BaseLayout';
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

    useEffect(() => {
        const fetchUsers = async () => {
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
                    throw new Error('Failed to fetch users.');
                }

                const data = await response.json();
                setUsers(data.results);
            } catch (err) {
                setError(err.message);
            }
        };

        fetchUsers();
    }, []);

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
        } catch (err) {
            setMessage(err.message);
            setMessageType('error');
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const handleCreateProfileClick = (userId, role) => {
        if (!role) {
            alert('Select a Role Before Creating a Profile');
            return;
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
                        <button onClick={() => setPage(page - 1)} disabled={page === 1}>Previous</button>
                        <button onClick={() => setPage(page + 1)} disabled={users.length < 50}>Next</button>
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

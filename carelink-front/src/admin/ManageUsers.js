import React, { useEffect, useState } from 'react';
import './ManageUsers.css';
import BaseLayout from '../auth/BaseLayout';
import EditUserForm from './EditUserForm';
import CreateUserForm from './CreateUserForm';

const ManageUsers = () => {
    const [users, setUsers] = useState([]);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [editingUser, setEditingUser] = useState(null);
    const [message, setMessage] = useState(null);
    const [messageType, setMessageType] = useState(null); // 'success' or 'error'
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newUser, setNewUser] = useState({ firstname: '', lastname: '', email: '', role: '' });

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
    };

    const handleUpdate = async (updatedUser) => {
        try {
            setUsers((prevUsers) =>
                prevUsers.map((user) => (user.id === updatedUser.id ? updatedUser : user))
            );
            setMessage('User updated successfully!');
            setMessageType('success');
            setTimeout(() => setMessage(null), 3000); // Clear message after 3 seconds

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
        } catch (err) {
            setMessage(err.message);
            setMessageType('error');
            setTimeout(() => setMessage(null), 3000); // Clear message after 3 seconds
        }
    };

    const handleError = (errorMessage) => {
        setMessage(errorMessage);
        setMessageType('error');
        setTimeout(() => setMessage(null), 3000); // Clear message after 3 seconds
    };

    const handleCreateUser = async (userData) => {
        try {
            console.log('Creating user with data:', userData);
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found. Please log in.');
            }

            // Remove national_number field if it's empty
            if (!userData.national_number) {
                delete userData.national_number;
            }

            const response = await fetch('http://localhost:8000/account/create-user/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(userData),
            });

            if (!response.ok) {
                throw new Error('Failed to create user.');
            }

            const newUser = await response.json();
            setUsers((prevUsers) => [...prevUsers, newUser]);
            setMessage('User created successfully!');
            setMessageType('success');
            setTimeout(() => setMessage(null), 3000);
            setShowCreateModal(false);
            setNewUser({ firstname: '', lastname: '', email: '', role: '' });
            window.location.reload();
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
                    {/* Display success or error messages */}
                    {message && (
                        <p className={`message ${messageType}`}>{message}</p>
                    )}
                    <div className="create-user-container">
                        <button
                            className="create-user-button"
                            onClick={() => setShowCreateModal(true)}
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
                    {editingUser && (
                        <EditUserForm
                            user={editingUser}
                            onClose={() => setEditingUser(null)}
                            onUpdate={handleUpdate}
                        />
                    )}
                    {showCreateModal && (
                        <CreateUserForm
                            onCreate={handleCreateUser}
                            onClose={() => setShowCreateModal(false)}
                        />
                    )}
                </div>
            </div>
        </BaseLayout>
    );
};

export default ManageUsers;

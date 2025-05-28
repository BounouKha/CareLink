import React, { useEffect, useState } from 'react';
import './ManageUsers.css';
import BaseLayout from '../auth/BaseLayout';
import EditUserForm from './EditUserForm';

const ManageUsers = () => {
    const [users, setUsers] = useState([]);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [editingUser, setEditingUser] = useState(null);

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
            setUsers(data.results); // Assuming the backend returns paginated results
        } catch (err) {
            setError(err.message);
        }
    };

    const handleEdit = (user) => {
        setEditingUser(user);
    };

    const handleUpdate = (updatedUser) => {
        setUsers((prevUsers) =>
            prevUsers.map((user) => (user.id === updatedUser.id ? updatedUser : user))
        );
        fetchUsers(page); // Re-fetch users to ensure the table is updated
    };

    useEffect(() => {
        fetchUsers(page);
    }, [page]);

    console.log('[DEBUG] Users State:', users); // Debugging users state

    return (
        <BaseLayout>
            <div className="manage-users">
                <h1>Manage Users</h1>
                {error && <p className="error">{error}</p>}
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
            </div>
        </BaseLayout>
    );
};

export default ManageUsers;

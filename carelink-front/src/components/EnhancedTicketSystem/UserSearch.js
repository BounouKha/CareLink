import React, { useState, useEffect, useRef } from 'react';
import { useCareTranslation } from '../../hooks/useCareTranslation';
import './UserSearch.css';

const UserSearch = ({ 
    onUserSelect, 
    selectedUser, 
    placeholder = "Search for a user...",
    disabled = false,
    required = false,
    error = null
}) => {
    const { common } = useCareTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [fetchError, setFetchError] = useState(null);
    const dropdownRef = useRef(null);
    const inputRef = useRef(null);

    // Fetch users based on search term
    const fetchUsers = async (search) => {
        if (!search.trim()) {
            setUsers([]);
            return;
        }

        setLoading(true);
        setFetchError(null);
        
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found');
            }

            const response = await fetch(`http://localhost:8000/account/users/?search=${encodeURIComponent(search)}&page=1`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch users');
            }

            const data = await response.json();
            setUsers(data.results || []);
        } catch (err) {
            console.error('Error fetching users:', err);
            setFetchError(err.message);
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    // Debounced search
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (searchTerm.trim()) {
                fetchUsers(searchTerm);
            } else {
                setUsers([]);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchTerm]);

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };

        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, []);

    const handleInputChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        
        // Clear selected user if input is cleared
        if (!value && selectedUser) {
            onUserSelect(null);
        }
        
        // Show dropdown when typing
        if (value.trim()) {
            setShowDropdown(true);
        } else {
            setShowDropdown(false);
        }
    };

    const handleUserSelect = (user) => {
        onUserSelect(user);
        setSearchTerm(`${user.firstname} ${user.lastname} (${user.email})`);
        setShowDropdown(false);
        setUsers([]);
    };

    const handleInputFocus = () => {
        if (searchTerm.trim() && users.length > 0) {
            setShowDropdown(true);
        }
    };

    const handleInputBlur = () => {
        // Delay hiding dropdown to allow for clicks on dropdown items
        setTimeout(() => {
            setShowDropdown(false);
        }, 150);
    };

    const handleClearSelection = () => {
        setSearchTerm('');
        onUserSelect(null);
        setUsers([]);
        setShowDropdown(false);
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    const getRoleBadgeClass = (role) => {
        switch (role) {
            case 'Coordinator': return 'badge bg-success';
            case 'Administrator': 
            case 'Administrative': return 'badge bg-danger';
            case 'Patient': return 'badge bg-info';
            case 'Provider': return 'badge bg-warning';
            case 'SocialAssistant': return 'badge bg-secondary';
            default: return 'badge bg-light text-dark';
        }
    };

    return (
        <div className="user-search-container" ref={dropdownRef}>
            <div className="user-search-input-wrapper">
                <input
                    ref={inputRef}
                    type="text"
                    className={`form-control user-search-input ${error ? 'is-invalid' : ''}`}
                    placeholder={placeholder}
                    value={searchTerm}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    disabled={disabled}
                    required={required}
                    autoComplete="off"
                />
                {selectedUser && (
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary clear-user-btn"
                        onClick={handleClearSelection}
                        disabled={disabled}
                    >
                        <i className="fas fa-times"></i>
                    </button>
                )}
                {loading && (
                    <div className="user-search-spinner">
                        <div className="spinner-border spinner-border-sm" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Show fetch error (API error) only if not a validation error from parent */}
            {fetchError && <div className="invalid-feedback">{fetchError}</div>}

            {showDropdown && (users.length > 0 || loading) && (
                <div className="user-search-dropdown">
                    {loading ? (
                        <div className="user-search-loading">
                            <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                            Searching users...
                        </div>
                    ) : users.length > 0 ? (
                        <div className="user-search-results">
                            {users.map((user) => (
                                <div
                                    key={user.id}
                                    className="user-search-item"
                                    onClick={() => handleUserSelect(user)}
                                    onMouseDown={(e) => e.preventDefault()} // Prevent blur on click
                                >
                                    <div className="user-search-item-avatar">
                                        {user.firstname.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="user-search-item-info">
                                        <div className="user-search-item-name">
                                            {user.firstname} {user.lastname}
                                        </div>
                                        <div className="user-search-item-email">
                                            {user.email}
                                        </div>
                                        {user.role && (
                                            <span className={`user-search-item-role ${getRoleBadgeClass(user.role)}`}>
                                                {user.role}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : searchTerm.trim() && !loading ? (
                        <div className="user-search-no-results">
                            No users found for "{searchTerm}"
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
};

export default UserSearch; 
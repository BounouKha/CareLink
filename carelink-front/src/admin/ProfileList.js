import React, { useEffect, useState, useCallback } from 'react';
import './ProfileList.css';
import ShowProfileModal from './ShowProfileModal';
import EditProfileModal from './EditProfileModal';
import { useAuthenticatedApi } from '../hooks/useAuth';
import tokenManager from '../utils/tokenManager';

const PROFILES_PER_PAGE = 50;

const ProfileList = () => {
    const [profiles, setProfiles] = useState([]);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProfile, setSelectedProfile] = useState(null);
    const [isShowModalOpen, setIsShowModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const { get } = useAuthenticatedApi();    const fetchProfiles = useCallback(async (pageNum = 1, search = '') => {
        try {
            if (!tokenManager.isAuthenticated()) {
                throw new Error('User not authenticated. Please log in.');
            }

            const params = new URLSearchParams({ page: pageNum.toString() });
            if (search && search.trim()) {
                params.append('search', search);
            }

            console.log(`[ProfileList] Fetching page ${pageNum} with search: "${search}"`);
            const data = await get(`http://localhost:8000/account/profiles/?${params.toString()}`);

            const profilesData = data.results || [];
            const validProfiles = profilesData.filter(profile => profile.id !== null);

            setProfiles(validProfiles);
            setPage(pageNum);
            const count = data.count || 0;
            setTotalCount(count);
            setTotalPages(Math.ceil(count / PROFILES_PER_PAGE) || 1);
            
            console.log(`[ProfileList] Loaded ${validProfiles.length} profiles, total: ${count}`);
        } catch (err) {
            console.error('[ProfileList] Error fetching profiles:', err);
            setError(err.message);
            setProfiles([]);

            if (err.message.includes('401') || err.message.includes('Unauthorized') || err.message.includes('not authenticated')) {
                tokenManager.handleLogout();
            }
        }
    }, [get]);    // Load initial data on component mount ONLY
    useEffect(() => {
        console.log('[ProfileList] Initial load - fetching page 1');
        fetchProfiles(1, '');
    }, []); // Empty dependency - runs only once on mount

    // Handle search with debouncing (separate from initial load)
    useEffect(() => {
        // Don't run search on initial mount (when searchTerm is still empty)
        if (searchTerm === '') return;
        
        console.log('[ProfileList] Search effect triggered:', searchTerm);
        const timeoutId = setTimeout(() => {
            fetchProfiles(1, searchTerm); // Always go to page 1 when searching
        }, 300); // 300ms debounce

        return () => clearTimeout(timeoutId);
    }, [searchTerm]); // Only run when search actually changes

    // Handle page changes
    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages && newPage !== page) {
            fetchProfiles(newPage, searchTerm);
        }
    };

    const handleSearchChange = (e) => setSearchTerm(e.target.value);

    const handleShowProfile = (profile) => {
        setSelectedProfile(profile);
        setIsShowModalOpen(true);
    };

    const handleEditProfile = (profile) => {
        setSelectedProfile(profile);
        setIsEditModalOpen(true);
    };

    const getRoleBadgeClass = (role) => {
        if (!role || role.toLowerCase() === 'new entry') return 'd-none';
        switch (role.toLowerCase()) {
            case 'administrative': return 'bg-warning bg-opacity-20 text-dark';
            case 'patient': return 'bg-primary bg-opacity-20 text-light';
            case 'coordinator': return 'bg-success bg-opacity-20 text-light';
            case 'family patient': return 'bg-info bg-opacity-20 text-dark';
            case 'social assistant': return 'bg-secondary bg-opacity-20 text-light';
            case 'provider': return 'bg-success bg-opacity-20 text-light';
            default: return 'bg-light text-dark';
        }
    };

    return (
        <div className="admin-users-container">
            <div className="admin-users-header">
                <h1>Profile Management</h1>
                <p className="admin-users-subtitle">Manage user profiles and view profile details</p>
            </div>

            {/* Search */}
            <div className="search-container">
                <div className="search-input-wrapper">
                    <i className="fas fa-search search-icon"></i>
                    <input
                        type="text"
                        className="form-control search-input"
                        placeholder="Search profiles..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                    />
                    {searchTerm && (
                        <button 
                            className="clear-search-btn"
                            onClick={() => setSearchTerm('')}
                            title="Clear search"
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    )}
                </div>
                <div className="search-results-info">
                    <span className="results-count">
                        Showing {profiles.length} profile{profiles.length !== 1 ? 's' : ''} (Page {page} of {totalPages})
                    </span>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="alert alert-danger" role="alert">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    {error}
                </div>
            )}

            {/* Table */}
            <div className="table-container">
                {profiles.length > 0 ? (
                    <table className="profiles-table">
                        <thead>
                            <tr>
                                <th><i className="fas fa-user me-2"></i>Profile</th>
                                <th><i className="fas fa-id-card me-2"></i>IDs</th>
                                <th><i className="fas fa-user-tag me-2"></i>Role</th>
                                <th><i className="fas fa-cogs me-2"></i>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {profiles.map((profile, index) => (
                                <tr key={index} className="profile-row">
                                    <td className="profile-info">
                                        <div className="profile-name">
                                            <div className="profile-avatar">
                                                {profile.firstname?.charAt(0)}{profile.lastname?.charAt(0)}
                                            </div>
                                            <div className="name-details">
                                                <div className="full-name">
                                                    {profile.firstname} {profile.lastname}
                                                </div>
                                                <div className="profile-subtitle">
                                                    Profile #{profile.id}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="id-info">
                                        <div className="id-row">
                                            <span className="id-label">Profile:</span>
                                            <span className="id-value">{profile.id}</span>
                                        </div>
                                        {profile.user_id && (
                                            <div className="id-row">
                                                <span className="id-label">User:</span>
                                                <span className="id-value">{profile.user_id}</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="role-info">
                                        {profile.role && profile.role.toLowerCase() !== 'new entry' ? (
                                            <span className={`role-badge ${getRoleBadgeClass(profile.role)}`}>
                                                {profile.role}
                                            </span>
                                        ) : (
                                            <span className="role-badge no-role">No role assigned</span>
                                        )}
                                    </td>
                                    <td className="actions-cell">
                                        <div className="action-buttons">
                                            <button 
                                                className="btn btn-info btn-sm action-btn"
                                                onClick={() => handleShowProfile(profile)}
                                                title="View Profile Details"
                                            >
                                                <i className="fas fa-eye"></i> Show
                                            </button>
                                            <button 
                                                className="btn btn-secondary btn-sm action-btn"
                                                onClick={() => handleEditProfile(profile)}
                                                title="Edit Profile"
                                            >
                                                <i className="fas fa-edit"></i> Edit
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="no-profiles-found">
                        <div className="no-data-icon">
                            <i className="fas fa-user-friends"></i>
                        </div>
                        <h3>No profiles found</h3>
                        <p>No user profiles found in the system.</p>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="admin-pagination">
                    <div className="pagination-controls">
                        <button onClick={() => setPage(1)} disabled={page === 1} className="btn btn-secondary pagination-btn">
                            <i className="fas fa-angle-double-left"></i>
                        </button>
                        <button onClick={() => setPage(page - 1)} disabled={page === 1} className="btn btn-secondary pagination-btn">
                            <i className="fas fa-angle-left"></i> Previous
                        </button>
                        <div className="page-info">
                            <span className="current-page">Page {page}</span>
                            <span className="page-separator">of</span>
                            <span className="total-pages">{totalPages}</span>
                        </div>
                        <button onClick={() => setPage(page + 1)} disabled={page === totalPages} className="btn btn-secondary pagination-btn">
                            Next <i className="fas fa-angle-right"></i>
                        </button>
                        <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="btn btn-secondary pagination-btn">
                            <i className="fas fa-angle-double-right"></i>
                        </button>
                    </div>
                    <div className="pagination-info">
                        Showing {((page - 1) * PROFILES_PER_PAGE) + 1} to {Math.min(page * PROFILES_PER_PAGE, totalCount)} of {totalCount} profiles
                    </div>
                </div>
            )}

            {/* Modals */}
            {isShowModalOpen && (
                <ShowProfileModal
                    profile={selectedProfile}
                    onClose={() => setIsShowModalOpen(false)}
                />
            )}
            {isEditModalOpen && (
                <EditProfileModal
                    profile={selectedProfile}
                    onClose={() => setIsEditModalOpen(false)}
                    onSave={() => {
                        setIsEditModalOpen(false);
                        fetchProfiles(page, searchTerm);
                    }}
                />
            )}
        </div>
    );
};

export default ProfileList; 

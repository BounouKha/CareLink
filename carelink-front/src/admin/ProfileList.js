import React, { useEffect, useState } from 'react';
import './ProfileList.css';
import ShowProfileModal from './ShowProfileModal';
import EditProfileModal from './EditProfileModal';

const ProfileList = () => {
    const [profiles, setProfiles] = useState([]); // Ensure profiles is initialized as an empty array
    const [allProfiles, setAllProfiles] = useState([]); // Store all profiles for search
    const [filteredProfiles, setFilteredProfiles] = useState([]); // Store filtered profiles
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProfile, setSelectedProfile] = useState(null);
    const [isShowModalOpen, setIsShowModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const PROFILES_PER_PAGE = 50;    const fetchProfiles = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found. Please log in.');
            }

            // Fetch all profiles without pagination to enable client-side search and pagination
            const response = await fetch(`http://localhost:8000/account/profiles/?page_size=1000`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch profiles.');
            }

            const data = await response.json();
            console.log('Fetched profiles:', data.results); // Log fetched profiles
            const filteredProfiles = (data.results || []).filter(profile => profile.id !== null && profile.user_id !== null);
            setAllProfiles(filteredProfiles); // Store all profiles
            setFilteredProfiles(filteredProfiles); // Initially, filtered profiles are all profiles

            // Calculate pagination for client-side
            const totalPages = Math.ceil(filteredProfiles.length / PROFILES_PER_PAGE);
            setTotalPages(totalPages);
            
        } catch (err) {
            setError(err.message);
            setAllProfiles([]); // Reset profiles to an empty array in case of an error
            setFilteredProfiles([]);
        }
    };    useEffect(() => {
        fetchProfiles();
    }, []);

    // Handle search functionality
    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredProfiles(allProfiles);
        } else {
            const filtered = allProfiles.filter(profile => {
                const searchLower = searchTerm.toLowerCase();
                const fullName = `${profile.firstname || ''} ${profile.lastname || ''}`.toLowerCase();
                const nationalNumber = (profile.national_number || '').toString().toLowerCase();
                const role = (profile.role || '').toLowerCase();
                const birthdate = (profile.birthdate || '').toLowerCase();
                
                return fullName.includes(searchLower) || 
                       nationalNumber.includes(searchLower) || 
                       role.includes(searchLower) ||
                       birthdate.includes(searchLower) ||
                       profile.id.toString().includes(searchLower);
            });
            setFilteredProfiles(filtered);
        }
        
        // Reset to first page when search changes
        setPage(1);
        
        // Recalculate total pages based on filtered results
        const totalPages = Math.ceil(filteredProfiles.length / PROFILES_PER_PAGE);
        setTotalPages(totalPages);
        
    }, [searchTerm, allProfiles]);

    // Update profiles to display based on current page and filtered results
    useEffect(() => {
        const startIndex = (page - 1) * PROFILES_PER_PAGE;
        const endIndex = startIndex + PROFILES_PER_PAGE;
        const paginatedProfiles = filteredProfiles.slice(startIndex, endIndex);
        setProfiles(paginatedProfiles);
        
        // Recalculate total pages
        const totalPages = Math.ceil(filteredProfiles.length / PROFILES_PER_PAGE);
        setTotalPages(totalPages);
    }, [page, filteredProfiles]);

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    const handleShowProfile = (profile) => {
        setSelectedProfile(profile);
        setIsShowModalOpen(true);
    };    const handleEditProfile = (profile) => {
        setSelectedProfile(profile);
        setIsEditModalOpen(true);
    };    const getRoleBadgeClass = (role) => {
        // Don't show badge for "New entry" or empty/null roles
        if (!role || role.toLowerCase() === 'new entry') {
            return 'd-none'; // Hide the badge completely
        }
        
        switch (role?.toLowerCase()) {
            case 'administrative':
                return 'bg-warning bg-opacity-20 text-dark';
            case 'patient':
                return 'bg-primary bg-opacity-20 text-light';
            case 'coordinator':
                return 'bg-success bg-opacity-20 text-light';
            case 'family patient':
                return 'bg-info bg-opacity-20 text-dark';
            case 'social assistant':
                return 'bg-secondary bg-opacity-20 text-light';
            case 'provider':
                return 'bg-success bg-opacity-20 text-light';
            default:
                return 'bg-light text-dark';
        }    };    return (        
            <div className="admin-users-container">
                <div className="admin-users-header">
                    <h1>Profile Management</h1>
                    <p className="admin-users-subtitle">Manage user profiles and view profile details</p>
                </div>

                {/* Search Bar */}
                <div className="search-container">
                    <div className="search-input-wrapper">
                        <i className="fas fa-search search-icon"></i>
                        <input
                            type="text"
                            className="form-control search-input"
                            placeholder="Search profiles by name, national number, role, birth date, or ID..."
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
                        {searchTerm ? (
                            <span className="results-count">
                                Found {filteredProfiles.length} profile{filteredProfiles.length !== 1 ? 's' : ''}
                            </span>
                        ) : (
                            <span className="total-count">
                                Total: {allProfiles.length} profile{allProfiles.length !== 1 ? 's' : ''}
                            </span>
                        )}
                    </div>
                </div>

                {/* Error Alert */}
                {error && (
                    <div className="alert alert-danger" role="alert">
                        <i className="fas fa-exclamation-triangle me-2"></i>
                        {error}
                    </div>
                )}{/* Profiles Table */}
                <div className="table-container">
                    {profiles.length > 0 ? (
                        <table className="profiles-table">
                            <thead>
                                <tr>
                                    <th>
                                        <i className="fas fa-user me-2"></i>
                                        Profile
                                    </th>
                                    <th>
                                        <i className="fas fa-id-card me-2"></i>
                                        IDs
                                    </th>                                    <th>
                                        <i className="fas fa-user-tag me-2"></i>
                                        Role
                                    </th>
                                    <th>
                                        <i className="fas fa-heart me-2"></i>
                                        Relations
                                    </th>
                                    <th>
                                        <i className="fas fa-calendar me-2"></i>
                                        Birth Date
                                    </th>
                                    <th>
                                        <i className="fas fa-cogs me-2"></i>
                                        Actions
                                    </th>
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
                                        </td>                                        <td className="role-info">
                                            {profile.role && profile.role.toLowerCase() !== 'new entry' ? (
                                                <span className={`role-badge ${getRoleBadgeClass(profile.role)}`}>
                                                    {profile.role}
                                                </span>
                                            ) : (
                                                <span className="role-badge no-role">
                                                    No role assigned
                                                </span>
                                            )}
                                        </td>
                                        <td className="relations-info">
                                            {profile.role === 'FamilyPatient' && profile.relations && profile.relations.length > 0 ? (
                                                <div className="relations-list">
                                                    {profile.relations.map((relation, idx) => (
                                                        <div key={idx} className="relation-item">
                                                            <div className="relation-link">
                                                                <i className="fas fa-link me-1"></i>
                                                                <span className="link-text">{relation.link}</span>
                                                            </div>
                                                            <div className="relation-patient">
                                                                <i className="fas fa-user me-1"></i>
                                                                <span className="patient-name">{relation.patient_name || 'Unknown Patient'}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : profile.role === 'FamilyPatient' ? (
                                                <span className="no-relations">
                                                    <i className="fas fa-info-circle me-1"></i>
                                                    No relations found
                                                </span>
                                            ) : (
                                                <span className="not-applicable">
                                                    <i className="fas fa-minus me-1"></i>
                                                    N/A
                                                </span>
                                            )}
                                        </td>
                                        <td className="birthdate-info">
                                            {profile.birthdate ? (
                                                <span className="date-value">{profile.birthdate}</span>
                                            ) : (
                                                <span className="no-data">Not provided</span>
                                            )}
                                        </td>
                                        <td className="actions-cell">
                                            <div className="action-buttons">
                                                <button 
                                                    className="btn btn-info btn-sm action-btn"
                                                    onClick={() => handleShowProfile(profile)}
                                                    title="View Profile Details"
                                                >
                                                    <i className="fas fa-eye"></i>
                                                    Show
                                                </button>
                                                <button 
                                                    className="btn btn-secondary btn-sm action-btn"
                                                    onClick={() => handleEditProfile(profile)}
                                                    title="Edit Profile"
                                                >
                                                    <i className="fas fa-edit"></i>
                                                    Edit
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
                </div>                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="admin-pagination">
                        <div className="pagination-controls">
                            <button 
                                onClick={() => setPage(1)} 
                                disabled={page === 1}
                                className="btn btn-secondary pagination-btn"
                                title="First page"
                            >
                                <i className="fas fa-angle-double-left"></i>
                            </button>
                            <button 
                                onClick={() => setPage(page - 1)} 
                                disabled={page === 1}
                                className="btn btn-secondary pagination-btn"
                                title="Previous page"
                            >
                                <i className="fas fa-angle-left"></i>
                                Previous
                            </button>
                            
                            <div className="page-info">
                                <span className="current-page">Page {page}</span>
                                <span className="page-separator">of</span>
                                <span className="total-pages">{totalPages}</span>
                            </div>
                            
                            <button 
                                onClick={() => setPage(page + 1)} 
                                disabled={page === totalPages}
                                className="btn btn-secondary pagination-btn"
                                title="Next page"
                            >
                                Next
                                <i className="fas fa-angle-right"></i>
                            </button>
                            <button 
                                onClick={() => setPage(totalPages)} 
                                disabled={page === totalPages}
                                className="btn btn-secondary pagination-btn"
                                title="Last page"
                            >
                                <i className="fas fa-angle-double-right"></i>
                            </button>
                        </div>
                        
                        <div className="pagination-info">
                            Showing {((page - 1) * PROFILES_PER_PAGE) + 1} to {Math.min(page * PROFILES_PER_PAGE, filteredProfiles.length)} of {filteredProfiles.length} profiles
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
                        onClose={() => setIsEditModalOpen(false)}                        onSave={() => {
                            setIsEditModalOpen(false);                        fetchProfiles(); // Refresh profiles
                        }}
                    />
                )}
            </div>
    );
};

export default ProfileList;

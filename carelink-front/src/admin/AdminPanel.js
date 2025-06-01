import React, { useState } from 'react';
import './AdminPanel.css';
import BaseLayout from '../auth/layout/BaseLayout';
import ManageUsers from './ManageUsers'; // Import the ManageUsers component
import ProfileList from './ProfileList';
import { useNavigate } from 'react-router-dom';

const AdminPanel = () => {
    const [selectedTab, setSelectedTab] = useState('users');
    const [refreshKey, setRefreshKey] = useState(0);
    const navigate = useNavigate();

    const renderContent = () => {
        switch (selectedTab) {
            case 'users':
                return (
                    <div>
                        <ManageUsers key={refreshKey} />
                    </div>
                );
            case 'logs':
                return <p>View Logs Section</p>;
            case 'settings':
                return <p>Settings Section</p>;
            case 'profile':
                return <ProfileList />;
            default:
                return <p>Select a tab to view content.</p>;
        }
    };

    return (
        <BaseLayout>
            <div className="admin-panel">
                <h1>Admin Panel</h1>
                <div className="admin-toolbar">
                    <button onClick={() => setSelectedTab('users')} className={`tab-button ${selectedTab === 'users' ? 'active' : ''}`}>Users</button>
                    <button onClick={() => setSelectedTab('logs')} className={`tab-button ${selectedTab === 'logs' ? 'active' : ''}`}>Logs</button>
                    <button onClick={() => setSelectedTab('settings')} className={`tab-button ${selectedTab === 'settings' ? 'active' : ''}`}>Settings</button>
                    <button onClick={() => setSelectedTab('profile')} className={`tab-button ${selectedTab === 'profile' ? 'active' : ''}`}>Profile</button>
                </div>
                <div className="content">
                    {renderContent()}
                </div>
            </div>
        </BaseLayout>
    );
};

export default AdminPanel;

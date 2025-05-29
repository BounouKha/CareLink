import React, { useState } from 'react';
import './AdminPanel.css';
import BaseLayout from '../auth/BaseLayout';
import ManageUsers from './ManageUsers'; // Import the ManageUsers component

const AdminPanel = () => {
    const [selectedTab, setSelectedTab] = useState('users');

    const renderContent = () => {
        switch (selectedTab) {
            case 'users':
                return <ManageUsers />; // Render the ManageUsers component
            case 'logs':
                return <p>View Logs Section</p>;
            case 'settings':
                return <p>Settings Section</p>;
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
                </div>
                <div className="content">
                    {renderContent()}
                </div>
            </div>
        </BaseLayout>
    );
};

export default AdminPanel;

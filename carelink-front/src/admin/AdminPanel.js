import React, { useState } from 'react';
import './AdminPanel.css';
import BaseLayout from '../auth/BaseLayout';

const AdminPanel = () => {
    const [selectedTab, setSelectedTab] = useState('users');

    const renderContent = () => {
        switch (selectedTab) {
            case 'users':
                return <p>Manage Users Section</p>;
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
                <div className="toolbar">
                    <button onClick={() => setSelectedTab('users')} className={selectedTab === 'users' ? 'active' : ''}>Users</button>
                    <button onClick={() => setSelectedTab('logs')} className={selectedTab === 'logs' ? 'active' : ''}>Logs</button>
                    <button onClick={() => setSelectedTab('settings')} className={selectedTab === 'settings' ? 'active' : ''}>Settings</button>
                </div>
                <div className="content">
                    {renderContent()}
                </div>
            </div>
        </BaseLayout>
    );
};

export default AdminPanel;

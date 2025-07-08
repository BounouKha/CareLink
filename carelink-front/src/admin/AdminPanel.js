import React, { useState } from 'react';
// CSS is now handled by UnifiedBaseLayout.css
import BaseLayout from '../auth/layout/BaseLayout';
import ManageUsers from './ManageUsers'; // Import the ManageUsers component
import ProfileList from './ProfileList';
import LogsManagement from './LogsManagement'; // Import the LogsManagement component
import ConsentManagement from './ConsentManagement'; // Import the ConsentManagement component
import PricingManagement from './PricingManagement'; // Import the PricingManagement component
import SubmitTicketPage from '../components/EnhancedTicketSystem/SubmitTicketPage';
import ManageTicketsPage from '../components/EnhancedTicketSystem/ManageTicketsPage';
import { useNavigate } from 'react-router-dom';

import './AdminPanel.css';

const AdminPanel = () => {
    const [selectedTab, setSelectedTab] = useState('users');
    const [refreshKey, setRefreshKey] = useState(0);
    const navigate = useNavigate();

    const tabs = [
        { id: 'users', label: 'Users', icon: '👥', description: 'Manage user accounts and roles' },
        { id: 'logs', label: 'Logs', icon: '📋', description: 'View system activity logs' },
        { id: 'consent', label: 'Consent', icon: '🔒', description: 'Manage user privacy and consent' },
        { id: 'pricing', label: 'Pricing', icon: '💰', description: 'Manage custom patient service pricing' },
        { id: 'submit-tickets', label: 'Submit Tickets', icon: '📝', description: 'Create new support tickets' },
        { id: 'manage-tickets', label: 'Manage Tickets', icon: '🎫', description: 'Handle and manage existing tickets' },
        { id: 'settings', label: 'Settings', icon: '⚙️', description: 'Configure system settings' },
        { id: 'profile', label: 'Profiles', icon: '👤', description: 'Manage user profiles' }
    ];

    const renderContent = () => {
        switch (selectedTab) {
            case 'users':
                return <ManageUsers key={refreshKey} />;
            case 'logs':
                return <LogsManagement />;
            case 'consent':
                return <ConsentManagement />;
            case 'pricing':
                return <PricingManagement />;
            case 'submit-tickets':
                return <SubmitTicketPage />;
            case 'manage-tickets':
                return <ManageTicketsPage />;
            case 'settings':
                return (
                    <div className="admin-section-placeholder">
                        <div className="placeholder-icon">⚙️</div>
                        <h2>System Settings</h2>
                        <p>Configure website settings, preferences, and system parameters.</p>
                        <div className="coming-soon">Coming Soon</div>
                    </div>
                );
            case 'profile':
                return <ProfileList />;
            default:
                return (
                    <div className="admin-section-placeholder">
                        <div className="placeholder-icon">🎯</div>
                        <h2>Welcome to Admin Panel</h2>
                        <p>Select a tab to view and manage different aspects of the system.</p>
                    </div>
                );
        }
    };

    return (
        <BaseLayout>
            <div className="admin-panel-container">
                <div className="admin-panel-header">
                    <h1>Admin Panel</h1>
                    <p className="admin-panel-subtitle">Comprehensive system administration</p>
                </div>
                
                <div className="admin-tabs">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setSelectedTab(tab.id)}
                            className={`admin-tab ${selectedTab === tab.id ? 'active' : ''}`}
                        >
                            <span className="tab-icon">{tab.icon}</span>
                            <div className="tab-content">
                                <span className="tab-label">{tab.label}</span>
                                <span className="tab-description">{tab.description}</span>
                            </div>
                        </button>
                    ))}
                </div>
                
                <div className="admin-content">
                    {renderContent()}
                </div>
            </div>
        </BaseLayout>
    );
};

export default AdminPanel;

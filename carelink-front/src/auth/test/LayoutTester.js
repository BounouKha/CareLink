// Layout Tester - Tool to verify BaseLayout functionality
import React, { useState, useEffect } from 'react';
import BaseLayout from '../layout/BaseLayout';
import './LayoutTester.css';

const LayoutTester = () => {
    const [currentPath, setCurrentPath] = useState(window.location.pathname);
    const [toolbarState, setToolbarState] = useState(localStorage.getItem('showToolbar') || 'true');
    const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('accessToken'));
    const [userRole, setUserRole] = useState('Loading...');
    const [pageType, setPageType] = useState('');
    
    useEffect(() => {
        // Detect if page is public or member area
        const isPublicPage = ['/', '/login', '/register', '/home'].some(path => 
            window.location.pathname === path || window.location.pathname === path + '/'
        );
        setPageType(isPublicPage ? 'Public Page' : 'Member Area Page');
        
        // Fetch user role if logged in
        const fetchUserData = async () => {
            try {
                const token = localStorage.getItem('accessToken');
                if (!token) {
                    setUserRole('Not logged in');
                    return;
                }
                
                const response = await fetch('http://localhost:8000/account/profile/', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    setUserRole(data.user.role || 'Unknown Role');
                } else {
                    setUserRole('Error fetching role');
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
                setUserRole('Error fetching role');
            }
        };
        
        fetchUserData();
        
        // Update path when it changes
        const handlePathChange = () => {
            setCurrentPath(window.location.pathname);
        };
        
        window.addEventListener('popstate', handlePathChange);
        return () => window.removeEventListener('popstate', handlePathChange);
    }, []);
    
    // Check toolbar state periodically
    useEffect(() => {
        const interval = setInterval(() => {
            const currentToolbarState = localStorage.getItem('showToolbar');
            if (currentToolbarState !== toolbarState) {
                setToolbarState(currentToolbarState);
            }
        }, 1000);
        
        return () => clearInterval(interval);
    }, [toolbarState]);
    
    return (
        <BaseLayout>
            <div className="layout-tester">
                <h1>Layout Tester Tool</h1>
                
                <div className="test-section">
                    <h2>Page Information</h2>
                    <div className="test-item">
                        <strong>Current Path:</strong> {currentPath}
                    </div>
                    <div className="test-item">
                        <strong>Page Type:</strong> {pageType}
                    </div>
                </div>
                
                <div className="test-section">
                    <h2>Authentication Status</h2>
                    <div className="test-item">
                        <strong>Logged In:</strong> {isLoggedIn ? 'Yes' : 'No'}
                    </div>
                    <div className="test-item">
                        <strong>User Role:</strong> {userRole}
                    </div>
                </div>
                
                <div className="test-section">
                    <h2>Layout Status</h2>
                    <div className="test-item">
                        <strong>Toolbar Visibility:</strong> {toolbarState === 'true' ? 'Visible' : 'Hidden'}
                    </div>
                    <div className="test-item">
                        <strong>Layout Class:</strong> base-main {pageType === 'Member Area Page' && toolbarState === 'true' ? 'with-toolbar' : 'without-toolbar'}
                    </div>
                </div>
                
                <div className="test-actions">
                    <h2>Layout Actions</h2>
                    <button onClick={() => {
                        const newState = toolbarState === 'true' ? 'false' : 'true';
                        localStorage.setItem('showToolbar', newState);
                        setToolbarState(newState);
                    }}>Toggle Toolbar</button>
                    
                    <button onClick={() => {
                        if (isLoggedIn) {
                            localStorage.removeItem('accessToken');
                            localStorage.removeItem('refreshToken');
                            setIsLoggedIn(false);
                            setUserRole('Not logged in');
                        } else {
                            window.location.href = '/login';
                        }
                    }}>
                        {isLoggedIn ? 'Log Out' : 'Go To Login'}
                    </button>
                </div>
                
                <div className="test-section">
                    <h2>Layout Navigation Test</h2>
                    <div className="nav-test-buttons">
                        <button onClick={() => window.location.href = '/'}>Home</button>
                        <button onClick={() => window.location.href = '/profile'}>Profile</button>
                        <button onClick={() => window.location.href = '/service-demands'}>Service Demands</button>
                        <button onClick={() => window.location.href = '/schedule'}>Schedule</button>
                        <button onClick={() => window.location.href = '/patients'}>Patients</button>
                    </div>
                </div>
            </div>
        </BaseLayout>
    );
};

export default LayoutTester;

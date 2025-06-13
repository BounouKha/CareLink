import React, { useState, useEffect } from 'react';
import BaseLayout from '../../auth/layout/BaseLayout';
import tokenManager from '../../utils/tokenManager';
import { useAuth, useAuthenticatedApi } from '../../hooks/useAuth';

const TokenTestPage = () => {
    const { isAuthenticated, tokenInfo, login, logout } = useAuth();
    const { loading, error, get } = useAuthenticatedApi();
    const [testResults, setTestResults] = useState([]);
    const [loginForm, setLoginForm] = useState({ email: '', password: '' });

    const addTestResult = (test, result, details = '') => {
        const timestamp = new Date().toLocaleTimeString();
        setTestResults(prev => [...prev, { 
            test, 
            result, 
            details, 
            timestamp 
        }]);
    };

    const runTokenTests = async () => {
        setTestResults([]);
        
        // Test 1: Check token info
        const info = tokenManager.getTokenInfo();
        addTestResult(
            'Token Information', 
            info ? 'PASS' : 'FAIL',
            info ? `Access expires: ${info.access.exp.toLocaleString()}` : 'No token found'
        );

        // Test 2: Check authentication status
        const authStatus = tokenManager.isAuthenticated();
        addTestResult(
            'Authentication Status',
            authStatus ? 'PASS' : 'FAIL',
            authStatus ? 'User is authenticated' : 'User is not authenticated'
        );

        if (authStatus) {
            // Test 3: Test authenticated API call
            try {
                const profileData = await get('http://localhost:8000/account/profile/');
                addTestResult(
                    'Authenticated API Call',
                    'PASS',
                    `Profile loaded for: ${profileData.user.email}`
                );
            } catch (err) {
                addTestResult(
                    'Authenticated API Call',
                    'FAIL',
                    `Error: ${err.message}`
                );
            }

            // Test 4: Check token expiration
            const accessToken = tokenManager.getAccessToken();
            const isExpired = tokenManager.isTokenExpired(accessToken);
            addTestResult(
                'Token Expiration Check',
                isExpired ? 'WARNING' : 'PASS',
                isExpired ? 'Token is expired or about to expire' : 'Token is valid'
            );
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            await login(loginForm.email, loginForm.password);
            addTestResult('Login Test', 'PASS', 'Login successful');
            setLoginForm({ email: '', password: '' });
        } catch (err) {
            addTestResult('Login Test', 'FAIL', err.message);
        }
    };

    const handleLogout = () => {
        logout();
        addTestResult('Logout Test', 'PASS', 'Logout successful');
    };

    const testTokenRefresh = async () => {
        try {
            const newToken = await tokenManager.refreshAccessToken();
            addTestResult(
                'Token Refresh Test',
                'PASS',
                'Token refreshed successfully'
            );
        } catch (err) {
            addTestResult(
                'Token Refresh Test',
                'FAIL',
                err.message
            );
        }
    };

    return (
        <BaseLayout>
            <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
                <h1>🔐 JWT Token Security Test Dashboard</h1>
                <p>Test the improved JWT token management system</p>

                {/* Authentication Status */}
                <div style={{
                    background: isAuthenticated ? '#e8f5e8' : '#ffe8e8',
                    padding: '15px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    border: `2px solid ${isAuthenticated ? '#4caf50' : '#f44336'}`
                }}>
                    <h3>🔑 Authentication Status</h3>
                    <p><strong>Status:</strong> {isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'}</p>
                    {tokenInfo && (
                        <div>
                            <p><strong>Access Token Expires:</strong> {tokenInfo.access.exp.toLocaleString()}</p>
                            <p><strong>Time Until Expiry:</strong> {Math.round((tokenInfo.access.exp - new Date()) / 1000 / 60)} minutes</p>
                            {tokenInfo.refresh && (
                                <p><strong>Refresh Token Expires:</strong> {tokenInfo.refresh.exp.toLocaleString()}</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Login Form (if not authenticated) */}
                {!isAuthenticated && (
                    <div style={{
                        background: '#f5f5f5',
                        padding: '20px',
                        borderRadius: '8px',
                        marginBottom: '20px'
                    }}>
                        <h3>🔐 Login Test</h3>
                        <form onSubmit={handleLogin} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <input
                                type="email"
                                placeholder="Email"
                                value={loginForm.email}
                                onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                                required
                            />
                            <input
                                type="password"
                                placeholder="Password"
                                value={loginForm.password}
                                onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                                required
                            />
                            <button 
                                type="submit" 
                                disabled={loading}
                                style={{
                                    padding: '8px 16px',
                                    background: '#4285f4',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                {loading ? 'Testing...' : 'Test Login'}
                            </button>
                        </form>
                    </div>
                )}

                {/* Test Controls */}
                <div style={{
                    background: '#f0f8ff',
                    padding: '20px',
                    borderRadius: '8px',
                    marginBottom: '20px'
                }}>
                    <h3>🧪 Test Controls</h3>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button 
                            onClick={runTokenTests}
                            disabled={loading}
                            style={{
                                padding: '10px 20px',
                                background: '#4caf50',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            🔍 Run All Tests
                        </button>
                        
                        {isAuthenticated && (
                            <>
                                <button 
                                    onClick={testTokenRefresh}
                                    disabled={loading}
                                    style={{
                                        padding: '10px 20px',
                                        background: '#ff9800',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    🔄 Test Token Refresh
                                </button>
                                
                                <button 
                                    onClick={handleLogout}
                                    style={{
                                        padding: '10px 20px',
                                        background: '#f44336',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    🚪 Test Logout
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Test Results */}
                <div style={{
                    background: 'white',
                    padding: '20px',
                    borderRadius: '8px',
                    border: '1px solid #ddd'
                }}>
                    <h3>📊 Test Results</h3>
                    {loading && <p>🔄 Running tests...</p>}
                    {error && <p style={{ color: 'red' }}>❌ Error: {error}</p>}
                    
                    {testResults.length === 0 ? (
                        <p style={{ color: '#666' }}>No tests run yet. Click "Run All Tests" to start.</p>
                    ) : (
                        <div>
                            {testResults.map((result, index) => (
                                <div 
                                    key={index}
                                    style={{
                                        padding: '10px',
                                        margin: '5px 0',
                                        borderRadius: '4px',
                                        border: `1px solid ${
                                            result.result === 'PASS' ? '#4caf50' : 
                                            result.result === 'WARNING' ? '#ff9800' : '#f44336'
                                        }`,
                                        background: `${
                                            result.result === 'PASS' ? '#e8f5e8' : 
                                            result.result === 'WARNING' ? '#fff3e0' : '#ffe8e8'
                                        }`
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <strong>{result.test}</strong>
                                        <span style={{
                                            padding: '2px 8px',
                                            borderRadius: '12px',
                                            fontSize: '12px',
                                            color: 'white',
                                            background: 
                                                result.result === 'PASS' ? '#4caf50' : 
                                                result.result === 'WARNING' ? '#ff9800' : '#f44336'
                                        }}>
                                            {result.result}
                                        </span>
                                    </div>
                                    <div style={{ marginTop: '5px', fontSize: '14px', color: '#666' }}>
                                        {result.details}
                                    </div>
                                    <div style={{ marginTop: '5px', fontSize: '12px', color: '#999' }}>
                                        {result.timestamp}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Security Improvements Info */}
                <div style={{
                    background: '#e3f2fd',
                    padding: '20px',
                    borderRadius: '8px',
                    marginTop: '20px'
                }}>
                    <h3>🛡️ Security Improvements Implemented</h3>
                    <ul style={{ lineHeight: '1.6' }}>
                        <li><strong>Short-lived Access Tokens:</strong> 15 minutes (was 60 minutes)</li>
                        <li><strong>Longer Refresh Tokens:</strong> 7 days (was 1 day)</li>
                        <li><strong>Automatic Token Rotation:</strong> New refresh token on each refresh</li>
                        <li><strong>Token Blacklisting:</strong> Old tokens are invalidated</li>
                        <li><strong>Automatic Refresh:</strong> Tokens refresh 2 minutes before expiry</li>
                        <li><strong>Secure Error Handling:</strong> Automatic logout on refresh failure</li>
                        <li><strong>Request Queuing:</strong> Multiple requests during refresh are queued</li>
                        <li><strong>Retry Logic:</strong> Up to 3 retry attempts for failed refreshes</li>
                    </ul>
                </div>
            </div>
        </BaseLayout>
    );
};

export default TokenTestPage;

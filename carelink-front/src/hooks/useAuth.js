import { useState, useEffect, useCallback } from 'react';
import tokenManager from '../utils/tokenManager';

/**
 * React Hook for JWT Token Management
 * Provides authentication state and utilities
 */
export const useAuth = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(tokenManager.isAuthenticated());
    const [tokenInfo, setTokenInfo] = useState(tokenManager.getTokenInfo());
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Update authentication state periodically
        const updateAuthState = () => {
            setIsAuthenticated(tokenManager.isAuthenticated());
            setTokenInfo(tokenManager.getTokenInfo());
        };

        // Check every 30 seconds
        const interval = setInterval(updateAuthState, 30000);

        // Also listen for localStorage changes (for multi-tab support)
        const handleStorageChange = (e) => {
            if (e.key === 'accessToken' || e.key === 'refreshToken') {
                updateAuthState();
            }
        };

        window.addEventListener('storage', handleStorageChange);

        return () => {
            clearInterval(interval);
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    /**
     * Perform authenticated API request
     */
    const authenticatedRequest = async (url, options = {}) => {
        setIsLoading(true);
        try {
            const response = await tokenManager.authenticatedFetch(url, options);
            return response;
        } catch (error) {
            console.error('Authenticated request failed:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Login with credentials
     */
    const login = async (email, password) => {
        setIsLoading(true);
        try {
            const response = await fetch('http://localhost:8000/account/login/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Login failed');
            }

            const data = await response.json();
            tokenManager.setTokens(data.access, data.refresh);
            
            setIsAuthenticated(true);
            setTokenInfo(tokenManager.getTokenInfo());
            
            return data;
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Logout user
     */
    const logout = () => {
        tokenManager.handleLogout();
        setIsAuthenticated(false);
        setTokenInfo(null);
    };

    /**
     * Check if token needs refresh soon
     */
    const needsRefresh = () => {
        const token = tokenManager.getAccessToken();
        return tokenManager.isTokenExpired(token);
    };

    return {
        // State
        isAuthenticated,
        isLoading,
        tokenInfo,
        
        // Actions
        login,
        logout,
        authenticatedRequest,
        
        // Utilities
        needsRefresh,
        getAccessToken: () => tokenManager.getAccessToken(),
        getRefreshToken: () => tokenManager.getRefreshToken(),
    };
};

/**
 * Hook for making authenticated API requests with automatic error handling
 */
export const useAuthenticatedApi = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const makeRequest = useCallback(async (url, options = {}) => {
        setLoading(true);
        setError(null);

        try {
            const response = await tokenManager.authenticatedFetch(url, options);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || errorData.error || `HTTP ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const get = useCallback((url) => makeRequest(url, { method: 'GET' }), [makeRequest]);
    const post = useCallback((url, data) => makeRequest(url, { 
        method: 'POST', 
        body: JSON.stringify(data) 
    }), [makeRequest]);
    const put = useCallback((url, data) => makeRequest(url, { 
        method: 'PUT', 
        body: JSON.stringify(data) 
    }), [makeRequest]);
    const del = useCallback((url) => makeRequest(url, { method: 'DELETE' }), [makeRequest]);

    return {
        loading,
        error,
        makeRequest,
        get,
        post,
        put,
        delete: del,
    };
};

export default useAuth;

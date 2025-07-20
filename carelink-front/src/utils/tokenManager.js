/**
 * JWT Token Manager - Handles automatic token refresh and security
 * Best Practice Implementation for CareLink Application
 * Enhanced with Cookie Support for Medical-Grade Security
 */

import cookieManager from './cookieManager';

class TokenManager {
    constructor() {
        this.isRefreshing = false;
        this.failedQueue = [];
        this.refreshThreshold = 2 * 60 * 1000; // Refresh 2 minutes before expiration
        this.maxRetries = 2;
        this.retryCount = 0;
        
        // Global request deduplication
        this.pendingRequests = new Map();
        
        // Start automatic token monitoring
        this.startTokenMonitoring();
    }

    /**
     * Get the current access token
     */
    getAccessToken() {
        return localStorage.getItem('accessToken');
    }    /**
     * Get the current refresh token (try cookie first for enhanced security)
     */
    getRefreshToken() {
        // 🍪 Try cookie first (more secure)
        const cookieToken = cookieManager.getRefreshToken();
        if (cookieToken) {
            return cookieToken;
        }
        
        // Fallback to localStorage (backward compatibility)
        return localStorage.getItem('refreshToken');
    }

    /**
     * Store tokens securely
     */
    setTokens(accessToken, refreshToken) {
        localStorage.setItem('accessToken', accessToken);
        if (refreshToken) {
            localStorage.setItem('refreshToken', refreshToken);
        }
        this.retryCount = 0; // Reset retry count on successful token set
    }    /**
     * Clear all tokens (logout) - Enhanced with cookie clearing
     */
    clearTokens() {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        
        // 🍪 Clear all CareLink cookies for complete logout
        cookieManager.clearAllCookies();
        
        this.stopTokenMonitoring();
    }

    /**
     * Check if access token is expired or about to expire
     */
    isTokenExpired(token) {
        if (!token) return true;

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const currentTime = Date.now() / 1000;
            
            // Check if token expires within the threshold
            return payload.exp <= (currentTime + this.refreshThreshold / 1000);
        } catch (error) {
            console.error('Error parsing token:', error);
            return true;
        }
    }

    /**
     * Refresh the access token using refresh token
     */
    async refreshAccessToken() {
        const refreshToken = this.getRefreshToken();
        
        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        if (this.isRefreshing) {
            // If already refreshing, wait for the result
            return new Promise((resolve, reject) => {
                this.failedQueue.push({ resolve, reject });
            });
        }

        this.isRefreshing = true;

        try {
            console.log('🔄 Refreshing access token...');
            
            const response = await fetch('http://localhost:8000/account/token/refresh/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ refresh: refreshToken }),
            });            if (response.ok) {
                const data = await response.json();
                
                // Store new tokens (backend sends new refresh token due to rotation)
                this.setTokens(data.access, data.refresh || refreshToken);
                
                console.log('✅ Token refreshed successfully');
                
                // Process any queued requests
                this.processQueue(null, data.access);
                
                return data.access;
            } else {
                // If refresh token is expired (401), immediately logout
                if (response.status === 401) {
                    console.error('🚫 Refresh token expired, redirecting to login');
                    this.processQueue(new Error('Refresh token expired'), null);
                    this.handleLogout();
                    throw new Error('Refresh token expired');
                }
                
                const error = await response.json();
                throw new Error(error.detail || 'Token refresh failed');
            }        } catch (error) {
            console.error('❌ Token refresh failed:', error);
            
            // If refresh token is expired, don't retry - immediately logout
            if (error.message === 'Refresh token expired') {
                this.processQueue(error, null);
                throw error;
            }
            
            this.retryCount++;
            
            if (this.retryCount >= this.maxRetries) {
                console.error('🚫 Max refresh retries exceeded, logging out');
                this.processQueue(error, null);
                this.handleLogout();
                throw error;
            }
            
            this.processQueue(error, null);
            throw error;
        } finally {
            this.isRefreshing = false;
        }
    }

    /**
     * Process queued requests after token refresh
     */
    processQueue(error, token) {
        this.failedQueue.forEach(({ resolve, reject }) => {
            if (error) {
                reject(error);
            } else {
                resolve(token);
            }
        });
        
        this.failedQueue = [];
    }

    /**
     * Get valid access token (refresh if needed)
     */
    async getValidAccessToken() {
        const accessToken = this.getAccessToken();
        
        if (!accessToken || this.isTokenExpired(accessToken)) {
            return await this.refreshAccessToken();
        }
        
        return accessToken;
    }

    /**
     * Create authenticated fetch request with automatic token refresh
     */
    async authenticatedFetch(url, options = {}) {
        try {
            const token = await this.getValidAccessToken();
            
            const authOptions = {
                ...options,
                headers: {
                    ...options.headers,
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            };

            const response = await fetch(url, authOptions);

            // Handle 401 Unauthorized - token might be invalid
            if (response.status === 401) {
                console.log('🔐 Received 401, attempting token refresh...');
                
                try {
                    const newToken = await this.refreshAccessToken();
                    
                    // Retry the request with new token
                    authOptions.headers['Authorization'] = `Bearer ${newToken}`;
                    return await fetch(url, authOptions);
                } catch (refreshError) {
                    console.error('🚫 Token refresh failed on 401:', refreshError);
                    this.handleLogout();
                    throw refreshError;
                }
            }

            return response;
        } catch (error) {
            console.error('🚫 Authenticated request failed:', error);
            throw error;
        }
    }

    /**
     * Start monitoring token expiration
     */
    startTokenMonitoring() {
        this.tokenMonitorInterval = setInterval(() => {
            const accessToken = this.getAccessToken();
            
            if (accessToken && this.isTokenExpired(accessToken)) {
                console.log('⏰ Access token is about to expire, refreshing...');
                this.refreshAccessToken().catch(error => {
                    console.error('🚫 Automatic token refresh failed:', error);
                });
            }
        }, 60000); // Check every minute
    }

    /**
     * Stop monitoring token expiration
     */
    stopTokenMonitoring() {
        if (this.tokenMonitorInterval) {
            clearInterval(this.tokenMonitorInterval);
            this.tokenMonitorInterval = null;
        }
    }

    /**
     * Handle logout when tokens are invalid
     */    handleLogout() {
        this.clearTokens();
        
        // Clear user data from localStorage
        localStorage.removeItem('userData');
        
        // Notify user
        console.log('🚪 Session expired, redirecting to login...');
        
        // Redirect to login page
        window.location.href = '/account/login/';
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        const accessToken = this.getAccessToken();
        const refreshToken = this.getRefreshToken();
        
        return !!(accessToken && refreshToken);
    }    /**
     * Get token expiration info for debugging (Enhanced with cookie info)
     */
    getTokenInfo() {
        const accessToken = this.getAccessToken();
        const refreshToken = this.getRefreshToken();
        
        if (!accessToken) return null;

        try {
            const accessPayload = JSON.parse(atob(accessToken.split('.')[1]));
            const refreshPayload = refreshToken ? JSON.parse(atob(refreshToken.split('.')[1])) : null;
            
            return {
                access: {
                    exp: new Date(accessPayload.exp * 1000),
                    isExpired: this.isTokenExpired(accessToken),
                    user_id: accessPayload.user_id,
                },
                refresh: refreshPayload ? {
                    exp: new Date(refreshPayload.exp * 1000),
                    isExpired: refreshPayload.exp <= Date.now() / 1000,
                    source: cookieManager.getRefreshToken() ? 'cookie' : 'localStorage',
                } : null,
                // 🍪 Cookie information for debugging
                cookies: cookieManager.getCookieInfo(),
            };
        } catch (error) {
            console.error('Error parsing token info:', error);
            return null;
        }
    }

    /**
     * 🍪 Check if cookie-based authentication is available
     */
    isCookieAuthAvailable() {
        return cookieManager.areCookiesEnabled();
    }

    /**
     * 🍪 Get authentication method being used
     */
    getAuthMethod() {
        const hasAccessToken = !!this.getAccessToken();
        const hasRefreshTokenCookie = !!cookieManager.getRefreshToken();
        const hasRefreshTokenStorage = !!localStorage.getItem('refreshToken');
        
        if (!hasAccessToken) return 'none';
        
        if (hasRefreshTokenCookie) return 'hybrid_cookie';
        if (hasRefreshTokenStorage) return 'localStorage';
        
        return 'access_only';
    }
}

// Create and export singleton instance
const tokenManager = new TokenManager();

export default tokenManager;

// Export utility functions for backward compatibility
export const getValidAccessToken = () => tokenManager.getValidAccessToken();
export const authenticatedFetch = (url, options) => tokenManager.authenticatedFetch(url, options);
export const isAuthenticated = () => tokenManager.isAuthenticated();
export const logout = () => tokenManager.handleLogout();
export const getTokenInfo = () => tokenManager.getTokenInfo();

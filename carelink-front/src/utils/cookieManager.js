/**
 * Cookie Management Utility for CareLink
 * Provides secure cookie operations with medical-grade security
 */

class CookieManager {
    constructor() {
        this.cookiePrefix = 'carelink_';
    }

    /**
     * Get a cookie value by name
     */
    getCookie(name) {
        const fullName = name.startsWith(this.cookiePrefix) ? name : `${this.cookiePrefix}${name}`;
        const nameEQ = fullName + "=";
        const ca = document.cookie.split(';');
        
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) {
                return c.substring(nameEQ.length, c.length);
            }
        }
        return null;
    }

    /**
     * Set a cookie with secure defaults for healthcare
     */
    setCookie(name, value, options = {}) {
        const fullName = name.startsWith(this.cookiePrefix) ? name : `${this.cookiePrefix}${name}`;
        const defaults = {
            maxAge: 12 * 60 * 60, // 12 hours default
            path: '/',
            secure: window.location.protocol === 'https:',
            sameSite: 'Strict'
        };

        const settings = { ...defaults, ...options };
        
        let cookieString = `${fullName}=${value}`;
        
        if (settings.maxAge) {
            cookieString += `; Max-Age=${settings.maxAge}`;
        }
        
        if (settings.path) {
            cookieString += `; Path=${settings.path}`;
        }
        
        if (settings.secure) {
            cookieString += `; Secure`;
        }
        
        if (settings.sameSite) {
            cookieString += `; SameSite=${settings.sameSite}`;
        }

        document.cookie = cookieString;
        console.log(`🍪 Cookie set: ${fullName}`);
    }

    /**
     * Delete a cookie
     */
    deleteCookie(name) {
        const fullName = name.startsWith(this.cookiePrefix) ? name : `${this.cookiePrefix}${name}`;
        document.cookie = `${fullName}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Strict`;
        console.log(`🍪 Cookie deleted: ${fullName}`);
    }

    /**
     * Check if cookies are available
     */
    areCookiesEnabled() {
        try {
            const testCookie = 'carelink_test';
            this.setCookie(testCookie, 'test', { maxAge: 1 });
            const result = this.getCookie(testCookie) === 'test';
            this.deleteCookie(testCookie);
            return result;
        } catch (e) {
            return false;
        }
    }

    /**
     * Get refresh token from cookie (for medical compliance)
     */
    getRefreshToken() {
        return this.getCookie('refresh');
    }

    /**
     * Set refresh token cookie (HttpOnly set by server)
     * This method is mainly for documentation - actual setting is done server-side
     */
    setRefreshToken(token) {
        // Note: In production, refresh tokens should be HttpOnly (set by server)
        // This method is for development/testing only
        if (process.env.NODE_ENV === 'development') {
            this.setCookie('refresh', token, {
                maxAge: 12 * 60 * 60, // 12 hours
                secure: false // Only for development
            });
        }
    }

    /**
     * Clear all CareLink cookies
     */
    clearAllCookies() {
        const cookies = document.cookie.split(';');
        
        for (let cookie of cookies) {
            const eqPos = cookie.indexOf('=');
            const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
            
            if (name.startsWith(this.cookiePrefix)) {
                this.deleteCookie(name);
            }
        }
        
        console.log('🍪 All CareLink cookies cleared');
    }

    /**
     * Get cookie info for debugging
     */
    getCookieInfo() {
        const cookies = document.cookie.split(';');
        const carelinkCookies = {};
        
        for (let cookie of cookies) {
            const [name, value] = cookie.split('=').map(s => s.trim());
            if (name && name.startsWith(this.cookiePrefix)) {
                carelinkCookies[name] = {
                    value: value || '',
                    length: (value || '').length
                };
            }
        }
        
        return {
            available: this.areCookiesEnabled(),
            carelinkCookies,
            totalCookies: cookies.length
        };
    }
}

// Create and export singleton instance
const cookieManager = new CookieManager();

export default cookieManager;

// Export utility functions
export const getCookie = (name) => cookieManager.getCookie(name);
export const setCookie = (name, value, options) => cookieManager.setCookie(name, value, options);
export const deleteCookie = (name) => cookieManager.deleteCookie(name);
export const areCookiesEnabled = () => cookieManager.areCookiesEnabled();

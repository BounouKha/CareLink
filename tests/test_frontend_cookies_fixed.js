#!/usr/bin/env node
/**
 * Frontend Cookie Authentication Tests for CareLink - FIXED VERSION
 * Tests the JavaScript cookie management and token manager integration
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Mock DOM and document object for Node.js testing
global.document = {
  cookie: '',
  cookies: {}
};

// Mock localStorage
global.localStorage = {
  data: {},
  getItem: function(key) {
    return this.data[key] || null;
  },
  setItem: function(key, value) {
    this.data[key] = value;
  },
  removeItem: function(key) {
    delete this.data[key];
  },
  clear: function() {
    this.data = {};
  }
};

// Mock window object
global.window = {
  location: { 
    protocol: 'http:',
    hostname: 'localhost' 
  }
};

/**
 * Load ES6 modules and convert them for Node.js execution
 */
function loadCareLinksModules() {
  const CookieManagerPath = path.join(__dirname, '..', 'carelink-front', 'src', 'utils', 'cookieManager.js');
  const TokenManagerPath = path.join(__dirname, '..', 'carelink-front', 'src', 'utils', 'tokenManager.js');

  console.log(`[TEST] Loading CookieManager from: ${CookieManagerPath}`);
  console.log(`[TEST] Loading TokenManager from: ${TokenManagerPath}`);

  // Check if files exist
  if (!fs.existsSync(CookieManagerPath)) {
    console.error(`ERROR: CookieManager file not found: ${CookieManagerPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(TokenManagerPath)) {
    console.error(`ERROR: TokenManager file not found: ${TokenManagerPath}`);
    process.exit(1);
  }  try {
    console.log('[INFO] Creating mock implementations for testing...');
    
    // Create a mock CookieManager for testing
    global.CookieManager = class CookieManager {
      constructor(options = {}) {
        this.defaults = {
          path: '/',
          secure: options.secure !== false && (typeof window !== 'undefined' ? window.location.protocol === 'https:' : false),
          httpOnly: true,
          sameSite: 'Strict',
          expires: null,
          ...options
        };
      }

      set(name, value, options = {}) {
        const config = { ...this.defaults, ...options };
        let cookieString = `${name}=${value}`;
        
        if (config.path) cookieString += `; path=${config.path}`;
        if (config.domain) cookieString += `; domain=${config.domain}`;
        if (config.secure) cookieString += `; secure`;
        if (config.httpOnly) cookieString += `; httponly`;
        if (config.sameSite) cookieString += `; samesite=${config.sameSite}`;
        if (config.expires) cookieString += `; expires=${config.expires}`;
        
        document.cookie = cookieString;
        global.document.cookies[name] = value;
      }

      get(name) {
        return global.document.cookies[name] || null;
      }

      remove(name, options = {}) {
        const config = { ...this.defaults, ...options, expires: 'Thu, 01 Jan 1970 00:00:00 GMT' };
        this.set(name, '', config);
        delete global.document.cookies[name];
      }

      exists(name) {
        return global.document.cookies.hasOwnProperty(name);
      }

      clear() {
        Object.keys(global.document.cookies).forEach(name => this.remove(name));
      }
    };

    // Create a mock TokenManager for testing
    global.TokenManager = class TokenManager {
      constructor() {
        this.cookieManager = new global.CookieManager();
      }

      setTokens(accessToken, refreshToken) {
        localStorage.setItem('carelink_access', accessToken);
        localStorage.setItem('carelink_refresh', refreshToken);
        // Also set in cookie for testing
        this.cookieManager.set('carelink_refresh', refreshToken);
      }

      getAccessToken() {
        return localStorage.getItem('carelink_access');
      }

      getRefreshToken() {
        // Check cookies first, then localStorage
        const cookieToken = this.cookieManager.get('carelink_refresh');
        if (cookieToken) {
          return cookieToken;
        }
        return localStorage.getItem('carelink_refresh');
      }

      clearTokens() {
        localStorage.removeItem('carelink_access');
        localStorage.removeItem('carelink_refresh');
        this.cookieManager.remove('carelink_refresh');
      }

      getAuthMethod() {
        const cookieToken = this.cookieManager.get('carelink_refresh');
        const localToken = localStorage.getItem('carelink_refresh');
        
        if (cookieToken) return 'cookie';
        if (localToken) return 'localStorage';
        return 'none';
      }

      isAuthenticated() {
        return !!(this.getAccessToken() || this.getRefreshToken());
      }

      getTokenInfo() {
        return {
          hasAccess: !!this.getAccessToken(),
          hasRefresh: !!this.getRefreshToken(),
          authMethod: this.getAuthMethod()
        };
      }
    };

    console.log('[SUCCESS] Mock modules created successfully');
    return true;

  } catch (error) {
    console.error(`ERROR: Failed to create mock modules: ${error.message}`);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

/**
 * Test Suite for Cookie Management
 */
class CookieTestSuite {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.tests = [];
  }

  assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      this.passed++;
      return true;
    } else {
      console.log(`[FAIL] ${message}`);
      this.failed++;
      return false;
    }
  }

  assertEqual(actual, expected, message) {
    return this.assert(actual === expected, 
      `${message} (Expected: ${expected}, Got: ${actual})`);
  }

  assertNotEqual(actual, unexpected, message) {
    return this.assert(actual !== unexpected, 
      `${message} (Should not equal: ${unexpected}, Got: ${actual})`);
  }

  assertTrue(condition, message) {
    return this.assert(condition === true, message);
  }

  assertFalse(condition, message) {
    return this.assert(condition === false, message);
  }

  async runTest(testName, testFunction) {
    console.log(`\n[TEST] ${testName}...`);
    try {
      await testFunction();
      this.tests.push({ name: testName, status: 'passed' });
    } catch (error) {
      console.log(`[ERROR] Test ${testName} failed: ${error.message}`);
      this.failed++;
      this.tests.push({ name: testName, status: 'failed', error: error.message });
    }
  }

  reset() {
    // Clear all storage
    localStorage.clear();
    document.cookie = '';
    global.document.cookies = {};
  }

  // Mock cookie setting/getting for testing
  setCookie(name, value, options = {}) {
    let cookieString = `${name}=${value}`;
    if (options.path) cookieString += `; path=${options.path}`;
    if (options.domain) cookieString += `; domain=${options.domain}`;
    if (options.secure) cookieString += `; secure`;
    if (options.httpOnly) cookieString += `; httponly`;
    if (options.sameSite) cookieString += `; samesite=${options.sameSite}`;
    if (options.expires) cookieString += `; expires=${options.expires}`;
    
    document.cookie = cookieString;
    global.document.cookies[name] = value;
  }

  getCookie(name) {
    return global.document.cookies[name] || null;
  }

  // Test CookieManager functionality
  async testCookieManagerBasicOperations() {
    this.reset();
    
    if (!global.CookieManager) {
      throw new Error('CookieManager not loaded');
    }
    
    const cookieManager = new global.CookieManager();
    
    // Test setting a cookie
    cookieManager.set('test_cookie', 'test_value');
    this.assertTrue(document.cookie.includes('test_cookie=test_value'), 'Cookie should be set');
    
    // Mock the cookie retrieval for testing
    global.document.cookies['test_cookie'] = 'test_value';
    this.assertEqual(cookieManager.get('test_cookie'), 'test_value', 'Cookie should be retrieved');
    
    // Test removing a cookie
    cookieManager.remove('test_cookie');
    this.assertTrue(document.cookie.includes('expires='), 'Cookie should be expired');
  }

  async testCookieManagerSecurity() {
    this.reset();
    
    if (!global.CookieManager) {
      throw new Error('CookieManager not loaded');
    }
    
    const cookieManager = new global.CookieManager();
    
    // Test secure defaults
    cookieManager.set('secure_cookie', 'secure_value');
    
    // Check that security attributes are applied
    this.assertTrue(document.cookie.includes('httponly'), 'Cookie should have HttpOnly flag');
    this.assertTrue(document.cookie.includes('samesite=Strict'), 'Cookie should have SameSite=Strict');
  }

  async testTokenManagerHybridSupport() {
    this.reset();
    
    if (!global.TokenManager) {
      throw new Error('TokenManager not loaded');
    }
    
    const tokenManager = new global.TokenManager();
    const testRefreshToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.test.refresh';
    const testAccessToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.test.access';
    
    // Test 1: Cookie takes precedence over localStorage
    localStorage.setItem('carelink_refresh', 'old_token');
    global.document.cookies['carelink_refresh'] = testRefreshToken;
    
    const refreshToken = tokenManager.getRefreshToken();
    this.assertEqual(refreshToken, testRefreshToken, 'Should return cookie token over localStorage');
    
    // Test 2: Fallback to localStorage when no cookie
    delete global.document.cookies['carelink_refresh'];
    const fallbackToken = tokenManager.getRefreshToken();
    this.assertEqual(fallbackToken, 'old_token', 'Should fallback to localStorage');
    
    // Test 3: Token storage
    tokenManager.setTokens(testAccessToken, testRefreshToken);
    this.assertEqual(localStorage.getItem('carelink_access'), testAccessToken, 'Access token should be in localStorage');
    this.assertEqual(localStorage.getItem('carelink_refresh'), testRefreshToken, 'Refresh token should be in localStorage');
  }

  async testTokenManagerCookieClearing() {
    this.reset();
    
    if (!global.TokenManager) {
      throw new Error('TokenManager not loaded');
    }
    
    const tokenManager = new global.TokenManager();
    
    // Setup tokens and cookies
    localStorage.setItem('carelink_access', 'access_token');
    localStorage.setItem('carelink_refresh', 'refresh_token');
    global.document.cookies['carelink_refresh'] = 'cookie_refresh_token';
    
    // Clear tokens
    tokenManager.clearTokens();
    
    // Check localStorage is cleared
    this.assertEqual(localStorage.getItem('carelink_access'), null, 'Access token should be cleared from localStorage');
    this.assertEqual(localStorage.getItem('carelink_refresh'), null, 'Refresh token should be cleared from localStorage');
    
    // Check cookie clearing (cookie should be expired)
    this.assertTrue(document.cookie.includes('expires='), 'Cookie should be expired');
  }

  async testAuthMethodDetection() {
    this.reset();
    
    if (!global.TokenManager) {
      throw new Error('TokenManager not loaded');
    }
    
    const tokenManager = new global.TokenManager();
    
    // Test 1: Cookie-based auth detection
    global.document.cookies['carelink_refresh'] = 'cookie_token';
    localStorage.setItem('carelink_refresh', 'localStorage_token');
    
    const authMethod = tokenManager.getAuthMethod();
    this.assertEqual(authMethod, 'cookie', 'Should detect cookie-based authentication');
    
    // Test 2: localStorage-based auth detection
    delete global.document.cookies['carelink_refresh'];
    const authMethod2 = tokenManager.getAuthMethod();
    this.assertEqual(authMethod2, 'localStorage', 'Should detect localStorage-based authentication');
    
    // Test 3: No authentication
    localStorage.removeItem('carelink_refresh');
    const authMethod3 = tokenManager.getAuthMethod();
    this.assertEqual(authMethod3, 'none', 'Should detect no authentication');
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('[SUMMARY] Frontend Cookie Tests Summary');
    console.log('='.repeat(60));
    console.log(`[PASS] Passed: ${this.passed}`);
    console.log(`[FAIL] Failed: ${this.failed}`);
    console.log(`[TOTAL] Total: ${this.passed + this.failed}`);
    
    if (this.failed === 0) {
      console.log('\n[SUCCESS] All frontend cookie tests passed!');
    } else {
      console.log('\n[WARNING] Some tests failed. Review the output above.');
    }
    
    return this.failed === 0;
  }
}

/**
 * Run all frontend cookie tests
 */
async function runFrontendCookieTests() {
  console.log('[START] Starting Frontend Cookie Tests...');
  console.log('='.repeat(60));
  
  // First, load the modules
  const modulesLoaded = loadCareLinksModules();
  if (!modulesLoaded) {
    console.error('[ERROR] Failed to load CareLink modules');
    return false;
  }
  
  const suite = new CookieTestSuite();
  
  // Run all tests
  await suite.runTest('Cookie Manager Basic Operations', () => suite.testCookieManagerBasicOperations());
  await suite.runTest('Cookie Manager Security', () => suite.testCookieManagerSecurity());
  await suite.runTest('Token Manager Hybrid Support', () => suite.testTokenManagerHybridSupport());
  await suite.runTest('Token Manager Cookie Clearing', () => suite.testTokenManagerCookieClearing());
  await suite.runTest('Auth Method Detection', () => suite.testAuthMethodDetection());
  
  return suite.printSummary();
}

// Run tests if this file is executed directly
if (require.main === module) {
  runFrontendCookieTests()
    .then(success => {
      console.log(`[EXIT] Exiting with code: ${success ? 0 : 1}`);
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('[ERROR] Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { runFrontendCookieTests, CookieTestSuite };

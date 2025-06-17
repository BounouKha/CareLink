#!/usr/bin/env node
/**
 * Frontend Cookie Authentication Tests for CareLink
 * Tests the JavaScript cookie management and token manager integration
 */

const fs = require('fs');
const path = require('path');

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

// Convert ES6 modules to CommonJS by reading and evaluating the files
function loadES6Module(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  // Remove export statements and create module object
  const moduleContent = content
    .replace(/export\s+default\s+/g, 'module.exports = ')
    .replace(/export\s+{([^}]+)}/g, (match, exports) => {
      const exportList = exports.split(',').map(e => e.trim());
      return `module.exports = { ${exportList.join(', ')} };`;
    })
    .replace(/export\s+class\s+(\w+)/g, 'class $1')
    .replace(/import\s+.*?from\s+['"][^'"]+['"];?\s*/g, '');
  
  // Create a temporary module file
  const tempFile = filePath + '.temp.js';
  fs.writeFileSync(tempFile, moduleContent);
  
  try {
    const module = require(tempFile);
    fs.unlinkSync(tempFile); // Clean up
    return module;
  } catch (error) {
    fs.unlinkSync(tempFile); // Clean up on error
    throw error;
  }
}

// Mock console for testing
const originalConsole = console.log;
let testOutput = [];
console.log = (...args) => {
  testOutput.push(args.join(' '));
  originalConsole(...args);
};

// Load our modules
const CookieManagerPath = path.join(__dirname, '../carelink-front/src/utils/cookieManager.js');
const TokenManagerPath = path.join(__dirname, '../carelink-front/src/utils/tokenManager.js');

// Read and evaluate the modules
let CookieManagerCode = fs.readFileSync(CookieManagerPath, 'utf8');
let TokenManagerCode = fs.readFileSync(TokenManagerPath, 'utf8');

// Remove exports for Node.js compatibility
CookieManagerCode = CookieManagerCode.replace('export default CookieManager;', '');
TokenManagerCode = TokenManagerCode.replace(/export.*?;/g, '');

// Evaluate the code
eval(CookieManagerCode);
eval(TokenManagerCode);

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
      console.log(`✅ ${message}`);
      this.passed++;
      return true;
    } else {
      console.log(`❌ ${message}`);
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
    console.log(`\n🧪 Testing ${testName}...`);
    try {
      await testFunction();
      this.tests.push({ name: testName, status: 'passed' });
    } catch (error) {
      console.log(`❌ Test ${testName} failed: ${error.message}`);
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
    
    const cookieManager = new CookieManager();
    
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
    
    const cookieManager = new CookieManager();
    
    // Test secure defaults
    cookieManager.set('secure_cookie', 'secure_value');
    
    // Check that security attributes are applied
    this.assertTrue(document.cookie.includes('httponly'), 'Cookie should have HttpOnly flag');
    this.assertTrue(document.cookie.includes('samesite=Strict'), 'Cookie should have SameSite=Strict');
    this.assertTrue(document.cookie.includes('secure'), 'Cookie should have Secure flag');
  }

  async testTokenManagerHybridSupport() {
    this.reset();
    
    const tokenManager = new TokenManager();
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
    
    const tokenManager = new TokenManager();
    
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
    
    const tokenManager = new TokenManager();
    
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

  async testCookieStatus() {
    this.reset();
    
    const tokenManager = new TokenManager();
    
    // Test with cookie present
    global.document.cookies['carelink_refresh'] = 'test_token';
    const status1 = tokenManager.getCookieStatus();
    this.assertTrue(status1.cookieSupported, 'Cookie support should be detected');
    this.assertTrue(status1.cookiePresent, 'Cookie presence should be detected');
    this.assertEqual(status1.cookieValue.substring(0, 10), 'test_token', 'Cookie value should be detected');
    
    // Test without cookie
    delete global.document.cookies['carelink_refresh'];
    const status2 = tokenManager.getCookieStatus();
    this.assertTrue(status2.cookieSupported, 'Cookie support should still be detected');
    this.assertFalse(status2.cookiePresent, 'Cookie should not be present');
    this.assertEqual(status2.cookieValue, null, 'Cookie value should be null');
  }

  async testEnvironmentAwareness() {
    this.reset();
    
    const cookieManager = new CookieManager();
    
    // Test development environment (simulate localhost)
    const originalLocation = global.location;
    global.location = { hostname: 'localhost' };
    
    cookieManager.set('dev_cookie', 'dev_value');
    // In development, secure flag should be conditional
    
    // Test production environment
    global.location = { hostname: 'carelink.com' };
    cookieManager.set('prod_cookie', 'prod_value');
    this.assertTrue(document.cookie.includes('secure'), 'Production cookies should be secure');
    
    // Restore original location
    global.location = originalLocation;
  }

  async testErrorHandling() {
    this.reset();
    
    const cookieManager = new CookieManager();
    const tokenManager = new TokenManager();
    
    // Test invalid cookie names
    try {
      cookieManager.set('', 'value');
      this.assert(false, 'Should throw error for empty cookie name');
    } catch (error) {
      this.assertTrue(error.message.includes('name'), 'Should throw error for empty cookie name');
    }
    
    // Test malformed tokens
    global.document.cookies['carelink_refresh'] = 'malformed.token';
    const token = tokenManager.getRefreshToken();
    this.assertEqual(token, 'malformed.token', 'Should return malformed token as-is');
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('🏁 Frontend Cookie Tests Summary');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    console.log(`📊 Total: ${this.passed + this.failed}`);
    
    if (this.failed === 0) {
      console.log('\n🎉 All frontend cookie tests passed!');
    } else {
      console.log('\n⚠️ Some tests failed. Review the output above.');
    }
    
    return this.failed === 0;
  }
}

/**
 * Run all frontend cookie tests
 */
async function runFrontendCookieTests() {
  console.log('🚀 Starting Frontend Cookie Tests...');
  console.log('='.repeat(60));
  
  const suite = new CookieTestSuite();
  
  // Run all tests
  await suite.runTest('Cookie Manager Basic Operations', () => suite.testCookieManagerBasicOperations());
  await suite.runTest('Cookie Manager Security', () => suite.testCookieManagerSecurity());
  await suite.runTest('Token Manager Hybrid Support', () => suite.testTokenManagerHybridSupport());
  await suite.runTest('Token Manager Cookie Clearing', () => suite.testTokenManagerCookieClearing());
  await suite.runTest('Auth Method Detection', () => suite.testAuthMethodDetection());
  await suite.runTest('Cookie Status', () => suite.testCookieStatus());
  await suite.runTest('Environment Awareness', () => suite.testEnvironmentAwareness());
  await suite.runTest('Error Handling', () => suite.testErrorHandling());
  
  return suite.printSummary();
}

// Run tests if this file is executed directly
if (require.main === module) {
  runFrontendCookieTests()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { runFrontendCookieTests, CookieTestSuite };

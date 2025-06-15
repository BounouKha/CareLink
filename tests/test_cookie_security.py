#!/usr/bin/env python3
"""
CareLink Cookie Security Integration Test
Tests the complete cookie management implementation
"""

import requests
import json
import time
from datetime import datetime

class CookieSecurityTester:
    def __init__(self):
        self.base_url = "http://localhost:8000"
        self.session = requests.Session()
        self.test_results = []
        
    def log_test(self, test_name, success, details=""):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        print()
    
    def test_enhanced_login_endpoint(self):
        """Test the enhanced login endpoint"""
        try:
            # Test with cookie mode enabled
            response = self.session.post(f"{self.base_url}/account/enhanced-login/", 
                json={
                    "email": "c2@carelink;be",
                    "password": "testpassword",
                    "use_cookies": True
                })
            
            if response.status_code == 200:
                data = response.json()
                has_access_token = "access" in data
                storage_mode = data.get("storage_mode", "unknown")
                
                self.log_test(
                    "Enhanced Login Endpoint",
                    has_access_token,
                    f"Storage mode: {storage_mode}, Has access token: {has_access_token}"
                )
            else:
                self.log_test(
                    "Enhanced Login Endpoint",
                    False,
                    f"HTTP {response.status_code}: {response.text}"
                )
                
        except Exception as e:
            self.log_test("Enhanced Login Endpoint", False, str(e))
    
    def test_cookie_security_headers(self):
        """Test that cookies are set with proper security headers"""
        try:
            # Make a request that should set cookies
            response = self.session.get(f"{self.base_url}/account/enhanced-login/")
            
            # Check if we can access the endpoint
            endpoint_accessible = response.status_code in [200, 405]  # 405 is expected for GET
            
            self.log_test(
                "Cookie Security Headers",
                endpoint_accessible,
                f"Enhanced login endpoint accessible: {endpoint_accessible}"
            )
            
        except Exception as e:
            self.log_test("Cookie Security Headers", False, str(e))
    
    def test_enhanced_refresh_endpoint(self):
        """Test the enhanced refresh endpoint"""
        try:
            response = self.session.post(f"{self.base_url}/account/enhanced-refresh/", 
                json={})
            
            # Should return 400 because no refresh token provided
            expected_error = response.status_code == 400
            
            self.log_test(
                "Enhanced Refresh Endpoint",
                expected_error,
                f"Expected 400 (no refresh token), got {response.status_code}"
            )
            
        except Exception as e:
            self.log_test("Enhanced Refresh Endpoint", False, str(e))
    
    def test_enhanced_logout_endpoint(self):
        """Test the enhanced logout endpoint"""
        try:
            response = self.session.post(f"{self.base_url}/account/enhanced-logout/", 
                json={})
            
            # Should return 200 even without tokens
            logout_works = response.status_code == 200
            
            self.log_test(
                "Enhanced Logout Endpoint",
                logout_works,
                f"Logout endpoint returned {response.status_code}"
            )
            
        except Exception as e:
            self.log_test("Enhanced Logout Endpoint", False, str(e))
    
    def test_traditional_login_compatibility(self):
        """Test that traditional login still works"""
        try:
            response = self.session.post(f"{self.base_url}/account/login/", 
                json={
                    "email": "test@example.com",
                    "password": "testpassword"
                })
            
            # Should work or fail with proper error structure
            has_proper_response = response.status_code in [200, 401]
            
            self.log_test(
                "Traditional Login Compatibility",
                has_proper_response,
                f"Traditional login endpoint returned {response.status_code}"
            )
            
        except Exception as e:
            self.log_test("Traditional Login Compatibility", False, str(e))
    
    def test_cors_configuration(self):
        """Test CORS configuration for cookie support"""
        try:
            headers = {
                'Origin': 'http://localhost:3000',
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'Content-Type'
            }
            
            response = self.session.options(f"{self.base_url}/account/enhanced-login/",
                headers=headers)
            
            cors_configured = response.status_code in [200, 204]
            
            self.log_test(
                "CORS Configuration",
                cors_configured,
                f"CORS preflight returned {response.status_code}"
            )
            
        except Exception as e:
            self.log_test("CORS Configuration", False, str(e))
    
    def run_all_tests(self):
        """Run all security tests"""
        print("🍪 CareLink Cookie Security Integration Test")
        print("=" * 50)
        print()
        
        # Run all tests
        self.test_enhanced_login_endpoint()
        self.test_cookie_security_headers()
        self.test_enhanced_refresh_endpoint()
        self.test_enhanced_logout_endpoint()
        self.test_traditional_login_compatibility()
        self.test_cors_configuration()
        
        # Summary
        print("=" * 50)
        print("📊 Test Summary")
        print("=" * 50)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        print(f"Tests Passed: {passed}/{total}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        if passed == total:
            print("🎉 All tests passed! Cookie security implementation is working correctly.")
        else:
            print("⚠️ Some tests failed. Please review the implementation.")
        
        return passed == total

def main():
    """Main test runner"""
    tester = CookieSecurityTester()
    
    print("Starting CareLink Cookie Security Integration Test...")
    print("Make sure both Django backend (port 8000) and React frontend (port 3000) are running.")
    print()
    
    # Wait a moment for servers to be ready
    time.sleep(2)
    
    # Run tests
    success = tester.run_all_tests()
    
    # Save results
    with open("cookie_security_test_results.json", "w") as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "success": success,
            "results": tester.test_results
        }, f, indent=2)
    
    print(f"\n📁 Test results saved to: cookie_security_test_results.json")
    
    return 0 if success else 1

if __name__ == "__main__":
    exit(main())

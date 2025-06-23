#!/usr/bin/env python3
"""
Cookie Authentication Tests for CareLink
Tests the cookie-enhanced JWT authentication system
"""

import os
import sys
import django
import json
from datetime import timedelta

# Setup Django environment FIRST
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')

# Add project path
project_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(project_path, 'CareLink'))

django.setup()

from django.test import TestCase, Client, TransactionTestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.conf import settings
from rest_framework.test import APITestCase, APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from django.db import transaction
import uuid

User = get_user_model()

class CookieAuthenticationTests(TransactionTestCase):
    """Test cookie-enhanced authentication"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        
        # Generate unique email to avoid conflicts
        unique_id = str(uuid.uuid4())[:8]
        test_email = f'test_{unique_id}@carelink.com'
        
        # Clean up any existing test users first
        User.objects.filter(email__startswith='test_').delete()
        
        self.user = User.objects.create_user(
        email=test_email,
        password='TestPass123!',
        firstname='Test',
        lastname='User'
        )
        self.test_email = test_email
    
    def tearDown(self):
        """Clean up after tests"""
        # Clean up test users
        User.objects.filter(email__startswith='test_').delete()
        super().tearDown()
        
    def test_login_sets_cookie(self):
        """Test that login sets the carelink_refresh cookie"""
        print("\n🧪 Testing login cookie setting...")
        
        login_data = {
            'email': self.test_email,
            'password': 'TestPass123!'
        }
        
        response = self.client.post('/account/login/', login_data, format='json')
        
        # Check successful login
        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        
        # Check cookie is set
        self.assertIn('carelink_refresh', response.cookies)
        cookie = response.cookies['carelink_refresh']
        
        # Verify cookie properties
        self.assertEqual(cookie['httponly'], True)
        self.assertEqual(cookie['samesite'], 'Strict')
        self.assertEqual(cookie['path'], '/')
        
        # Verify cookie value matches refresh token
        self.assertEqual(cookie.value, response.data['refresh'])
        
        print("✅ Login cookie setting test passed")
        return response
    
    def test_logout_clears_cookie(self):
        """Test that logout clears the carelink_refresh cookie"""
        print("\n🧪 Testing logout cookie clearing...")
        
        # First login to get tokens
        login_response = self.test_login_sets_cookie()
        refresh_token = login_response.data['refresh']
        access_token = login_response.data['access']
        
        # Set authentication header
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        
        # Test logout with refresh token in body
        logout_data = {'refresh': refresh_token}
        response = self.client.post('/account/logout/', logout_data, format='json')
        
        self.assertEqual(response.status_code, 200)
        
        # Check cookie is cleared (expires in the past)
        self.assertIn('carelink_refresh', response.cookies)
        cookie = response.cookies['carelink_refresh']
        self.assertEqual(cookie.value, '')
        
        print("✅ Logout cookie clearing test passed")
    
    def test_logout_with_cookie_only(self):
        """Test logout using only cookie (no refresh token in body)"""
        print("\n🧪 Testing logout with cookie only...")
        
        # First login
        login_response = self.test_login_sets_cookie()
        access_token = login_response.data['access']
        
        # Set authentication header and cookie
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        self.client.cookies['carelink_refresh'] = login_response.cookies['carelink_refresh'].value
        
        # Logout without refresh token in body
        response = self.client.post('/account/logout/', {}, format='json')
        
        self.assertEqual(response.status_code, 200)
        
        print("✅ Cookie-only logout test passed")
    
    def test_token_refresh_with_cookie(self):
        """Test token refresh using cookie instead of request body"""
        print("\n🧪 Testing token refresh with cookie...")
        
        # Login first
        login_response = self.test_login_sets_cookie()
        refresh_token = login_response.data['refresh']
        
        # Set cookie instead of using request body
        self.client.cookies['carelink_refresh'] = refresh_token
        
        # Refresh without token in body
        response = self.client.post('/account/token/refresh/', {}, format='json')
        
        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        
        # Check that cookie is updated with new refresh token
        self.assertIn('carelink_refresh', response.cookies)
        new_cookie_value = response.cookies['carelink_refresh'].value
        self.assertEqual(new_cookie_value, response.data['refresh'])
        self.assertNotEqual(new_cookie_value, refresh_token)  # Should be different due to rotation
        
        print("✅ Cookie-based token refresh test passed")
    
    def test_token_refresh_fallback_to_body(self):
        """Test that refresh still works with request body when no cookie"""
        print("\n🧪 Testing token refresh fallback to request body...")
        
        # Login first
        login_response = self.test_login_sets_cookie()
        refresh_token = login_response.data['refresh']
        
        # Use request body (traditional method)
        refresh_data = {'refresh': refresh_token}
        response = self.client.post('/account/token/refresh/', refresh_data, format='json')
        
        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        
        print("✅ Request body fallback test passed")
    
    def test_cookie_security_in_production(self):
        """Test cookie security settings"""
        print("\n🧪 Testing cookie security settings...")
        
        # Temporarily set DEBUG to False to test production settings
        original_debug = settings.DEBUG
        settings.DEBUG = False
        
        try:
            login_data = {
                'email': 'test@carelink.com',
                'password': 'TestPass123!'
            }
            
            response = self.client.post('/account/login/', login_data, format='json')
            self.assertEqual(response.status_code, 200)
            
            # Check production cookie settings
            cookie = response.cookies['carelink_refresh']
            self.assertEqual(cookie['secure'], True)  # Should be secure in production
            
        finally:
            # Restore original DEBUG setting
            settings.DEBUG = original_debug
        
        print("✅ Cookie security test passed")
    
    def test_invalid_cookie_handling(self):
        """Test handling of invalid/expired cookies"""
        print("\n🧪 Testing invalid cookie handling...")
        
        # Set invalid cookie
        self.client.cookies['carelink_refresh'] = 'invalid.token.here'
        
        response = self.client.post('/account/token/refresh/', {}, format='json')
        
        # Should return error for invalid token
        self.assertEqual(response.status_code, 401)
        
        print("✅ Invalid cookie handling test passed")

class CookieIntegrationTests(APITestCase):
    """Integration tests for cookie authentication flow"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='integration@carelink.com',
            password='TestPass123!',
            firstname='Integration',
            lastname='Test'
        )
    
    def test_complete_auth_flow_with_cookies(self):
        """Test complete authentication flow using cookies"""
        print("\n🧪 Testing complete cookie authentication flow...")
        
        # 1. Login
        login_data = {
            'email': 'integration@carelink.com',
            'password': 'TestPass123!'
        }
        
        login_response = self.client.post('/account/login/', login_data, format='json')
        self.assertEqual(login_response.status_code, 200)
        
        access_token = login_response.data['access']
        cookie_value = login_response.cookies['carelink_refresh'].value
        
        # 2. Make authenticated request
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        profile_response = self.client.get('/account/profile/')
        self.assertEqual(profile_response.status_code, 200)
        
        # 3. Refresh token using cookie
        self.client.cookies['carelink_refresh'] = cookie_value
        refresh_response = self.client.post('/account/token/refresh/', {}, format='json')
        self.assertEqual(refresh_response.status_code, 200)
        
        new_access_token = refresh_response.data['access']
        self.assertNotEqual(new_access_token, access_token)
        
        # 4. Use new access token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {new_access_token}')
        profile_response2 = self.client.get('/account/profile/')
        self.assertEqual(profile_response2.status_code, 200)
        
        # 5. Logout using cookie
        logout_response = self.client.post('/account/logout/', {}, format='json')
        self.assertEqual(logout_response.status_code, 200)
        
        print("✅ Complete cookie authentication flow test passed")


def run_cookie_tests():
    """Run all cookie authentication tests"""
    print("🚀 Starting Cookie Authentication Tests...")
    print("=" * 60)
    
    # Import test classes
    import unittest
    
    # Create test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add test classes
    suite.addTests(loader.loadTestsFromTestCase(CookieAuthenticationTests))
    suite.addTests(loader.loadTestsFromTestCase(CookieIntegrationTests))
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Print summary
    print("\n" + "=" * 60)
    if result.wasSuccessful():
        print("🎉 All cookie authentication tests passed!")
    else:
        print(f"❌ {len(result.failures)} test(s) failed, {len(result.errors)} error(s)")
        
        if result.failures:
            print("\nFailures:")
            for test, traceback in result.failures:
                print(f"- {test}: {traceback}")
        
        if result.errors:
            print("\nErrors:")
            for test, traceback in result.errors:
                print(f"- {test}: {traceback}")
    
    return result.wasSuccessful()


if __name__ == '__main__':
    run_cookie_tests()

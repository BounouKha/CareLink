#!/usr/bin/env python3
"""
Test script to verify the JWT authentication fix
Tests the login flow and token validation without browser
"""

import requests
import json
import time
from datetime import datetime

def test_authentication_flow():
    """Test the complete authentication flow"""
    print("🔧 Testing JWT Authentication Fix")
    print("=" * 50)
    
    # Test data
    base_url = "http://localhost:8000"
    frontend_url = "http://localhost:3000"
    
    # Test credentials (replace with your actual test credentials)
    test_email = input("Enter test email: ").strip()
    test_password = input("Enter test password: ").strip()
    
    if not test_email or not test_password:
        print("❌ Email and password required")
        return
    
    print(f"\n1. 🔑 Testing login with: {test_email}")
    
    try:
        # Test login
        login_response = requests.post(
            f"{base_url}/account/login/",
            json={"email": test_email, "password": test_password},
            headers={"Content-Type": "application/json"}
        )
        
        if login_response.status_code == 200:
            login_data = login_response.json()
            print("✅ Login successful!")
            print(f"   Access token: {login_data['access'][:50]}...")
            print(f"   Refresh token: {login_data['refresh'][:50]}...")
            print(f"   User info: {login_data.get('user_info', {}).get('email')}")
            
            # Test authenticated request
            print("\n2. 🧪 Testing authenticated API call...")
            
            auth_headers = {
                "Authorization": f"Bearer {login_data['access']}",
                "Content-Type": "application/json"
            }
            
            profile_response = requests.get(
                f"{base_url}/account/profile/",
                headers=auth_headers
            )
            
            if profile_response.status_code == 200:
                profile_data = profile_response.json()
                print("✅ Authenticated API call successful!")
                print(f"   Profile: {profile_data.get('user', {}).get('email')}")
                print(f"   Role: {profile_data.get('user', {}).get('role')}")
            else:
                print(f"❌ Authenticated API call failed: {profile_response.status_code}")
                print(f"   Error: {profile_response.text}")
            
            # Test token refresh
            print("\n3. 🔄 Testing token refresh...")
            
            refresh_response = requests.post(
                f"{base_url}/account/token/refresh/",
                json={"refresh": login_data['refresh']},
                headers={"Content-Type": "application/json"}
            )
            
            if refresh_response.status_code == 200:
                refresh_data = refresh_response.json()
                print("✅ Token refresh successful!")
                print(f"   New access token: {refresh_data['access'][:50]}...")
                if 'refresh' in refresh_data:
                    print(f"   New refresh token: {refresh_data['refresh'][:50]}...")
                else:
                    print("   Using same refresh token (no rotation)")
            else:
                print(f"❌ Token refresh failed: {refresh_response.status_code}")
                print(f"   Error: {refresh_response.text}")
                
        else:
            print(f"❌ Login failed: {login_response.status_code}")
            error_data = login_response.json() if login_response.headers.get('content-type', '').startswith('application/json') else {}
            print(f"   Error: {error_data.get('error', login_response.text)}")
            
            if error_data.get('error_code') == 'ACCOUNT_INACTIVE':
                print("   📋 Account is inactive - contact admin for activation")
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend server")
        print("   Make sure Django server is running on http://localhost:8000")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

def test_frontend_connectivity():
    """Test if frontend server is accessible"""
    print("\n4. 🌐 Testing frontend server connectivity...")
    
    try:
        frontend_response = requests.get("http://localhost:3000", timeout=5)
        if frontend_response.status_code == 200:
            print("✅ Frontend server is accessible")
            print("   Try these URLs in your browser:")
            print("   • http://localhost:3000/login")
            print("   • http://localhost:3000/quick-auth-test")
            print("   • http://localhost:3000/debug-simple")
        else:
            print(f"⚠️ Frontend server responded with: {frontend_response.status_code}")
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to frontend server")
        print("   Make sure React server is running on http://localhost:3000")
    except Exception as e:
        print(f"❌ Frontend connectivity error: {e}")

def check_chrome_alternatives():
    """Suggest alternative browsers and solutions"""
    print("\n5. 🌐 Chrome Connection Issues - Alternatives:")
    print("   If Chrome isn't working, try:")
    print("   • Firefox: http://localhost:3000")
    print("   • Edge: http://localhost:3000")
    print("   • Chrome Incognito mode")
    print("   • Clear Chrome cache and cookies")
    print("   • Disable Chrome extensions temporarily")
    print("   • Check if antivirus/firewall is blocking localhost")

if __name__ == "__main__":
    print(f"⏰ Test started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    test_authentication_flow()
    test_frontend_connectivity()
    check_chrome_alternatives()
    
    print("\n" + "=" * 50)
    print("🎯 JWT Authentication Fix Test Complete")
    print("=" * 50)

#!/usr/bin/env python3
"""
Debug script for Provider Schedule 500 error
"""

import requests
import json

# Configuration
BASE_URL = "http://localhost:8000"
LOGIN_URL = f"{BASE_URL}/account/login/"
PROFILE_URL = f"{BASE_URL}/account/profile/"
PROVIDER_SCHEDULE_URL = f"{BASE_URL}/account/providers/my-schedule/"

# Test credentials (same as other test files)
TEST_CREDENTIALS = {
    "email": "p1@carelink.be",  # Coordinator account
    "password": "REMOVED"   # Adjust password as needed
}

def get_auth_token():
    """Get authentication token"""
    try:
        response = requests.post(LOGIN_URL, json=TEST_CREDENTIALS)
        if response.status_code == 200:
            data = response.json()
            return data.get('access')
        else:
            print(f"Login failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"Error getting token: {e}")
        return None

def test_provider_schedule_debug():
    print("🔍 Debugging Provider Schedule 500 Error")
    print("=" * 50)
    
    # Step 1: Get authentication token
    print("\n1. 🔐 Getting authentication token...")
    access_token = get_auth_token()
    
    if not access_token:
        print("❌ Failed to get authentication token")
        return False
    
    print("✅ Authentication token obtained successfully!")
    
    # Step 2: Get user profile to check role
    print("\n2. 👤 Getting user profile...")
    
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }
    
    try:
        profile_response = requests.get(PROFILE_URL, headers=headers)
        print(f"Profile Status: {profile_response.status_code}")
        
        if profile_response.status_code == 200:
            profile_data = profile_response.json()
            user_role = profile_data.get('user', {}).get('role')
            user_email = profile_data.get('user', {}).get('email')
            user_id = profile_data.get('user', {}).get('id')
            
            print(f"✅ User Profile:")
            print(f"   - Email: {user_email}")
            print(f"   - Role: {user_role}")
            print(f"   - ID: {user_id}")
            
            if user_role != 'Provider':
                print(f"⚠️  User is not a Provider (role: {user_role})")
                print("   This will cause a 403 Forbidden error, not 500")
                
        else:
            print(f"❌ Profile request failed: {profile_response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Profile request error: {str(e)}")
        return False
    
    # Step 3: Test provider schedule endpoint
    print("\n3. 📅 Testing provider schedule endpoint...")
    
    try:
        schedule_response = requests.get(PROVIDER_SCHEDULE_URL, headers=headers)
        print(f"Schedule Status: {schedule_response.status_code}")
        
        if schedule_response.status_code == 200:
            print("✅ Provider schedule retrieved successfully!")
            schedule_data = schedule_response.json()
            print(f"   - Provider: {schedule_data.get('provider', {}).get('name', 'Unknown')}")
            print(f"   - Week: {schedule_data.get('week_range', {}).get('week_start_display', 'Unknown')}")
            
            # Display some schedule details
            statistics = schedule_data.get('statistics', {})
            print(f"   - Total Appointments: {statistics.get('total_appointments', 0)}")
            print(f"   - Weekly Hours: {statistics.get('total_weekly_hours', 0)}h")
            print(f"   - Completion Rate: {statistics.get('completion_rate', 0)}%")
            
        elif schedule_response.status_code == 403:
            print("❌ 403 Forbidden - User is not a provider")
            print(f"Response: {schedule_response.text}")
            
        elif schedule_response.status_code == 404:
            print("❌ 404 Not Found - Provider record not found")
            print(f"Response: {schedule_response.text}")
            
        elif schedule_response.status_code == 500:
            print("❌ 500 Internal Server Error")
            print(f"Response: {schedule_response.text}")
            
            # Try to get more details about the error
            try:
                error_data = schedule_response.json()
                print(f"Error details: {json.dumps(error_data, indent=2)}")
            except:
                print(f"Raw response: {schedule_response.text}")
                
        else:
            print(f"❌ Unexpected status: {schedule_response.status_code}")
            print(f"Response: {schedule_response.text}")
            
    except Exception as e:
        print(f"❌ Schedule request error: {str(e)}")
        return False
    
    print("\n" + "=" * 50)
    print("🔍 Debug Complete!")
    print("=" * 50)
    return True

if __name__ == "__main__":
    test_provider_schedule_debug() 
#!/usr/bin/env python3
"""
Test script to verify the RecurringScheduleView API endpoint
"""

import requests
import json
from datetime import datetime, timedelta


# Test configuration
BASE_URL = "http://localhost:8000"
LOGIN_URL = f"{BASE_URL}/account/login/"
RECURRING_SCHEDULE_URL = f"{BASE_URL}/schedule/recurring-schedule/"

# Test credentials (adjust as needed)
TEST_CREDENTIALS = {
    "email": "REMOVED_EMAIL",  # Coordinator account
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

def test_recurring_schedule_api():
    """Test the recurring schedule API endpoint"""
    print("🔄 Testing Recurring Schedule API Endpoint")
    print("=" * 50)
    
    # Get auth token
    token = get_auth_token()
    if not token:
        print("❌ Failed to get authentication token")
        return False
    
    print("✅ Authentication successful")
    
    # Prepare test data
    start_date = datetime.now().date()
    end_date = start_date + timedelta(days=28)  # 4 weeks later
    
    # Generate weekly dates for 4 weeks (every Monday)
    dates = []
    current_date = start_date
    while current_date <= end_date:
        if current_date.weekday() == 0:  # Monday = 0
            dates.append(current_date.strftime('%Y-%m-%d'))
        current_date += timedelta(days=1)
    
    recurring_schedule_data = {
        "provider_id": 5,  # Adjust based on your test data
        "patient_id": 3,   # Adjust based on your test data
        "start_time": "09:00",
        "end_time": "10:00",
        "service_id": "",  # Optional
        "description": "Test recurring appointment - Weekly therapy sessions",
        "recurring_settings": {
            "frequency": "weekly",
            "weekdays": [1],  # Monday
            "interval": 1,
            "end_type": "date",
            "end_date": end_date.strftime('%Y-%m-%d'),
            "occurrences": 4,
            "dates": dates
        }
    }
    
    print(f"📅 Testing with {len(dates)} appointments:")
    for date in dates:
        print(f"   - {date} at 09:00-10:00")
    
    # Make API request
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    try:
        response = requests.post(
            RECURRING_SCHEDULE_URL,
            headers=headers,
            json=recurring_schedule_data
        )
        
        print(f"\n📡 API Response: {response.status_code}")
        
        if response.status_code == 201:
            data = response.json()
            print("✅ Recurring schedule created successfully!")
            print(f"   Created schedules: {data.get('created_schedules', 0)}")
            print(f"   Created timeslots: {data.get('created_timeslots', 0)}")
            print(f"   Total appointments: {data.get('total_appointments', 0)}")
            
            if data.get('errors'):
                print(f"⚠️  Warnings: {len(data['errors'])} errors")
                for error in data['errors']:
                    print(f"      - {error}")
            
            return True
        else:
            print(f"❌ API Error: {response.status_code}")
            try:
                error_data = response.json()
                print(f"   Error details: {error_data}")
            except:
                print(f"   Error text: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Network error: {e}")
        return False

def test_recurring_schedule_validation():
    """Test validation errors"""
    print("\n🔍 Testing API Validation")
    print("=" * 30)
    
    token = get_auth_token()
    if not token:
        return False
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Test with missing required fields
    invalid_data = {
        "provider_id": "",  # Missing
        "patient_id": "",   # Missing
        "start_time": "",   # Missing
        "end_time": "",     # Missing
        "recurring_settings": {
            "dates": []     # Empty
        }
    }
    
    try:
        response = requests.post(
            RECURRING_SCHEDULE_URL,
            headers=headers,
            json=invalid_data
        )
        
        if response.status_code == 400:
            error_data = response.json()
            print("✅ Validation working correctly")
            print(f"   Error: {error_data.get('error', 'Unknown error')}")
            return True
        else:
            print(f"❌ Expected 400 error, got {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Network error: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Recurring Schedule API Test Suite")
    print("====================================\n")
    
    # Run tests
    success = test_recurring_schedule_api()
    validation_success = test_recurring_schedule_validation()
    
    print("\n📊 Test Results:")
    print("================")
    print(f"✅ API Functionality: {'PASS' if success else 'FAIL'}")
    print(f"✅ Validation: {'PASS' if validation_success else 'FAIL'}")
    
    if success and validation_success:
        print("\n🎉 All tests passed! The recurring schedule API is working correctly.")
    else:
        print("\n❌ Some tests failed. Check the logs above for details.")

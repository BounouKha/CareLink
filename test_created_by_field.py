#!/usr/bin/env python3
"""
Test script to verify that the created_by field is being returned in API responses
"""

import requests
import json
from datetime import datetime, timedelta

# Test configuration
BASE_URL = "http://localhost:8000"
LOGIN_URL = f"{BASE_URL}/account/login/"
CALENDAR_URL = f"{BASE_URL}/schedule/calendar/"

# Test credentials (coordinator account)
TEST_CREDENTIALS = {
    "email": "REMOVED_EMAIL",  # Coordinator account
    "password": "REMOVED"   # Common default password
}

def get_auth_token():
    """Get authentication token"""
    try:
        response = requests.post(LOGIN_URL, json=TEST_CREDENTIALS)
        if response.status_code == 200:
            data = response.json()
            return data.get('access_token')
        else:
            print(f"❌ Login failed: {response.status_code}")
            print(f"Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error during login: {str(e)}")
        return None

def test_created_by_field():
    """Test if created_by field is included in calendar API response"""
    print("🧪 Testing Created By Field in API Response")
    print("=" * 50)
    
    # Get auth token
    token = get_auth_token()
    if not token:
        print("❌ Could not authenticate")
        return False
    
    print("✅ Authentication successful")
    
    # Test calendar API
    try:
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
        
        # Get current week's data
        today = datetime.now()
        start_date = today.strftime('%Y-%m-%d')
        end_date = (today + timedelta(days=7)).strftime('%Y-%m-%d')
        
        params = {
            'start_date': start_date,
            'end_date': end_date,
            'view': 'week'
        }
        
        response = requests.get(CALENDAR_URL, headers=headers, params=params)
        
        if response.status_code == 200:
            data = response.json()
            calendar_data = data.get('calendar_data', [])
            
            print(f"✅ Calendar API responded successfully")
            print(f"📊 Found {len(calendar_data)} appointments")
            
            # Check if any appointments have created_by field
            found_created_by = False
            for appointment in calendar_data:
                if 'created_by' in appointment:
                    found_created_by = True
                    created_by = appointment['created_by']
                    print(f"\n📋 Appointment ID: {appointment['id']}")
                    print(f"📅 Date: {appointment['date']}")
                    print(f"👤 Patient: {appointment.get('patient', {}).get('name', 'Unknown')}")
                    print(f"👨‍⚕️ Provider: {appointment.get('provider', {}).get('name', 'Unknown')}")
                    print(f"✨ Created By: {created_by}")
                    
                    if created_by:
                        if isinstance(created_by, dict):
                            print(f"   - Name: {created_by.get('name', 'Unknown')}")
                            print(f"   - Email: {created_by.get('email', 'Not provided')}")
                        else:
                            print(f"   - Info: {created_by}")
                    else:
                        print("   - Created By: None/Empty")
                    break
            
            if found_created_by:
                print(f"\n✅ SUCCESS: created_by field is present in API response!")
            else:
                print(f"\n❌ WARNING: No appointments found with created_by field")
                print("This could mean:")
                print("- No appointments exist in the database")
                print("- Existing appointments don't have created_by set")
                print("- Field is not being serialized properly")
            
            return found_created_by
            
        else:
            print(f"❌ Calendar API failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing calendar API: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_created_by_field()
    
    if success:
        print(f"\n🎉 Test completed successfully!")
        print("The created_by field is working correctly in the backend API.")
        print("You can now test the frontend EditAppointment component.")
    else:
        print(f"\n⚠️ Test completed with issues.")
        print("Check the backend implementation or create test data.")

#!/usr/bin/env python3
"""
Test the family patient schedule endpoint specifically
"""

import requests
import json

# Base URL for the Django server
BASE_URL = "http://localhost:8000"

def test_family_patient_schedule():
    """Test family patient schedule endpoint with JWT token"""
    print("=" * 60)
    print("TESTING FAMILY PATIENT SCHEDULE ENDPOINT")
    print("=" * 60)
    
    # First login to get access token
    login_url = f"{BASE_URL}/account/login/"
    credentials = {
        "email": "fpatient1@carelink.be",
        "password": "Pugu8874@"
    }
    
    print("1. Logging in...")
    response = requests.post(login_url, json=credentials, timeout=10)
    
    if response.status_code != 200:
        print(f"Login failed with status {response.status_code}")
        return False
    
    access_token = response.json().get('access')
    if not access_token:
        print("No access token received")
        return False
    
    print("✓ Login successful")
    
    # Test the family patient schedule endpoint
    schedule_url = f"{BASE_URL}/schedule/family/schedule/"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    print(f"\n2. Testing family schedule endpoint...")
    print(f"GET {schedule_url}")
    
    try:
        response = requests.get(schedule_url, headers=headers, timeout=10)
        
        print(f"\nResponse Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Family schedule fetch successful!")
            print(f"Response data keys: {list(data.keys())}")
            print(f"Response content: {json.dumps(data, indent=2)}")
            return True
        else:
            print(f"✗ Family schedule fetch failed with status {response.status_code}")
            try:
                error_data = response.json()
                print(f"Error response: {json.dumps(error_data, indent=2)}")
            except:
                print(f"Error response text: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        return False

if __name__ == "__main__":
    print("Testing Family Patient Schedule Endpoint")
    print("=" * 60)
    
    success = test_family_patient_schedule()
    
    if success:
        print("\n✓ All tests passed!")
    else:
        print("\n✗ Tests failed!")

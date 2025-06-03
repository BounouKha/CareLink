#!/usr/bin/env python3
"""
HTTP endpoint testing with provided user credentials
Tests the complete authentication and profile flow via HTTP requests
"""

import requests
import json
import sys
from datetime import datetime

# Base URL for the Django server
BASE_URL = "http://localhost:8000"

def test_login_endpoint():
    """Test login with provided credentials"""
    print("=" * 60)
    print("TESTING LOGIN ENDPOINT")
    print("=" * 60)
    
    login_url = f"{BASE_URL}/account/login/"
    credentials = {
        "email": "fpatient1@carelink.be",
        "password": "Pugu8874@"
    }
    
    print(f"POST {login_url}")
    print(f"Credentials: {credentials}")
    
    try:
        response = requests.post(login_url, json=credentials, timeout=10)
        
        print(f"\nResponse Status: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Login successful!")
            print(f"Response data keys: {list(data.keys())}")
            
            # Extract JWT tokens
            access_token = data.get('access')
            refresh_token = data.get('refresh')
            
            if access_token:
                print(f"Access token received: {access_token[:50]}...")
                return access_token
            else:
                print("ERROR: No access token in response")
                return None
        else:
            print(f"Login failed with status {response.status_code}")
            try:
                error_data = response.json()
                print(f"Error response: {error_data}")
            except:
                print(f"Error response text: {response.text}")
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        return None

def test_profile_endpoint(access_token):
    """Test profile endpoint with JWT token"""
    print("\n" + "=" * 60)
    print("TESTING PROFILE ENDPOINT")
    print("=" * 60)
    
    profile_url = f"{BASE_URL}/account/profile/"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    print(f"GET {profile_url}")
    print(f"Headers: {headers}")
    
    try:
        response = requests.get(profile_url, headers=headers, timeout=10)
        
        print(f"\nResponse Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Profile fetch successful!")
            print(f"Response data keys: {list(data.keys())}")
            
            # Print user info
            if 'user' in data:
                user = data['user']
                print(f"User ID: {user.get('id')}")
                print(f"User Name: {user.get('firstname')} {user.get('lastname')}")
                print(f"User Email: {user.get('email')}")
                print(f"User Role: {user.get('role')}")
            
            # Print patient info if available
            if 'patient' in data:
                patient = data['patient']
                print(f"Patient ID: {patient.get('id')}")
                print(f"Patient Name: {patient.get('name')}")
                
            return True
        else:
            print(f"Profile fetch failed with status {response.status_code}")
            try:
                error_data = response.json()
                print(f"Error response: {error_data}")
            except:
                print(f"Error response text: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        return False

def test_patient_schedule_endpoint(access_token):
    """Test patient schedule endpoint with JWT token"""
    print("\n" + "=" * 60)
    print("TESTING PATIENT SCHEDULE ENDPOINT")
    print("=" * 60)
    
    schedule_url = f"{BASE_URL}/schedule/patient/schedule/"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    print(f"GET {schedule_url}")
    print(f"Headers: {headers}")
    
    try:
        response = requests.get(schedule_url, headers=headers, timeout=10)
        
        print(f"\nResponse Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Schedule fetch successful!")
            print(f"Response data keys: {list(data.keys())}")
            
            # Print patient info
            if 'patient_info' in data:
                patient_info = data['patient_info']
                print(f"Patient ID: {patient_info.get('id')}")
                print(f"Patient Name: {patient_info.get('name')}")
                print(f"Patient Email: {patient_info.get('email')}")
            
            # Print schedule summary
            if 'appointments' in data:
                appointments = data['appointments']
                print(f"Total appointments: {len(appointments)}")
                
                for i, appointment in enumerate(appointments[:3]):  # Show first 3
                    print(f"Appointment {i+1}:")
                    print(f"  Date: {appointment.get('date')}")
                    print(f"  Provider: {appointment.get('provider', {}).get('name')}")
                    print(f"  Timeslots: {len(appointment.get('appointments', []))}")
            
            return True
        else:
            print(f"Schedule fetch failed with status {response.status_code}")
            try:
                error_data = response.json()
                print(f"Error response: {error_data}")
            except:
                print(f"Error response text: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        return False

def check_server_status():
    """Check if Django server is running"""
    print("=" * 60)
    print("CHECKING SERVER STATUS")
    print("=" * 60)
    
    try:
        response = requests.get(f"{BASE_URL}/", timeout=5)
        print(f"Server is running - Status: {response.status_code}")
        return True
    except requests.exceptions.RequestException as e:
        print(f"Server is not accessible: {e}")
        print("Please make sure Django development server is running on port 8000")
        return False

def main():
    """Run all HTTP endpoint tests"""
    print("HTTP ENDPOINT TESTING")
    print(f"Testing against: {BASE_URL}")
    print(f"Timestamp: {datetime.now()}")
    print()
    
    # Check if server is running
    if not check_server_status():
        print("\nERROR: Cannot connect to Django server")
        print("Please run: python manage.py runserver")
        sys.exit(1)
    
    # Test login
    access_token = test_login_endpoint()
    if not access_token:
        print("\nERROR: Login failed - cannot proceed with other tests")
        sys.exit(1)
    
    # Test profile endpoint
    profile_success = test_profile_endpoint(access_token)
    if not profile_success:
        print("\nWARNING: Profile endpoint failed")
    
    # Test patient schedule endpoint
    schedule_success = test_patient_schedule_endpoint(access_token)
    if not schedule_success:
        print("\nWARNING: Patient schedule endpoint failed")
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    print(f"Login: {'✓ PASS' if access_token else '✗ FAIL'}")
    print(f"Profile: {'✓ PASS' if profile_success else '✗ FAIL'}")
    print(f"Schedule: {'✓ PASS' if schedule_success else '✗ FAIL'}")
    
    if access_token and profile_success and schedule_success:
        print("\n🎉 ALL TESTS PASSED! The system is working correctly.")
    else:
        print("\n⚠️  Some tests failed. Please check the output above.")

if __name__ == "__main__":
    main()

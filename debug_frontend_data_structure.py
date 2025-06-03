#!/usr/bin/env python
"""
Debug the exact data structure returned by family schedule API vs what frontend expects
"""
import requests
import json
from datetime import datetime, timedelta

# API Configuration
BASE_URL = "http://localhost:8000"
LOGIN_EMAIL = "REMOVED_EMAIL"
LOGIN_PASSWORD = "patient123"

def get_auth_token():
    """Get authentication token"""
    login_data = {
        "email": LOGIN_EMAIL,
        "password": LOGIN_PASSWORD
    }
    
    response = requests.post(f"{BASE_URL}/account/login/", json=login_data)
    
    if response.status_code == 200:
        token_data = response.json()
        return token_data.get('access')
    else:
        print(f"❌ Login failed: {response.status_code}")
        print(response.text)
        return None

def test_family_schedule_structure():
    """Test the exact data structure from family schedule endpoint"""
    print("🔍 Testing Family Schedule Data Structure...")
    
    # Get authentication token
    token = get_auth_token()
    if not token:
        return
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Test family schedule endpoint with date range
    today = datetime.now().strftime('%Y-%m-%d')
    future_date = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
    
    family_schedule_url = f"{BASE_URL}/schedule/family/schedule/"
    params = {
        'start_date': today,
        'end_date': future_date,
        'patient_id': 4  # Bob Sull's ID
    }
    
    print(f"Making request to: {family_schedule_url}")
    print(f"With params: {params}")
    
    response = requests.get(family_schedule_url, headers=headers, params=params)
    
    print(f"Response status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("\n🎯 RAW API RESPONSE STRUCTURE:")
        print("=" * 60)
        print(json.dumps(data, indent=2, default=str))
        print("=" * 60)
        
        # Analyze the structure
        print("\n📊 STRUCTURE ANALYSIS:")
        print(f"- Response has 'patients' key: {'patients' in data}")
        print(f"- Response has 'appointments' key: {'appointments' in data}")
        
        if 'patients' in data:
            patients = data['patients']
            print(f"- Number of patients: {len(patients)}")
            
            for i, patient in enumerate(patients):
                print(f"\n  Patient {i+1}:")
                print(f"  - Has 'patient_info': {'patient_info' in patient}")
                print(f"  - Has 'schedules': {'schedules' in patient}")
                
                if 'schedules' in patient:
                    schedules = patient['schedules']
                    print(f"  - Number of schedules: {len(schedules)}")
                    
                    for j, schedule in enumerate(schedules):
                        print(f"\n    Schedule {j+1}:")
                        print(f"    - ID: {schedule.get('id')}")
                        print(f"    - Date: {schedule.get('date')}")
                        print(f"    - Has 'appointments': {'appointments' in schedule}")
                        
                        if 'appointments' in schedule:
                            appointments = schedule['appointments']
                            print(f"    - Number of appointments: {len(appointments)}")
                            
                            for k, appointment in enumerate(appointments):
                                print(f"      Appointment {k+1}: {appointment.get('start_time')} - {appointment.get('end_time')}")
                                print(f"        Service: {appointment.get('service', {}).get('name', 'Unknown')}")
        
        print("\n🎯 WHAT FRONTEND EXPECTS:")
        print("- Direct 'appointments' array at root level")
        print("- Each appointment should have:")
        print("  * id, date, provider, appointments[], patient_name")
        
    else:
        print(f"❌ Family schedule request failed: {response.status_code}")
        print(response.text)

if __name__ == "__main__":
    test_family_schedule_structure()

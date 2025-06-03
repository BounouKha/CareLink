#!/usr/bin/env python3

import requests
import json

def test_family_schedule_access():
    """Test family patient schedule access with the fixed frontend logic"""
    
    print("=== Testing Family Patient Schedule Access ===")
    
    # Login as family patient
    login_url = "http://localhost:8000/account/login/"
    login_data = {
        "email": "fpatient1@carelink.be",
        "password": "Pugu8874@"
    }
    
    try:
        # Step 1: Login
        print("Step 1: Logging in as family patient...")
        response = requests.post(login_url, json=login_data)
        if response.status_code != 200:
            print(f"Login failed: {response.status_code}")
            print(response.text)
            return
            
        login_data = response.json()
        access_token = login_data['access']
        print("✅ Login successful")
        
        # Step 2: Fetch profile (what the fixed frontend will do)
        print("Step 2: Fetching user profile...")
        profile_url = "http://localhost:8000/account/profile/"
        profile_response = requests.get(profile_url, headers={
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        })
        
        if profile_response.status_code != 200:
            print(f"Profile fetch failed: {profile_response.status_code}")
            print(profile_response.text)
            return
            
        profile_data = profile_response.json()
        user_role = profile_data.get('user', {}).get('role')
        print(f"✅ Profile fetched. User role: {user_role}")
        
        # Step 3: Check if family view should be enabled
        is_family_view = (user_role == 'Family Patient')
        print(f"Family view enabled: {is_family_view}")
          # Step 4: Test family members fetch (if family view)
        if is_family_view:
            print("Step 3: Fetching family members...")
            family_url = "http://localhost:8000/account/family-patient/linked-patient/"
            family_response = requests.get(family_url, headers={
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            })
            
            if family_response.status_code == 200:
                family_data = family_response.json()
                linked_patients = family_data.get('linked_patients', [])
                print(f"✅ Found {len(linked_patients)} linked patients")
                for patient in linked_patients:
                    print(f"  - Patient ID: {patient.get('id')}, Name: {patient.get('name', 'Unknown')}")
            else:
                print(f"❌ Family members fetch failed: {family_response.status_code}")
                print(family_response.text)
        
        # Step 5: Test schedule access (the correct endpoint)
        print("Step 4: Testing schedule access...")
        
        if is_family_view:
            # Should use family endpoint
            schedule_url = "http://localhost:8000/schedule/family/schedule/"
            params = {
                'start_date': '2024-01-01',
                'end_date': '2024-12-31'
            }
            print(f"Using family schedule endpoint: {schedule_url}")
        else:
            # Should use patient endpoint
            schedule_url = "http://localhost:8000/schedule/patient/schedule/"
            params = {
                'start_date': '2024-01-01', 
                'end_date': '2024-12-31'
            }
            print(f"Using patient schedule endpoint: {schedule_url}")
            
        schedule_response = requests.get(schedule_url, headers={
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }, params=params)
        
        print(f"Schedule response status: {schedule_response.status_code}")
        
        if schedule_response.status_code == 200:
            schedule_data = schedule_response.json()
            appointments = schedule_data.get('appointments', [])
            print(f"✅ Schedule access successful. Found {len(appointments)} appointments")
            
            if appointments:
                print("First few appointments:")
                for i, apt in enumerate(appointments[:3]):
                    print(f"  {i+1}. {apt.get('service_name', 'Unknown')} on {apt.get('date')} with {apt.get('patient_name', 'Unknown patient')}")
        else:
            print(f"❌ Schedule access failed: {schedule_response.status_code}")
            print(schedule_response.text)
            
        # Step 6: Test wrong endpoint (what was happening before)
        print("\nStep 5: Testing WRONG endpoint (what was failing before)...")
        wrong_url = "http://localhost:8000/schedule/patient/schedule/"
        wrong_response = requests.get(wrong_url, headers={
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }, params=params)
        
        print(f"Wrong endpoint response status: {wrong_response.status_code}")
        if wrong_response.status_code != 200:
            print(f"❌ As expected, wrong endpoint fails: {wrong_response.text}")
        else:
            print("⚠️ Unexpected: wrong endpoint worked")
            
    except Exception as e:
        print(f"Error during test: {e}")

if __name__ == "__main__":
    test_family_schedule_access()

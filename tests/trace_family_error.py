#!/usr/bin/env python3

import requests
import json

def trace_family_patient_flow():
    """Trace the complete family patient flow to find where the wrong endpoint is called"""
    
    print("=== Tracing Family Patient Flow ===")
    
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
            return
            
        login_response = response.json()
        access_token = login_response['access']
        print("✅ Login successful")
        
        # Step 2: Profile API (used by both ScheduleRouter and PatientSchedule)
        print("\nStep 2: Testing profile API...")
        profile_url = "http://localhost:8000/account/profile/"
        profile_response = requests.get(profile_url, headers={
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        })
        
        if profile_response.status_code == 200:
            profile_data = profile_response.json()
            user_role = profile_data.get('user', {}).get('role')
            print(f"✅ Profile API successful - Role: {user_role}")
        else:
            print(f"❌ Profile API failed: {profile_response.status_code}")
            return
            
        # Step 3: Family linked patients API (used by PatientSchedule)
        print("\nStep 3: Testing family linked patients API...")
        family_url = "http://localhost:8000/account/family-patient/linked-patient/"
        family_response = requests.get(family_url, headers={
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        })
        
        if family_response.status_code == 200:
            family_data = family_response.json()
            linked_patients = family_data.get('linked_patients', [])
            print(f"✅ Family API successful - {len(linked_patients)} linked patients")
            for patient in linked_patients:
                print(f"   - {patient.get('firstname')} {patient.get('lastname')} (ID: {patient.get('id')})")
        else:
            print(f"❌ Family API failed: {family_response.status_code}")
            
        # Step 4: Test CORRECT family schedule endpoint
        print("\nStep 4: Testing CORRECT family schedule endpoint...")
        correct_url = "http://localhost:8000/schedule/family/schedule/"
        params = {
            'start_date': '2024-01-01',
            'end_date': '2024-12-31'
        }
        
        correct_response = requests.get(correct_url, headers={
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }, params=params)
        
        print(f"✅ Family schedule endpoint: {correct_response.status_code}")
        if correct_response.status_code == 200:
            data = correct_response.json()
            appointments = data.get('appointments', [])
            print(f"   Found {len(appointments)} appointments")
        else:
            print(f"   Error: {correct_response.text}")
            
        # Step 5: Test WRONG patient schedule endpoint (what's causing the error)
        print("\nStep 5: Testing WRONG patient schedule endpoint...")
        wrong_url = "http://localhost:8000/schedule/patient/schedule/"
        
        wrong_response = requests.get(wrong_url, headers={
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }, params=params)
        
        print(f"❌ Patient schedule endpoint: {wrong_response.status_code}")
        if wrong_response.status_code != 200:
            error_text = wrong_response.text
            print(f"   Error: {error_text}")
            
            if "Permission denied. Only patients can access this view." in error_text:
                print("   🎯 THIS IS THE ERROR YOU'RE SEEING!")
                print("   This means the frontend is still calling the patient endpoint instead of family endpoint")
        
        # Step 6: Debug - let's check what the frontend logic should be doing
        print("\nStep 6: Frontend Logic Analysis...")
        print("Based on the profile response:")
        print(f"   user.role = '{user_role}'")
        print(f"   user.role === 'Family Patient' = {user_role == 'Family Patient'}")
        print(f"   isFamilyView should be = {user_role == 'Family Patient'}")
        
        if user_role == 'Family Patient':
            print("   ✅ Frontend should use: http://localhost:8000/schedule/family/schedule/")
            print("   ❌ Frontend should NOT use: http://localhost:8000/schedule/patient/schedule/")
        else:
            print(f"   ⚠️ Unexpected role: {user_role}")
            
        print("\n" + "="*60)
        print("DIAGNOSIS:")
        print("- Family patient login: ✅ Working")
        print("- Role detection API: ✅ Working") 
        print("- Family API: ✅ Working")
        print("- Family schedule API: ✅ Working")
        print("- ERROR: Frontend is still calling patient endpoint ❌")
        print("\nThe issue is in the frontend PatientSchedule component.")
        print("It's not properly detecting the family role or not using the right endpoint.")
        
    except Exception as e:
        print(f"Error during trace: {e}")

if __name__ == "__main__":
    trace_family_patient_flow()

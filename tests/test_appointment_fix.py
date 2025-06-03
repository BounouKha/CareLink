#!/usr/bin/env python3
"""
Test script to verify the family patient appointment fix is working correctly.
This script will:
1. Test family patient login
2. Test family schedule API response 
3. Verify appointment data structure
4. Simulate frontend data transformation
"""

import requests
import json
import sys
import os

def test_family_login():
    """Test family patient login and get auth token"""
    print("🔑 Testing Family Patient Login")
    print("-" * 40)
    
    login_url = "http://localhost:8000/account/login/"
    login_data = {
        "email": "fpatient1@carelink.be",
        "password": "Pugu8874@"
    }
    
    try:
        response = requests.post(login_url, json=login_data)
        if response.status_code == 200:
            data = response.json()
            token = data.get('access')
            print(f"✅ Login successful")
            print(f"   Email: {login_data['email']}")
            print(f"   Token: {token[:20]}...")
            return token
        else:
            print(f"❌ Login failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Login error: {e}")
        return None

def test_family_schedule_api(token):
    """Test the family schedule API and return the raw response"""
    print("\n📅 Testing Family Schedule API")
    print("-" * 40)
    
    headers = {'Authorization': f'Bearer {token}'}
    schedule_url = 'http://localhost:8000/schedule/family/schedule/?start_date=2024-01-01&end_date=2026-12-31'
    
    try:
        response = requests.get(schedule_url, headers=headers)
        print(f"📡 API Response Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ API request successful")
            print(f"   Found {len(data.get('patients', []))} patients")
            
            total_schedules = 0
            total_appointments = 0
            
            for patient in data.get('patients', []):
                patient_name = patient.get('patient_info', {}).get('name', 'Unknown')
                schedules = patient.get('schedules', [])
                total_schedules += len(schedules)
                
                for schedule in schedules:
                    appointments = schedule.get('appointments', [])
                    total_appointments += len(appointments)
                    
                print(f"   Patient: {patient_name}")
                print(f"   Schedules: {len(schedules)}")
            
            print(f"   Total schedules: {total_schedules}")
            print(f"   Total appointments: {total_appointments}")
            
            return data
        else:
            print(f"❌ API request failed")
            print(f"   Response text: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ API request error: {e}")
        return None

def simulate_frontend_transformation(api_data):
    """Simulate the frontend data transformation logic"""
    print("\n🔄 Simulating Frontend Data Transformation")
    print("-" * 40)
    
    if not api_data or not api_data.get('patients'):
        print("❌ No patients data to transform")
        return []
    
    flat_appointments = []
    
    for patient in api_data.get('patients', []):
        patient_name = patient.get('patient_info', {}).get('name', 'Unknown')
        print(f"📋 Processing patient: {patient_name}")
        
        for schedule in patient.get('schedules', []):
            schedule_id = schedule.get('id')
            schedule_date = schedule.get('date')
            provider_name = schedule.get('provider', {}).get('name', 'Unknown Provider')
            appointments = schedule.get('appointments', [])
            
            # Split provider name for frontend compatibility
            name_parts = provider_name.split(' ')
            provider_firstname = name_parts[0] if name_parts else ''
            provider_lastname = ' '.join(name_parts[1:]) if len(name_parts) > 1 else ''
            
            # Transform to frontend-expected structure
            transformed_schedule = {
                'id': schedule_id,
                'date': schedule_date,
                'provider': {
                    'firstname': provider_firstname,
                    'lastname': provider_lastname
                },
                'appointments': appointments,
                'patient_name': patient_name,
                'service_type': schedule.get('provider', {}).get('service_type')
            }
            
            flat_appointments.append(transformed_schedule)
            
            print(f"   ✅ Schedule {schedule_id} ({schedule_date})")
            print(f"      Provider: {provider_firstname} {provider_lastname}")
            print(f"      Appointments: {len(appointments)}")
            
            for i, appointment in enumerate(appointments, 1):
                start_time = appointment.get('start_time')
                end_time = appointment.get('end_time') 
                service_name = appointment.get('service', {}).get('name', 'Unknown')
                status = appointment.get('status', 'unknown')
                
                print(f"         {i}. {start_time}-{end_time} | {service_name} | {status}")
    
    print(f"\n📊 Transformation Summary:")
    print(f"   Input: {len(api_data.get('patients', []))} patients with nested schedules")
    print(f"   Output: {len(flat_appointments)} flat appointment records")
    
    return flat_appointments

def verify_frontend_compatibility(transformed_data):
    """Verify the transformed data matches frontend expectations"""
    print("\n✅ Verifying Frontend Compatibility")
    print("-" * 40)
    
    if not transformed_data:
        print("❌ No transformed data to verify")
        return False
    
    all_compatible = True
    
    for i, appointment in enumerate(transformed_data, 1):
        print(f"🔍 Checking appointment {i}:")
        
        # Check required fields
        required_fields = ['id', 'date', 'provider', 'appointments', 'patient_name']
        missing_fields = []
        
        for field in required_fields:
            if field not in appointment:
                missing_fields.append(field)
        
        if missing_fields:
            print(f"   ❌ Missing fields: {missing_fields}")
            all_compatible = False
        else:
            print(f"   ✅ All required fields present")
        
        # Check provider structure
        provider = appointment.get('provider', {})
        if 'firstname' not in provider or 'lastname' not in provider:
            print(f"   ❌ Provider missing firstname/lastname structure")
            all_compatible = False
        else:
            print(f"   ✅ Provider structure correct: {provider['firstname']} {provider['lastname']}")
        
        # Check appointments array
        appointments = appointment.get('appointments', [])
        if isinstance(appointments, list) and len(appointments) > 0:
            print(f"   ✅ Contains {len(appointments)} appointment(s)")
        else:
            print(f"   ⚠️  No appointments in schedule")
    
    if all_compatible:
        print(f"\n🎉 SUCCESS: All {len(transformed_data)} appointments are frontend-compatible!")
    else:
        print(f"\n❌ ISSUES: Some appointments have compatibility problems")
    
    return all_compatible

def main():
    print("🚀 CARELINK FAMILY PATIENT APPOINTMENT FIX VERIFICATION")
    print("=" * 70)
    
    # Step 1: Login
    token = test_family_login()
    if not token:
        print("\n❌ Cannot proceed without authentication token")
        return
    
    # Step 2: Test API
    api_data = test_family_schedule_api(token)
    if not api_data:
        print("\n❌ Cannot proceed without API data")
        return
    
    # Step 3: Transform data
    transformed_data = simulate_frontend_transformation(api_data)
    
    # Step 4: Verify compatibility
    is_compatible = verify_frontend_compatibility(transformed_data)
    
    # Final summary
    print("\n" + "=" * 70)
    if is_compatible and len(transformed_data) > 0:
        print("🎯 FINAL RESULT: ✅ FIX SUCCESSFUL!")
        print("   - Family patient can login")
        print("   - API returns appointment data")
        print("   - Data transformation works")
        print("   - Frontend compatibility verified")
        print("   - Bob Sull's appointments should now be visible!")
    else:
        print("🎯 FINAL RESULT: ❌ ISSUES REMAIN")
        print("   - Review the output above for specific problems")
    print("=" * 70)

if __name__ == "__main__":
    main()

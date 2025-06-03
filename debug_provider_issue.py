#!/usr/bin/env python3
"""
Debug the provider display issue - why shows "Provider TBD"
"""

import requests
import json

def debug_provider_display():
    print("🔍 DEBUGGING PROVIDER DISPLAY ISSUE")
    print("=" * 50)
    
    # Login
    login_response = requests.post("http://localhost:8000/account/login/", json={
        "email": "fpatient1@carelink.be",
        "password": "Pugu8874@"
    })
    
    if login_response.status_code != 200:
        print("❌ Login failed")
        return
    
    token = login_response.json().get('access')
    
    # Get family schedule data
    schedule_response = requests.get(
        "http://localhost:8000/schedule/family/schedule/?start_date=2024-01-01&end_date=2026-12-31",
        headers={'Authorization': f'Bearer {token}'}
    )
    
    if schedule_response.status_code == 200:
        data = schedule_response.json()
        print("📋 Provider Analysis from Family Schedule API:")
        
        for patient in data.get('patients', []):
            patient_name = patient.get('patient_info', {}).get('name')
            print(f"\n👤 Patient: {patient_name}")
            
            for schedule in patient.get('schedules', []):
                print(f"\n   📅 Schedule {schedule.get('id')} ({schedule.get('date')}):")
                
                provider = schedule.get('provider', {})
                print(f"      Provider object: {provider}")
                print(f"      Provider keys: {list(provider.keys())}")
                
                # Check what fields are available
                if 'name' in provider:
                    print(f"      ✅ Provider name: '{provider['name']}'")
                else:
                    print(f"      ❌ No 'name' field in provider")
                
                if 'id' in provider:
                    print(f"      Provider ID: {provider['id']}")
                
                if 'service_type' in provider:
                    print(f"      Service type: {provider['service_type']}")
                
                # Check appointments too
                appointments = schedule.get('appointments', [])
                print(f"      Appointments: {len(appointments)}")
                
                for i, appointment in enumerate(appointments, 1):
                    print(f"         {i}. {appointment.get('start_time')}-{appointment.get('end_time')}")
                    print(f"            Service: {appointment.get('service', {}).get('name')}")
                    print(f"            Status: {appointment.get('status')}")
    else:
        print(f"❌ Failed to get schedule data: {schedule_response.status_code}")
        print(f"Response: {schedule_response.text}")

if __name__ == "__main__":
    debug_provider_display()

#!/usr/bin/env python3
"""
Debug script to examine the exact data structure returned by the family schedule API
and compare it with what the frontend expects.
"""

import requests
import json
import sys
import os

# Add the Django project to the path
sys.path.insert(0, r'c:\Users\460020779\Desktop\CareLink\CareLink')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')

import django
django.setup()

from django.contrib.auth import get_user_model
from CareLink.models import Patient, FamilyPatient, ServiceDemand, Schedule, TimeSlot

User = get_user_model()

def get_auth_token():
    """Get authentication token for family patient"""
    login_url = "http://localhost:8000/account/login/"
    login_data = {
        "email": "fpatient1@carelink.be",
        "password": "Pugu8874@"
    }
    
    try:
        response = requests.post(login_url, json=login_data)
        if response.status_code == 200:
            data = response.json()
            return data.get('access')
        else:
            print(f"❌ Login failed: {response.status_code}")
            print(f"Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Login error: {e}")
        return None

def debug_database_appointments():
    """Check what appointments exist in the database for Bob Sull"""
    print("\n🔍 DEBUGGING DATABASE APPOINTMENTS FOR BOB SULL")
    print("=" * 60)
    
    try:
        # Find Bob Sull patient
        bob_user = User.objects.filter(firstname__icontains='Bob', lastname__icontains='Sull').first()
        if not bob_user:
            print("❌ Bob Sull user not found in database")
            return
        
        bob_patient = Patient.objects.filter(user=bob_user).first()
        if not bob_patient:
            print("❌ Bob Sull patient record not found")
            return
        
        print(f"✅ Found Bob Sull - User ID: {bob_user.id}, Patient ID: {bob_patient.id}")
        print(f"   Name: {bob_user.firstname} {bob_user.lastname}")
        print(f"   Email: {bob_user.email}")
        
        # Check schedules for Bob
        schedules = Schedule.objects.filter(patient=bob_patient)
        print(f"\n📅 Found {schedules.count()} schedules for Bob Sull:")
        
        for schedule in schedules:
            print(f"\n   Schedule ID: {schedule.id}")
            print(f"   Date: {schedule.date}")
            print(f"   Provider: {schedule.provider.user.firstname} {schedule.provider.user.lastname}" if schedule.provider else "No provider")
            
            # Check timeslots
            print(f"   Timeslots from many-to-many: {schedule.time_slots.count()}")
            
            for slot in schedule.time_slots.all():
                print(f"     - Slot ID: {slot.id}")
                print(f"       Time: {slot.start_time} - {slot.end_time}")
                print(f"       Service: {slot.service.name if slot.service else 'No service'}")
                print(f"       Description: {slot.description}")
                
        return bob_patient.id
        
    except Exception as e:
        print(f"❌ Database error: {e}")
        return None

def debug_api_response(token):
    """Debug the exact API response structure"""
    print("\n🔍 DEBUGGING API RESPONSE STRUCTURE")
    print("=" * 60)
    
    headers = {'Authorization': f'Bearer {token}'}
    
    # Test with wider date range to catch any appointments
    schedule_url = 'http://localhost:8000/schedule/family/schedule/?start_date=2024-01-01&end_date=2026-12-31'
    
    try:
        response = requests.get(schedule_url, headers=headers)
        print(f"📡 API Response Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            print("\n📊 COMPLETE API RESPONSE STRUCTURE:")
            print("=" * 40)
            print(json.dumps(data, indent=2, default=str))
            
            print("\n📋 RESPONSE ANALYSIS:")
            print("=" * 40)
            print(f"Root keys: {list(data.keys())}")
            
            patients = data.get('patients', [])
            print(f"Number of patients: {len(patients)}")
            
            total_schedules = 0
            total_appointments = 0
            
            for i, patient in enumerate(patients):
                print(f"\n👤 Patient {i + 1}:")
                print(f"   Patient keys: {list(patient.keys())}")
                
                patient_info = patient.get('patient_info', {})
                print(f"   Patient info: {patient_info}")
                
                schedules = patient.get('schedules', [])
                print(f"   Number of schedules: {len(schedules)}")
                total_schedules += len(schedules)
                
                for j, schedule in enumerate(schedules):
                    print(f"\n   📅 Schedule {j + 1}:")
                    print(f"      Schedule keys: {list(schedule.keys())}")
                    print(f"      Date: {schedule.get('date')}")
                    print(f"      Provider: {schedule.get('provider', {})}")
                    
                    appointments = schedule.get('appointments', [])
                    print(f"      Number of appointments: {len(appointments)}")
                    total_appointments += len(appointments)
                    
                    for k, appointment in enumerate(appointments):
                        print(f"\n      ⏰ Appointment {k + 1}:")
                        print(f"         Keys: {list(appointment.keys())}")
                        print(f"         Start time: {appointment.get('start_time')}")
                        print(f"         End time: {appointment.get('end_time')}")
                        print(f"         Service: {appointment.get('service', {})}")
                        print(f"         Status: {appointment.get('status')}")
            
            print(f"\n📈 SUMMARY:")
            print(f"   Total patients: {len(patients)}")
            print(f"   Total schedules: {total_schedules}")
            print(f"   Total appointments: {total_appointments}")
            
            return data
        else:
            print(f"❌ API request failed")
            print(f"Response text: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ API request error: {e}")
        return None

def analyze_frontend_expectations():
    """Analyze what the frontend expects vs what we're getting"""
    print("\n🔍 ANALYZING FRONTEND EXPECTATIONS")
    print("=" * 60)
    
    print("📝 FRONTEND EXPECTS (based on PatientSchedule.js):")
    print("   Root structure: { appointments: [...] }")
    print("   Each appointment: {")
    print("     id: number,")
    print("     date: string,")
    print("     provider: { firstname: string, lastname: string },")
    print("     appointments: [")
    print("       {")
    print("         id: number,")
    print("         start_time: string,")
    print("         end_time: string,")
    print("         service: { name: string },")
    print("         status: string")
    print("       }")
    print("     ],")
    print("     patient_name: string")
    print("   }")
    
    print("\n📝 BACKEND RETURNS (from FamilyPatientScheduleView):")
    print("   Root structure: { patients: [...] }")
    print("   Each patient: {")
    print("     patient_info: { id: number, firstname: string, lastname: string },")
    print("     schedules: [")
    print("       {")
    print("         id: number,")
    print("         date: string,")
    print("         provider: { firstname: string, lastname: string },")
    print("         appointments: [")
    print("           {")
    print("             id: number,")
    print("             start_time: string,")
    print("             end_time: string,")
    print("             service: { name: string },")
    print("             status: string")
    print("           }")
    print("         ]")
    print("       }")
    print("     ]")
    print("   }")
    
    print("\n🎯 THE MISMATCH:")
    print("   ❌ Frontend looks for 'appointments' at root level")
    print("   ❌ Backend provides 'patients' at root level")
    print("   ❌ Frontend expects flat structure")
    print("   ❌ Backend provides nested structure")

def suggest_solutions():
    """Suggest solutions to fix the data structure mismatch"""
    print("\n💡 SUGGESTED SOLUTIONS")
    print("=" * 60)
    
    print("🔧 OPTION 1: Transform backend response to match frontend")
    print("   - Modify FamilyPatientScheduleView to return flat appointments array")
    print("   - Each appointment includes patient_name field")
    print("   - Pros: Minimal frontend changes")
    print("   - Cons: Changes backend API contract")
    
    print("\n🔧 OPTION 2: Update frontend to parse nested structure")
    print("   - Modify PatientSchedule.js to handle patients -> schedules -> appointments")
    print("   - Transform nested data to flat structure in frontend")
    print("   - Pros: Preserves backend API structure")
    print("   - Cons: More complex frontend logic")
    
    print("\n🔧 OPTION 3: Create adapter/transformer function")
    print("   - Add utility function to transform backend response")
    print("   - Keep backend structure intact")
    print("   - Transform in frontend before rendering")
    print("   - Pros: Clean separation, backwards compatible")
    print("   - Cons: Extra transformation step")

def main():
    print("🚀 CARELINK APPOINTMENT DATA STRUCTURE DEBUGGING")
    print("=" * 80)
    
    # Check database first
    bob_patient_id = debug_database_appointments()
    
    # Get auth token
    print("\n🔑 Getting authentication token...")
    token = get_auth_token()
    
    if not token:
        print("❌ Failed to get authentication token. Exiting.")
        return
    
    # Debug API response
    api_data = debug_api_response(token)
    
    # Analyze expectations
    analyze_frontend_expectations()
    
    # Suggest solutions
    suggest_solutions()
    
    print("\n" + "=" * 80)
    print("🎯 NEXT STEPS:")
    print("   1. Choose a solution approach (Option 1, 2, or 3)")
    print("   2. Implement the transformation logic")
    print("   3. Test the frontend appointment display")
    print("   4. Verify Bob Sull's appointments are visible")
    print("=" * 80)

if __name__ == "__main__":
    main()

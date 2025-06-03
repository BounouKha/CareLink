#!/usr/bin/env python3
import os
import django
import sys
from django.test import RequestFactory
from django.contrib.auth import get_user_model

sys.path.append('c:/Users/460020779/Desktop/CareLink/CareLink')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')
django.setup()

from CareLink.models import User, Patient, Schedule
from schedule.views import PatientScheduleView

def test_patient_api():
    print("=== TESTING PATIENT API ===")
    
    # Get Bob
    bob_user = User.objects.get(email='REMOVED_EMAIL')
    print(f"✓ Testing with Bob: {bob_user.firstname} {bob_user.lastname}")
    
    # Create a mock request
    factory = RequestFactory()
    request = factory.get('/schedule/patient/schedule/')
    request.user = bob_user
    
    # Create view instance and call get method
    view = PatientScheduleView()
    response = view.get(request)
    
    print(f"✓ API Response Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.data
        print(f"✓ Response keys: {list(data.keys())}")
        
        if 'appointments' in data:
            appointments = data['appointments']
            print(f"✓ Found {len(appointments)} appointments")
            
            for i, appointment in enumerate(appointments, 1):
                print(f"  Appointment {i}:")
                print(f"    ID: {appointment.get('id')}")
                print(f"    Date: {appointment.get('date')}")
                print(f"    Provider: {appointment.get('provider', {}).get('name', 'Unknown')}")
                timeslots = appointment.get('appointments', [])
                print(f"    Timeslots: {len(timeslots)}")
                
                for ts in timeslots:
                    print(f"      - {ts.get('start_time')} to {ts.get('end_time')}")
                    print(f"        Service: {ts.get('service', {}).get('name', 'Unknown')}")
                    print(f"        Description: {ts.get('description', 'None')}")
        else:
            print("✗ No 'appointments' key found in response")
            
        # Check patient info
        if 'patient_info' in data:
            patient_info = data['patient_info']
            print(f"✓ Patient info: {patient_info.get('name')} ({patient_info.get('email')})")
            
    else:
        print(f"✗ API call failed: {response.data}")

if __name__ == "__main__":
    test_patient_api()

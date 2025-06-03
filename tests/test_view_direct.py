#!/usr/bin/env python3
import os
import django
import sys

sys.path.append('c:/Users/460020779/Desktop/CareLink/CareLink')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')
django.setup()

from CareLink.models import User, Patient, Schedule
from schedule.views import PatientScheduleView
from django.http import HttpRequest
from rest_framework.request import Request
from rest_framework_simplejwt.tokens import RefreshToken

def test_patient_view_direct():
    print("=== TESTING PATIENT VIEW DIRECTLY ===")
    
    try:
        # Get Bob
        bob_user = User.objects.get(email='REMOVED_EMAIL')
        print(f"✓ Found Bob: {bob_user.firstname} {bob_user.lastname}")
        
        # Create a mock request
        http_request = HttpRequest()
        http_request.user = bob_user
        
        # Create view instance
        view = PatientScheduleView()
        
        # Create a proper DRF request
        request = Request(http_request)
        request.user = bob_user
        
        # Call the view
        response = view.get(request)
        
        print(f"Response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.data
            print(f"✓ View executed successfully")
            print(f"Response keys: {list(data.keys())}")
            
            if 'appointments' in data:
                appointments = data['appointments']
                print(f"✓ Found 'appointments' key with {len(appointments)} items")
                
                for i, appointment in enumerate(appointments, 1):
                    print(f"\n  Appointment {i}:")
                    print(f"    Date: {appointment.get('date')}")
                    print(f"    Provider: {appointment.get('provider', {}).get('name')}")
                    print(f"    Sub-appointments: {len(appointment.get('appointments', []))}")
                    
            else:
                print("✗ 'appointments' key missing")
                
            print(f"\n✓ Total appointments in response: {data.get('total_appointments', 0)}")
        else:
            print(f"✗ View failed: {response.data}")
            
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_patient_view_direct()

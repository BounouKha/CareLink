#!/usr/bin/env python3
import os
import django
import sys
import requests
from datetime import datetime, timedelta

sys.path.append('c:/Users/460020779/Desktop/CareLink/CareLink')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')
django.setup()

from CareLink.models import User
from rest_framework_simplejwt.tokens import RefreshToken

def test_patient_api():
    print("=== TESTING PATIENT API ENDPOINT ===")
    
    # Get Bob's user and create a token
    try:
        bob_user = User.objects.get(email='REMOVED_EMAIL')
        refresh = RefreshToken.for_user(bob_user)
        access_token = str(refresh.access_token)
        
        print(f"✓ Created token for Bob: {bob_user.firstname} {bob_user.lastname}")
        
        # Test the patient schedule endpoint
        url = 'http://localhost:8000/schedule/patient/schedule/'
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }
        
        print(f"\nTesting API endpoint: {url}")
        response = requests.get(url, headers=headers)
        print(f"API Response Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ API call successful")
            print(f"Response data keys: {list(data.keys())}")
            
            if 'appointments' in data:
                appointments = data['appointments']
                print(f"Found {len(appointments)} appointments:")
                
                for i, appointment in enumerate(appointments, 1):
                    print(f"\n  Appointment {i}:")
                    print(f"    Schedule ID: {appointment.get('schedule_id')}")
                    print(f"    Date: {appointment.get('date')}")
                    print(f"    Provider: {appointment.get('provider_name')}")
                    print(f"    Timeslots: {len(appointment.get('timeslots', []))}")
                    
                    for j, ts in enumerate(appointment.get('timeslots', []), 1):
                        print(f"      Timeslot {j}: {ts.get('start_time')} to {ts.get('end_time')}")
                        print(f"        Description: {ts.get('description')}")
                        print(f"        Service: {ts.get('service_name')}")
                        print(f"        Status: {ts.get('status')}")
            else:
                print("No 'appointments' key in response")
                print(f"Full response: {data}")
            
            if 'summary' in data:
                summary = data['summary']
                print(f"\nSummary:")
                print(f"  Total appointments: {summary.get('total_appointments')}")
                print(f"  Upcoming: {summary.get('upcoming_appointments')}")
                print(f"  Past: {summary.get('past_appointments')}")
        else:
            print(f"✗ API call failed")
            print(f"Response text: {response.text}")
            
    except User.DoesNotExist:
        print("✗ Bob user not found")
    except Exception as e:
        print(f"✗ Error testing API: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_patient_api()

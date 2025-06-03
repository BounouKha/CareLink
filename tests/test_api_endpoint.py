#!/usr/bin/env python3
import os
import django
import sys

sys.path.append('c:/Users/460020779/Desktop/CareLink/CareLink')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')
django.setup()

from django.test import Client
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
import json

User = get_user_model()

def test_patient_schedule_api():
    print("=== TESTING PATIENT SCHEDULE API ===")
    
    # Get Bob's user
    try:
        bob_user = User.objects.get(email='bob@sull.be')
        print(f"✓ Found Bob: {bob_user.firstname} {bob_user.lastname}")
        
        # Generate JWT token for Bob
        refresh = RefreshToken.for_user(bob_user)
        access_token = str(refresh.access_token)
        
        # Create test client
        client = Client()
        
        # Make API request
        response = client.get(
            '/schedule/patient/schedule/',
            HTTP_AUTHORIZATION=f'Bearer {access_token}',
            content_type='application/json'
        )
        
        print(f"API Response Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ API call successful")
            print(f"Response keys: {list(data.keys())}")
            
            # Check if 'appointments' key exists (what frontend expects)
            if 'appointments' in data:
                appointments = data['appointments']
                print(f"✓ Found 'appointments' key with {len(appointments)} items")
                
                for i, appointment in enumerate(appointments, 1):
                    print(f"\n  Appointment {i}:")
                    print(f"    ID: {appointment.get('id')}")
                    print(f"    Date: {appointment.get('date')}")
                    print(f"    Provider: {appointment.get('provider', {}).get('name', 'N/A')}")
                    print(f"    Sub-appointments: {len(appointment.get('appointments', []))}")
                    
                    for j, sub_app in enumerate(appointment.get('appointments', []), 1):
                        print(f"      {j}. {sub_app.get('start_time')} - {sub_app.get('end_time')}")
                        print(f"         Service: {sub_app.get('service', {}).get('name', 'N/A')}")
                        print(f"         Status: {sub_app.get('status', 'N/A')}")
            else:
                print("✗ 'appointments' key not found in response")
                print(f"Available keys: {list(data.keys())}")
            
            # Check summary info
            if 'total_appointments' in data:
                print(f"\n✓ Total appointments: {data['total_appointments']}")
            
        else:
            print(f"✗ API call failed: {response.content.decode()}")
            
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_patient_schedule_api()

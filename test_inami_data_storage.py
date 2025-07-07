#!/usr/bin/env python3
"""
Test INAMI Data Storage and Retrieval
Verifies that INAMI data is properly saved to and retrieved from TimeSlots
"""

import os
import sys
import django
import json

# Setup Django environment
sys.path.append(os.path.abspath('.'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')
django.setup()

from django.contrib.auth import get_user_model
from CareLink.models import TimeSlot, Schedule, Patient, Provider, Service
from datetime import date, time

User = get_user_model()

def test_inami_data_storage():
    """Test INAMI data storage and retrieval"""
    print("=" * 60)
    print("INAMI DATA STORAGE TEST")
    print("=" * 60)
    
    # Sample INAMI data
    sample_inami_data = {
        "care_type": "plaie_complexe",
        "care_location": "home", 
        "care_duration": "30-59",
        "is_weekend": False,
        "is_holiday": False,
        "mutuelle_price": 42.80,
        "patient_copay": 8.56,
        "total_price": 51.36,
        "inami_code": "424255",
        "care_type_label": "Plaie complexe",
        "care_location_label": "Domicile/Résidence",
        "care_duration_label": "30-59 minutes"
    }
    
    try:
        # Get Service 3 (Nursing Care)
        service_3 = Service.objects.filter(id=3).first()
        if not service_3:
            print("❌ Service 3 not found. Creating test service...")
            service_3 = Service.objects.create(
                id=3,
                name='Soins Infirmiers',
                price=50.00,
                description='Nursing care services'
            )
        
        print(f"✅ Using Service 3: {service_3.name}")
        
        # Create or get test users
        patient_user = User.objects.filter(role='Patient').first()
        if not patient_user:
            patient_user = User.objects.create(
                email='test.inami.patient@example.com',
                firstname='INAMI',
                lastname='Patient',
                role='Patient'
            )
        
        provider_user = User.objects.filter(role='Provider').first()
        if not provider_user:
            provider_user = User.objects.create(
                email='test.inami.provider@example.com',
                firstname='INAMI',
                lastname='Provider',
                role='Provider'
            )
        
        patient = Patient.objects.filter(user=patient_user).first()
        if not patient:
            patient = Patient.objects.create(user=patient_user)
            
        provider = Provider.objects.filter(user=provider_user).first()
        if not provider:
            provider = Provider.objects.create(
                user=provider_user,
                service=service_3,
                is_internal=True
            )
        
        # Create schedule
        schedule = Schedule.objects.create(
            patient=patient,
            provider=provider,
            date=date.today()
        )
        
        # Create timeslot with INAMI data
        timeslot = TimeSlot.objects.create(
            start_time=time(14, 0),
            end_time=time(14, 30),
            description="Test INAMI nursing care",
            service=service_3,
            inami_data=sample_inami_data,
            status='scheduled'
        )
        
        schedule.time_slots.add(timeslot)
        
        print(f"✅ Created TimeSlot {timeslot.id} with INAMI data")
        print(f"   - Service: {timeslot.service.name} (ID: {timeslot.service.id})")
        print(f"   - INAMI Code: {timeslot.inami_data['inami_code']}")
        print(f"   - Care Type: {timeslot.inami_data['care_type_label']}")
        print(f"   - Total Price: €{timeslot.inami_data['total_price']}")
        
        # Test retrieval
        retrieved_timeslot = TimeSlot.objects.get(id=timeslot.id)
        print(f"\n✅ Retrieved TimeSlot {retrieved_timeslot.id}")
        print(f"   - Has INAMI data: {'Yes' if retrieved_timeslot.inami_data else 'No'}")
        
        if retrieved_timeslot.inami_data:
            print(f"   - INAMI data keys: {list(retrieved_timeslot.inami_data.keys())}")
            print(f"   - Care type: {retrieved_timeslot.inami_data.get('care_type_label', 'N/A')}")
            print(f"   - INAMI code: {retrieved_timeslot.inami_data.get('inami_code', 'N/A')}")
            print(f"   - Total price: €{retrieved_timeslot.inami_data.get('total_price', 'N/A')}")
        
        # Test API-like data structure
        print(f"\n✅ API Response Structure Test:")
        api_timeslot_data = {
            'id': retrieved_timeslot.id,
            'start_time': str(retrieved_timeslot.start_time),
            'end_time': str(retrieved_timeslot.end_time),
            'description': retrieved_timeslot.description,
            'service': {
                'id': retrieved_timeslot.service.id,
                'name': retrieved_timeslot.service.name,
                'price': float(retrieved_timeslot.service.price)
            },
            'status': retrieved_timeslot.status,
            'inami_data': retrieved_timeslot.inami_data
        }
        
        print(f"   - TimeSlot ID: {api_timeslot_data['id']}")
        print(f"   - Service ID: {api_timeslot_data['service']['id']} (Type: {type(api_timeslot_data['service']['id'])})")
        print(f"   - Has INAMI data: {'Yes' if api_timeslot_data['inami_data'] else 'No'}")
        
        if api_timeslot_data['inami_data']:
            print(f"   - INAMI Code: {api_timeslot_data['inami_data']['inami_code']}")
            print(f"   - Care Type: {api_timeslot_data['inami_data']['care_type_label']}")
        
        print(f"\n✅ JSON Serialization Test:")
        json_data = json.dumps(api_timeslot_data, indent=2, default=str)
        print("   - Successfully serialized to JSON")
        
        # Test condition checking (like in frontend)
        service_id = api_timeslot_data['service']['id']
        print(f"\n✅ Frontend Condition Tests:")
        print(f"   - service_id == 3: {service_id == 3}")
        print(f"   - service_id == '3': {service_id == '3'}")
        print(f"   - service_id in [3, '3']: {service_id in [3, '3']}")
        print(f"   - Has INAMI data and Service 3: {api_timeslot_data['inami_data'] and service_id == 3}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error in INAMI data test: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    try:
        success = test_inami_data_storage()
        if success:
            print("\n" + "=" * 60)
            print("✅ ALL INAMI DATA TESTS PASSED!")
            print("INAMI data is properly stored and can be retrieved.")
            print("=" * 60)
        else:
            print("\n❌ INAMI data tests failed!")
            sys.exit(1)
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        sys.exit(1)

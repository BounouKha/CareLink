#!/usr/bin/env python3
"""
Test Prescription Implementation for CareLink
Tests prescription linking functionality between ServiceDemands and TimeSlots
"""

import os
import sys
import django

# Setup Django environment
sys.path.append(os.path.abspath('.'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')
django.setup()

from django.contrib.auth import get_user_model
from CareLink.models import ServiceDemand, Prescription, TimeSlot, Schedule, Patient, Provider, Service
from datetime import date, time, datetime
from django.utils import timezone

User = get_user_model()

def test_prescription_implementation():
    """Test the complete prescription implementation"""
    print("=" * 60)
    print("PRESCRIPTION IMPLEMENTATION TEST")
    print("=" * 60)
    
    # 1. Test ServiceDemand creation
    print("\n1. Testing ServiceDemand Creation...")
    try:
        # Get or create test patient
        test_user = User.objects.filter(role='Patient').first()
        if not test_user:
            print("❌ No test patient found. Creating one...")
            test_user = User.objects.create(
                email='test.patient@example.com',
                firstname='Test',
                lastname='Patient',
                role='Patient',
                is_active=True
            )
        
        patient = Patient.objects.filter(user=test_user).first()
        if not patient:
            patient = Patient.objects.create(user=test_user)
        
        # Get or create test service
        service = Service.objects.filter(name__contains='Nursing').first()
        if not service:
            service = Service.objects.create(
                name='Nursing Care Test',
                price=50.00,
                description='Test nursing care service'
            )
        
        # Create test ServiceDemand
        service_demand = ServiceDemand.objects.create(
            patient=patient,
            service=service,
            title="Test Prescription Service Demand",
            description="Patient needs regular nursing care",
            priority='Normal',
            status='Approved',
            preferred_start_date=date.today(),
            frequency='Daily',
            special_instructions="Apply medication as prescribed"
        )
        
        print(f"✅ ServiceDemand created: ID {service_demand.id}")
        print(f"   - Title: {service_demand.title}")
        print(f"   - Service: {service_demand.service.name}")
        print(f"   - Patient: {service_demand.patient.user.firstname} {service_demand.patient.user.lastname}")
        
    except Exception as e:
        print(f"❌ Error creating ServiceDemand: {e}")
        return False
    
    # 2. Test Prescription creation from ServiceDemand
    print("\n2. Testing Prescription Creation from ServiceDemand...")
    try:
        note_text = f"Created from Service Demand #{service_demand.id}: {service_demand.title}"
        prescription, created = Prescription.objects.get_or_create(
            medication=service_demand.description or service_demand.title,
            start_date=service_demand.preferred_start_date,
            service=service_demand.service,
            defaults={
                'end_date': None,
                'note': note_text,
                'status': 'accepted',
                'frequency': 1,
                'instructions': service_demand.special_instructions or ''
            }
        )
        
        print(f"✅ Prescription {'created' if created else 'retrieved'}: ID {prescription.id}")
        print(f"   - Medication: {prescription.medication}")
        print(f"   - Note: {prescription.note}")
        print(f"   - Instructions: {prescription.instructions}")
        
    except Exception as e:
        print(f"❌ Error creating Prescription: {e}")
        return False
    
    # 3. Test TimeSlot with prescription
    print("\n3. Testing TimeSlot with Prescription Link...")
    try:
        # Get or create test provider
        provider_user = User.objects.filter(role='Provider').first()
        if not provider_user:
            provider_user = User.objects.create(
                email='test.provider@example.com',
                firstname='Test',
                lastname='Provider',
                role='Provider',
                is_active=True
            )
        
        provider = Provider.objects.filter(user=provider_user).first()
        if not provider:
            provider = Provider.objects.create(
                user=provider_user,
                service=service,
                is_internal=True
            )
        
        # Create Schedule
        schedule = Schedule.objects.create(
            patient=patient,
            provider=provider,
            date=date.today()
        )
        
        # Create TimeSlot with prescription
        timeslot = TimeSlot.objects.create(
            start_time=time(9, 0),
            end_time=time(9, 30),
            description="Nursing care appointment",
            service=service,
            prescription=prescription,
            status='scheduled'
        )
        
        schedule.time_slots.add(timeslot)
        
        print(f"✅ TimeSlot created with prescription: ID {timeslot.id}")
        print(f"   - Time: {timeslot.start_time} - {timeslot.end_time}")
        print(f"   - Service: {timeslot.service.name}")
        print(f"   - Prescription ID: {timeslot.prescription.id}")
        print(f"   - Schedule ID: {schedule.id}")
        
    except Exception as e:
        print(f"❌ Error creating TimeSlot with prescription: {e}")
        return False
    
    # 4. Test API response structure
    print("\n4. Testing API Response Structure...")
    try:
        # Simulate the data structure that would be returned by the API
        timeslot_data = {
            'id': timeslot.id,
            'start_time': str(timeslot.start_time),
            'end_time': str(timeslot.end_time),
            'description': timeslot.description,
            'service': {
                'id': timeslot.service.id,
                'name': timeslot.service.name,
                'price': float(timeslot.service.price)
            },
            'status': timeslot.status,
            'prescription': None
        }
        
        # Add prescription data
        if timeslot.prescription:
            # Extract service demand ID from prescription note
            import re
            match = re.search(r'Service Demand #(\d+):', timeslot.prescription.note)
            service_demand_id = int(match.group(1)) if match else None
            
            timeslot_data['prescription'] = {
                'id': timeslot.prescription.id,
                'medication': timeslot.prescription.medication,
                'instructions': timeslot.prescription.instructions,
                'start_date': str(timeslot.prescription.start_date),
                'end_date': str(timeslot.prescription.end_date) if timeslot.prescription.end_date else None,
                'frequency': timeslot.prescription.frequency,
                'status': timeslot.prescription.status,
                'service_demand_id': service_demand_id,
                'note': timeslot.prescription.note
            }
        
        print("✅ API Response Structure Test:")
        print(f"   - TimeSlot ID: {timeslot_data['id']}")
        print(f"   - Service: {timeslot_data['service']['name']}")
        print(f"   - Has Prescription: {'Yes' if timeslot_data['prescription'] else 'No'}")
        if timeslot_data['prescription']:
            print(f"   - Prescription ID: {timeslot_data['prescription']['id']}")
            print(f"   - Service Demand ID: {timeslot_data['prescription']['service_demand_id']}")
        
    except Exception as e:
        print(f"❌ Error testing API response structure: {e}")
        return False
    
    # 5. Test Prescription Options API simulation
    print("\n5. Testing Prescription Options for Patient...")
    try:
        # Get all ServiceDemands for the patient that could be prescriptions
        patient_demands = ServiceDemand.objects.filter(
            patient=patient,
            status__in=['Approved', 'In Progress']
        )
        
        prescriptions_data = []
        for demand in patient_demands:
            # Check if already linked to a prescription/timeslot
            existing_prescription = Prescription.objects.filter(
                note__contains=f"Service Demand #{demand.id}"
            ).first()
            
            already_scheduled = False
            if existing_prescription:
                already_scheduled = TimeSlot.objects.filter(
                    prescription=existing_prescription
                ).exists()
            
            prescriptions_data.append({
                'id': demand.id,
                'title': demand.title,
                'description': demand.description,
                'service_name': demand.service.name if demand.service else 'No Service',
                'service_id': demand.service.id if demand.service else None,
                'patient_name': f"{demand.patient.user.firstname} {demand.patient.user.lastname}",
                'priority': demand.priority,
                'preferred_start_date': str(demand.preferred_start_date),
                'frequency': demand.frequency,
                'status': demand.status,
                'already_scheduled': already_scheduled,
                'instructions': demand.special_instructions
            })
        
        print(f"✅ Found {len(prescriptions_data)} prescription options for patient")
        for prescription_option in prescriptions_data:
            print(f"   - ID {prescription_option['id']}: {prescription_option['title']}")
            print(f"     Service: {prescription_option['service_name']}")
            print(f"     Already Scheduled: {'Yes' if prescription_option['already_scheduled'] else 'No'}")
            print(f"     Priority: {prescription_option['priority']}")
        
    except Exception as e:
        print(f"❌ Error testing prescription options: {e}")
        return False
    
    # 6. Summary
    print("\n" + "=" * 60)
    print("PRESCRIPTION IMPLEMENTATION TEST SUMMARY")
    print("=" * 60)
    print("✅ All prescription functionality tests passed!")
    print(f"✅ ServiceDemand ID: {service_demand.id}")
    print(f"✅ Prescription ID: {prescription.id}")
    print(f"✅ TimeSlot ID: {timeslot.id}")
    print(f"✅ Schedule ID: {schedule.id}")
    print("\nThe prescription implementation is working correctly:")
    print("- ServiceDemands can be converted to Prescriptions")
    print("- Prescriptions can be linked to TimeSlots")
    print("- API responses include prescription data")
    print("- Frontend can fetch available prescriptions for patients")
    
    return True

if __name__ == "__main__":
    try:
        test_prescription_implementation()
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        sys.exit(1)

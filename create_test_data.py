#!/usr/bin/env python3
"""
Create test data with created_by field set for testing
"""

import os
import sys
import django

# Setup Django environment
sys.path.append(r'c:\Users\460020779\Desktop\CareLink\CareLink')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')
django.setup()

from CareLink.models import User, Schedule, TimeSlot, Provider, Patient, Service
from datetime import date, time
from django.contrib.auth.hashers import make_password

def create_test_data():
    """Create test data with created_by field"""
    print("🧪 Creating Test Data with Created By Field")
    print("=" * 50)
    
    try:
        # Create or get test coordinator user
        coord_email = "test_coord@carelink.be"
        coordinator, created = User.objects.get_or_create(
            email=coord_email,
            defaults={
                'firstname': 'Test',
                'lastname': 'Coordinator',
                'role': 'Coordinator',
                'password': make_password('testpass123'),
                'phone': '1234567890'
            }
        )
        
        if created:
            print(f"✅ Created test coordinator: {coord_email}")
        else:
            print(f"✅ Using existing coordinator: {coord_email}")
            # Update password to ensure we know it
            coordinator.password = make_password('testpass123')
            coordinator.save()
        
        # Get or create a provider
        provider = Provider.objects.first()
        if not provider:
            # Create test provider user
            prov_user, created = User.objects.get_or_create(
                email="test_provider@carelink.be",
                defaults={
                    'firstname': 'Test',
                    'lastname': 'Provider',
                    'role': 'Provider',
                    'password': make_password('testpass123'),
                    'phone': '1234567891'
                }
            )
            
            # Get or create a service
            service, created = Service.objects.get_or_create(
                name="General Consultation",
                defaults={
                    'description': 'General medical consultation',
                    'price': 50.00,
                    'duration': 30
                }
            )
            
            provider = Provider.objects.create(
                user=prov_user,
                service=service,
                license_number="TEST123",
                is_internal=True
            )
            print(f"✅ Created test provider")
        
        # Get or create a patient
        patient = Patient.objects.first()
        if not patient:
            pat_user, created = User.objects.get_or_create(
                email="test_patient@carelink.be",
                defaults={
                    'firstname': 'Test',
                    'lastname': 'Patient',
                    'role': 'Patient',
                    'password': make_password('testpass123'),
                    'phone': '1234567892'
                }
            )
            
            patient = Patient.objects.create(
                user=pat_user,
                birth_date=date(1990, 1, 1),
                gender='M',
                national_id="123456789",
                emergency_contact="Emergency Contact"
            )
            print(f"✅ Created test patient")
        
        # Create a schedule with created_by field
        test_date = date(2025, 6, 10)
        schedule, created = Schedule.objects.get_or_create(
            date=test_date,
            provider=provider,
            patient=patient,
            defaults={
                'created_by': coordinator
            }
        )
        
        if created:
            print(f"✅ Created test schedule with created_by field")
        else:
            # Update existing schedule to have created_by
            schedule.created_by = coordinator
            schedule.save()
            print(f"✅ Updated existing schedule with created_by field")
        
        # Create a timeslot for the schedule
        service = Service.objects.first()
        if not service:
            service = Service.objects.create(
                name="Test Service",
                description="Test service description",
                price=25.00,
                duration=30
            )
        
        timeslot, created = TimeSlot.objects.get_or_create(
            start_time=time(10, 0),
            end_time=time(10, 30),
            defaults={
                'service': service,
                'status': 'scheduled',
                'description': 'Test appointment created by coordinator'
            }
        )
        
        if created:
            schedule.time_slots.add(timeslot)
            print(f"✅ Created test timeslot")
        
        print(f"\n📊 Test Data Summary:")
        print(f"   - Coordinator: {coordinator.email} (ID: {coordinator.id})")
        print(f"   - Provider: {provider.user.email} (ID: {provider.id})")
        print(f"   - Patient: {patient.user.email} (ID: {patient.id})")
        print(f"   - Schedule: Date {schedule.date} (ID: {schedule.id})")
        print(f"   - Created By: {schedule.created_by.firstname} {schedule.created_by.lastname}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error creating test data: {str(e)}")
        return False

if __name__ == "__main__":
    success = create_test_data()
    
    if success:
        print(f"\n🎉 Test data created successfully!")
        print("You can now test the API with:")
        print("Email: test_coord@carelink.be")
        print("Password: testpass123")
    else:
        print(f"\n⚠️ Failed to create test data")

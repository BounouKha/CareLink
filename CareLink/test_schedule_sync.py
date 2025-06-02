#!/usr/bin/env python3
"""
Test script to verify schedule synchronization between coordinator and patient views
"""
import os
import django
import sys
from datetime import datetime, date, time

# Setup Django
sys.path.append('c:/Users/460020779/Desktop/CareLink/CareLink')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')
django.setup()

from CareLink.models import Schedule, TimeSlot, Patient, Provider, Service, User

def test_schedule_sync():
    print("=== TESTING SCHEDULE SYNCHRONIZATION ===")
    
    # Get Bob as a test patient
    try:
        bob_user = User.objects.get(email='bob@sull.be')
        bob_patient = Patient.objects.get(user=bob_user)
        print(f"✓ Found Bob: {bob_patient.user.firstname} {bob_patient.user.lastname}")
    except (User.DoesNotExist, Patient.DoesNotExist) as e:
        print(f"✗ Error finding Bob: {e}")
        return
    
    # Check existing schedules for Bob
    bob_schedules = Schedule.objects.filter(patient=bob_patient)
    print(f"\n1. Bob's existing schedules: {bob_schedules.count()}")
    for schedule in bob_schedules:
        timeslot_count = schedule.time_slots.count()
        print(f"   - Schedule {schedule.id}: Date {schedule.date}, Timeslots: {timeslot_count}")
        for timeslot in schedule.time_slots.all():
            print(f"     * {timeslot.start_time} - {timeslot.end_time}: {timeslot.description}")
    
    # Check if Bob has any timeslots through reverse relationship
    print(f"\n2. Checking all timeslots associated with Bob's schedules:")
    all_timeslots = TimeSlot.objects.filter(schedule__patient=bob_patient)
    print(f"   Found {all_timeslots.count()} timeslots")
    for ts in all_timeslots:
        print(f"   - TimeSlot {ts.id}: {ts.start_time}-{ts.end_time} on {ts.schedule_set.first().date if ts.schedule_set.first() else 'No schedule'}")
    
    # Test creating a new schedule as a coordinator would
    print(f"\n3. Creating test schedule as coordinator...")
    try:
        # Get a provider and service
        provider = Provider.objects.first()
        service = Service.objects.first()
        
        if not provider:
            print("✗ No providers found")
            return
        if not service:
            print("✗ No services found") 
            return
            
        # Create schedule (as QuickScheduleView does)
        test_schedule = Schedule.objects.create(
            provider=provider,
            patient=bob_patient,
            date=date.today()
        )
        print(f"   ✓ Created schedule {test_schedule.id}")
        
        # Create timeslot (as QuickScheduleView does)
        test_timeslot = TimeSlot.objects.create(
            start_time=time(14, 0),  # 2:00 PM
            end_time=time(15, 0),    # 3:00 PM
            description="Test appointment created by coordinator",
            service=service,
            user=bob_user  # This might be wrong - should be coordinator user
        )
        print(f"   ✓ Created timeslot {test_timeslot.id}")
        
        # Add timeslot to schedule (as QuickScheduleView does)
        test_schedule.time_slots.add(test_timeslot)
        print(f"   ✓ Added timeslot to schedule")
        
        # Verify the relationship
        print(f"\n4. Verifying new schedule:")
        updated_schedule = Schedule.objects.get(id=test_schedule.id)
        print(f"   - Schedule has {updated_schedule.time_slots.count()} timeslots")
        print(f"   - Patient: {updated_schedule.patient.user.firstname} {updated_schedule.patient.user.lastname}")
        print(f"   - Provider: {updated_schedule.provider.user.firstname} {updated_schedule.provider.user.lastname}")
        
        # Test patient view query
        print(f"\n5. Testing patient view query:")
        patient_schedules = Schedule.objects.filter(patient=bob_patient).prefetch_related('time_slots', 'provider__user')
        print(f"   - Found {patient_schedules.count()} schedules for Bob")
        
        for schedule in patient_schedules:
            print(f"   - Schedule {schedule.id}: {schedule.date}")
            print(f"     Provider: {schedule.provider.user.firstname} {schedule.provider.user.lastname}")
            timeslots = schedule.time_slots.all()
            print(f"     Timeslots: {timeslots.count()}")
            for ts in timeslots:
                print(f"       * {ts.start_time}-{ts.end_time}: {ts.description}")
        
        print(f"\n✓ Test completed successfully!")
        
    except Exception as e:
        print(f"✗ Error during test: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_schedule_sync()
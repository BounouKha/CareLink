#!/usr/bin/env python3
"""
Script to fix the schedule data and create proper appointments for testing
"""
import os
import django
import sys
from datetime import datetime, date, time, timedelta

# Setup Django
sys.path.append('c:/Users/460020779/Desktop/CareLink/CareLink')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')
django.setup()

from CareLink.models import Schedule, TimeSlot, Patient, Provider, Service, User

def fix_schedule_data():
    print("=== FIXING SCHEDULE DATA ===")
    
    # 1. Remove the shared timeslot issue
    print("1. Analyzing shared timeslots...")
    shared_timeslot = TimeSlot.objects.get(id=6)  # The 06:00-10:00 slot
    linked_schedules = shared_timeslot.schedule_set.all()
    
    print(f"Shared timeslot {shared_timeslot.id} is linked to {linked_schedules.count()} schedules:")
    for schedule in linked_schedules:
        patient_name = f"{schedule.patient.user.firstname} {schedule.patient.user.lastname}" if schedule.patient and schedule.patient.user else "Unknown"
        print(f"  - Schedule {schedule.id}: {patient_name}")
    
    # 2. Keep timeslot for Grace Harris (Schedule 3), remove from Frank Green (Schedule 9)
    grace_schedule = Schedule.objects.get(id=3)  # Grace Harris
    frank_schedule = Schedule.objects.get(id=9)   # Frank Green
    
    # Remove from Frank's schedule
    frank_schedule.time_slots.remove(shared_timeslot)
    print(f"Removed shared timeslot from Frank's schedule (ID: {frank_schedule.id})")
      # 3. Create new schedules and timeslots for Bob
    bob_user = User.objects.get(email='REMOVED_EMAIL')
    bob_patient = Patient.objects.get(user=bob_user)
    
    # Get providers for Bob's schedules
    providers = Provider.objects.all()[:2]  # Get two providers for Bob's schedules
    if providers.count() < 2:
        print("Not enough providers, creating only one schedule")
    
    print(f"\n2. Creating new schedules and timeslots for Bob Sull...")
    
    # Get a service for appointments
    try:
        general_service = Service.objects.first()
        print(f"Using service: {general_service.name if general_service else 'No service available'}")
    except:
        general_service = None
        print("No services available")
    
    # Create two new schedules for Bob
    bob_schedules = []
    
    # Schedule 1: Today's appointment
    today_schedule = Schedule.objects.create(
        patient=bob_patient,
        provider=providers[0] if providers else None,
        date=date.today()
    )
    bob_schedules.append(today_schedule)
    print(f"Created schedule for today (ID: {today_schedule.id})")
    
    # Schedule 2: Future appointment (next week)
    future_date = date.today() + timedelta(days=7)
    future_schedule = Schedule.objects.create(
        patient=bob_patient,
        provider=providers[1] if len(providers) > 1 else providers[0] if providers else None,
        date=future_date
    )
    bob_schedules.append(future_schedule)
    print(f"Created schedule for {future_date} (ID: {future_schedule.id})")
    
    # Create timeslots for Bob's new schedules
    for i, schedule in enumerate(bob_schedules):
        # Create different appointment times for each schedule
        if i == 0:
            start_time = time(14, 0)  # 2:00 PM
            end_time = time(15, 0)    # 3:00 PM
            description = "General Health Checkup"
        else:
            start_time = time(10, 0)  # 10:00 AM
            end_time = time(11, 30)   # 11:30 AM
            description = "Follow-up Consultation"
        
        # Create timeslot
        timeslot = TimeSlot.objects.create(
            start_time=start_time,
            end_time=end_time,
            description=description,
            service=general_service,
            user=bob_user
        )
        
        # Link to schedule
        schedule.time_slots.add(timeslot)
        
        provider_name = f"{schedule.provider.user.firstname} {schedule.provider.user.lastname}" if schedule.provider and schedule.provider.user else "Unknown Provider"
        print(f"Created timeslot for Schedule {schedule.id}: {start_time}-{end_time} with {provider_name}")
    
    # 4. Create timeslot for Frank's empty schedule
    frank_timeslot = TimeSlot.objects.create(
        start_time=time(16, 0),    # 4:00 PM
        end_time=time(17, 0),      # 5:00 PM
        description="Physical Therapy Session",
        service=general_service,
        user=frank_schedule.patient.user if frank_schedule.patient else None
    )
    frank_schedule.time_slots.add(frank_timeslot)
    print(f"Created new timeslot for Frank's schedule: {frank_timeslot.start_time}-{frank_timeslot.end_time}")
    
    print("\n=== DATA FIXING COMPLETE ===")
    
    # 5. Verify the fix
    print("\n=== VERIFICATION ===")
    all_schedules = Schedule.objects.all()
    for schedule in all_schedules:
        timeslots = schedule.time_slots.all()
        patient_name = f"{schedule.patient.user.firstname} {schedule.patient.user.lastname}" if schedule.patient and schedule.patient.user else "Unknown"
        print(f"Schedule {schedule.id} ({patient_name}): {timeslots.count()} timeslots")
        for ts in timeslots:
            print(f"  -> {ts.start_time}-{ts.end_time}: {ts.description}")

if __name__ == "__main__":
    fix_schedule_data()

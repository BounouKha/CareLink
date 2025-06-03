#!/usr/bin/env python3
import os
import django
import sys

sys.path.append('c:/Users/460020779/Desktop/CareLink/CareLink')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')
django.setup()

from CareLink.models import User, Schedule, Patient

print("=== SIMPLE TEST ===")

# Check Bob exists
try:
    bob_user = User.objects.get(email='bob@sull.be')
    print(f"✓ Found Bob: {bob_user.firstname} {bob_user.lastname}")
    
    bob_patient = Patient.objects.get(user=bob_user)
    print(f"✓ Found Bob's patient record: ID {bob_patient.id}")
    
    # Check his schedules
    schedules = Schedule.objects.filter(patient=bob_patient)
    print(f"✓ Bob has {schedules.count()} schedules")
    
    for schedule in schedules:
        timeslot_count = schedule.time_slots.count()
        print(f"  - Schedule {schedule.id}: Date {schedule.date}, Timeslots: {timeslot_count}")
        
except Exception as e:
    print(f"✗ Error: {e}")
    import traceback
    traceback.print_exc()

#!/usr/bin/env python3
import os
import django
import sys

sys.path.append('c:/Users/460020779/Desktop/CareLink/CareLink')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')
django.setup()

from CareLink.models import Schedule

def cleanup_empty_schedules():
    print("=== CLEANING UP EMPTY SCHEDULES ===")
    
    # Find schedules with no timeslots
    empty_schedules = []
    all_schedules = Schedule.objects.all()
    
    for schedule in all_schedules:
        if schedule.time_slots.count() == 0:
            empty_schedules.append(schedule)
    
    print(f"Found {len(empty_schedules)} empty schedules")
    
    for schedule in empty_schedules:
        patient_name = f"{schedule.patient.user.firstname} {schedule.patient.user.lastname}" if schedule.patient else "Unknown"
        print(f"Deleting empty schedule {schedule.id} for {patient_name} on {schedule.date}")
        schedule.delete()
    
    print("✓ Cleanup completed")

if __name__ == "__main__":
    cleanup_empty_schedules()

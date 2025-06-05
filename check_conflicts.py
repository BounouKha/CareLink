#!/usr/bin/env python3
"""
Check for existing schedules and timeslots that might be causing conflicts
"""
import os
import django
import sys
from datetime import datetime, time

# Add the CareLink directory to the path
sys.path.append('CareLink')

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')
django.setup()

from CareLink.models import Schedule, TimeSlot, Patient, Provider, Service, User

def check_existing_data():
    print("🔍 Checking Existing Data in Database")
    print("=" * 50)
    
    # Check schedules
    schedules = Schedule.objects.all()
    print(f"📅 Total Schedules: {schedules.count()}")
    
    for schedule in schedules:
        print(f"   - Date: {schedule.date}, Patient: {schedule.patient}, Provider: {schedule.provider}")
        print(f"     Created by: {schedule.created_by}")
        timeslots = schedule.time_slots.all()
        print(f"     TimeSlots: {timeslots.count()}")
        for ts in timeslots:
            print(f"       * {ts.start_time}-{ts.end_time} ({ts.status}) - Service: {ts.service}")
    
    print()
    
    # Check standalone timeslots
    all_timeslots = TimeSlot.objects.all()
    schedule_timeslots = TimeSlot.objects.filter(schedule__isnull=False)
    standalone_timeslots = all_timeslots.exclude(id__in=schedule_timeslots.values_list('id', flat=True))
    
    print(f"⏰ Total TimeSlots: {all_timeslots.count()}")
    print(f"   - Linked to schedules: {schedule_timeslots.count()}")
    print(f"   - Standalone: {standalone_timeslots.count()}")
    
    if standalone_timeslots.exists():
        print("   Standalone timeslots:")
        for ts in standalone_timeslots[:10]:  # Show first 10
            print(f"     * {ts.start_time}-{ts.end_time} (Status: {ts.status}) - Service: {ts.service}")
    
    print()
    
    # Check specific dates from the test
    test_dates = ['2025-06-09', '2025-06-16', '2025-06-23', '2025-06-30']
    test_time_start = time(9, 0)
    test_time_end = time(10, 0)
    
    print("🎯 Checking Specific Test Dates")
    print("-" * 30)
    
    for date_str in test_dates:
        print(f"\n📅 Date: {date_str}")
        
        # Check schedules on this date
        date_schedules = Schedule.objects.filter(date=date_str)
        print(f"   Schedules on this date: {date_schedules.count()}")
        
        for schedule in date_schedules:
            print(f"     - Patient: {schedule.patient}, Provider: {schedule.provider}")
            
        # Check timeslots that might conflict
        # Look for timeslots that overlap with 09:00-10:00
        overlapping_timeslots = TimeSlot.objects.filter(
            start_time__lt=test_time_end,
            end_time__gt=test_time_start
        )
        
        print(f"   Potentially overlapping timeslots (09:00-10:00): {overlapping_timeslots.count()}")
        
        # Check if any of these timeslots are linked to schedules on this date
        for ts in overlapping_timeslots:
            linked_schedules = ts.schedule_set.filter(date=date_str)
            if linked_schedules.exists():
                print(f"     - Conflict: {ts.start_time}-{ts.end_time} linked to {linked_schedules.count()} schedule(s) on {date_str}")
                for schedule in linked_schedules:
                    print(f"       Schedule: Patient {schedule.patient}, Provider {schedule.provider}")

if __name__ == "__main__":
    check_existing_data()

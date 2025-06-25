#!/usr/bin/env python3
"""
Test script to diagnose schedule data synchronization issues.

This test helps identify discrepancies between:
1. Calendar appointments showing in week view
2. Pending service demands
3. Actual schedule data in database

Usage: python test_schedule_data_sync.py
"""

import os
import sys
import django
from datetime import datetime, timedelta
from django.utils import timezone

# Add the CareLink directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'CareLink'))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')
django.setup()

from schedule.models import Schedule, TimeSlot
from servicedemands.models import ServiceDemand
from account.models import Patient, Provider


def print_separator(title):
    """Print a formatted separator with title."""
    print("\n" + "="*60)
    print(f" {title} ")
    print("="*60)


def test_schedule_data_for_week():
    """Test schedule data for the week 29/06 to 05/07."""
    
    # Define the week range (June 29 to July 5, 2025)
    week_start = datetime(2025, 6, 29).date()
    week_end = datetime(2025, 7, 5).date()
    
    print_separator("SCHEDULE DATA SYNC TEST")
    print(f"Testing week: {week_start} to {week_end}")
    print(f"Current date: {datetime.now().date()}")
    
    # 1. Check all schedules in the date range
    print_separator("1. SCHEDULES IN DATE RANGE")
    schedules = Schedule.objects.filter(date__range=[week_start, week_end])
    print(f"Total schedules found: {schedules.count()}")
    
    for schedule in schedules:
        print(f"\nSchedule ID: {schedule.id}")
        print(f"  Date: {schedule.date}")
        print(f"  Patient: {schedule.patient}")
        print(f"  Description: {schedule.description or 'No description'}")
        print(f"  Created by: {schedule.created_by}")
        print(f"  Created at: {schedule.created_at}")
        
        # Get providers for this schedule
        providers = schedule.providers.all()
        print(f"  Providers: {', '.join([p.user.get_full_name() or p.user.username for p in providers])}")
        
        # Get timeslots for this schedule
        timeslots = schedule.timeslots.all()
        print(f"  Timeslots count: {timeslots.count()}")
        
        for i, timeslot in enumerate(timeslots, 1):
            print(f"    Timeslot {i}: {timeslot.start_time} - {timeslot.end_time}")
            print(f"      Service: {timeslot.service.name if timeslot.service else 'No service'}")
            print(f"      Status: {timeslot.status}")
    
    # 2. Check all timeslots in the date range (alternative query)
    print_separator("2. TIMESLOTS IN DATE RANGE")
    timeslots = TimeSlot.objects.filter(schedule__date__range=[week_start, week_end])
    print(f"Total timeslots found: {timeslots.count()}")
    
    timeslot_summary = {}
    for timeslot in timeslots:
        date_key = timeslot.schedule.date
        if date_key not in timeslot_summary:
            timeslot_summary[date_key] = []
        
        timeslot_summary[date_key].append({
            'time': f"{timeslot.start_time}-{timeslot.end_time}",
            'patient': str(timeslot.schedule.patient) if timeslot.schedule.patient else "No Patient (Blocked)",
            'providers': [p.user.get_full_name() or p.user.username for p in timeslot.schedule.providers.all()],
            'service': timeslot.service.name if timeslot.service else "No Service",
            'status': timeslot.status
        })
    
    for date, slots in sorted(timeslot_summary.items()):
        print(f"\n{date} ({len(slots)} timeslots):")
        for slot in slots:
            print(f"  {slot['time']} | {slot['patient']} | {', '.join(slot['providers'])} | {slot['service']} | {slot['status']}")
    
    # 3. Check pending service demands
    print_separator("3. PENDING SERVICE DEMANDS")
    pending_demands = ServiceDemand.objects.filter(status='pending')
    print(f"Total pending demands: {pending_demands.count()}")
    
    for demand in pending_demands:
        print(f"\nDemand ID: {demand.id}")
        print(f"  Title: {demand.title}")
        print(f"  Patient: {demand.patient}")
        print(f"  Service: {demand.service}")
        print(f"  Priority: {demand.priority}")
        print(f"  Preferred start date: {demand.preferred_start_date}")
        print(f"  Created: {demand.created_at}")
        print(f"  Updated: {demand.updated_at}")
    
    # 4. Check for appointments without patients (blocked time)
    print_separator("4. BLOCKED TIME APPOINTMENTS")
    blocked_schedules = Schedule.objects.filter(
        date__range=[week_start, week_end],
        patient__isnull=True
    )
    print(f"Blocked time schedules: {blocked_schedules.count()}")
    
    for schedule in blocked_schedules:
        print(f"\nBlocked Schedule ID: {schedule.id}")
        print(f"  Date: {schedule.date}")
        print(f"  Description: {schedule.description or 'No description'}")
        print(f"  Providers: {', '.join([p.user.get_full_name() or p.user.username for p in schedule.providers.all()])}")
        
        timeslots = schedule.timeslots.all()
        for timeslot in timeslots:
            print(f"  Timeslot: {timeslot.start_time} - {timeslot.end_time} ({timeslot.status})")
    
    # 5. Check API endpoint data simulation
    print_separator("5. SIMULATING API ENDPOINT DATA")
    
    # Simulate what the calendar API would return
    from schedule.views import ScheduleListView
    from django.http import HttpRequest
    from django.contrib.auth.models import AnonymousUser
    
    # Create a mock request for the API
    request = HttpRequest()
    request.method = 'GET'
    request.user = AnonymousUser()
    
    # Try to get the same data the frontend would get
    try:
        view = ScheduleListView()
        view.request = request
        
        # Get queryset (this simulates what the API returns)
        queryset = view.get_queryset()
        week_schedules = queryset.filter(date__range=[week_start, week_end])
        
        print(f"API would return {week_schedules.count()} schedules for this week")
        
        # Check if there are any filtering issues
        all_schedules_in_week = Schedule.objects.filter(date__range=[week_start, week_end])
        if week_schedules.count() != all_schedules_in_week.count():
            print(f"⚠️  DISCREPANCY DETECTED!")
            print(f"   Database has {all_schedules_in_week.count()} schedules")
            print(f"   API returns {week_schedules.count()} schedules")
            print(f"   Difference: {all_schedules_in_week.count() - week_schedules.count()} schedules are filtered out")
        
    except Exception as e:
        print(f"Error simulating API call: {e}")
    
    # 6. Summary and recommendations
    print_separator("6. SUMMARY AND ANALYSIS")
    
    total_timeslots = timeslots.count()
    total_schedules = schedules.count()
    total_pending = pending_demands.count()
    total_blocked = blocked_schedules.count()
    
    print(f"Week {week_start} to {week_end} Summary:")
    print(f"  • Total schedules: {total_schedules}")
    print(f"  • Total timeslots: {total_timeslots}")
    print(f"  • Blocked time schedules: {total_blocked}")
    print(f"  • Pending service demands: {total_pending}")
    
    # Analysis
    print(f"\nAnalysis:")
    if total_timeslots > 0 and total_schedules == 0:
        print("  ⚠️  Found timeslots but no schedules - possible orphaned data")
    
    if total_timeslots == 0 and total_schedules > 0:
        print("  ⚠️  Found schedules but no timeslots - schedules without time slots")
    
    if total_pending > 0:
        print(f"  ℹ️  There are {total_pending} pending service demands that might need scheduling")
    
    if total_timeslots == 4 and total_pending == 2:
        print("  ✅ This matches your observation: 4 busy timeslots and 2 pending demands")
        print("  📋 Recommendations:")
        print("     1. Check if calendar filters are hiding some appointments")
        print("     2. Verify user permissions to view all schedules")
        print("     3. Check date range calculations in the frontend")
        print("     4. Verify provider filtering settings")
    
    # 7. Check for common issues
    print_separator("7. COMMON ISSUES CHECK")
    
    # Check for timezone issues
    current_tz = timezone.get_current_timezone()
    print(f"Current timezone: {current_tz}")
    
    # Check for future dates being filtered
    future_schedules = Schedule.objects.filter(date__gt=datetime.now().date())
    print(f"Future schedules in database: {future_schedules.count()}")
    
    # Check for user-specific filtering
    users_with_schedules = Schedule.objects.filter(
        date__range=[week_start, week_end]
    ).values_list('created_by__username', flat=True).distinct()
    print(f"Users who created schedules this week: {list(users_with_schedules)}")
    
    print(f"\nTest completed! Check the output above for any discrepancies.")


if __name__ == "__main__":
    test_schedule_data_for_week()

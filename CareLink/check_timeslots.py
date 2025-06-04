#!/usr/bin/env python
import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')

try:
    django.setup()
except Exception as e:
    print(f"Django setup error: {e}")
    sys.exit(1)

from CareLink.models import Schedule, TimeSlot
from django.db.models import Count

print("=== DETAILED TIMESLOT ANALYSIS ===")

# Check for duplicate schedules on same date
print("\n=== SCHEDULES BY DATE ===")
schedules = Schedule.objects.all().order_by('date', 'patient__user__firstname')
for schedule in schedules:
    timeslots = TimeSlot.objects.filter(schedule=schedule)
    patient_name = f"{schedule.patient.user.firstname} {schedule.patient.user.lastname}" if schedule.patient and schedule.patient.user else "Unknown Patient"
    print(f"Schedule {schedule.id}: Patient {patient_name} on {schedule.date}")
    print(f"  - {len(timeslots)} timeslots")
    for ts in timeslots:
        print(f"    * TimeSlot {ts.id}: {ts.start_time}-{ts.end_time}, Status: {ts.status}")

# Check for same patient on same date
print("\n=== CHECKING FOR DUPLICATE SCHEDULES ===")
from django.db.models import Count
duplicate_dates = Schedule.objects.values('patient', 'date').annotate(count=Count('id')).filter(count__gt=1)
for dup in duplicate_dates:
    patient_schedules = Schedule.objects.filter(patient=dup['patient'], date=dup['date'])
    patient_name = f"{patient_schedules.first().patient.user.firstname} {patient_schedules.first().patient.user.lastname}" if patient_schedules.first().patient and patient_schedules.first().patient.user else "Unknown Patient"
    print(f"\nDUPLICATE: Patient {patient_name} has {dup['count']} schedules on {dup['date']}")
    for sched in patient_schedules:
        timeslots = TimeSlot.objects.filter(schedule=sched)
        print(f"  - Schedule {sched.id}: {len(timeslots)} timeslots")
        for ts in timeslots:
            print(f"    * TimeSlot {ts.id}: {ts.start_time}-{ts.end_time}, Status: {ts.status}")

# Check timeslots by time to see if there are overlapping times
print("\n=== TIMESLOTS BY TIME ===")
all_timeslots = TimeSlot.objects.all().order_by('start_time')
for ts in all_timeslots:
    # Find which schedule this timeslot belongs to
    schedule = Schedule.objects.filter(time_slots=ts).first()
    if schedule:
        patient_name = f"{schedule.patient.user.firstname} {schedule.patient.user.lastname}" if schedule.patient and schedule.patient.user else "Unknown Patient"
        print(f"TimeSlot {ts.id}: {patient_name} on {schedule.date} at {ts.start_time}-{ts.end_time} (Schedule {schedule.id})")
    else:
        print(f"TimeSlot {ts.id}: No associated schedule - {ts.start_time}-{ts.end_time}, Status: {ts.status}")

# Check if any timeslots belong to multiple schedules
print("\n=== TIMESLOTS WITH MULTIPLE SCHEDULES ===")
for ts in TimeSlot.objects.all():
    schedules = Schedule.objects.filter(time_slots=ts)
    if schedules.count() > 1:
        print(f"TimeSlot {ts.id} belongs to {schedules.count()} schedules:")
        for sched in schedules:
            patient_name = f"{sched.patient.user.firstname} {sched.patient.user.lastname}" if sched.patient and sched.patient.user else "Unknown Patient"
            print(f"  - Schedule {sched.id}: {patient_name} on {sched.date}")
    elif schedules.count() == 0:
        print(f"TimeSlot {ts.id} has NO associated schedule - {ts.start_time}-{ts.end_time}")

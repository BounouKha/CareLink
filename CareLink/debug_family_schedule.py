#!/usr/bin/env python
import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')
django.setup()

from CareLink.models import FamilyPatient, User, Patient, Schedule, TimeSlot

def analyze_family_patient_data():
    print('=== FAMILY PATIENT RELATIONSHIPS ===')
    family_patients = FamilyPatient.objects.all().select_related('user', 'patient__user')
    
    if not family_patients.exists():
        print("No family patient relationships found.")
    else:
        for fp in family_patients:
            user_name = f"{fp.user.firstname} {fp.user.lastname}" if fp.user else "No User"
            patient_name = f"{fp.patient.user.firstname} {fp.patient.user.lastname}" if fp.patient and fp.patient.user else "No User"
            print(f"FamilyPatient ID {fp.id}: User {user_name} (ID: {fp.user.id if fp.user else 'None'}) -> Patient {patient_name} (Patient ID: {fp.patient.id if fp.patient else 'None'}) - Relationship: {fp.link}")

    print('\n=== PATIENT SCHEDULES ===')
    schedules = Schedule.objects.all().select_related('patient__user', 'provider__user')
    
    if not schedules.exists():
        print("No schedules found.")
    else:
        for s in schedules:
            timeslots_count = s.time_slots.count()
            patient_name = f"{s.patient.user.firstname} {s.patient.user.lastname}" if s.patient and s.patient.user else "No User"
            provider_name = f"{s.provider.user.firstname} {s.provider.user.lastname}" if s.provider and s.provider.user else "No Provider"
            print(f"Schedule ID {s.id}: Date {s.date}, Patient: {patient_name} (Patient ID: {s.patient.id if s.patient else 'None'}), Provider: {provider_name}, TimeSlots: {timeslots_count}")

    print('\n=== USERS WITH FAMILY PATIENT ROLE ===')
    family_users = User.objects.filter(role='Family Patient')
    
    if not family_users.exists():
        print("No users with Family Patient role found.")
    else:
        for user in family_users:
            print(f"User ID {user.id}: {user.firstname} {user.lastname} - Email: {user.email}")

    print('\n=== SCHEDULE DATA FOR FAMILY PATIENTS ===')
    # Check what schedules family patients should see
    for fp in family_patients:
        print(f"\nFamily Patient: {fp.user.firstname} {fp.user.lastname} (linked to Patient ID: {fp.patient.id if fp.patient else 'None'})")
        if fp.patient:
            patient_schedules = Schedule.objects.filter(patient=fp.patient)
            if patient_schedules.exists():
                for schedule in patient_schedules:
                    timeslots = schedule.time_slots.all()
                    print(f"  - Schedule {schedule.id} on {schedule.date}: {timeslots.count()} timeslots")
                    for ts in timeslots:
                        print(f"    * {ts.start_time}-{ts.end_time}: {ts.description or 'No description'}")
            else:
                print("  - No schedules found for this patient")

if __name__ == "__main__":
    analyze_family_patient_data()

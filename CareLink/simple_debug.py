import os
import sys
import django

# Add the project root to sys.path
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.append(project_root)

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')
django.setup()

from CareLink.models import FamilyPatient, User, Patient, Schedule, TimeSlot

# Check family patients
print("=== FAMILY PATIENTS ===")
fps = FamilyPatient.objects.all()
print(f"Total FamilyPatient records: {fps.count()}")

for fp in fps:
    print(f"- FamilyPatient {fp.id}: User {fp.user_id} -> Patient {fp.patient_id}, Link: {fp.link}")

# Check users with Family Patient role
print("\n=== FAMILY PATIENT USERS ===")
family_users = User.objects.filter(role='Family Patient')
print(f"Total users with Family Patient role: {family_users.count()}")

for user in family_users:
    print(f"- User {user.id}: {user.firstname} {user.lastname} ({user.email})")

# Check patients
print("\n=== PATIENTS ===")
patients = Patient.objects.all()
print(f"Total patients: {patients.count()}")

for patient in patients:
    user_info = f"{patient.user.firstname} {patient.user.lastname}" if patient.user else "No User"
    print(f"- Patient {patient.id}: {user_info}")

# Check schedules
print("\n=== SCHEDULES ===")
schedules = Schedule.objects.all()
print(f"Total schedules: {schedules.count()}")

for schedule in schedules:
    patient_info = f"Patient {schedule.patient_id}" if schedule.patient_id else "No Patient"
    timeslot_count = schedule.time_slots.count()
    print(f"- Schedule {schedule.id}: {patient_info}, Date: {schedule.date}, TimeSlots: {timeslot_count}")

# Check for family patient schedules specifically
print("\n=== FAMILY PATIENT SCHEDULE ACCESS ===")
for fp in fps:
    if fp.patient_id:
        patient_schedules = Schedule.objects.filter(patient_id=fp.patient_id)
        user_name = f"{fp.user.firstname} {fp.user.lastname}" if fp.user else "Unknown User"
        print(f"Family member {user_name} should see {patient_schedules.count()} schedules for Patient {fp.patient_id}")
        
        for schedule in patient_schedules:
            timeslots = schedule.time_slots.all()
            print(f"  - Schedule {schedule.id} on {schedule.date}: {timeslots.count()} timeslots")

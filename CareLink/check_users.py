#!/usr/bin/env python
import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')
django.setup()

from CareLink.models import User, FamilyPatient, Patient

def check_users():
    print('=== ALL USERS ===')
    users = User.objects.all()
    for user in users:
        print(f"ID: {user.id}, Email: {user.email}, Role: {user.role}, Name: {user.firstname} {user.lastname}")
    
    print('\n=== FAMILY PATIENT USERS ===')
    family_users = User.objects.filter(role='Family Patient')
    for user in family_users:
        print(f"Family Patient - ID: {user.id}, Email: {user.email}, Name: {user.firstname} {user.lastname}")
    
    print('\n=== FAMILY PATIENT RELATIONSHIPS ===')
    family_patients = FamilyPatient.objects.all().select_related('user', 'patient')
    for fp in family_patients:
        user_info = f"{fp.user.email} ({fp.user.firstname} {fp.user.lastname})" if fp.user else "No user"
        patient_info = f"Patient ID {fp.patient.id}" if fp.patient else "No patient"
        print(f"FamilyPatient ID {fp.id}: {user_info} -> {patient_info}, Link: {fp.link}")

if __name__ == "__main__":
    check_users()

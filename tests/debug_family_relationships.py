#!/usr/bin/env python3
"""
Debug script to check family relationships and patient data
"""

import os
import sys
import django

# Add the project directory to the Python path
sys.path.append('c:\\Users\\460020779\\Desktop\\CareLink')
os.chdir('c:\\Users\\460020779\\Desktop\\CareLink\\CareLink')

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')
django.setup()

from CareLink.models import User, Patient, FamilyPatient

def debug_family_relationships():
    print("=" * 60)
    print("DEBUGGING FAMILY RELATIONSHIPS")
    print("=" * 60)
    
    # Find the family patient user
    family_user = User.objects.filter(email="fpatient1@carelink.be").first()
    if not family_user:
        print("❌ Family patient user not found!")
        return
    
    print(f"✅ Found family patient user: {family_user.firstname} {family_user.lastname} (ID: {family_user.id})")
    
    # Check family relationships
    family_relationships = FamilyPatient.objects.filter(user=family_user)
    print(f"\n📋 Family relationships for {family_user.firstname}:")
    
    for i, fp in enumerate(family_relationships, 1):
        print(f"  {i}. Relationship ID: {fp.id}")
        print(f"     Link: {fp.link}")
        print(f"     Patient ID: {fp.patient_id}")
        print(f"     Patient object: {fp.patient}")
        if fp.patient:
            print(f"     Patient details: ID={fp.patient.id}, User={fp.patient.user}")
            if fp.patient.user:
                print(f"     Patient name: {fp.patient.user.firstname} {fp.patient.user.lastname}")
        print()
    
    # Check all patients in the system
    print("👥 All patients in the system:")
    patients = Patient.objects.all()
    for patient in patients:
        print(f"  Patient ID: {patient.id}")
        if patient.user:
            print(f"    Name: {patient.user.firstname} {patient.user.lastname}")
            print(f"    Email: {patient.user.email}")
            print(f"    Role: {patient.user.role}")
        else:
            print(f"    Name: [No linked user]")
        print(f"    Gender: {patient.gender}")
        print(f"    Blood Type: {patient.blood_type}")
        print(f"    Emergency Contact: {patient.emergency_contact}")
        print()
    
    # Check all users
    print("👤 All users in the system:")
    users = User.objects.all()
    for user in users:
        print(f"  User ID: {user.id}")
        print(f"    Name: {user.firstname} {user.lastname}")
        print(f"    Email: {user.email}")
        print(f"    Role: {user.role}")
        
        # Check if this user has a patient profile
        try:
            patient = Patient.objects.get(user=user)
            print(f"    ✅ Has patient profile (Patient ID: {patient.id})")
        except Patient.DoesNotExist:
            print(f"    ❌ No patient profile")
        print()

if __name__ == "__main__":
    debug_family_relationships()

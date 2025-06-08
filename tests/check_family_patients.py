#!/usr/bin/env python3

import os
import sys
import django

# Add the parent directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'CareLink'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')
django.setup()

from CareLink.models import User

def check_family_patients():
    print("Checking for Family Patient users...")
    
    # Get all users with 'Family Patient' role
    family_patients = User.objects.filter(role='Family Patient')
    
    print(f"Found {family_patients.count()} Family Patient users:")
    
    for user in family_patients:
        print(f"- ID: {user.id}, Name: {user.firstname} {user.lastname}, Email: {user.email}")
          # Check if they have a family patient profile
        try:
            from CareLink.models import FamilyPatient
            profile = FamilyPatient.objects.filter(user_id=user.id).first()
            if profile:
                print(f"  - Has FamilyPatient profile: ID {profile.id}")
            else:
                print(f"  - No FamilyPatient profile found")
        except Exception as e:
            print(f"  - Error checking profile: {e}")
    
    print("\nAll users by role:")
    for role in User.objects.values_list('role', flat=True).distinct():
        count = User.objects.filter(role=role).count()
        print(f"- {role}: {count} users")

if __name__ == "__main__":
    check_family_patients()

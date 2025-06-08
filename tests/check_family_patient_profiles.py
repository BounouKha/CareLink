#!/usr/bin/env python3

import os
import sys
import django

# Add the CareLink directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'CareLink'))

# Set the Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')

# Setup Django
django.setup()

from CareLink.models import User, FamilyPatient

def check_family_patient_profiles():
    """Check which Family Patient users have actual FamilyPatient profiles created"""
    
    print("=== FAMILY PATIENT USERS AND THEIR PROFILES ===")
    
    # Get all users with Family Patient role
    family_users = User.objects.filter(role='Family Patient')
    
    if not family_users.exists():
        print("❌ No users with 'Family Patient' role found.")
        return
    
    print(f"✅ Found {family_users.count()} users with 'Family Patient' role:")
    print()
    
    for user in family_users:
        print(f"👤 User ID: {user.id}")
        print(f"   Name: {user.firstname} {user.lastname}")
        print(f"   Email: {user.email}")
        print(f"   Role: {user.role}")
        
        # Check if this user has a FamilyPatient profile
        family_profile = FamilyPatient.objects.filter(user=user).first()
        
        if family_profile:
            print(f"   ✅ HAS FamilyPatient profile (ID: {family_profile.id})")
            print(f"      Link: {family_profile.link}")
            if family_profile.patient:
                print(f"      Linked to Patient ID: {family_profile.patient.id}")
                if family_profile.patient.user:
                    print(f"      Patient Name: {family_profile.patient.user.firstname} {family_profile.patient.user.lastname}")
                else:
                    print(f"      Patient has no linked user")
            else:
                print(f"      No linked patient")
        else:
            print(f"   ❌ NO FamilyPatient profile - needs to create profile first")
        
        print()
    
    print("=== SUMMARY ===")
    users_with_profiles = 0
    users_without_profiles = 0
    
    for user in family_users:
        if FamilyPatient.objects.filter(user=user).exists():
            users_with_profiles += 1
        else:
            users_without_profiles += 1
    
    print(f"Users with profiles: {users_with_profiles}")
    print(f"Users without profiles: {users_without_profiles}")
    
    if users_without_profiles > 0:
        print(f"\n⚠️  {users_without_profiles} Family Patient users need to create profiles first")
        print("They should click 'Profile' button to create a profile before using 'New Relation'")

if __name__ == "__main__":
    check_family_patient_profiles()

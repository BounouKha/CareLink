#!/usr/bin/env python3
"""
Script to fix missing FamilyPatient profiles for users with 'Family Patient' role.
This script will:
1. Find all users with role 'Family Patient'
2. Check which ones don't have corresponding FamilyPatient profiles
3. Create the missing FamilyPatient profiles
"""

import os
import sys
import django

# Add the CareLink directory to the Python path
sys.path.append('c:\\Users\\460020779\\Desktop\\CareLink\\CareLink')

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')
django.setup()

from account.models import User, FamilyPatient

def main():
    print("=" * 60)
    print("FIXING MISSING FAMILY PATIENT PROFILES")
    print("=" * 60)
    
    # Find all users with 'Family Patient' role
    family_patient_users = User.objects.filter(role='Family Patient')
    print(f"\nFound {family_patient_users.count()} users with 'Family Patient' role:")
    
    missing_profiles = []
    existing_profiles = []
    
    for user in family_patient_users:
        print(f"  - User ID {user.id}: {user.firstname} {user.lastname} ({user.email})")
        
        # Check if this user has a corresponding FamilyPatient profile
        try:
            family_patient_profile = FamilyPatient.objects.get(user=user)
            existing_profiles.append((user, family_patient_profile))
            print(f"    ✓ Has FamilyPatient profile (ID: {family_patient_profile.id})")
        except FamilyPatient.DoesNotExist:
            missing_profiles.append(user)
            print(f"    ✗ Missing FamilyPatient profile")
    
    print(f"\nSUMMARY:")
    print(f"  - Users with existing profiles: {len(existing_profiles)}")
    print(f"  - Users missing profiles: {len(missing_profiles)}")
    
    if missing_profiles:
        print(f"\nCreating missing FamilyPatient profiles...")
        created_profiles = []
        
        for user in missing_profiles:
            try:
                # Create the missing FamilyPatient profile
                family_patient = FamilyPatient.objects.create(
                    user=user,
                    # Add any default field values if needed
                )
                created_profiles.append((user, family_patient))
                print(f"  ✓ Created FamilyPatient profile for {user.firstname} {user.lastname} (Profile ID: {family_patient.id})")
            except Exception as e:
                print(f"  ✗ Failed to create profile for {user.firstname} {user.lastname}: {e}")
        
        print(f"\nCREATION SUMMARY:")
        print(f"  - Successfully created: {len(created_profiles)}")
        print(f"  - Failed to create: {len(missing_profiles) - len(created_profiles)}")
        
        if created_profiles:
            print(f"\nNewly created profiles:")
            for user, profile in created_profiles:
                print(f"  - User ID {user.id} -> FamilyPatient ID {profile.id}")
    else:
        print(f"\n✓ All users with 'Family Patient' role already have FamilyPatient profiles!")
    
    # Final verification
    print(f"\n" + "=" * 60)
    print("FINAL VERIFICATION")
    print("=" * 60)
    
    all_family_patients = FamilyPatient.objects.all()
    print(f"\nTotal FamilyPatient profiles in database: {all_family_patients.count()}")
    
    for fp in all_family_patients:
        user = fp.user
        print(f"  - FamilyPatient ID {fp.id}: User ID {user.id} - {user.firstname} {user.lastname} (Role: {user.role})")
    
    print(f"\n✓ Script completed successfully!")

if __name__ == "__main__":
    main()

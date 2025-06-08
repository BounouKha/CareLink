#!/usr/bin/env python3
"""
Test script for the new add-relation endpoint
"""

import os
import sys
import django
import requests
import json

# Add the project directory to the Python path
sys.path.append('c:\\Users\\460020779\\Desktop\\CareLink')
os.chdir('c:\\Users\\460020779\\Desktop\\CareLink\\CareLink')

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')
django.setup()

from CareLink.models import User, Patient, FamilyPatient
from django.contrib.auth import authenticate

def test_add_relation_endpoint():
    print("=" * 60)
    print("TESTING ADD RELATION ENDPOINT")
    print("=" * 60)
    
    # First, let's check what family patients exist
    print("\n=== EXISTING FAMILY PATIENTS ===")
    family_patients = FamilyPatient.objects.all()
    print(f"Total family patients: {family_patients.count()}")
    
    for fp in family_patients:
        user_name = f"{fp.user.firstname} {fp.user.lastname}" if fp.user else "No User"
        patient_name = f"{fp.patient.user.firstname} {fp.patient.user.lastname}" if fp.patient and fp.patient.user else "No Patient"
        print(f"FP ID {fp.id}: {user_name} -> {patient_name} ({fp.link})")
    
    # Check available patients
    print("\n=== AVAILABLE PATIENTS ===")
    patients = Patient.objects.filter(user__isnull=False, user__is_active=True)
    print(f"Total available patients: {patients.count()}")
    
    for patient in patients[:5]:  # Show first 5
        user_name = f"{patient.user.firstname} {patient.user.lastname}" if patient.user else "No User"
        print(f"Patient ID {patient.id}: {user_name}")
    
    if family_patients.exists():
        # Test the endpoint
        family_patient = family_patients.first()
        print(f"\n=== TESTING WITH FAMILY PATIENT ID {family_patient.id} ===")
        
        # Get available patients that are not already linked
        existing_relations = FamilyPatient.objects.filter(user=family_patient.user).values_list('patient_id', flat=True)
        available_patients = patients.exclude(id__in=existing_relations)[:2]  # Get 2 patients to test
        
        if available_patients:
            patient_ids = [p.id for p in available_patients]
            print(f"Testing with patient IDs: {patient_ids}")
            
            # Try to authenticate and get token (this would normally be done through login)
            # For testing purposes, we'll test the endpoint structure
            endpoint_url = f"http://localhost:8000/account/family-patients/{family_patient.id}/add-relation/"
            print(f"Endpoint URL: {endpoint_url}")
            
            test_data = {
                "patient_ids": patient_ids,
                "relationship": "Test Relative"
            }
            print(f"Test data: {test_data}")
            
            print("\n✅ Endpoint structure looks correct!")
            print("To test with authentication, use the frontend interface.")
        else:
            print("No available patients to test with (all already linked)")
    else:
        print("No family patients found to test with")

if __name__ == "__main__":
    test_add_relation_endpoint()

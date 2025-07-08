#!/usr/bin/env python3
"""
Debug script to check prescription linking in QuickSchedule
"""

import os
import sys
import django

# Add the project directory to Python path
sys.path.insert(0, 'C:/Users/460020779/Desktop/CareLink/CareLink')

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')
django.setup()

from CareLink.models import Patient, ServiceDemand, Prescription
from django.db.models import Q
import json

def debug_prescription_data():
    print("🔍 Debugging QuickSchedule Prescription Linking")
    print("=" * 60)
    
    # Check if we have patients
    patients = Patient.objects.all()
    print(f"📊 Total Patients: {patients.count()}")
    
    if patients.exists():
        # Check a specific patient
        patient = patients.first()
        print(f"🧑‍⚕️ Testing with Patient: {patient.user.firstname} {patient.user.lastname} (ID: {patient.id})")
        
        # Check ServiceDemands for this patient (these are used as prescriptions)
        service_demands = ServiceDemand.objects.filter(patient=patient)
        print(f"💊 ServiceDemands (Prescriptions) for this patient: {service_demands.count()}")
        
        if service_demands.exists():
            for sd in service_demands:
                print(f"   - ID: {sd.id}, Title: {sd.title}, Service: {sd.service.name if sd.service else 'No Service'}")
                print(f"     Status: {sd.status}, Priority: {sd.priority}")
        else:
            print("   ❌ No ServiceDemands found for this patient")
            
        # Check actual Prescription objects
        prescriptions = Prescription.objects.filter(
            Q(service__in=[sd.service for sd in service_demands if sd.service]) |
            Q(medication__icontains=patient.user.firstname)
        )
        print(f"💉 Actual Prescription objects: {prescriptions.count()}")
        
        if prescriptions.exists():
            for p in prescriptions:
                print(f"   - ID: {p.id}, Medication: {p.medication}, Service: {p.service}")
        
    else:
        print("❌ No patients found in database")
    
    print("\n🌐 Testing API endpoint structure...")
    
    # Check what the prescription API should return
    try:
        from schedule.views import PrescriptionListView
        print("✅ PrescriptionListView exists")
    except ImportError as e:
        print(f"❌ Import error: {e}")
    
    print("\n🔧 Testing prescription linking logic...")
    
    # Test the QuickScheduleView prescription logic
    service_demands = ServiceDemand.objects.filter(status__in=['Approved', 'In Progress'])
    print(f"📋 Available ServiceDemands for prescription linking: {service_demands.count()}")
    
    if service_demands.exists():
        sd = service_demands.first()
        print(f"   Example: SD #{sd.id} - {sd.title}")
        print(f"   Patient: {sd.patient.user.firstname} {sd.patient.user.lastname}")
        print(f"   Service: {sd.service.name if sd.service else 'No Service'}")
        print(f"   Can be used as prescription: YES")
    
    print("\n✅ Debug complete!")

if __name__ == "__main__":
    debug_prescription_data()

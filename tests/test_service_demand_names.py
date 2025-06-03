#!/usr/bin/env python3
"""
Test script to verify service demand patient name display for family patients
"""

import os
import sys
import django
import json

# Add the project directory to the Python path
project_path = 'c:\\Users\\460020779\\Desktop\\CareLink\\CareLink'
sys.path.insert(0, project_path)
os.chdir(project_path)

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')
django.setup()

from CareLink.models import User, Patient, FamilyPatient, ServiceDemand
from account.serializers.servicedemand import ServiceDemandSerializer

def test_service_demand_names():
    print("=" * 60)
    print("TESTING SERVICE DEMAND PATIENT NAMES")
    print("=" * 60)
    
    # Find the family patient user
    family_user = User.objects.filter(email="fpatient1@carelink.be").first()
    if not family_user:
        print("❌ Family patient user not found!")
        return
    
    print(f"✅ Found family patient user: {family_user.firstname} {family_user.lastname} (ID: {family_user.id})")
    
    # Get their linked patients
    family_relationships = FamilyPatient.objects.filter(user=family_user)
    print(f"\n📋 Linked patients for {family_user.firstname}:")
    
    linked_patient_ids = []
    for fp in family_relationships:
        if fp.patient:
            print(f"  - Patient ID {fp.patient.id}: {fp.patient.user.firstname if fp.patient.user else 'No User'} {fp.patient.user.lastname if fp.patient.user else ''} ({fp.link})")
            linked_patient_ids.append(fp.patient.id)
    
    # Check service demands for these patients
    print(f"\n🔍 Service demands for linked patients:")
    service_demands = ServiceDemand.objects.filter(patient_id__in=linked_patient_ids)
    
    if not service_demands.exists():
        print("  No service demands found for linked patients")
        
        # Create a test service demand
        print("\n📝 Creating a test service demand...")
        first_patient = Patient.objects.filter(id__in=linked_patient_ids).first()
        if first_patient:
            test_demand = ServiceDemand.objects.create(
                patient=first_patient,
                sent_by=family_user,
                title="Test Service Request",
                description="Testing patient name display",
                reason="Testing purposes",
                priority="Normal",
                status="Pending",
                contact_method="Email"
            )
            print(f"  ✅ Created test service demand ID: {test_demand.id}")
            service_demands = ServiceDemand.objects.filter(id=test_demand.id)
    
    # Serialize and check patient info
    for demand in service_demands:
        print(f"\n📋 Service Demand ID {demand.id}:")
        print(f"  Title: {demand.title}")
        print(f"  Patient ID: {demand.patient_id}")
        
        # Serialize the demand
        serializer = ServiceDemandSerializer(demand)
        demand_data = serializer.data
        
        print(f"  Patient Info from serializer:")
        if demand_data.get('patient_info'):
            patient_info = demand_data['patient_info']
            print(f"    - ID: {patient_info.get('id')}")
            print(f"    - First Name: {patient_info.get('firstname')}")
            print(f"    - Last Name: {patient_info.get('lastname')}")
            print(f"    - Birth Date: {patient_info.get('birthdate')}")
            print(f"    - Email: {patient_info.get('email')}")
        else:
            print("    - No patient_info found")
        
        print(f"  Full serialized data (patient_info only):")
        print(f"    {json.dumps(demand_data.get('patient_info', {}), indent=4, default=str)}")

if __name__ == "__main__":
    test_service_demand_names()

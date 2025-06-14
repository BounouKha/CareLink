#!/usr/bin/env python3
"""
Test script to verify the 500 error fix for Family Patient service demand creation
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

from django.test import RequestFactory, TestCase
from django.contrib.auth import get_user_model
from CareLink.models import User, Patient, FamilyPatient, Service, ServiceDemand
from account.views.servicedemand import ServiceDemandListCreateView

def test_family_patient_service_demand_creation():
    """Test that Family Patients can create service demands without 500 errors"""
    print("=" * 60)
    print("TESTING FAMILY PATIENT SERVICE DEMAND CREATION")
    print("=" * 60)
    
    # Find the family patient user
    family_user = User.objects.filter(email="fpatient1@carelink.be").first()
    if not family_user:
        print("❌ Family patient user not found!")
        return
    
    print(f"✅ Found family patient user: {family_user.firstname} {family_user.lastname} (ID: {family_user.id})")
    
    # Get their linked patients
    family_relationships = FamilyPatient.objects.filter(user=family_user)
    if not family_relationships.exists():
        print("❌ No family relationships found!")
        return
    
    print(f"📋 Found {family_relationships.count()} linked patients:")
    for fp in family_relationships:
        if fp.patient and fp.patient.user:
            print(f"  - Patient ID {fp.patient.id}: {fp.patient.user.firstname} {fp.patient.user.lastname} ({fp.link})")
    
    # Get the first linked patient
    first_relationship = family_relationships.first()
    linked_patient = first_relationship.patient
    
    if not linked_patient:
        print("❌ No valid linked patient found!")
        return
    
    print(f"🎯 Testing with patient: {linked_patient.user.firstname} {linked_patient.user.lastname} (ID: {linked_patient.id})")
    
    # Get a service for the test
    service = Service.objects.first()
    if not service:
        print("❌ No services found!")
        return
    
    print(f"🔧 Using service: {service.name}")
      # Create a test request with proper data structure
    factory = RequestFactory()
    request_data = {
        'patient': linked_patient.id,
        'service': service.id,
        'title': 'Test Service Request from Family Patient',
        'description': 'Testing the 500 error fix',
        'reason': 'Medical test',
        'priority': 'Normal',
        'contact_method': 'Email'
    }
    
    request = factory.post('/account/service-demands/', 
                          data=request_data, 
                          content_type='application/json')
    request.user = family_user
    
    # Add the data attribute for the serializer
    import json
    request.data = request_data
    
    # Test the view
    view = ServiceDemandListCreateView()
    
    try:
        print("🚀 Sending request to create service demand...")
        response = view.post(request)
        
        print(f"📤 Response status: {response.status_code}")
        print(f"📤 Response data: {response.data}")
        
        if response.status_code == 201:
            print("✅ SUCCESS: Service demand created successfully!")
            
            # Check if it was actually created
            created_demand = ServiceDemand.objects.filter(
                title='Test Service Request from Family Patient',
                patient=linked_patient,
                sent_by=family_user
            ).first()
            
            if created_demand:
                print(f"✅ VERIFIED: Service demand ID {created_demand.id} found in database")
                print(f"   - Title: {created_demand.title}")
                print(f"   - Patient: {created_demand.patient.user.firstname} {created_demand.patient.user.lastname}")
                print(f"   - Sent by: {created_demand.sent_by.firstname} {created_demand.sent_by.lastname}")
                print(f"   - Status: {created_demand.status}")
                
                # Clean up the test data
                created_demand.delete()
                print("🧹 Test data cleaned up")
            else:
                print("⚠️  WARNING: Service demand not found in database despite success response")
        
        elif response.status_code == 500:
            print("❌ FAILED: Still getting 500 error!")
            if hasattr(response, 'data') and 'error' in response.data:
                print(f"   Error: {response.data['error']}")
        
        elif response.status_code == 400:
            print("⚠️  Got 400 error (likely validation issue):")
            if hasattr(response, 'data'):
                print(f"   Response: {response.data}")
        
        else:
            print(f"⚠️  Got unexpected status code: {response.status_code}")
            if hasattr(response, 'data'):
                print(f"   Response: {response.data}")
    
    except Exception as e:
        print(f"❌ EXCEPTION occurred: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_family_patient_service_demand_creation()

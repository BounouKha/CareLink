#!/usr/bin/env python3
"""
Test edge cases for Family Patient service demand creation
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

from django.test import RequestFactory
from CareLink.models import User, Patient, FamilyPatient, Service, ServiceDemand
from account.views.servicedemand import ServiceDemandListCreateView

def test_edge_cases():
    """Test edge cases for Family Patient service demand creation"""
    print("=" * 60)
    print("TESTING EDGE CASES FOR FAMILY PATIENT SERVICE DEMANDS")
    print("=" * 60)
    
    # Find the family patient user
    family_user = User.objects.filter(email="fpatient1@carelink.be").first()
    if not family_user:
        print("❌ Family patient user not found!")
        return
    
    print(f"✅ Found family patient user: {family_user.firstname} {family_user.lastname}")
    
    # Get their linked patients
    family_relationships = FamilyPatient.objects.filter(user=family_user)
    print(f"📋 Found {family_relationships.count()} linked patients")
    
    # Get a service for the test
    service = Service.objects.first()
    if not service:
        print("❌ No services found!")
        return
    
    # Test Case 1: No patient specified for Family Patient with multiple links
    print("\n🧪 TEST CASE 1: No patient specified (should get proper error)")
    factory = RequestFactory()
    request_data = {
        # 'patient': linked_patient.id,  # <-- Intentionally omitted
        'service': service.id,
        'title': 'Test Request Without Patient',
        'description': 'Testing no patient specified',
        'reason': 'Test',
        'priority': 'Normal',
        'contact_method': 'Email'
    }
    
    request = factory.post('/account/service-demands/', 
                          data=request_data, 
                          content_type='application/json')
    request.user = family_user
    request.data = request_data
    
    view = ServiceDemandListCreateView()
    
    try:
        response = view.post(request)
        print(f"📤 Response status: {response.status_code}")
        print(f"📤 Response data: {response.data}")
        
        if response.status_code == 400:
            print("✅ EXPECTED: Got 400 error as expected for missing patient")
        else:
            print(f"⚠️  UNEXPECTED: Expected 400, got {response.status_code}")
    
    except Exception as e:
        print(f"❌ EXCEPTION: {str(e)}")
    
    # Test Case 2: Family Patient tries to create demand for non-linked patient
    print("\n🧪 TEST CASE 2: Try to create demand for non-linked patient")
    
    # Find a patient not linked to this family user
    linked_patient_ids = [fp.patient_id for fp in family_relationships if fp.patient_id]
    non_linked_patient = Patient.objects.exclude(id__in=linked_patient_ids).first()
    
    if non_linked_patient:
        request_data = {
            'patient': non_linked_patient.id,  # <-- Patient not linked to this family user
            'service': service.id,
            'title': 'Test Request for Non-Linked Patient',
            'description': 'Testing unauthorized patient access',
            'reason': 'Test',
            'priority': 'Normal',
            'contact_method': 'Email'
        }
        
        request = factory.post('/account/service-demands/', 
                              data=request_data, 
                              content_type='application/json')
        request.user = family_user
        request.data = request_data
        
        try:
            response = view.post(request)
            print(f"📤 Response status: {response.status_code}")
            print(f"📤 Response data: {response.data}")
            
            if response.status_code == 403:
                print("✅ EXPECTED: Got 403 error as expected for unauthorized patient access")
            else:
                print(f"⚠️  UNEXPECTED: Expected 403, got {response.status_code}")
        
        except Exception as e:
            print(f"❌ EXCEPTION: {str(e)}")
    else:
        print("⚠️  SKIPPED: No non-linked patients found for testing")
    
    # Test Case 3: Successful creation for correctly linked patient
    print("\n🧪 TEST CASE 3: Successful creation for linked patient")
    
    linked_patient = family_relationships.first().patient
    if linked_patient:
        request_data = {
            'patient': linked_patient.id,
            'service': service.id,
            'title': 'Test Success Case',
            'description': 'Testing successful creation',
            'reason': 'Test',
            'priority': 'Normal',
            'contact_method': 'Email'
        }
        
        request = factory.post('/account/service-demands/', 
                              data=request_data, 
                              content_type='application/json')
        request.user = family_user
        request.data = request_data
        
        try:
            response = view.post(request)
            print(f"📤 Response status: {response.status_code}")
            
            if response.status_code == 201:
                print("✅ SUCCESS: Service demand created successfully")
                
                # Clean up
                created_demand = ServiceDemand.objects.filter(
                    title='Test Success Case',
                    patient=linked_patient,
                    sent_by=family_user
                ).first()
                
                if created_demand:
                    created_demand.delete()
                    print("🧹 Test data cleaned up")
            else:
                print(f"❌ FAILED: Expected 201, got {response.status_code}")
                print(f"   Response: {response.data}")
        
        except Exception as e:
            print(f"❌ EXCEPTION: {str(e)}")
    
    print("\n✅ ALL EDGE CASE TESTS COMPLETED")

if __name__ == "__main__":
    test_edge_cases()

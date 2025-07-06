#!/usr/bin/env python3
"""
Test script to check the services endpoint
"""

import os
import sys
import django
import requests
import json

# Add the CareLink directory to the Python path
carelink_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'CareLink')
sys.path.append(carelink_dir)

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')
django.setup()

from django.contrib.auth import get_user_model
from CareLink.models import Service

User = get_user_model()

def test_services_endpoint():
    """Test the services endpoint"""
    
    print("🧪 Testing Services Endpoint")
    print("=" * 50)
    
    # Step 1: Check services in database
    services = Service.objects.all()
    print(f"✅ Found {services.count()} services in database:")
    for service in services:
        print(f"   ID: {service.id}, Name: {service.name}, Description: {service.description}")
    
    # Step 2: Test the services API endpoint
    services_url = "http://localhost:8000/account/services/"
    
    try:
        response = requests.get(services_url)
        
        if response.status_code == 200:
            services_data = response.json()
            print(f"\n✅ Services API endpoint working")
            print(f"   Response status: {response.status_code}")
            
            if isinstance(services_data, list):
                print(f"   Found {len(services_data)} services in API response:")
                for service in services_data:
                    print(f"     ID: {service.get('id')}, Name: {service.get('name')}")
            else:
                print(f"   API response format: {type(services_data)}")
                print(f"   Response keys: {list(services_data.keys()) if isinstance(services_data, dict) else 'Not a dict'}")
        else:
            print(f"❌ Services API endpoint failed: {response.status_code}")
            print(f"   Response: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Network error: {e}")
    
    # Step 3: Create Service 3 if it doesn't exist
    try:
        service3 = Service.objects.get(id=3)
        print(f"\n✅ Service 3 already exists: {service3.name}")
    except Service.DoesNotExist:
        print(f"\n🔧 Creating Service 3...")
        service3 = Service.objects.create(
            id=3,
            name="Specialized Care Service",
            description="Specialized healthcare services for complex cases",
            price=75.00,
            duration=45
        )
        print(f"✅ Created Service 3: {service3.name}")
    
    print("\n" + "=" * 50)

def test_provider_creation():
    """Test provider creation with Service 3"""
    
    print("\n🧪 Testing Provider Creation with Service 3")
    print("=" * 50)
    
    # First, we need to login as an admin user
    login_url = "http://localhost:8000/account/login/"
    create_provider_url = "http://localhost:8000/account/users/729/create/provider/"
    
    # Try to login with a known admin user
    admin_emails = [
        'admin@carelink.be',
        'administrative@carelink.be',
        'coordinator@carelink.be'
    ]
    
    for email in admin_emails:
        try:
            login_data = {
                "email": email,
                "password": "testpass123"
            }
            
            login_response = requests.post(login_url, json=login_data)
            
            if login_response.status_code == 200:
                login_result = login_response.json()
                access_token = login_result.get('access')
                
                if access_token:
                    print(f"✅ Successfully logged in as: {email}")
                    
                    # Test provider creation
                    headers = {
                        'Authorization': f'Bearer {access_token}',
                        'Content-Type': 'application/json'
                    }
                    
                    provider_data = {
                        "user_id": 729,
                        "role_specific_data": {
                            "service": 3,
                            "is_internal": True
                        }
                    }
                    
                    print(f"   Testing provider creation with data: {provider_data}")
                    
                    create_response = requests.post(create_provider_url, json=provider_data, headers=headers)
                    
                    if create_response.status_code == 201:
                        print("✅ Provider creation successful!")
                        return True
                    else:
                        print(f"❌ Provider creation failed: {create_response.status_code}")
                        print(f"   Response: {create_response.text}")
                        return False
                        
                else:
                    print(f"❌ No access token for {email}")
            else:
                print(f"❌ Login failed for {email}: {login_response.status_code}")
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Network error for {email}: {e}")
    
    print("❌ Could not login with any admin user")
    return False

if __name__ == "__main__":
    print("🚀 Services and Provider Creation Test Suite")
    print("=" * 50)
    
    # Test services endpoint
    test_services_endpoint()
    
    # Test provider creation
    success = test_provider_creation()
    
    if success:
        print("\n🎉 All tests passed!")
    else:
        print("\n❌ Some tests failed. Please check the errors above.")
    
    print("\n" + "=" * 50) 
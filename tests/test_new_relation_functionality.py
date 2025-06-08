#!/usr/bin/env python3

import requests
import json

def test_new_relation_functionality():
    """Test the New Relation button functionality with different users"""
    
    # Test user with profile (should work)
    test_user_with_profile = {
        "email": "bob@sull.be",  
        "password": "Pugu8874@"
    }
    
    # Login and test
    print("=== TESTING USER WITH PROFILE ===")
    login_response = requests.post("http://localhost:8000/account/login/", data=test_user_with_profile)
    
    if login_response.status_code == 200:
        token_data = login_response.json()
        access_token = token_data.get('access')
        
        if access_token:
            print("Login successful for user with profile")
            
            # Test profile fetch - this should work
            profile_response = requests.get(
                "http://localhost:8000/account/profiles/75/fetch/FamilyPatient/",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            print(f"Profile fetch status: {profile_response.status_code}")
            if profile_response.status_code == 200:
                data = profile_response.json()
                print(f"Full profile data: {json.dumps(data, indent=2)}")
                family_patient_data = data.get('additional_fields', {}).get('familypatient')
                if family_patient_data:
                    print(f"Profile found - FamilyPatient ID: {family_patient_data.get('id')}")
                    print("'New Relation' button should work for this user")
                else:
                    print("Profile data structure unexpected")
                    print("Looking for alternative structures...")
                    # Check alternative structures
                    if 'familypatient' in data:
                        print(f"Found familypatient at root level: {data['familypatient']}")
                    elif 'id' in data:
                        print(f"Found profile ID at root level: {data['id']}")
            else:
                print(f"Profile fetch failed: {profile_response.text}")
        else:
            print("No access token received")
    else:
        print(f"Login failed: {login_response.text}")
    
    print("\n" + "="*50)
    print("=== TESTING ADMIN ACCESS TO USER WITHOUT PROFILE ===")
    
    # Test admin accessing user without profile  
    admin_credentials = {
        "email": "bob@sull.be",  # Admin user
        "password": "Pugu8874@"
    }
    
    admin_login = requests.post("http://localhost:8000/account/login/", data=admin_credentials)
    
    if admin_login.status_code == 200:
        admin_data = admin_login.json()
        admin_token = admin_data.get('access')
        
        if admin_token:
            print("Admin login successful")
            
            # Try to fetch profile for user without profile (User ID 19: Emma White)
            no_profile_response = requests.get(
                "http://localhost:8000/account/profiles/19/fetch/FamilyPatient/",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            
            print(f"Profile fetch for user without profile - Status: {no_profile_response.status_code}")
            if no_profile_response.status_code == 400:
                print("Expected 400 error for user without profile")
                print("Frontend should show: 'Please create a Family Patient profile first by clicking the Profile button.'")
            elif no_profile_response.status_code == 404:
                print("Got 404 error for user without profile")
                print(f"Response: {no_profile_response.text}")
            else:
                print(f"Unexpected response: {no_profile_response.text}")
        else:
            print("No admin access token received")
    else:
        print(f"Admin login failed: {admin_login.text}")

if __name__ == "__main__":
    test_new_relation_functionality()

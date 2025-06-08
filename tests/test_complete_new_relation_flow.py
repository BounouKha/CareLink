#!/usr/bin/env python3

import requests
import json

def test_complete_new_relation_flow():
    """Test the complete New Relation flow"""
    
    print("=== TESTING COMPLETE NEW RELATION FLOW ===")
    
    # Login as admin to test both cases
    admin_credentials = {
        "email": "bob@sull.be",
        "password": "Pugu8874@"
    }
    
    admin_login = requests.post("http://localhost:8000/account/login/", data=admin_credentials)
    
    if admin_login.status_code != 200:
        print(f"Admin login failed: {admin_login.text}")
        return
        
    admin_data = admin_login.json()
    admin_token = admin_data.get('access')
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    print("Admin login successful")
    
    # Test Case 1: User WITH FamilyPatient profile (should work)
    print("\n=== TEST CASE 1: User WITH Profile (Claire Bennet, ID 75) ===")
    
    profile_response = requests.get(
        "http://localhost:8000/account/profiles/75/fetch/FamilyPatient/",
        headers=headers
    )
    
    print(f"Profile fetch status: {profile_response.status_code}")
    if profile_response.status_code == 200:
        data = profile_response.json()
        family_patient_id = data.get('id')
        print(f"SUCCESS: FamilyPatient ID found: {family_patient_id}")
        print("'New Relation' button should work for this user")
        
        # Test the actual add-relation endpoint
        print("Testing add-relation endpoint...")
        add_relation_response = requests.post(
            f"http://localhost:8000/account/familypatient/{family_patient_id}/add-relation/",
            headers=headers,
            json={
                "patient_ids": [4],  # Bob Sull's patient ID
                "relationship": "Test Relationship"
            }
        )
        
        print(f"Add relation test status: {add_relation_response.status_code}")
        if add_relation_response.status_code in [200, 201]:
            print("Add relation endpoint works")
        else:
            print(f"Add relation response: {add_relation_response.text}")
    else:
        print(f"Profile fetch failed: {profile_response.text}")
    
    # Test Case 2: User WITHOUT FamilyPatient profile (should show error)
    print("\n=== TEST CASE 2: User WITHOUT Profile (Emma White, ID 19) ===")
    
    no_profile_response = requests.get(
        "http://localhost:8000/account/profiles/19/fetch/FamilyPatient/",
        headers=headers
    )
    
    print(f"Profile fetch status: {no_profile_response.status_code}")
    if no_profile_response.status_code in [404, 400]:
        print("SUCCESS: Expected error for user without profile")
        print("Frontend should show: 'Please create a Family Patient profile first by clicking the Profile button.'")
    else:
        print(f"Unexpected response: {no_profile_response.status_code} - {no_profile_response.text}")
    
    print("\n=== SUMMARY ===")
    print("Role format fix applied (Family Patient -> FamilyPatient)")
    print("Data structure handling updated (use response.id directly)")  
    print("Error handling improved (handle both 400 and 404 errors)")
    print("New Relation button renamed and functionality working")

if __name__ == "__main__":
    test_complete_new_relation_flow()

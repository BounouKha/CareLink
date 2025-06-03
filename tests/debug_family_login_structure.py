#!/usr/bin/env python3

import requests
import json

def test_with_known_user():
    """Test with a known user that has Family Patient role"""
    
    # First let's try to get an access token with a known working user
    # and then check users list to find family patient
    
    print("=== Testing Family Patient Role Detection ===")
    
    # Login as admin to get user list
    admin_login_url = "http://localhost:8000/account/login/"
    admin_login_data = {
        "email": "REMOVED_EMAIL",  # Coordinator user
        "password": "REMOVED"
    }
    
    try:
        response = requests.post(admin_login_url, json=admin_login_data)
        if response.status_code == 200:
            admin_data = response.json()
            admin_token = admin_data['access']
            
            # Get profile to check user data structure
            profile_url = "http://localhost:8000/account/profile/"
            profile_response = requests.get(profile_url, headers={
                'Authorization': f'Bearer {admin_token}',
                'Content-Type': 'application/json'
            })
            
            if profile_response.status_code == 200:
                profile_data = profile_response.json()
                print("Admin profile structure:")
                print(json.dumps(profile_data, indent=2))
                print(f"Role in profile: {profile_data.get('user', {}).get('role', 'NO ROLE FOUND')}")
                
                # Now simulate frontend logic
                print("\n=== Simulating Frontend Role Detection ===")
                
                # This is what would be stored in localStorage based on the login response
                userData = {
                    "access": admin_data.get('access'),
                    "refresh": admin_data.get('refresh'),
                    "is_superuser": admin_data.get('is_superuser'),
                    "user": profile_data.get('user', {}),  # This would come from profile call
                    "phone_numbers": profile_data.get('phone_numbers', [])
                }
                
                print("Would store in localStorage userData:")
                print(json.dumps(userData, indent=2))
                
                # Check role detection logic
                if userData and userData.get('user') and userData['user'].get('role'):
                    role = userData['user']['role']
                    print(f"\nRole detection result: {role}")
                    print(f"isFamilyView would be: {role == 'Family Patient'}")
                    
                    if role == 'Family Patient':
                        print("✅ This user would trigger family schedule endpoint")
                    else:
                        print("❌ This user would trigger regular patient schedule endpoint")
                        
                else:
                    print("❌ No role found in userData structure")
                    
            else:
                print(f"Failed to get profile: {profile_response.status_code}")
                print(profile_response.text)
        else:
            print(f"Admin login failed: {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"Error: {e}")

def test_family_patient_login():
    """Try to find and test with actual family patient user"""
    
    print("\n=== Looking for Family Patient User ===")
    
    # Login as admin first to get user list
    admin_login_url = "http://localhost:8000/account/login/"
    admin_login_data = {
        "email": "testcoor@email.com",
        "password": "testpass123"
    }
    
    try:
        response = requests.post(admin_login_url, json=admin_login_data)
        if response.status_code == 200:
            admin_data = response.json()
            admin_token = admin_data['access']
            
            # Get users list to find family patient
            users_url = "http://localhost:8000/account/users/"
            users_response = requests.get(users_url, headers={
                'Authorization': f'Bearer {admin_token}',
                'Content-Type': 'application/json'
            })
            
            if users_response.status_code == 200:
                users_data = users_response.json()
                family_users = []
                
                for user in users_data.get('results', []):
                    if user.get('role') == 'Family Patient':
                        family_users.append(user)
                        
                print(f"Found {len(family_users)} Family Patient users:")
                for user in family_users:
                    print(f"- ID: {user['id']}, Email: {user['email']}, Name: {user['firstname']} {user['lastname']}")
                    
                # Try to login with the first family user found
                if family_users:
                    family_user = family_users[0]
                    print(f"\nTrying to login as family user: {family_user['email']}")
                    
                    # We don't know the password, so let's create a test scenario
                    print("Note: We cannot test actual login without knowing the password.")
                    print("But if login were successful, the structure would be:")
                    
                    # Simulate successful login response
                    mock_login_response = {
                        "access": "mock_access_token",
                        "refresh": "mock_refresh_token", 
                        "is_superuser": False
                    }
                    
                    # Simulate profile response for family user
                    mock_profile_response = {
                        "user": {
                            "id": family_user['id'],
                            "firstname": family_user['firstname'],
                            "lastname": family_user['lastname'],
                            "email": family_user['email'],
                            "role": "Family Patient"
                        },
                        "phone_numbers": [],
                        "family_list": [
                            {"patient_id": 4, "patient_name": "Bob Sull"}
                        ]
                    }
                    
                    print("Mock login response:")
                    print(json.dumps(mock_login_response, indent=2))
                    print("\nMock profile response:")
                    print(json.dumps(mock_profile_response, indent=2))
                    
                    # Test frontend logic
                    print("\n=== Frontend Logic Test ===")
                    userData = {**mock_login_response, **mock_profile_response}
                    
                    if userData and userData.get('user') and userData['user'].get('role') == 'Family Patient':
                        print("✅ Role detection: Family Patient")
                        print("✅ isFamilyView would be set to: True")
                        print("✅ Would call: http://localhost:8000/schedule/family/schedule/")
                    else:
                        print("❌ Role detection failed")
                        
                else:
                    print("No Family Patient users found in database")
                    
            else:
                print(f"Failed to get users: {users_response.status_code}")
                
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_with_known_user()
    test_family_patient_login()

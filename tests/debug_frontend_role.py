#!/usr/bin/env python3

import requests
import json

def test_family_patient_login_and_role():
    """Test family patient login and check what gets stored"""
      # Login as family patient
    login_url = "http://localhost:8000/account/login/"
    login_data = {
        "email": "fpatient1@carelink.be",
        "password": "Pugu8874@"
    }
    
    print("=== Testing Family Patient Login and Role Detection ===")
    print(f"Logging in as: {login_data['email']}")
    
    try:
        response = requests.post(login_url, json=login_data)
        print(f"Login response status: {response.status_code}")
        
        if response.status_code == 200:
            login_response = response.json()
            print("Login response data:")
            print(json.dumps(login_response, indent=2))
            
            # Check what would be stored in localStorage
            print("\n=== Frontend Storage Analysis ===")
            print("This is what would be stored in localStorage:")
            
            if 'userData' in login_response:
                print(f"userData: {json.dumps(login_response['userData'], indent=2)}")
            if 'user' in login_response:
                print(f"user: {json.dumps(login_response['user'], indent=2)}")
            if 'accessToken' in login_response:
                print(f"accessToken: Present")
            if 'role' in login_response:
                print(f"role: {login_response['role']}")
                
            # Simulate the frontend role detection logic
            print("\n=== Simulating Frontend Role Detection ===")
            
            # Check userData structure
            if 'userData' in login_response:
                userData = login_response['userData']
                if isinstance(userData, dict):
                    if 'user' in userData and 'role' in userData['user']:
                        role = userData['user']['role']
                        print(f"Role found in userData.user.role: {role}")
                        print(f"isFamilyView would be set to: {role == 'Family Patient'}")
                    elif 'role' in userData:
                        role = userData['role']
                        print(f"Role found in userData.role: {role}")
                        print(f"isFamilyView would be set to: {role == 'Family Patient'}")
                    else:
                        print("No role found in userData structure")
                else:
                    print("userData is not a dictionary")
            else:
                print("No userData in login response")
                
        else:
            print(f"Login failed: {response.text}")
            
    except Exception as e:
        print(f"Error during login test: {e}")

if __name__ == "__main__":
    test_family_patient_login_and_role()

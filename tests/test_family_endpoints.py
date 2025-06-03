import requests
import json

# Test the family patient schedule endpoint
base_url = "http://localhost:8000"

# First, let's check the profile endpoint to see family patient data
def test_family_patient_endpoints():
    # Test data - you may need to adjust these based on your actual data
    test_credentials = {
        "email": "fpatient1@carelink.be",  # Replace with actual family patient email
        "password": "Pugu8874@"
    }
    
    # Login first
    print("=== TESTING FAMILY PATIENT LOGIN ===")
    login_response = requests.post(f"{base_url}/account/login/", data=test_credentials)
    
    if login_response.status_code == 200:
        token_data = login_response.json()
        access_token = token_data.get('access')  # Changed from 'access_token' to 'access'
        print(f"Login response data: {json.dumps(token_data, indent=2)}")
        
        if access_token:
            print(f"✅ Login successful, token: {access_token[:20]}...")
        else:
            print("❌ Login response missing access token")
            return
        
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        # Test profile endpoint
        print("\n=== TESTING PROFILE ENDPOINT ===")
        profile_response = requests.get(f"{base_url}/account/profile/", headers=headers)
        print(f"Profile response status: {profile_response.status_code}")
        
        if profile_response.status_code == 200:
            profile_data = profile_response.json()
            print(f"User role: {profile_data.get('user', {}).get('role')}")
            print(f"Family list count: {len(profile_data.get('family_list', []))}")
            
            # Test family patient linked patients endpoint
            print("\n=== TESTING LINKED PATIENTS ENDPOINT ===")
            linked_response = requests.get(f"{base_url}/account/family-patient/linked-patient/", headers=headers)
            print(f"Linked patients response status: {linked_response.status_code}")
            
            if linked_response.status_code == 200:
                linked_data = linked_response.json()
                print(f"Linked patients data: {json.dumps(linked_data, indent=2)}")
            else:
                print(f"❌ Linked patients error: {linked_response.text}")
            
            # Test family patient schedule endpoint
            print("\n=== TESTING FAMILY SCHEDULE ENDPOINT ===")
            schedule_response = requests.get(f"{base_url}/schedule/family/schedule/", headers=headers)
            print(f"Family schedule response status: {schedule_response.status_code}")
            
            if schedule_response.status_code == 200:
                schedule_data = schedule_response.json()
                print(f"Patients in schedule: {len(schedule_data.get('patients', []))}")
                print(f"Schedule data: {json.dumps(schedule_data, indent=2)}")
            else:
                print(f"❌ Family schedule error: {schedule_response.text}")
        else:
            print(f"❌ Profile error: {profile_response.text}")
    else:
        print(f"❌ Login failed: {login_response.status_code} - {login_response.text}")

if __name__ == "__main__":
    test_family_patient_endpoints()

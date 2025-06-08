import requests
import json

def test_family_patient_endpoints():
    base_url = "http://localhost:8000"
    
    print("=" * 60)
    print("TESTING FAMILY PATIENT API ENDPOINTS")
    print("=" * 60)
      # Test 1: Check if family patients endpoint exists
    print("\n=== Testing Family Patients List Endpoint ===")
    try:
        response = requests.get(f"{base_url}/account/familypatient/")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 401:
            print("✅ Endpoint exists but requires authentication (expected)")
        elif response.status_code == 200:
            print("✅ Endpoint accessible")
            data = response.json()
            print(f"Response data: {data}")
        else:
            print(f"❌ Unexpected status code: {response.status_code}")
            print(f"Response: {response.text}")
    except requests.RequestException as e:
        print(f"❌ Error accessing endpoint: {e}")
    
    # Test 2: Check add-relation endpoint structure (without auth)
    print("\n=== Testing Add Relation Endpoint Structure ===")
    try:
        # This should return 401 or 405 but not 404 if the URL pattern is correct
        response = requests.post(f"{base_url}/account/familypatient/1/add-relation/")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code in [401, 403]:
            print("✅ Add relation endpoint exists but requires authentication (expected)")
        elif response.status_code == 405:
            print("✅ Endpoint exists but wrong method (check URL pattern)")
        elif response.status_code == 404:
            print("❌ Endpoint not found - URL pattern may be incorrect")
        else:
            print(f"Status: {response.status_code}")
            print(f"Response: {response.text}")
    except requests.RequestException as e:
        print(f"❌ Error accessing endpoint: {e}")
    
    # Test 3: Test patient search endpoint
    print("\n=== Testing Patient Search Endpoint ===")
    try:
        response = requests.get(f"{base_url}/account/views_patient/")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 401:
            print("✅ Patient search endpoint exists but requires authentication (expected)")
        elif response.status_code == 200:
            print("✅ Patient search endpoint accessible")
        else:
            print(f"Status: {response.status_code}")
    except requests.RequestException as e:
        print(f"❌ Error accessing endpoint: {e}")

if __name__ == "__main__":
    test_family_patient_endpoints()

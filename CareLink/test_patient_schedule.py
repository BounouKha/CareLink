import requests
import json
import sys
from datetime import datetime, timedelta

# Helper function to make API requests
def make_request(url, method='GET', data=None, headers=None):
    if method == 'GET':
        response = requests.get(url, headers=headers)
    elif method == 'POST':
        response = requests.post(url, json=data, headers=headers)
    
    print(f"Request to: {url}")
    print(f"Status Code: {response.status_code}")
    
    if response.status_code in [200, 201]:
        print("Success!")
        try:
            return response.json()
        except json.decoder.JSONDecodeError:
            print("Response is not JSON format")
            return response.text
    else:
        print(f"Error: {response.text}")
        return None

# Get authentication token for a patient
def get_auth_token(username, password):
    url = "http://localhost:8000/account/login/"
    data = {
        "username": username,
        "password": password
    }
    response = make_request(url, 'POST', data)
    
    if response and 'access' in response:
        return response['access']
    else:
        print("Failed to get auth token")
        return None

# Test patient schedule endpoint
def test_patient_schedule_endpoint(token):
    print("\n=== Testing Patient Schedule Endpoint ===")
    # Get current date and date 30 days from now
    today = datetime.now().strftime("%Y-%m-%d")
    future = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
    
    url = f"http://localhost:8000/schedule/patient/schedule/?start_date={today}&end_date={future}"
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    response = make_request(url, headers=headers)
    if response:
        print("\nAppointments:")
        if 'appointments' in response and response['appointments']:
            for app in response['appointments']:
                print(f"- {app.get('date')}: {app.get('start_time')} - {app.get('end_time')} with {app.get('provider_name')}")
                
                # Test detail endpoint for the first appointment
                if 'id' in app:
                    test_patient_appointment_detail(token, app['id'])
                    break  # Just test the first one
        else:
            print("No appointments found for this patient")
    
    return response

# Test patient appointment detail endpoint
def test_patient_appointment_detail(token, appointment_id):
    print(f"\n=== Testing Patient Appointment Detail Endpoint (ID: {appointment_id}) ===")
    url = f"http://localhost:8000/schedule/patient/appointment/{appointment_id}/"
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    response = make_request(url, headers=headers)
    if response:
        print("\nAppointment Details:")
        print(f"Date: {response.get('date')}")
        print(f"Time: {response.get('start_time')} - {response.get('end_time')}")
        print(f"Provider: {response.get('provider_name')}")
        print(f"Status: {response.get('status')}")

# Test family patient schedule endpoint
def test_family_schedule_endpoint(token):
    print("\n=== Testing Family Patient Schedule Endpoint ===")
    today = datetime.now().strftime("%Y-%m-%d")
    future = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
    
    url = f"http://localhost:8000/schedule/family/schedule/?start_date={today}&end_date={future}"
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    response = make_request(url, headers=headers)
    if response:
        print("\nFamily Member Appointments:")
        if 'appointments' in response and response['appointments']:
            for app in response['appointments']:
                print(f"- {app.get('date')}: {app.get('start_time')} - {app.get('end_time')} for {app.get('patient_name')}")
                
                # Test detail endpoint for the first appointment
                if 'id' in app:
                    test_family_appointment_detail(token, app['id'])
                    break  # Just test the first one
        else:
            print("No appointments found for family members")

# Test family patient appointment detail endpoint
def test_family_appointment_detail(token, appointment_id):
    print(f"\n=== Testing Family Patient Appointment Detail Endpoint (ID: {appointment_id}) ===")
    url = f"http://localhost:8000/schedule/family/appointment/{appointment_id}/"
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    response = make_request(url, headers=headers)
    if response:
        print("\nFamily Member Appointment Details:")
        print(f"Date: {response.get('date')}")
        print(f"Time: {response.get('start_time')} - {response.get('end_time')}")
        print(f"Provider: {response.get('provider_name')}")
        print(f"Patient: {response.get('patient_name')}")
        print(f"Status: {response.get('status')}")

# Main function
def main():
    print("=== CareLink Patient Schedule Test Script ===")
    
    # Test with Bob Sull (patient)
    print("\nTesting as Patient (Bob Sull)")
    token = get_auth_token("BobSull", "test1234")
    if token:
        test_patient_schedule_endpoint(token)
    
    # Test with Mary Sull (family patient)
    print("\nTesting as Family Patient (Mary Sull)")
    token = get_auth_token("MarySull", "test1234")
    if token:
        test_family_schedule_endpoint(token)

if __name__ == "__main__":
    main()

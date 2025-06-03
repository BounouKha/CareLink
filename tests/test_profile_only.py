#!/usr/bin/env python3
"""
Test only the profile endpoint to see the error
"""

import requests
import json

# Base URL for the Django server
BASE_URL = "http://localhost:8000"

def test_login_endpoint():
    """Test login with provided credentials"""
    login_url = f"{BASE_URL}/account/login/"
    credentials = {
        "email": "fpatient1@carelink.be",
        "password": "Pugu8874@"
    }
    
    response = requests.post(login_url, json=credentials, timeout=10)
    if response.status_code == 200:
        data = response.json()
        return data.get('access')
    return None

def test_profile_endpoint(access_token):
    """Test profile endpoint with JWT token"""
    profile_url = f"{BASE_URL}/account/profile/"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    response = requests.get(profile_url, headers=headers, timeout=10)
    print(f"Response Status: {response.status_code}")
    print(f"Response Text: {response.text}")

def main():
    # Test login
    access_token = test_login_endpoint()
    if access_token:
        test_profile_endpoint(access_token)

if __name__ == "__main__":
    main()

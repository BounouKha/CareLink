#!/usr/bin/env python3
"""
Test script to check ticket access and user role
"""

import requests
import json

def test_ticket_access():
    base_url = "http://localhost:8000"
    
    # Test login
    login_data = {
        "email": "REMOVED_EMAIL",  # Change this to your actual email
        "password": "REMOVED"
    }
    
    print("Testing login...")
    login_response = requests.post(f"{base_url}/account/login/", json=login_data)
    
    if login_response.status_code != 200:
        print(f"Login failed: {login_response.status_code}")
        print(login_response.text)
        return
    
    login_data = login_response.json()
    token = login_data.get('access')
    
    if not token:
        print("No access token received")
        return
    
    print("Login successful!")
    print(f"Token: {token[:50]}...")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Test user profile to get role
    print("\nTesting user profile...")
    profile_response = requests.get(f"{base_url}/account/profile/", headers=headers)
    
    if profile_response.status_code == 200:
        profile_data = profile_response.json()
        print(f"User profile: {json.dumps(profile_data, indent=2)}")
        user_role = profile_data.get('user', {}).get('role')
        print(f"User role: {user_role}")
    else:
        print(f"Profile request failed: {profile_response.status_code}")
        print(profile_response.text)
    
    # Test ticket endpoints
    print("\nTesting ticket endpoints...")
    
    # Test categories
    print("Testing categories...")
    categories_response = requests.get(f"{base_url}/account/enhanced-tickets/categories/", headers=headers)
    print(f"Categories status: {categories_response.status_code}")
    if categories_response.status_code == 200:
        print(f"Categories: {categories_response.json()}")
    else:
        print(f"Categories error: {categories_response.text}")
    
    # Test priorities
    print("\nTesting priorities...")
    priorities_response = requests.get(f"{base_url}/account/enhanced-tickets/priorities/", headers=headers)
    print(f"Priorities status: {priorities_response.status_code}")
    if priorities_response.status_code == 200:
        print(f"Priorities: {priorities_response.json()}")
    else:
        print(f"Priorities error: {priorities_response.text}")
    
    # Test teams
    print("\nTesting teams...")
    teams_response = requests.get(f"{base_url}/account/enhanced-tickets/teams/", headers=headers)
    print(f"Teams status: {teams_response.status_code}")
    if teams_response.status_code == 200:
        print(f"Teams: {teams_response.json()}")
    else:
        print(f"Teams error: {teams_response.text}")
    
    # Test ticket list
    print("\nTesting ticket list...")
    tickets_response = requests.get(f"{base_url}/account/enhanced-tickets/", headers=headers)
    print(f"Tickets status: {tickets_response.status_code}")
    if tickets_response.status_code == 200:
        tickets_data = tickets_response.json()
        print(f"Found {len(tickets_data.get('results', tickets_data))} tickets")
        if tickets_data.get('results'):
            print(f"First ticket: {json.dumps(tickets_data['results'][0], indent=2)}")
    else:
        print(f"Tickets error: {tickets_response.text}")
    
    # Test dashboard stats
    print("\nTesting dashboard stats...")
    stats_response = requests.get(f"{base_url}/account/enhanced-tickets/dashboard_stats/", headers=headers)
    print(f"Stats status: {stats_response.status_code}")
    if stats_response.status_code == 200:
        print(f"Stats: {json.dumps(stats_response.json(), indent=2)}")
    else:
        print(f"Stats error: {stats_response.text}")

if __name__ == "__main__":
    test_ticket_access() 
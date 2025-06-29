#!/usr/bin/env python3
"""
Test script to check coordinator ticket visibility
"""

import requests
import json

def test_coordinator_tickets():
    base_url = "http://localhost:8000"
    
    # Test login
    login_data = {
        "email": "REMOVED_EMAIL",
        "password": "REMOVED"
    }
    
    print("Testing coordinator login...")
    login_response = requests.post(f"{base_url}/account/login/", json=login_data)
    
    if login_response.status_code != 200:
        print(f"Login failed: {login_response.status_code}")
        print(login_response.text)
        return
    
    login_data = login_response.json()
    token = login_response.json().get('access')
    
    if not token:
        print("No access token received")
        return
    
    print("Login successful!")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Test different ticket queries
    print("\n=== Testing Coordinator Ticket Visibility ===")
    
    # 1. All tickets (no filters)
    print("\n1. All tickets (no filters):")
    response = requests.get(f"{base_url}/account/enhanced-tickets/", headers=headers)
    if response.status_code == 200:
        tickets = response.json().get('results', response.json())
        print(f"Found {len(tickets)} tickets")
        for ticket in tickets:
            print(f"  - ID: {ticket['id']}, Title: {ticket['title']}, Team: {ticket['assigned_team']}, Status: {ticket['status']}")
    else:
        print(f"Error: {response.status_code} - {response.text}")
    
    # 2. Tickets assigned to Coordinator team
    print("\n2. Tickets assigned to Coordinator team:")
    response = requests.get(f"{base_url}/account/enhanced-tickets/?assigned_team=Coordinator", headers=headers)
    if response.status_code == 200:
        tickets = response.json().get('results', response.json())
        print(f"Found {len(tickets)} tickets assigned to Coordinator team")
        for ticket in tickets:
            print(f"  - ID: {ticket['id']}, Title: {ticket['title']}, Team: {ticket['assigned_team']}, Status: {ticket['status']}")
    else:
        print(f"Error: {response.status_code} - {response.text}")
    
    # 3. Tickets assigned to Administrator team
    print("\n3. Tickets assigned to Administrator team:")
    response = requests.get(f"{base_url}/account/enhanced-tickets/?assigned_team=Administrator", headers=headers)
    if response.status_code == 200:
        tickets = response.json().get('results', response.json())
        print(f"Found {len(tickets)} tickets assigned to Administrator team")
        for ticket in tickets:
            print(f"  - ID: {ticket['id']}, Title: {ticket['title']}, Team: {ticket['assigned_team']}, Status: {ticket['status']}")
    else:
        print(f"Error: {response.status_code} - {response.text}")
    
    # 4. My tickets (created by me)
    print("\n4. My tickets (created by me):")
    response = requests.get(f"{base_url}/account/enhanced-tickets/?my_tickets=true", headers=headers)
    if response.status_code == 200:
        tickets = response.json().get('results', response.json())
        print(f"Found {len(tickets)} tickets created by me")
        for ticket in tickets:
            print(f"  - ID: {ticket['id']}, Title: {ticket['title']}, Team: {ticket['assigned_team']}, Status: {ticket['status']}")
    else:
        print(f"Error: {response.status_code} - {response.text}")
    
    # 5. My tickets assigned to Administrator team
    print("\n5. My tickets assigned to Administrator team:")
    response = requests.get(f"{base_url}/account/enhanced-tickets/?my_tickets=true&assigned_team=Administrator", headers=headers)
    if response.status_code == 200:
        tickets = response.json().get('results', response.json())
        print(f"Found {len(tickets)} tickets created by me and assigned to Administrator team")
        for ticket in tickets:
            print(f"  - ID: {ticket['id']}, Title: {ticket['title']}, Team: {ticket['assigned_team']}, Status: {ticket['status']}")
    else:
        print(f"Error: {response.status_code} - {response.text}")

if __name__ == "__main__":
    test_coordinator_tickets() 
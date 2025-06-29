#!/usr/bin/env python3
"""
Verify the coordinator ticket exists and check API responses
"""

import requests
import json

def verify_coordinator_ticket():
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
        return
    
    token = login_response.json().get('access')
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    print("Login successful!")
    
    print("\n=== Verifying Coordinator Ticket ===")
    
    # 1. Check all tickets
    print("\n1. All tickets:")
    response = requests.get(f"{base_url}/account/enhanced-tickets/", headers=headers)
    if response.status_code == 200:
        tickets = response.json().get('results', response.json())
        print(f"Found {len(tickets)} total tickets")
        for ticket in tickets:
            print(f"  - ID: {ticket['id']}, Title: {ticket['title']}, Team: {ticket['assigned_team']}, Status: {ticket['status']}")
    else:
        print(f"Error: {response.status_code}")
    
    # 2. Check Coordinator team tickets specifically
    print("\n2. Coordinator team tickets:")
    response = requests.get(f"{base_url}/account/enhanced-tickets/?assigned_team=Coordinator", headers=headers)
    if response.status_code == 200:
        tickets = response.json().get('results', response.json())
        print(f"Found {len(tickets)} Coordinator team tickets")
        for ticket in tickets:
            print(f"  - ID: {ticket['id']}, Title: {ticket['title']}, Team: {ticket['assigned_team']}, Status: {ticket['status']}")
    else:
        print(f"Error: {response.status_code}")
    
    # 3. Check the specific ticket by ID
    print("\n3. Checking ticket ID 5 specifically:")
    response = requests.get(f"{base_url}/account/enhanced-tickets/5/", headers=headers)
    if response.status_code == 200:
        ticket = response.json()
        print(f"✅ Ticket 5 found:")
        print(f"  - ID: {ticket['id']}")
        print(f"  - Title: {ticket['title']}")
        print(f"  - Team: {ticket['assigned_team']}")
        print(f"  - Status: {ticket['status']}")
        print(f"  - Created by: {ticket.get('created_by_name', 'Unknown')}")
    else:
        print(f"❌ Error getting ticket 5: {response.status_code}")
        print(response.text)
    
    # 4. Check stats
    print("\n4. Stats for Coordinator team:")
    response = requests.get(f"{base_url}/account/enhanced-tickets/dashboard_stats/?assigned_team=Coordinator", headers=headers)
    if response.status_code == 200:
        stats = response.json()
        print(f"Coordinator team stats: {json.dumps(stats, indent=2)}")
    else:
        print(f"Error: {response.status_code}")

if __name__ == "__main__":
    verify_coordinator_ticket() 
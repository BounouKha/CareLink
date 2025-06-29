#!/usr/bin/env python3
"""
Debug script to check coordinator tickets
"""

import requests
import json

def debug_coordinator_tickets():
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
    
    token = login_response.json().get('access')
    if not token:
        print("No access token received")
        return
    
    print("Login successful!")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    print("\n=== Debugging Coordinator Tickets ===")
    
    # 1. Check all tickets (no filters)
    print("\n1. All tickets (no filters):")
    response = requests.get(f"{base_url}/account/enhanced-tickets/", headers=headers)
    if response.status_code == 200:
        tickets = response.json().get('results', response.json())
        print(f"Found {len(tickets)} total tickets")
        for ticket in tickets:
            print(f"  - ID: {ticket['id']}, Title: {ticket['title']}, Team: {ticket['assigned_team']}, Status: {ticket['status']}, Created by: {ticket.get('created_by_name', 'Unknown')}")
    else:
        print(f"Error: {response.status_code} - {response.text}")
    
    # 2. Check tickets with assigned_team=Coordinator filter
    print("\n2. Tickets with assigned_team=Coordinator filter:")
    response = requests.get(f"{base_url}/account/enhanced-tickets/?assigned_team=Coordinator", headers=headers)
    if response.status_code == 200:
        tickets = response.json().get('results', response.json())
        print(f"Found {len(tickets)} Coordinator team tickets")
        for ticket in tickets:
            print(f"  - ID: {ticket['id']}, Title: {ticket['title']}, Team: {ticket['assigned_team']}, Status: {ticket['status']}, Created by: {ticket.get('created_by_name', 'Unknown')}")
    else:
        print(f"Error: {response.status_code} - {response.text}")
    
    # 3. Check tickets with assigned_team=Administrator filter
    print("\n3. Tickets with assigned_team=Administrator filter:")
    response = requests.get(f"{base_url}/account/enhanced-tickets/?assigned_team=Administrator", headers=headers)
    if response.status_code == 200:
        tickets = response.json().get('results', response.json())
        print(f"Found {len(tickets)} Administrator team tickets")
        for ticket in tickets:
            print(f"  - ID: {ticket['id']}, Title: {ticket['title']}, Team: {ticket['assigned_team']}, Status: {ticket['status']}, Created by: {ticket.get('created_by_name', 'Unknown')}")
    else:
        print(f"Error: {response.status_code} - {response.text}")
    
    # 4. Check my tickets
    print("\n4. My tickets (created by me):")
    response = requests.get(f"{base_url}/account/enhanced-tickets/?my_tickets=true", headers=headers)
    if response.status_code == 200:
        tickets = response.json().get('results', response.json())
        print(f"Found {len(tickets)} tickets created by me")
        for ticket in tickets:
            print(f"  - ID: {ticket['id']}, Title: {ticket['title']}, Team: {ticket['assigned_team']}, Status: {ticket['status']}, Created by: {ticket.get('created_by_name', 'Unknown')}")
    else:
        print(f"Error: {response.status_code} - {response.text}")
    
    # 5. Check stats
    print("\n5. Dashboard stats (all tickets):")
    response = requests.get(f"{base_url}/account/enhanced-tickets/dashboard_stats/", headers=headers)
    if response.status_code == 200:
        stats = response.json()
        print(f"Stats: {json.dumps(stats, indent=2)}")
    else:
        print(f"Error: {response.status_code} - {response.text}")
    
    # 6. Check stats for Coordinator team only
    print("\n6. Dashboard stats (Coordinator team only):")
    response = requests.get(f"{base_url}/account/enhanced-tickets/dashboard_stats/?assigned_team=Coordinator", headers=headers)
    if response.status_code == 200:
        stats = response.json()
        print(f"Coordinator team stats: {json.dumps(stats, indent=2)}")
    else:
        print(f"Error: {response.status_code} - {response.text}")

if __name__ == "__main__":
    debug_coordinator_tickets() 
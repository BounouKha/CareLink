#!/usr/bin/env python3
"""
Create a test ticket assigned to Coordinator team
"""

import requests
import json

def create_coordinator_ticket():
    base_url = "http://localhost:8000"
    
    # Test login as coordinator
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
    
    # Create a ticket assigned to Coordinator team
    ticket_data = {
        "title": "Test Coordinator Ticket",
        "description": "This is a test ticket assigned to the Coordinator team to test the functionality.",
        "category": "General Inquiry",
        "priority": "Medium",
        "assigned_team": "Coordinator"  # This is the key - assigned to Coordinator team
    }
    
    print("\nCreating ticket assigned to Coordinator team...")
    response = requests.post(f"{base_url}/account/enhanced-tickets/", 
                           headers=headers, 
                           json=ticket_data)
    
    if response.status_code == 201:
        ticket = response.json()
        print(f"✅ Successfully created ticket:")
        print(f"  - ID: {ticket['id']}")
        print(f"  - Title: {ticket['title']}")
        print(f"  - Team: {ticket['assigned_team']}")
        print(f"  - Status: {ticket['status']}")
        print(f"  - Created by: {ticket.get('created_by_name', 'Unknown')}")
        
        print(f"\n🎉 Now you should see this ticket in:")
        print(f"  - /coordinator/tickets (because it's assigned to Coordinator team)")
        print(f"  - /coordinator/helpdesk (because you created it)")
        
    else:
        print(f"❌ Failed to create ticket: {response.status_code}")
        print(response.text)

if __name__ == "__main__":
    create_coordinator_ticket() 
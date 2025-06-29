#!/usr/bin/env python3
"""
Test script to verify coordinator can add comments to tickets
"""

import requests
import json

def test_coordinator_comment():
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
    
    print("\n=== Testing Coordinator Comment Functionality ===")
    
    # 1. Get tickets to find one to comment on
    print("\n1. Getting tickets...")
    response = requests.get(f"{base_url}/account/enhanced-tickets/", headers=headers)
    if response.status_code != 200:
        print(f"Error getting tickets: {response.status_code}")
        return
    
    tickets = response.json().get('results', response.json())
    if not tickets:
        print("No tickets found to test commenting")
        return
    
    # Use the first ticket
    ticket = tickets[0]
    ticket_id = ticket['id']
    print(f"Using ticket ID: {ticket_id}, Title: {ticket['title']}")
    
    # 2. Get existing comments
    print("\n2. Getting existing comments...")
    response = requests.get(f"{base_url}/account/enhanced-tickets/comments/by_ticket/?ticket_id={ticket_id}", headers=headers)
    if response.status_code == 200:
        comments = response.json()
        print(f"Found {len(comments)} existing comments")
        for comment in comments:
            print(f"  - {comment.get('created_by_name', 'Unknown')}: {comment.get('comment', 'No content')}")
    else:
        print(f"Error getting comments: {response.status_code}")
    
    # 3. Add a new comment
    print("\n3. Adding a new comment...")
    comment_data = {
        "ticket": ticket_id,
        "comment": "This is a test comment from coordinator to verify commenting functionality.",
        "is_internal": False
    }
    
    response = requests.post(f"{base_url}/account/enhanced-tickets/comments/", 
                           headers=headers, 
                           json=comment_data)
    
    if response.status_code == 201:
        print("✅ Comment added successfully!")
        new_comment = response.json()
        print(f"Comment ID: {new_comment.get('id')}")
        print(f"Comment: {new_comment.get('comment')}")
    else:
        print(f"❌ Failed to add comment: {response.status_code}")
        print(f"Response: {response.text}")
    
    # 4. Get comments again to verify the new comment appears
    print("\n4. Verifying comment was added...")
    response = requests.get(f"{base_url}/account/enhanced-tickets/comments/by_ticket/?ticket_id={ticket_id}", headers=headers)
    if response.status_code == 200:
        comments = response.json()
        print(f"Now found {len(comments)} comments")
        for comment in comments:
            print(f"  - {comment.get('created_by_name', 'Unknown')}: {comment.get('comment', 'No content')}")
    else:
        print(f"Error getting comments: {response.status_code}")

if __name__ == "__main__":
    test_coordinator_comment() 
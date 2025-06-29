#!/usr/bin/env python3
"""
Test script to verify ticketing system fixes
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def test_login():
    """Test login to get access token"""
    login_data = {
        "email": "c2@carelink.com",  # Use coordinator account
        "password": "REMOVED"
    }
    
    response = requests.post(f"{BASE_URL}/account/login/", json=login_data)
    if response.status_code == 200:
        data = response.json()
        return data.get('access')
    else:
        print(f"Login failed: {response.status_code} - {response.text}")
        return None

def test_ticket_creation(token):
    """Test creating a ticket"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    ticket_data = {
        "title": "Test Ticket for Comment Testing",
        "description": "This is a test ticket to verify comment functionality",
        "category": "General",
        "priority": "Medium",
        "assigned_team": "Administrator"
    }
    
    response = requests.post(f"{BASE_URL}/account/enhanced-tickets/", 
                           json=ticket_data, headers=headers)
    
    if response.status_code == 201:
        data = response.json()
        print(f"✅ Ticket created successfully: {data['id']}")
        return data['id']
    else:
        print(f"❌ Ticket creation failed: {response.status_code} - {response.text}")
        return None

def test_comment_creation(token, ticket_id):
    """Test creating a comment"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    comment_data = {
        "ticket": ticket_id,
        "comment": "This is a test comment to verify the fix"
    }
    
    response = requests.post(f"{BASE_URL}/account/ticket-comments/", 
                           json=comment_data, headers=headers)
    
    if response.status_code == 201:
        data = response.json()
        print(f"✅ Comment created successfully: {data['id']}")
        return data['id']
    else:
        print(f"❌ Comment creation failed: {response.status_code} - {response.text}")
        return None

def test_comment_fetching(token, ticket_id):
    """Test fetching comments for a ticket"""
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    response = requests.get(f"{BASE_URL}/account/ticket-comments/by_ticket/?ticket_id={ticket_id}", 
                          headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Comments fetched successfully: {len(data)} comments found")
        return data
    else:
        print(f"❌ Comment fetching failed: {response.status_code} - {response.text}")
        return None

def test_ticket_detail(token, ticket_id):
    """Test fetching ticket details"""
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    response = requests.get(f"{BASE_URL}/account/enhanced-tickets/{ticket_id}/", 
                          headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Ticket details fetched successfully: {data['title']}")
        return data
    else:
        print(f"❌ Ticket detail fetching failed: {response.status_code} - {response.text}")
        return None

def main():
    print("🧪 Testing Ticketing System Fixes")
    print("=" * 50)
    
    # Test login
    print("\n1. Testing login...")
    token = test_login()
    if not token:
        print("❌ Cannot proceed without valid token")
        return
    
    print(f"✅ Login successful, token: {token[:20]}...")
    
    # Test ticket creation
    print("\n2. Testing ticket creation...")
    ticket_id = test_ticket_creation(token)
    if not ticket_id:
        print("❌ Cannot proceed without ticket")
        return
    
    # Test comment creation
    print("\n3. Testing comment creation...")
    comment_id = test_comment_creation(token, ticket_id)
    if not comment_id:
        print("❌ Comment creation failed")
        return
    
    # Test comment fetching
    print("\n4. Testing comment fetching...")
    comments = test_comment_fetching(token, ticket_id)
    if not comments:
        print("❌ Comment fetching failed")
        return
    
    # Test ticket detail
    print("\n5. Testing ticket detail fetching...")
    ticket_detail = test_ticket_detail(token, ticket_id)
    if not ticket_detail:
        print("❌ Ticket detail fetching failed")
        return
    
    print("\n" + "=" * 50)
    print("🎉 All tests completed successfully!")
    print("The ticketing system fixes are working correctly.")

if __name__ == "__main__":
    main() 
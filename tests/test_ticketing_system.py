#!/usr/bin/env python3
"""
Test script for the Enhanced Ticketing System
Tests API endpoints and functionality
"""

import requests
import json
import sys
import os

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

BASE_URL = "http://localhost:8000/account"

def test_login():
    """Test user login to get authentication token"""
    print("🔐 Testing login...")
    
    login_data = {
        "email": "REMOVED_EMAIL",  # Replace with actual admin username
        "password": "REMOVED"  # Replace with actual admin password
    }
    
    try:
        response = requests.post(f"{BASE_URL}/login/", json=login_data)
        if response.status_code == 200:
            data = response.json()
            token = data.get('access')
            print(f"✅ Login successful! Token: {token[:20]}...")
            return token
        else:
            print(f"❌ Login failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"❌ Login error: {e}")
        return None

def test_ticket_categories(token):
    """Test getting ticket categories"""
    print("\n📋 Testing ticket categories...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(f"{BASE_URL}/enhanced-tickets/categories/", headers=headers)
        if response.status_code == 200:
            categories = response.json()
            print(f"✅ Categories retrieved: {len(categories)} categories")
            for cat in categories:
                print(f"   - {cat['label']} ({cat['value']})")
            return True
        else:
            print(f"❌ Failed to get categories: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Categories error: {e}")
        return False

def test_ticket_priorities(token):
    """Test getting ticket priorities"""
    print("\n⚡ Testing ticket priorities...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(f"{BASE_URL}/enhanced-tickets/priorities/", headers=headers)
        if response.status_code == 200:
            priorities = response.json()
            print(f"✅ Priorities retrieved: {len(priorities)} priorities")
            for pri in priorities:
                print(f"   - {pri['label']} ({pri['value']})")
            return True
        else:
            print(f"❌ Failed to get priorities: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Priorities error: {e}")
        return False

def test_ticket_teams(token):
    """Test getting ticket teams"""
    print("\n👥 Testing ticket teams...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(f"{BASE_URL}/enhanced-tickets/teams/", headers=headers)
        if response.status_code == 200:
            teams = response.json()
            print(f"✅ Teams retrieved: {len(teams)} teams")
            for team in teams:
                print(f"   - {team['label']} ({team['value']})")
            return True
        else:
            print(f"❌ Failed to get teams: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Teams error: {e}")
        return False

def test_create_ticket(token):
    """Test creating a new ticket"""
    print("\n🎫 Testing ticket creation...")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    ticket_data = {
        "title": "Test Ticket - System Integration",
        "description": "This is a test ticket to verify the ticketing system is working properly.",
        "category": "Technical Issue",
        "priority": "Medium",
        "assigned_team": "Coordinator"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/enhanced-tickets/", json=ticket_data, headers=headers)
        if response.status_code == 201:
            ticket = response.json()
            print(f"✅ Ticket created successfully!")
            print(f"   - ID: {ticket['id']}")
            print(f"   - Title: {ticket['title']}")
            print(f"   - Status: {ticket['status']}")
            print(f"   - Created by: {ticket['created_by']}")
            return ticket['id']
        else:
            print(f"❌ Failed to create ticket: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"❌ Create ticket error: {e}")
        return None

def test_get_tickets(token):
    """Test getting tickets list"""
    print("\n📋 Testing tickets list...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(f"{BASE_URL}/enhanced-tickets/", headers=headers)
        if response.status_code == 200:
            data = response.json()
            tickets = data.get('results', [])
            print(f"✅ Tickets retrieved: {len(tickets)} tickets")
            for ticket in tickets[:3]:  # Show first 3 tickets
                print(f"   - {ticket['title']} (Status: {ticket['status']})")
            return True
        else:
            print(f"❌ Failed to get tickets: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Get tickets error: {e}")
        return False

def test_dashboard_stats(token):
    """Test getting dashboard statistics"""
    print("\n📊 Testing dashboard stats...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(f"{BASE_URL}/enhanced-tickets/dashboard_stats/", headers=headers)
        if response.status_code == 200:
            stats = response.json()
            print(f"✅ Dashboard stats retrieved:")
            print(f"   - Total tickets: {stats['total_tickets']}")
            print(f"   - New tickets: {stats['new_tickets']}")
            print(f"   - In progress: {stats['in_progress']}")
            print(f"   - Resolved: {stats['resolved']}")
            print(f"   - My tickets: {stats['my_tickets']}")
            return True
        else:
            print(f"❌ Failed to get stats: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Dashboard stats error: {e}")
        return False

def test_add_comment(token, ticket_id):
    """Test adding a comment to a ticket"""
    print(f"\n💬 Testing comment addition for ticket {ticket_id}...")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    comment_data = {
        "ticket": ticket_id,
        "content": "This is a test comment to verify the commenting system works."
    }
    
    try:
        response = requests.post(f"{BASE_URL}/ticket-comments/", json=comment_data, headers=headers)
        if response.status_code == 201:
            comment = response.json()
            print(f"✅ Comment added successfully!")
            print(f"   - Comment ID: {comment['id']}")
            print(f"   - Content: {comment['content'][:50]}...")
            return True
        else:
            print(f"❌ Failed to add comment: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Add comment error: {e}")
        return False

def test_update_ticket_status(token, ticket_id):
    """Test updating ticket status"""
    print(f"\n🔄 Testing status update for ticket {ticket_id}...")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    status_data = {
        "status": "In Progress",
        "notes": "Starting work on this ticket"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/enhanced-tickets/{ticket_id}/update_status/", 
                               json=status_data, headers=headers)
        if response.status_code == 200:
            ticket = response.json()
            print(f"✅ Status updated successfully!")
            print(f"   - New status: {ticket['status']}")
            return True
        else:
            print(f"❌ Failed to update status: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Update status error: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Starting Enhanced Ticketing System Tests")
    print("=" * 50)
    
    # Test login
    token = test_login()
    if not token:
        print("❌ Cannot proceed without authentication token")
        return
    
    # Test basic functionality
    test_ticket_categories(token)
    test_ticket_priorities(token)
    test_ticket_teams(token)
    test_dashboard_stats(token)
    test_get_tickets(token)
    
    # Test ticket creation
    ticket_id = test_create_ticket(token)
    if ticket_id:
        test_add_comment(token, ticket_id)
        test_update_ticket_status(token, ticket_id)
    
    print("\n" + "=" * 50)
    print("✅ Ticketing System Tests Completed!")
    print("\nNext steps:")
    print("1. Test the frontend TicketDashboard component")
    print("2. Verify role-based access control")
    print("3. Test notification system (when implemented)")
    print("4. Test filtering and search functionality")

if __name__ == "__main__":
    main() 
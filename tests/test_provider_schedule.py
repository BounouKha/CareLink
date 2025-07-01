#!/usr/bin/env python3
"""
Test script for Provider Schedule functionality
Tests the new provider schedule view and API endpoints
"""

import requests
import json
from datetime import datetime, timedelta

# Configuration
BASE_URL = "http://localhost:8000"
LOGIN_URL = f"{BASE_URL}/account/login/"
PROVIDER_SCHEDULE_URL = f"{BASE_URL}/account/providers/my-schedule/"

def test_provider_schedule():
    print("🧪 Testing Provider Schedule Functionality")
    print("=" * 50)
    
    # Step 1: Login as a provider
    print("\n1. 🔐 Logging in as provider...")
    
    # You'll need to replace these with actual provider credentials
    login_data = {
        "email": "provider@example.com",  # Replace with actual provider email
        "password": "provider123"         # Replace with actual provider password
    }
    
    try:
        login_response = requests.post(LOGIN_URL, json=login_data)
        print(f"Login Status: {login_response.status_code}")
        
        if login_response.status_code != 200:
            print(f"❌ Login failed: {login_response.text}")
            return False
            
        login_data = login_response.json()
        access_token = login_data.get('access')
        
        if not access_token:
            print("❌ No access token received")
            return False
            
        print("✅ Login successful!")
        
    except Exception as e:
        print(f"❌ Login error: {str(e)}")
        return False
    
    # Step 2: Test provider schedule endpoint
    print("\n2. 📅 Testing provider schedule endpoint...")
    
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }
    
    # Calculate current week start (Sunday)
    today = datetime.now()
    days_since_sunday = (today.weekday() + 1) % 7
    week_start = today - timedelta(days=days_since_sunday)
    start_date = week_start.strftime('%Y-%m-%d')
    
    try:
        schedule_response = requests.get(
            f"{PROVIDER_SCHEDULE_URL}?start_date={start_date}",
            headers=headers
        )
        
        print(f"Schedule Status: {schedule_response.status_code}")
        
        if schedule_response.status_code == 200:
            schedule_data = schedule_response.json()
            print("✅ Provider schedule retrieved successfully!")
            
            # Display schedule information
            provider = schedule_data.get('provider', {})
            week_range = schedule_data.get('week_range', {})
            statistics = schedule_data.get('statistics', {})
            schedule_data_days = schedule_data.get('schedule_data', {})
            
            print(f"\n📋 Provider: {provider.get('name', 'Unknown')}")
            print(f"📅 Week: {week_range.get('week_start_display', 'Unknown')} - {week_range.get('week_end_display', 'Unknown')}")
            print(f"📊 Statistics:")
            print(f"   - Total Appointments: {statistics.get('total_appointments', 0)}")
            print(f"   - Weekly Hours: {statistics.get('total_weekly_hours', 0)}h")
            print(f"   - Completion Rate: {statistics.get('completion_rate', 0)}%")
            
            # Display daily schedule
            print(f"\n📅 Daily Schedule:")
            for day_key, day_data in schedule_data_days.items():
                appointments = day_data.get('appointments', [])
                print(f"   {day_data.get('day_name', 'Unknown')} ({day_key}): {len(appointments)} appointments")
                
                for appointment in appointments[:3]:  # Show first 3 appointments
                    patient = appointment.get('patient', {})
                    service = appointment.get('service', {})
                    print(f"     - {appointment.get('start_time', 'N/A')} - {appointment.get('end_time', 'N/A')}: {patient.get('name', 'No Patient')} ({service.get('name', 'No Service')})")
                
                if len(appointments) > 3:
                    print(f"     ... and {len(appointments) - 3} more appointments")
            
        elif schedule_response.status_code == 403:
            print("❌ Access denied - user might not be a provider")
            print(f"Response: {schedule_response.text}")
        elif schedule_response.status_code == 404:
            print("❌ Provider record not found")
            print(f"Response: {schedule_response.text}")
        else:
            print(f"❌ Schedule request failed: {schedule_response.text}")
            
    except Exception as e:
        print(f"❌ Schedule request error: {str(e)}")
        return False
    
    print("\n" + "=" * 50)
    print("🎉 Provider Schedule Testing Complete!")
    print("=" * 50)
    return True

if __name__ == "__main__":
    test_provider_schedule() 
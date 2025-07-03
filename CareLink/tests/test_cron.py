#!/usr/bin/env python3
"""
Test script for the cron invoice generation endpoint
Run this to test if your cron setup works correctly
"""

import requests
import json

# Configuration
BASE_URL = "http://localhost:8000"  # Change this to your domain in production
CRON_ENDPOINT = f"{BASE_URL}/account/invoices/cron-generate/"
SECRET_TOKEN = "carelink-invoice-2024-secret-token-change-this-in-production"

def test_cron_endpoint():
    """Test the cron endpoint with the secret token"""
    
    headers = {
        "Content-Type": "application/json",
        "X-Cron-Token": SECRET_TOKEN
    }
    
    data = {
        "token": SECRET_TOKEN
    }
    
    print(f"Testing cron endpoint: {CRON_ENDPOINT}")
    print(f"Using token: {SECRET_TOKEN[:20]}...")
    print("-" * 50)
    
    try:
        response = requests.post(CRON_ENDPOINT, headers=headers, json=data)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        print(f"Response Body: {response.text}")
        
        if response.status_code == 200:
            print("✅ SUCCESS: Cron endpoint is working!")
            result = response.json()
            if result.get('success'):
                print("✅ Invoice generation completed successfully")
            else:
                print("❌ Invoice generation failed")
        else:
            print("❌ FAILED: Cron endpoint returned an error")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ ERROR: Could not connect to endpoint: {e}")
    except json.JSONDecodeError as e:
        print(f"❌ ERROR: Invalid JSON response: {e}")

def test_without_token():
    """Test without token (should fail)"""
    
    headers = {"Content-Type": "application/json"}
    data = {}
    
    print(f"\nTesting without token (should fail):")
    print("-" * 50)
    
    try:
        response = requests.post(CRON_ENDPOINT, headers=headers, json=data)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 401:
            print("✅ SUCCESS: Endpoint correctly rejected request without token")
        else:
            print("❌ FAILED: Endpoint should have rejected request without token")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ ERROR: {e}")

if __name__ == "__main__":
    print("Testing CareLink Cron Invoice Generation")
    print("=" * 50)
    
    # Test with valid token
    test_cron_endpoint()
    
    # Test without token
    test_without_token()
    
    print("\n" + "=" * 50)
    print("Test completed!") 
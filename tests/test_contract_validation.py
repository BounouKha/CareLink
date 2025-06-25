#!/usr/bin/env python
"""
Test script for contract validation endpoints
"""
import requests
import json

# Configuration
BASE_URL = "http://localhost:8000/account"
LOGIN_URL = f"{BASE_URL}/login/"
CONTRACT_STATUS_URL = f"{BASE_URL}/users/5/contract-status/"  # Test with user ID 5
MY_CONTRACT_STATUS_URL = f"{BASE_URL}/users/my-contract-status/"

# Test credentials (coordinator)
USERNAME = "c2@carelink.be"
PASSWORD = "Pugu8874@"

def test_contract_validation_endpoints():
    print("🧪 Testing Contract Validation API Endpoints")
    print("=" * 60)
    
    # Step 1: Login
    login_data = {
        "email": "c2@carelink.be",  # Replace with actual admin email
        "password": "Pugu8874@"      # Replace with actual password
    }
    
    try:
        response = requests.post(LOGIN_URL, json=login_data)
        print(f"Login Status: {response.status_code}")
        
        if response.status_code == 200:
            tokens = response.json()
            access_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzUwNzY4MzA3LCJpYXQiOjE3NTA3Njc0MDcsImp0aSI6IjQ0ZWZkYzJjNmVhYTQ3MWJhZTE0OWM1OTE4YWRjYTIwIiwidXNlcl9pZCI6NjcsImlzX3N1cGVydXNlciI6ZmFsc2V9.BE7dDN7-Usn3A7bOrc2dL4F588mbmwThg-UQ1BiQ_Ks"
            print("✅ Login successful!")
            print(f"Access token: {access_token[:50]}...")
        else:
            print(f"❌ Login failed: {response.text}")
            print("Please update the login credentials in the test script")
            return
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection failed - make sure Django server is running on port 8000")
        return
    except Exception as e:
        print(f"❌ Login error: {str(e)}")
        return
    
    # Headers for authenticated requests
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }
    
    # Step 2: Test specific user contract status
    print("\n2. 🔍 Testing User Contract Status Check...")
    try:
        response = requests.get(CONTRACT_STATUS_URL, headers=headers)
        print(f"User Contract Status: {response.status_code}")
        
        if response.status_code == 200:
            status_data = response.json()
            print("✅ User contract status retrieved successfully!")
            print(f"User: {status_data.get('user_name')} ({status_data.get('user_email')})")
            print(f"Is Provider: {status_data.get('is_provider')}")
            print(f"Has Valid Contract: {status_data.get('has_valid_contract')}")
            print(f"Contract Status: {status_data.get('contract_status')}")
            print(f"Total Contracts: {status_data.get('total_contracts')}")
            print(f"Active Contracts: {status_data.get('active_contracts_count')}")
            print(f"Pending Contracts: {status_data.get('pending_contracts_count')}")
            print(f"Weekly Hours: {status_data.get('weekly_hours')}")
            print(f"Weekly Hours Status: {status_data.get('weekly_hours_status')}")
            print(f"Workload Category: {status_data.get('workload_category')}")
            print(f"Workload Compliance: {status_data.get('workload_compliance')}")
            print(f"Can Work: {status_data.get('can_work')}")
            print(f"Data Quality Score: {status_data.get('data_quality_score')}%")
            
            # Show current contract if exists
            current_contract = status_data.get('current_contract')
            if current_contract:
                print(f"\\nCurrent Contract:")
                print(f"  Reference: {current_contract.get('reference')}")
                print(f"  Type: {current_contract.get('type')}")
                print(f"  Start: {current_contract.get('start_date')}")
                print(f"  End: {current_contract.get('end_date')}")
                if 'days_until_expiry' in current_contract:
                    print(f"  Days until expiry: {current_contract.get('days_until_expiry')}")
            
            # Show issues and recommendations
            issues = status_data.get('issues', [])
            if issues:
                print(f"\\n⚠️  Issues found:")
                for issue in issues:
                    print(f"  - {issue}")
            
            recommendations = status_data.get('recommendations', [])
            if recommendations:
                print(f"\\n💡 Recommendations:")
                for rec in recommendations:
                    print(f"  - {rec}")
                    
        else:
            print(f"❌ User contract status failed: {response.text}")
            
    except Exception as e:
        print(f"❌ User contract status error: {str(e)}")
    
    # Step 3: Test current user contract status
    print("\n3. 👤 Testing Current User Contract Status...")
    try:
        response = requests.get(MY_CONTRACT_STATUS_URL, headers=headers)
        print(f"My Contract Status: {response.status_code}")
        
        if response.status_code == 200:
            my_status = response.json()
            print("✅ Current user contract status retrieved successfully!")
            print(f"User ID: {my_status.get('user_id')}")
            print(f"Is Provider: {my_status.get('is_provider')}")
            print(f"Has Valid Contract: {my_status.get('has_valid_contract')}")
            print(f"Contract Status: {my_status.get('contract_status')}")
            print(f"Can Work: {my_status.get('can_work')}")
            
            current_contract = my_status.get('current_contract')
            if current_contract:
                print(f"\\nMy Current Contract:")
                print(f"  Reference: {current_contract.get('reference')}")
                print(f"  Type: {current_contract.get('type')}")
                print(f"  Start: {current_contract.get('start_date')}")
                print(f"  End: {current_contract.get('end_date')}")
        else:
            print(f"❌ Current user contract status failed: {response.text}")
            
    except Exception as e:
        print(f"❌ Current user contract status error: {str(e)}")
    
    # Step 4: Test with different user IDs
    print("\n4. 🔄 Testing Multiple Users...")
    test_user_ids = [1, 2, 3, 6, 7]
    
    for user_id in test_user_ids:
        try:
            url = f"{BASE_URL}/users/{user_id}/contract-status/"
            response = requests.get(url, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                user_name = data.get('user_name', 'Unknown')
                contract_status = data.get('contract_status', 'unknown')
                has_valid = data.get('has_valid_contract', False)
                print(f"  User {user_id} ({user_name}): {contract_status} {'✅' if has_valid else '❌'}")
            elif response.status_code == 404:
                print(f"  User {user_id}: Not found")
            else:
                print(f"  User {user_id}: Error {response.status_code}")
                
        except Exception as e:
            print(f"  User {user_id}: Exception {str(e)}")
    
    print("\n" + "=" * 60)
    print("🎉 Contract Validation API Testing Complete!")
    print("=" * 60)

if __name__ == "__main__":
    test_contract_validation_endpoints()

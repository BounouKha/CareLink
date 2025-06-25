import requests
import json

# Test configuration
BASE_URL = "http://localhost:8000"
LOGIN_URL = f"{BASE_URL}/account/login/"
PROVIDER_LIST_URL = f"{BASE_URL}/account/providers/"
PROVIDER_STATS_URL = f"{BASE_URL}/account/providers/stats/"

def test_provider_endpoints():
    print("🧪 Testing Provider Management API Endpoints")
    print("=" * 50)
    
    # Step 1: Login to get access token
    print("\n1. 🔐 Testing Login...")
    
    # You'll need to use actual credentials here
    login_data = {
        "email": "c2@carelink.be",  # Replace with actual admin email
        "password": "Pugu8874@"      # Replace with actual password
    }
    
    try:
        response = requests.post(LOGIN_URL, json=login_data)
        print(f"Login Status: {response.status_code}")
        
        if response.status_code == 200:
            tokens = response.json()
            access_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzUwNzY0MTM2LCJpYXQiOjE3NTA3NjMyMzYsImp0aSI6Ijc1OTZkMTFkODBjZTQxZWM5ZTUwMThlOGI5ZTkzNmY2IiwidXNlcl9pZCI6NjcsImlzX3N1cGVydXNlciI6ZmFsc2V9.0LycFeFeaXyCNgRGCYCPJU4PmuSESzV3T7t_zrcciWA"
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
    
    # Step 2: Test Provider List
    print("\n2. 📋 Testing Provider List...")
    try:
        response = requests.get(PROVIDER_LIST_URL, headers=headers)
        print(f"Provider List Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Provider list retrieved successfully!")
            print(f"Total providers: {data.get('count', 0)}")
            
            # Show first few providers
            providers = data.get('providers', [])
            if providers:
                print("\nFirst 3 providers:")
                for i, provider in enumerate(providers[:3]):
                    user = provider.get('user', {})
                    print(f"  {i+1}. {user.get('full_name', 'N/A')} - {provider.get('service_name', 'No Service')} - {provider.get('active_contract_status', 'No Contract')}")
            else:
                print("No providers found in the system")
        else:
            print(f"❌ Provider list failed: {response.text}")
            
    except Exception as e:
        print(f"❌ Provider list error: {str(e)}")
    
    # Step 3: Test Provider Stats
    print("\n3. 📊 Testing Provider Statistics...")
    try:
        response = requests.get(PROVIDER_STATS_URL, headers=headers)
        print(f"Provider Stats Status: {response.status_code}")
        
        if response.status_code == 200:
            stats = response.json()
            print("✅ Provider statistics retrieved successfully!")
            print(f"Total providers: {stats.get('total_providers', 0)}")
            print(f"Active contracts: {stats.get('active_contracts', 0)}")
            print(f"Expiring contracts: {stats.get('expiring_contracts', 0)}")
            print(f"Providers without contracts: {stats.get('providers_without_contracts', 0)}")
            print(f"Internal providers: {stats.get('internal_providers', 0)}")
            print(f"External providers: {stats.get('external_providers', 0)}")
            
            # Show contract types
            contract_types = stats.get('contracts_by_type', {})
            if contract_types:
                print("\nContracts by type:")
                for contract_type, count in contract_types.items():
                    print(f"  - {contract_type}: {count}")
                    
            # Show contract statuses
            contract_statuses = stats.get('contracts_by_status', {})
            if contract_statuses:
                print("\nContracts by status:")
                for status, count in contract_statuses.items():
                    print(f"  - {status}: {count}")
        else:
            print(f"❌ Provider stats failed: {response.text}")
            
    except Exception as e:
        print(f"❌ Provider stats error: {str(e)}")
    
    # Step 4: Test Provider Detail (if providers exist)
    if 'providers' in locals() and providers:
        provider_id = providers[0]['id']
        detail_url = f"{BASE_URL}/account/providers/{provider_id}/"
        
        print(f"\n4. 🔍 Testing Provider Detail (ID: {provider_id})...")
        try:
            response = requests.get(detail_url, headers=headers)
            print(f"Provider Detail Status: {response.status_code}")
            
            if response.status_code == 200:
                detail = response.json()
                print("✅ Provider detail retrieved successfully!")
                user = detail.get('user', {})
                print(f"Provider: {user.get('full_name', 'N/A')}")
                print(f"Email: {user.get('email', 'N/A')}")
                print(f"Service: {detail.get('service', {}).get('name', 'N/A')}")
                print(f"Internal: {detail.get('is_internal', False)}")
                print(f"Total contracts: {detail.get('contracts_count', 0)}")
                
                contracts = detail.get('contracts', [])
                if contracts:
                    print(f"Latest contract: {contracts[0].get('contract_reference', 'N/A')} - {contracts[0].get('status', 'N/A')}")
            else:
                print(f"❌ Provider detail failed: {response.text}")
                
        except Exception as e:
            print(f"❌ Provider detail error: {str(e)}")
    
    # Step 5: Test Contracts for Provider (if providers exist)
    if 'providers' in locals() and providers:
        provider_id = providers[0]['id']
        contracts_url = f"{BASE_URL}/account/providers/{provider_id}/contracts/"
        
        print(f"\n5. 📄 Testing Provider Contracts (ID: {provider_id})...")
        try:
            response = requests.get(contracts_url, headers=headers)
            print(f"Provider Contracts Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print("✅ Provider contracts retrieved successfully!")
                print(f"Total contracts: {data.get('count', 0)}")
                
                contracts = data.get('contracts', [])
                if contracts:
                    print("\nContracts:")
                    for i, contract in enumerate(contracts[:3]):
                        print(f"  {i+1}. {contract.get('contract_reference', 'N/A')} - {contract.get('type_contract', 'N/A')} - {contract.get('status', 'N/A')}")
                        if contract.get('start_date'):
                            print(f"     Start: {contract.get('start_date')} | End: {contract.get('end_date', 'N/A')}")
                        if contract.get('hourly_rate'):
                            print(f"     Rate: €{contract.get('hourly_rate')}/hour | Hours: {contract.get('weekly_hours', 'N/A')}/week")
            else:
                print(f"❌ Provider contracts failed: {response.text}")
                
        except Exception as e:
            print(f"❌ Provider contracts error: {str(e)}")
    
    print("\n" + "=" * 50)
    print("🎉 Provider API Testing Complete!")
    print("=" * 50)

if __name__ == "__main__":
    test_provider_endpoints()

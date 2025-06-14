#!/usr/bin/env python
"""
JWT Performance Testing Script for CareLink
Tests the optimized JWT refresh token implementation
"""
import requests
import time
import json
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
import statistics

BASE_URL = "http://127.0.0.1:8000"  # Use IPv4 for better performance

class JWTPerformanceTester:
    def __init__(self):
        self.results = []
        self.test_users = [
            {"email": "REMOVED_EMAIL", "password": "REMOVED"},
            {"email": "REMOVED_EMAIL", "password": "REMOVED"},
            {"email": "REMOVED_EMAIL", "password": "REMOVED"},
        ]
        self.tokens = {}
    
    def setup_test_tokens(self):
        """Get initial tokens for testing"""
        print("🔐 Setting up test tokens...")
        
        for i, user in enumerate(self.test_users):
            try:
                response = requests.post(
                    f"{BASE_URL}/account/login/",
                    json=user,
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    self.tokens[f"user_{i}"] = {
                        'access': data.get('access'),
                        'refresh': data.get('refresh'),
                        'email': user['email']
                    }
                    print(f"✅ Token obtained for {user['email']}")
                else:
                    print(f"❌ Failed to get token for {user['email']}: {response.status_code}")
                    
            except Exception as e:
                print(f"❌ Error getting token for {user['email']}: {e}")
        
        print(f"📊 Successfully set up {len(self.tokens)} test tokens\n")
    
    def test_single_refresh_performance(self):
        """Test single token refresh performance"""
        print("🔄 Testing single token refresh performance...")
        
        if not self.tokens:
            print("❌ No tokens available for testing")
            return
        
        user_key = list(self.tokens.keys())[0]
        refresh_token = self.tokens[user_key]['refresh']
        
        results = []
        
        for i in range(10):
            start_time = time.time()
            
            try:
                response = requests.post(
                    f"{BASE_URL}/account/token/refresh/",
                    json={'refresh': refresh_token},
                    timeout=10
                )
                
                duration = (time.time() - start_time) * 1000  # Convert to ms
                
                if response.status_code == 200:
                    data = response.json()
                    refresh_token = data.get('refresh', refresh_token)  # Update for next iteration
                    results.append(duration)
                    print(f"  Refresh {i+1}: {duration:.2f}ms ✅")
                else:
                    print(f"  Refresh {i+1}: Failed ({response.status_code}) ❌")
                    
            except Exception as e:
                print(f"  Refresh {i+1}: Error - {e} ❌")
        
        if results:
            avg_time = statistics.mean(results)
            min_time = min(results)
            max_time = max(results)
            
            print(f"\n📊 Single Refresh Performance Results:")
            print(f"  Average: {avg_time:.2f}ms")
            print(f"  Min: {min_time:.2f}ms")
            print(f"  Max: {max_time:.2f}ms")
            print(f"  Target: <30ms {'✅' if avg_time < 30 else '❌'}")
        
        print()
    
    def test_concurrent_refresh_performance(self):
        """Test concurrent token refresh performance"""
        print("🚀 Testing concurrent token refresh performance...")
        
        if len(self.tokens) < 2:
            print("❌ Need at least 2 tokens for concurrent testing")
            return
        
        def refresh_worker(user_key, refresh_token):
            start_time = time.time()
            
            try:
                response = requests.post(
                    f"{BASE_URL}/account/token/refresh/",
                    json={'refresh': refresh_token},
                    timeout=10
                )
                
                duration = (time.time() - start_time) * 1000
                
                return {
                    'user_key': user_key,
                    'duration': duration,
                    'status_code': response.status_code,
                    'success': response.status_code == 200
                }
                
            except Exception as e:
                return {
                    'user_key': user_key,
                    'duration': (time.time() - start_time) * 1000,
                    'status_code': 0,
                    'success': False,
                    'error': str(e)
                }
        
        # Run concurrent refreshes
        with ThreadPoolExecutor(max_workers=len(self.tokens)) as executor:
            futures = []
            
            for user_key, token_data in self.tokens.items():
                future = executor.submit(
                    refresh_worker, 
                    user_key, 
                    token_data['refresh']
                )
                futures.append(future)
            
            results = []
            for future in as_completed(futures):
                results.append(future.result())
        
        # Analyze results
        successful_refreshes = [r for r in results if r['success']]
        failed_refreshes = [r for r in results if not r['success']]
        
        print(f"📊 Concurrent Refresh Results:")
        print(f"  Total requests: {len(results)}")
        print(f"  Successful: {len(successful_refreshes)}")
        print(f"  Failed: {len(failed_refreshes)}")
        
        if successful_refreshes:
            durations = [r['duration'] for r in successful_refreshes]
            avg_duration = statistics.mean(durations)
            print(f"  Average duration: {avg_duration:.2f}ms")
        
        for result in results:
            status = "✅" if result['success'] else "❌"
            print(f"  {result['user_key']}: {result['duration']:.2f}ms ({result['status_code']}) {status}")
        
        print()
    
    def test_refresh_rate_limiting(self):
        """Test concurrent refresh prevention"""
        print("🛡️ Testing refresh rate limiting...")
        
        if not self.tokens:
            print("❌ No tokens available for testing")
            return
        
        user_key = list(self.tokens.keys())[0]
        refresh_token = self.tokens[user_key]['refresh']
        
        def rapid_refresh_worker(attempt_num):
            try:
                response = requests.post(
                    f"{BASE_URL}/account/token/refresh/",
                    json={'refresh': refresh_token},
                    timeout=5
                )
                
                return {
                    'attempt': attempt_num,
                    'status_code': response.status_code,
                    'response_time': response.elapsed.total_seconds() * 1000
                }
                
            except Exception as e:
                return {
                    'attempt': attempt_num,
                    'status_code': 0,
                    'error': str(e)
                }
        
        # Rapid concurrent requests (should be rate limited)
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(rapid_refresh_worker, i) for i in range(5)]
            results = [f.result() for f in as_completed(futures)]
        
        # Analyze rate limiting
        success_count = sum(1 for r in results if r['status_code'] == 200)
        rate_limited_count = sum(1 for r in results if r['status_code'] == 429)
        
        print(f"📊 Rate Limiting Results:")
        print(f"  Successful refreshes: {success_count}")
        print(f"  Rate limited (429): {rate_limited_count}")
        print(f"  Rate limiting working: {'✅' if rate_limited_count > 0 else '❌'}")
        
        for result in results:
            status_symbol = "✅" if result['status_code'] == 200 else "🛡️" if result['status_code'] == 429 else "❌"
            print(f"  Attempt {result['attempt']}: {result['status_code']} {status_symbol}")
        
        print()
    
    def test_token_blacklisting(self):
        """Test token blacklisting functionality"""
        print("🔒 Testing token blacklisting...")
        
        if not self.tokens:
            print("❌ No tokens available for testing")
            return
        
        user_key = list(self.tokens.keys())[0]
        refresh_token = self.tokens[user_key]['refresh']
        
        # First refresh - should succeed
        response1 = requests.post(
            f"{BASE_URL}/account/token/refresh/",
            json={'refresh': refresh_token},
            timeout=10
        )
        
        if response1.status_code == 200:
            print("  First refresh: ✅ Success")
            
            # Try to use the old token again - should fail
            time.sleep(1)  # Give time for async blacklisting
            
            response2 = requests.post(
                f"{BASE_URL}/account/token/refresh/",
                json={'refresh': refresh_token},  # Old token
                timeout=10
            )
            
            if response2.status_code == 401:
                print("  Second refresh with old token: ✅ Properly rejected (401)")
                print("  Token blacklisting: ✅ Working correctly")
            else:
                print(f"  Second refresh with old token: ❌ Unexpected status ({response2.status_code})")
                print("  Token blacklisting: ❌ Not working properly")
        else:
            print(f"  First refresh: ❌ Failed ({response1.status_code})")
        
        print()
    
    def test_authenticated_api_performance(self):
        """Test authenticated API call performance"""
        print("🌐 Testing authenticated API performance...")
        
        if not self.tokens:
            print("❌ No tokens available for testing")
            return
        
        user_key = list(self.tokens.keys())[0]
        access_token = self.tokens[user_key]['access']
        
        results = []
        
        for i in range(5):
            start_time = time.time()
            
            try:
                response = requests.get(
                    f"{BASE_URL}/account/profile/",
                    headers={'Authorization': f'Bearer {access_token}'},
                    timeout=10
                )
                
                duration = (time.time() - start_time) * 1000
                results.append(duration)
                
                if response.status_code == 200:
                    print(f"  API call {i+1}: {duration:.2f}ms ✅")
                else:
                    print(f"  API call {i+1}: {duration:.2f}ms ❌ ({response.status_code})")
                    
            except Exception as e:
                print(f"  API call {i+1}: Error - {e} ❌")
        
        if results:
            avg_time = statistics.mean(results)
            print(f"\n📊 Authenticated API Performance:")
            print(f"  Average response time: {avg_time:.2f}ms")
            print(f"  Target: <100ms {'✅' if avg_time < 100 else '❌'}")
        
        print()
    
    def run_all_tests(self):
        """Run all performance tests"""
        print("🧪 JWT Performance Test Suite")
        print("=" * 50)
        
        self.setup_test_tokens()
        
        if not self.tokens:
            print("❌ Cannot run tests without tokens")
            return
        
        self.test_single_refresh_performance()
        self.test_concurrent_refresh_performance()
        self.test_refresh_rate_limiting()
        self.test_token_blacklisting()
        self.test_authenticated_api_performance()
        
        print("🏁 Performance testing completed!")
        print("=" * 50)

if __name__ == "__main__":
    tester = JWTPerformanceTester()
    tester.run_all_tests()

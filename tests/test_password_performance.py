#!/usr/bin/env python
"""
Test password hashing performance after optimization
"""
import os
import sys
import django
import time

# Setup Django
sys.path.append('c:/Users/460020779/Desktop/CareLink/CareLink')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')
django.setup()

from django.contrib.auth.hashers import make_password, check_password, get_hasher
from django.contrib.auth import authenticate

def test_password_performance():
    print('Testing Argon2 password hasher performance...')
    print('=' * 60)
    
    # Check which hasher is being used
    hasher = get_hasher()
    print(f'Current hasher: {hasher.__class__.__name__}')
    print(f'Algorithm: {hasher.algorithm}')
    print()
    
    # Test new password hashing (for new users)
    test_password = 'NewTestPassword123@'
    start = time.time()
    hashed = make_password(test_password)
    hash_time = time.time() - start
    print(f'NEW password hashing took: {hash_time*1000:.2f}ms (was ~700ms with PBKDF2)')
    
    # Test password verification with new hash
    start = time.time()
    is_valid = check_password(test_password, hashed)
    verify_time = time.time() - start
    print(f'NEW password verification took: {verify_time*1000:.2f}ms (was ~830ms)')
    print(f'New hash is valid: {is_valid}')
    print(f'Hash algorithm: {hashed.split("$")[0]}')
    print()
    
    # Test authentication with existing user (still using old PBKDF2 hash)
    print('Testing existing user authentication...')
    start = time.time()
    user = authenticate(username='REMOVED_EMAIL', password='REMOVED')
    auth_time = time.time() - start
    print(f'EXISTING user authentication took: {auth_time*1000:.2f}ms (old PBKDF2 hash)')
    print(f'Authentication result: {user is not None}')
    print()
    
    # Performance comparison
    print('Performance Comparison:')
    print(f'  Argon2 hashing: {hash_time*1000:.2f}ms vs PBKDF2: ~700ms')
    print(f'  Argon2 verification: {verify_time*1000:.2f}ms vs PBKDF2: ~830ms')
    print(f'  Existing PBKDF2 auth: {auth_time*1000:.2f}ms (until users reset passwords)')
    
    # Improvement calculation
    if hash_time*1000 < 700:
        improvement = ((700 - hash_time*1000) / 700) * 100
        print(f'  Hashing improvement: {improvement:.1f}% faster')
    
    if verify_time*1000 < 830:
        improvement = ((830 - verify_time*1000) / 830) * 100
        print(f'  Verification improvement: {improvement:.1f}% faster')

if __name__ == '__main__':
    test_password_performance()

"""
Custom password hashers optimized for healthcare applications
Balances security with performance for better user experience
"""
from django.contrib.auth.hashers import PBKDF2PasswordHasher, Argon2PasswordHasher


class FastPBKDF2PasswordHasher(PBKDF2PasswordHasher):
    """
    PBKDF2 hasher optimized for healthcare performance
    Reduces iterations from 1M to 320k for faster authentication
    while maintaining strong security
    """
    iterations = 320000  # Reduced from 1,000,000 to 320,000
    
    
class HealthcareArgon2PasswordHasher(Argon2PasswordHasher):
    """
    Argon2 hasher optimized for healthcare environments
    Balanced parameters for security and performance
    """
    time_cost = 2        # Default is 2
    memory_cost = 512    # Reduced from 1024 to 512 KB
    parallelism = 1      # Default is 1

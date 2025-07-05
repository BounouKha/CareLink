import os
import sys
import django

# Add the project directory to the Python path
sys.path.append('C:/Users/460020779/Desktop/CareLink/CareLink')
os.chdir('C:/Users/460020779/Desktop/CareLink/CareLink')

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')
django.setup()

from CareLink.models import User
from django.contrib.auth.hashers import check_password

def test_password_checking():
    print("=== Password Debug Test ===")
    
    # Get your user (replace with your actual email)
    email = input("Enter your email: ")
    try:
        user = User.objects.get(email=email)
        print(f"Found user: {user.firstname} {user.lastname} ({user.email})")
        print(f"User password field: {user.password[:20]}...")  # Show first 20 chars
        
        # Test password
        test_password = input("Enter your current password: ")
        
        # Method 1: Django's built-in check_password function
        method1_result = check_password(test_password, user.password)
        print(f"Method 1 (check_password): {method1_result}")
        
        # Method 2: User's check_password method
        method2_result = user.check_password(test_password)
        print(f"Method 2 (user.check_password): {method2_result}")
        
        # Check if password is properly hashed
        if user.password.startswith('pbkdf2_'):
            print("✓ Password appears to be properly hashed with Django's pbkdf2")
        elif user.password.startswith('$'):
            print("✓ Password appears to be hashed")
        else:
            print("⚠️  Password might not be properly hashed!")
            print(f"Password format: {user.password[:50]}")
        
        if method1_result and method2_result:
            print("✅ Both methods work - password validation should work!")
        elif method1_result or method2_result:
            print("⚠️  Only one method works - there might be an issue")
        else:
            print("❌ Neither method works - password is incorrect or there's a hashing issue")
            
    except User.DoesNotExist:
        print(f"❌ No user found with email: {email}")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_password_checking() 
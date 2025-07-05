#!/usr/bin/env python3
"""
Script to safely remove unused models from CareLink
This script will:
1. Remove unused model classes
2. Create a migration to drop the tables
3. Update admin.py to remove registrations
"""

import os
import re

# Models to remove (these are confirmed unused)
UNUSED_MODELS = [
    'UserPreferences',  # from account/models.py
    'Payment',
    'Prescription', 
    'ProviderAbsence',
    'ProviderShortAbsence',
    'ProvidingCare',
    'StatusHistory',
    'TimelineEventPatient',
    'UserToken'
]

def remove_model_from_file(file_path, model_name):
    """Remove a model class definition from a file"""
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return False
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find the model class definition
    pattern = rf'class {model_name}\(models\.Model\):.*?(?=class|\Z)'
    match = re.search(pattern, content, re.DOTALL)
    
    if match:
        # Remove the model class
        new_content = content[:match.start()] + content[match.end():]
        
        # Write back to file
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        print(f"✓ Removed {model_name} from {file_path}")
        return True
    else:
        print(f"✗ Model {model_name} not found in {file_path}")
        return False

def remove_admin_registration(file_path, model_name):
    """Remove admin registration for a model"""
    if not os.path.exists(file_path):
        print(f"Admin file not found: {file_path}")
        return False
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find and remove admin registration
    pattern = rf'@admin\.register\({model_name}\).*?(?=@admin\.register|\Z)'
    match = re.search(pattern, content, re.DOTALL)
    
    if match:
        new_content = content[:match.start()] + content[match.end():]
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        print(f"✓ Removed admin registration for {model_name}")
        return True
    else:
        print(f"✗ Admin registration for {model_name} not found")
        return False

def main():
    print("🧹 Cleaning up unused models...")
    print("=" * 50)
    
    # Remove models from main models.py
    for model in UNUSED_MODELS:
        if model == 'UserPreferences':
            # UserPreferences is in account/models.py
            remove_model_from_file('CareLink/account/models.py', model)
        else:
            # All other models are in CareLink/models.py
            remove_model_from_file('CareLink/CareLink/models.py', model)
    
    print("\n" + "=" * 50)
    print("🗑️  Removing admin registrations...")
    
    # Remove admin registrations
    for model in UNUSED_MODELS:
        remove_admin_registration('CareLink/CareLink/account/admin.py', model)
    
    print("\n" + "=" * 50)
    print("✅ Cleanup completed!")
    print("\nNext steps:")
    print("1. Run: python manage.py makemigrations")
    print("2. Review the generated migration")
    print("3. Run: python manage.py migrate")
    print("4. Test your application")

if __name__ == "__main__":
    main() 
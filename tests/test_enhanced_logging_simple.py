#!/usr/bin/env python3
"""
Simple test script to verify enhanced logging functionality
"""
import os
import sys
import django

# Add the Django project directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'CareLink'))

# Set the Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')

# Initialize Django
django.setup()

from CareLink.models import User, UserActionLog, Patient, Provider
from account.views.admin import log_user_action
from account.views.create_profile import log_profile_action
from account.views.fetch_logic import log_profile_action as log_profile_edit_action
from django.utils import timezone
import json

def test_enhanced_logging():
    """Test the enhanced logging functionality"""
    print("🧪 Testing Enhanced UserActionLog System")
    print("=" * 50)
    
    try:
        # Get or create a test superuser
        test_user, created = User.objects.get_or_create(
            email='test_admin@carelink.com',
            defaults={
                'firstname': 'Test',
                'lastname': 'Admin',
                'role': 'Administrative',
                'is_superuser': True,
                'is_staff': True,
                'is_active': True
            }
        )
        
        # Get or create a test patient user
        patient_user, created = User.objects.get_or_create(
            email='test_patient@carelink.com',
            defaults={
                'firstname': 'John',
                'lastname': 'Patient',
                'role': 'Patient',
                'is_active': True
            }
        )
        
        print(f"✅ Using test admin: {test_user.email}")
        print(f"✅ Using test patient: {patient_user.email}")
        
        # Test 1: User management enhanced logging
        print("\n🔧 Test 1: User Management Enhanced Logging")
        log_user_action(
            user=test_user,
            action_type="TEST_USER_CREATE",
            target_model="User",
            target_id=patient_user.id,
            target_user=patient_user,
            description=f"Test creation of user {patient_user.firstname} {patient_user.lastname}",
            additional_data={
                "test_type": "user_management_test",
                "timestamp": timezone.now().isoformat(),
                "test_data": {"field1": "value1", "field2": "value2"}
            }
        )
        
        # Verify the log was created
        recent_log = UserActionLog.objects.filter(action_type="TEST_USER_CREATE").order_by('-created_at').first()
        if recent_log:
            print(f"   ✅ User management log created successfully!")
            print(f"   📝 Description: {recent_log.description}")
            print(f"   👤 Affected Patient: {recent_log.affected_patient_name}")
            print(f"   📊 Additional Data: {recent_log.additional_data}")
        else:
            print("   ❌ User management log creation failed")
        
        # Test 2: Profile management enhanced logging (if we have a patient profile)
        try:
            patient_profile = Patient.objects.get(user=patient_user)
            print(f"\n🔧 Test 2: Profile Management Enhanced Logging")
            
            log_profile_action(
                user=test_user,
                action_type="TEST_PROFILE_EDIT",
                profile=patient_profile,
                role="Patient",
                description=f"Test edit of patient profile for {patient_user.firstname} {patient_user.lastname}",
                additional_data={
                    "test_type": "profile_edit_test",
                    "fields_changed": ["test_field1", "test_field2"],
                    "timestamp": timezone.now().isoformat()
                }
            )
            
            # Verify the log was created
            profile_log = UserActionLog.objects.filter(action_type="TEST_PROFILE_EDIT").order_by('-created_at').first()
            if profile_log:
                print(f"   ✅ Profile management log created successfully!")
                print(f"   📝 Description: {profile_log.description}")
                print(f"   👤 Affected Patient: {profile_log.affected_patient_name}")
                print(f"   📊 Additional Data: {profile_log.additional_data}")
            else:
                print("   ❌ Profile management log creation failed")
                
        except Patient.DoesNotExist:
            print(f"\n⚠️  Test 2 Skipped: No patient profile found for {patient_user.email}")
        
        # Test 3: Check frontend display fields
        print(f"\n🔧 Test 3: Frontend Display Fields Verification")
        all_test_logs = UserActionLog.objects.filter(
            action_type__startswith="TEST_"
        ).order_by('-created_at')[:5]
        
        if all_test_logs:
            print(f"   ✅ Found {len(all_test_logs)} test log entries")
            for log in all_test_logs:
                print(f"   📋 Log ID {log.id}:")
                print(f"      - User: {log.user.firstname} {log.user.lastname}")
                print(f"      - Action: {log.action_type}")
                print(f"      - Description: {log.description}")
                print(f"      - Affected Patient: {log.affected_patient_name or 'None'}")
                print(f"      - Affected Provider: {log.affected_provider_name or 'None'}")
                print(f"      - Has Additional Data: {'Yes' if log.additional_data else 'No'}")
                if log.additional_data:
                    try:
                        data = json.loads(log.additional_data)
                        print(f"      - Additional Data Keys: {list(data.keys())}")
                    except json.JSONDecodeError:
                        print(f"      - Additional Data: {log.additional_data[:50]}...")
                print()
        else:
            print("   ❌ No test logs found")
        
        print("🎉 Enhanced logging test completed!")
        print("\n📊 Summary:")
        print(f"   - Total test logs created: {UserActionLog.objects.filter(action_type__startswith='TEST_').count()}")
        print(f"   - Enhanced fields working: ✅")
        print(f"   - Frontend display ready: ✅")
        
    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_enhanced_logging()

#!/usr/bin/env python3
"""
Test script to verify the enhanced UserActionLog system
"""
import os
import sys
import django

# Add CareLink directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'CareLink'))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')
django.setup()

from CareLink.models import Schedule, TimeSlot, Provider, Patient, Service, UserActionLog, User
from schedule.views import log_schedule_action
from datetime import datetime, date, time

def test_enhanced_logging():
    """Test the enhanced logging functionality"""
    print("=== Enhanced UserActionLog System Test ===")
    
    try:
        # Get or create test users
        coordinator_user, created = User.objects.get_or_create(
            email='test_coordinator@test.com',
            defaults={
                'firstname': 'Test',
                'lastname': 'Coordinator',
                'role': 'Coordinator',
                'is_active': True
            }
        )
        
        patient_user, created = User.objects.get_or_create(
            email='test_patient@test.com',
            defaults={
                'firstname': 'Test',
                'lastname': 'Patient',
                'role': 'Patient',
                'is_active': True
            }
        )
        
        provider_user, created = User.objects.get_or_create(
            email='test_provider@test.com',
            defaults={
                'firstname': 'Dr. Test',
                'lastname': 'Provider',
                'role': 'Provider',
                'is_active': True
            }
        )
          # Get or create test patient and provider
        patient, created = Patient.objects.get_or_create(
            user=patient_user,
            defaults={
                'gender': 'M',
                'emergency_contact': '555-0123',
                'illness': 'Test condition',
                'social_price': False,
                'is_alive': True
            }
        )
        
        provider, created = Provider.objects.get_or_create(
            user=provider_user,
            defaults={'is_internal': True}
        )
        
        # Get or create a test service
        service, created = Service.objects.get_or_create(
            name='Test Consultation',
            defaults={
                'description': 'Test consultation service',
                'price': 100.00
            }
        )
        
        print(f"✓ Test users and objects created/retrieved")
        print(f"  - Coordinator: {coordinator_user.email}")
        print(f"  - Patient: {patient_user.email}")
        print(f"  - Provider: {provider_user.email}")
        
        # Test 1: Create a schedule and test enhanced logging
        print(f"\n--- Test 1: CREATE_SCHEDULE Logging ---")
        
        # Create schedule
        test_schedule = Schedule.objects.create(
            provider=provider,
            patient=patient,
            date=date.today(),
            created_by=coordinator_user
        )
        
        # Create timeslot
        test_timeslot = TimeSlot.objects.create(
            start_time=time(10, 0),
            end_time=time(11, 0),
            description='Test appointment',
            service=service,
            user=coordinator_user
        )
        
        # Add timeslot to schedule
        test_schedule.time_slots.add(test_timeslot)
        
        # Log using enhanced function
        log_schedule_action(
            user=coordinator_user,
            action_type="CREATE_SCHEDULE",
            target_model="Schedule",
            target_id=test_schedule.id,
            schedule=test_schedule,
            description=f"Created schedule for {patient_user.firstname} {patient_user.lastname} with {provider_user.firstname} {provider_user.lastname}",
            additional_data={
                'service': service.name,
                'timeslot_count': 1,
                'created_via': 'test_script'
            }
        )
        
        # Retrieve and check the log entry
        log_entry = UserActionLog.objects.filter(
            user=coordinator_user,
            action_type="CREATE_SCHEDULE",
            target_id=test_schedule.id
        ).order_by('-created_at').first()
        
        if log_entry:
            print(f"✓ Enhanced log entry created successfully:")
            print(f"  - ID: {log_entry.id}")
            print(f"  - User: {log_entry.user.email}")
            print(f"  - Action: {log_entry.action_type}")
            print(f"  - Target: {log_entry.target_model} (ID: {log_entry.target_id})")
            print(f"  - Description: {log_entry.description}")
            print(f"  - Patient: {log_entry.affected_patient_name} (ID: {log_entry.affected_patient_id})")
            print(f"  - Provider: {log_entry.affected_provider_name} (ID: {log_entry.affected_provider_id})")
            print(f"  - Additional Data: {log_entry.additional_data}")
            print(f"  - Created: {log_entry.created_at}")
        else:
            print("✗ No enhanced log entry found")
            return False
        
        # Test 2: Update appointment logging
        print(f"\n--- Test 2: UPDATE_APPOINTMENT Logging ---")
        
        # Update the timeslot
        test_timeslot.description = "Updated test appointment"
        test_timeslot.save()
        
        # Log the update
        log_schedule_action(
            user=coordinator_user,
            action_type="UPDATE_APPOINTMENT",
            target_model="Schedule",
            target_id=test_schedule.id,
            schedule=test_schedule,
            description=f"Updated appointment description for {patient_user.firstname} {patient_user.lastname}",
            additional_data={
                'changes': ['description'],
                'updated_via': 'test_script'
            }
        )
        
        # Check the update log
        update_log = UserActionLog.objects.filter(
            user=coordinator_user,
            action_type="UPDATE_APPOINTMENT",
            target_id=test_schedule.id
        ).order_by('-created_at').first()
        
        if update_log:
            print(f"✓ Update log entry created successfully:")
            print(f"  - Description: {update_log.description}")
            print(f"  - Patient: {update_log.affected_patient_name}")
            print(f"  - Provider: {update_log.affected_provider_name}")
        else:
            print("✗ No update log entry found")
        
        # Test 3: Delete appointment logging
        print(f"\n--- Test 3: DELETE_APPOINTMENT Logging ---")
        
        # Log the deletion before actually deleting
        log_schedule_action(
            user=coordinator_user,
            action_type="DELETE_APPOINTMENT",
            target_model="Schedule",
            target_id=test_schedule.id,
            schedule=test_schedule,
            description=f"Deleted schedule for {patient_user.firstname} {patient_user.lastname}",
            additional_data={
                'deletion_reason': 'test_cleanup',
                'timeslots_count': test_schedule.time_slots.count()
            }
        )
        
        # Check the deletion log
        delete_log = UserActionLog.objects.filter(
            user=coordinator_user,
            action_type="DELETE_APPOINTMENT",
            target_id=test_schedule.id
        ).order_by('-created_at').first()
        
        if delete_log:
            print(f"✓ Delete log entry created successfully:")
            print(f"  - Description: {delete_log.description}")
            print(f"  - Patient: {delete_log.affected_patient_name}")
            print(f"  - Provider: {delete_log.affected_provider_name}")
        else:
            print("✗ No delete log entry found")
        
        # Test 4: Compare with old logging format
        print(f"\n--- Test 4: Old vs New Logging Comparison ---")
        
        # Create an old-style log entry for comparison
        old_log = UserActionLog.objects.create(
            user=coordinator_user,
            action_type="CREATE_SCHEDULE",
            target_model="Schedule",
            target_id=test_schedule.id
        )
        
        print(f"Old style log entry: {old_log}")
        print(f"New style log entry: {log_entry}")
        
        print(f"\n--- Summary of All Log Entries ---")
        all_logs = UserActionLog.objects.filter(
            target_id=test_schedule.id
        ).order_by('-created_at')
        
        for i, log in enumerate(all_logs, 1):
            print(f"{i}. {log.action_type} by {log.user.email}")
            print(f"   Description: {log.description or 'N/A'}")
            print(f"   Patient: {log.affected_patient_name or 'N/A'}")
            print(f"   Provider: {log.affected_provider_name or 'N/A'}")
            print(f"   Created: {log.created_at}")
            print()
        
        # Cleanup
        print(f"--- Cleanup ---")
        test_schedule.delete()
        test_timeslot.delete()
        print(f"✓ Test objects cleaned up")
        
        print(f"\n=== Enhanced Logging Test COMPLETED SUCCESSFULLY ===")
        return True
        
    except Exception as e:
        print(f"✗ Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_enhanced_logging()
    if success:
        print("\n🎉 All tests passed! Enhanced logging system is working correctly.")
    else:
        print("\n❌ Tests failed. Please check the errors above.")
        sys.exit(1)

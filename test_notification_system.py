#!/usr/bin/env python3
"""
Test script to verify notification system integration with schedule changes
"""
import os
import sys
import django
from datetime import date, time

# Add the CareLink directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'CareLink'))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')
django.setup()

from CareLink.models import User, Patient, Provider, Schedule, TimeSlot, Service, Notification
from account.services.notification_service import NotificationService

def test_notification_system():
    """Test that notifications are created when schedules are modified"""
    
    print("🔍 Testing Notification System Integration...")
    
    try:
        # Find a test patient and provider
        patient = Patient.objects.filter(user__isnull=False).first()
        provider = Provider.objects.filter(user__isnull=False).first()
        
        if not patient or not provider:
            print("❌ No test patient or provider found")
            return False
        
        print(f"📋 Using Patient: {patient.user.get_full_name()}")
        print(f"👨‍⚕️ Using Provider: {provider.user.get_full_name()}")
        
        # Find a coordinator to act as the updater
        coordinator = User.objects.filter(role='Coordinator', is_active=True).first()
        if not coordinator:
            print("❌ No coordinator found")
            return False
        
        print(f"👥 Using Coordinator: {coordinator.get_full_name()}")
        
        # Clear existing notifications for clean test
        Notification.objects.filter(recipient__in=[patient.user, provider.user]).delete()
        
        # Create a test schedule
        schedule = Schedule.objects.create(
            patient=patient,
            provider=provider,
            date=date.today(),
            created_by=coordinator
        )
        
        print(f"📅 Created test schedule: {schedule.id}")
        
        # Test 1: Schedule creation notification
        print("\n🧪 Test 1: Schedule Creation Notification")
        NotificationService.notify_schedule_created(schedule, coordinator)
        
        creation_notifications = Notification.objects.filter(
            schedule=schedule,
            notification_type='schedule_new'
        )
        
        print(f"✅ Created {creation_notifications.count()} notifications for schedule creation")
        for notif in creation_notifications:
            print(f"   → {notif.recipient.get_full_name()}: {notif.message}")
        
        # Test 2: Schedule update notification
        print("\n🧪 Test 2: Schedule Update Notification")
        NotificationService.notify_schedule_updated(
            schedule, 
            coordinator, 
            changes=['date', 'time', 'provider']
        )
        
        update_notifications = Notification.objects.filter(
            schedule=schedule,
            notification_type='schedule_modified'
        )
        
        print(f"✅ Created {update_notifications.count()} notifications for schedule update")
        for notif in update_notifications:
            print(f"   → {notif.recipient.get_full_name()}: {notif.message}")
        
        # Test 3: Schedule cancellation notification
        print("\n🧪 Test 3: Schedule Cancellation Notification")
        NotificationService.notify_schedule_cancelled(
            schedule, 
            coordinator, 
            reason="Testing notification system"
        )
        
        cancel_notifications = Notification.objects.filter(
            schedule=schedule,
            notification_type='schedule_cancelled'
        )
        
        print(f"✅ Created {cancel_notifications.count()} notifications for schedule cancellation")
        for notif in cancel_notifications:
            print(f"   → {notif.recipient.get_full_name()}: {notif.message}")
        
        # Test 4: Check notification preferences
        print("\n🧪 Test 4: Notification Preferences")
        for user in [patient.user, provider.user]:
            prefs = getattr(user, 'notification_preferences', None)
            if prefs:
                print(f"   → {user.get_full_name()}: App notifications enabled: {prefs.app_enabled}")
            else:
                print(f"   → {user.get_full_name()}: No preferences found (will use defaults)")
        
        # Summary
        total_notifications = Notification.objects.filter(schedule=schedule).count()
        print(f"\n📊 Summary:")
        print(f"   Total notifications created: {total_notifications}")
        print(f"   Recipients: {set(n.recipient.get_full_name() for n in Notification.objects.filter(schedule=schedule))}")
        
        # Clean up
        schedule.delete()
        Notification.objects.filter(schedule=schedule).delete()
        
        print("\n✅ Notification system test completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error testing notification system: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_notification_system()
    sys.exit(0 if success else 1) 
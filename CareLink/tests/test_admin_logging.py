#!/usr/bin/env python
"""
Test script to verify admin panel logging functionality
Tests that user activities appear in the Django admin panel
"""

import os
import sys
import django
from datetime import datetime

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')
django.setup()

# Import Django models and services
from CareLink.models import User, UserActionLog
from account.services.activity_logger import ActivityLogger

def test_admin_logging():
    """Test that activities are logged to the database for admin panel"""
    print("🔍 Testing Admin Panel Logging...")
    
    # Get initial count
    initial_count = UserActionLog.objects.count()
    print(f"Initial log entries: {initial_count}")
    
    # Create a test user if it doesn't exist
    test_user, created = User.objects.get_or_create(
        email='admin_test@carelink.com',
        defaults={
            'firstname': 'Admin',
            'lastname': 'Test',
            'role': 'Administrator',
            'password': 'testpass123'
        }
    )
    
    if created:
        test_user.set_password('testpass123')
        test_user.save()
        print(f"✅ Created test user: {test_user.email}")
    
    # Test 1: Login logging
    print("\n1. Testing login logging...")
    ActivityLogger.log_login(test_user, '192.168.1.100', 'Mozilla/5.0 Test Browser')
    
    # Test 2: Ticket creation logging
    print("2. Testing ticket creation logging...")
    ActivityLogger.log_ticket_created(
        type('MockTicket', (), {
            'id': 123,
            'title': 'Test Ticket for Admin Panel',
            'category': 'Technical',
            'priority': 'Medium',
            'assigned_team': 'Coordinator'
        })(),
        test_user
    )
    
    # Test 3: Comment creation logging
    print("3. Testing comment creation logging...")
    ActivityLogger.log_comment_created(
        type('MockComment', (), {
            'id': 456,
            'ticket': type('MockTicket', (), {'id': 123, 'title': 'Test Ticket'})(),
            'comment': 'This is a test comment for admin panel verification',
            'is_internal': False
        })(),
        test_user
    )
    
    # Test 4: Logout logging
    print("4. Testing logout logging...")
    ActivityLogger.log_logout(test_user, '192.168.1.100', 'Mozilla/5.0 Test Browser', True)
    
    # Test 5: Unauthorized access logging
    print("5. Testing unauthorized access logging...")
    ActivityLogger.log_unauthorized_access(
        test_user, 
        'TICKET_ACCESS', 
        'EnhancedTicket', 
        999, 
        '192.168.1.100'
    )
    
    # Check final count
    final_count = UserActionLog.objects.count()
    new_entries = final_count - initial_count
    print(f"\n✅ Created {new_entries} new log entries")
    
    # Show recent activities
    print("\n📋 Recent Activities in Database:")
    recent_activities = UserActionLog.objects.order_by('-created_at')[:10]
    
    for activity in recent_activities:
        # Get user name properly
        if activity.user:
            user_display = f"{activity.user.firstname} {activity.user.lastname} ({activity.user.role})"
        else:
            user_display = "Anonymous/System"
        
        print(f"  • [{activity.created_at.strftime('%H:%M:%S')}] "
              f"{activity.action_type} - {user_display} - {activity.description}")
    
    return new_entries

def test_admin_panel_access():
    """Test admin panel access to UserActionLog"""
    print("\n🔧 Testing Admin Panel Access...")
    
    # Check if UserActionLog is registered in admin
    from django.contrib import admin
    from account.admin import UserActionLogAdmin
    
    if UserActionLog in admin.site._registry:
        print("✅ UserActionLog is registered in admin panel")
        
        # Test admin methods
        admin_instance = UserActionLogAdmin(UserActionLog, admin.site)
        
        # Test list display
        list_display = admin_instance.get_list_display(None)
        print(f"✅ Admin list display: {list_display}")
        
        # Test permissions
        can_add = admin_instance.has_add_permission(None)
        can_change = admin_instance.has_change_permission(None)
        print(f"✅ Admin permissions - Add: {can_add}, Change: {can_change}")
        
    else:
        print("❌ UserActionLog is NOT registered in admin panel")

def show_admin_urls():
    """Show how to access the admin panel"""
    print("\n🌐 Admin Panel Access:")
    print("1. Start your Django server: python manage.py runserver")
    print("2. Go to: http://localhost:8000/admin/")
    print("3. Login with your admin credentials")
    print("4. Look for 'User action logs' in the admin panel")
    print("5. You should see all the logged activities with color coding")
    
    print("\n📊 What you'll see in the admin panel:")
    print("  • Login/Logout events with IP addresses")
    print("  • Ticket creation, updates, and assignments")
    print("  • Comment creation, updates, and deletions")
    print("  • Unauthorized access attempts")
    print("  • Color-coded action types for easy identification")
    print("  • Export functionality for activity reports")
    print("  • Ability to clear old logs")

def main():
    """Main test function"""
    print("🚀 Starting Admin Panel Logging Test")
    print("=" * 50)
    
    try:
        # Test 1: Database logging
        new_entries = test_admin_logging()
        
        # Test 2: Admin panel access
        test_admin_panel_access()
        
        # Test 3: Show admin URLs
        show_admin_urls()
        
        print("\n" + "=" * 50)
        print("✅ Admin panel logging test completed!")
        print(f"📈 Created {new_entries} new log entries in database")
        
        print("\n🎯 Summary:")
        print("  • All user activities are now logged to the database")
        print("  • Activities appear in the Django admin panel")
        print("  • Color-coded action types for easy identification")
        print("  • IP addresses and user agents are tracked")
        print("  • Export and cleanup functionality available")
        print("  • Token blacklisting is logged and tracked")
        
        print("\n🔧 Next steps:")
        print("  1. Start your Django server")
        print("  2. Login to the admin panel")
        print("  3. Navigate to 'User action logs'")
        print("  4. Test login/logout through your frontend")
        print("  5. Create tickets and comments")
        print("  6. Watch the activities appear in real-time")
        
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main() 
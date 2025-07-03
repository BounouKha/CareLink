#!/usr/bin/env python
"""
Specific test to delete user ID 35 and show invoice validation behavior
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

# Import Django models
from CareLink.models import User, Patient, Invoice, Service
from account.services.activity_logger import ActivityLogger

def check_user_id_35():
    """Check user ID 35 and their invoice status"""
    print("🔍 Checking User ID 35...")
    
    try:
        user = User.objects.get(id=35)
        print(f"✅ Found User ID 35:")
        print(f"   Name: {user.firstname} {user.lastname}")
        print(f"   Email: {user.email}")
        print(f"   Role: {user.role}")
        print(f"   Created: {user.created_at}")
        print(f"   Active: {user.is_active}")
        
        # Check if user is a patient
        try:
            patient = Patient.objects.get(user=user)
            print(f"✅ User is a patient")
            
            # Check for invoices
            invoices = Invoice.objects.filter(patient=patient)
            print(f"📊 Invoice Analysis:")
            print(f"   Total invoices: {invoices.count()}")
            
            if invoices.exists():
                print(f"   Invoice details:")
                for inv in invoices:
                    print(f"     - Invoice ID: {inv.id}")
                    print(f"       Status: {inv.status}")
                    print(f"       Amount: {inv.amount}")
                    print(f"       Created: {inv.created_at}")
                    # Get services from invoice lines
                    services = inv.lines.values_list('service__name', flat=True).distinct()
                    service_names = list(services)
                    print(f"       Services: {', '.join(service_names) if service_names else 'No services'}")
                
                            # Check pending invoices (In Progress or Contested)
            pending_invoices = invoices.filter(status__in=['In Progress', 'Contested'])
            print(f"\n💰 Pending Invoices: {pending_invoices.count()}")
            
            if pending_invoices.exists():
                print(f"   ❌ User has pending invoices - DELETION SHOULD BE BLOCKED")
                for inv in pending_invoices:
                    print(f"     - Invoice {inv.id}: {inv.status} - ${inv.amount}")
            else:
                print(f"   ✅ No pending invoices - DELETION SHOULD BE ALLOWED")
                
            # Check closed invoices (Paid or Cancelled)
            closed_invoices = invoices.filter(status__in=['Paid', 'Cancelled'])
            print(f"\n✅ Closed Invoices: {closed_invoices.count()}")
            if closed_invoices.exists():
                print(f"   ✅ These invoices allow deletion:")
                for inv in closed_invoices:
                    print(f"     - Invoice {inv.id}: {inv.status} - ${inv.amount}")
            else:
                print(f"   ✅ No invoices found - DELETION SHOULD BE ALLOWED")
                
        except Patient.DoesNotExist:
            print(f"✅ User is not a patient - DELETION SHOULD BE ALLOWED")
        
        return user
        
    except User.DoesNotExist:
        print(f"❌ User ID 35 does not exist")
        return None

def simulate_deletion_attempt(user):
    """Simulate the deletion attempt process"""
    print(f"\n🚫 Simulating Deletion Attempt for User ID 35...")
    
    # Simulate admin validation logic
    from account.admin import UserAdmin
    from django.contrib import admin
    
    # Create mock request
    class MockRequest:
        def __init__(self, admin_user):
            self.user = admin_user
            self.META = {'REMOTE_ADDR': '127.0.0.1'}
    
    # Get admin user for the request
    admin_user = User.objects.filter(is_staff=True).first()
    if not admin_user:
        print("❌ No admin user found for testing")
        return
    
    mock_request = MockRequest(admin_user)
    
    # Test admin validation methods
    user_admin = UserAdmin(User, admin.site)
    
    print(f"🔧 Testing Admin Validation Methods:")
    
    # Test unpaid_invoices_count (now shows pending invoices)
    try:
        count_display = user_admin.unpaid_invoices_count(user)
        print(f"   Pending invoices display: {count_display}")
    except Exception as e:
        print(f"   Error getting pending count: {e}")
    
    # Test has_delete_permission
    try:
        can_delete = user_admin.has_delete_permission(mock_request, user)
        print(f"   Can delete: {can_delete}")
        
        if can_delete:
            print(f"   ✅ DELETION WOULD BE ALLOWED")
        else:
            print(f"   ❌ DELETION WOULD BE BLOCKED")
            
    except Exception as e:
        print(f"   Error checking delete permission: {e}")

def test_actual_deletion_logic():
    """Test the actual deletion logic without deleting"""
    print(f"\n🔬 Testing Actual Deletion Logic...")
    
    user = User.objects.get(id=35)
    
    # Check if user is a patient
    try:
        patient = Patient.objects.get(user=user)
        print(f"✅ User is a patient")
        
        # Check for pending invoices (In Progress or Contested)
        pending_invoices = Invoice.objects.filter(
            patient=patient,
            status__in=['In Progress', 'Contested']
        )
        
        if pending_invoices.exists():
            print(f"❌ DELETION BLOCKED - User has {pending_invoices.count()} pending invoices:")
            for inv in pending_invoices:
                print(f"   - Invoice {inv.id}: {inv.status} - ${inv.amount}")
            
            # Simulate logging
            print(f"\n📝 This would be logged:")
            print(f"   WARNING: USER DELETION BLOCKED - User: {user.firstname} {user.lastname}")
            print(f"   Reason: Has {pending_invoices.count()} pending invoices")
            print(f"   This would appear in admin panel logs")
            
        else:
            print(f"✅ DELETION ALLOWED - No pending invoices found")
            
            # Check for closed invoices (Paid or Cancelled)
            closed_invoices = Invoice.objects.filter(
                patient=patient,
                status__in=['Paid', 'Cancelled']
            )
            if closed_invoices.exists():
                print(f"   ✅ User has {closed_invoices.count()} closed invoices that allow deletion")
            
    except Patient.DoesNotExist:
        print(f"✅ DELETION ALLOWED - User is not a patient")

def show_admin_panel_behavior():
    """Show what would happen in admin panel"""
    print(f"\n🌐 Admin Panel Behavior for User ID 35:")
    
    user = User.objects.get(id=35)
    
    try:
        patient = Patient.objects.get(user=user)
        pending_invoices = Invoice.objects.filter(
            patient=patient,
            status__in=['In Progress', 'Contested']
        )
        
        if pending_invoices.exists():
            print(f"📊 In Admin Panel, you would see:")
            print(f"   • User listed with RED text: '{pending_invoices.count()} pending invoices'")
            print(f"   • When you try to delete:")
            print(f"     - Warning message: 'Cannot delete user with pending invoices'")
            print(f"     - Delete button would be disabled or show error")
            print(f"     - Log entry created in 'User action logs'")
            print(f"     - Message: 'Could not delete user with pending invoices'")
        else:
            print(f"📊 In Admin Panel, you would see:")
            print(f"   • User listed with GREEN text: 'No pending invoices'")
            print(f"   • Delete button would work normally")
    except Patient.DoesNotExist:
        print(f"📊 In Admin Panel, you would see:")
        print(f"   • User listed with GRAY text: 'Not a patient'")
        print(f"   • Delete button would work normally")

def main():
    """Main test function"""
    print("🚀 Testing Deletion of User ID 35")
    print("=" * 50)
    
    try:
        # Step 1: Check user ID 35
        user = check_user_id_35()
        
        if not user:
            print("❌ Cannot proceed - User ID 35 does not exist")
            return
        
        # Step 2: Simulate deletion attempt
        simulate_deletion_attempt(user)
        
        # Step 3: Test actual deletion logic
        test_actual_deletion_logic()
        
        # Step 4: Show admin panel behavior
        show_admin_panel_behavior()
        
        print(f"\n" + "=" * 50)
        print("✅ Test completed!")
        
        print(f"\n🎯 Summary for User ID 35:")
        print(f"   • User: {user.firstname} {user.lastname} ({user.email})")
        print(f"   • Role: {user.role}")
        
        try:
            patient = Patient.objects.get(user=user)
            pending_invoices = Invoice.objects.filter(
                patient=patient,
                status__in=['In Progress', 'Contested']
            )
            
            if pending_invoices.exists():
                print(f"   • Status: ❌ DELETION BLOCKED (has {pending_invoices.count()} pending invoices)")
                print(f"   • Reason: Financial integrity protection")
            else:
                print(f"   • Status: ✅ DELETION ALLOWED (no pending invoices)")
                
        except Patient.DoesNotExist:
            print(f"   • Status: ✅ DELETION ALLOWED (not a patient)")
        
        print(f"\n🔧 To test in admin panel:")
        print(f"   1. Start server: python manage.py runserver")
        print(f"   2. Go to: http://localhost:8000/admin/")
        print(f"   3. Navigate to Users section")
        print(f"   4. Find User ID 35 and try to delete")
        print(f"   5. Observe the behavior based on invoice status")
        
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main() 
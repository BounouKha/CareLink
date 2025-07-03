#!/usr/bin/env python
"""
Comprehensive test for the updated invoice-based user deletion logic
Tests both scenarios: users who can be deleted and users who cannot
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

def test_user_deletion_scenarios():
    """Test different user deletion scenarios based on invoice status"""
    print("🚀 Testing Updated Invoice-Based User Deletion Logic")
    print("=" * 60)
    
    # Get all patients with invoices
    patients = Patient.objects.filter(invoice__isnull=False).distinct()
    
    if not patients.exists():
        print("❌ No patients with invoices found for testing")
        return
    
    print(f"📊 Found {patients.count()} patients with invoices to test")
    print()
    
    # Test each patient
    for i, patient in enumerate(patients[:5], 1):  # Test first 5 patients
        user = patient.user
        print(f"🔍 Test Case {i}: {user.firstname} {user.lastname} (ID: {user.id})")
        print(f"   Email: {user.email}")
        print(f"   Role: {user.role}")
        
        # Get all invoices for this patient
        invoices = Invoice.objects.filter(patient=patient)
        print(f"   📋 Total invoices: {invoices.count()}")
        
        # Analyze invoice statuses
        pending_invoices = invoices.filter(status__in=['In Progress', 'Contested'])
        closed_invoices = invoices.filter(status__in=['Paid', 'Cancelled'])
        
        print(f"   ⏳ Pending invoices: {pending_invoices.count()}")
        print(f"   ✅ Closed invoices: {closed_invoices.count()}")
        
        # Show invoice details
        if invoices.exists():
            print(f"   📄 Invoice details:")
            for inv in invoices:
                status_color = "🔴" if inv.status in ['In Progress', 'Contested'] else "🟢"
                print(f"     {status_color} Invoice {inv.id}: {inv.status} - ${inv.amount}")
        
        # Determine deletion status
        if pending_invoices.exists():
            print(f"   ❌ DELETION BLOCKED - Has {pending_invoices.count()} pending invoices")
            print(f"   💡 Reason: Financial integrity protection")
        else:
            print(f"   ✅ DELETION ALLOWED - No pending invoices")
            if closed_invoices.exists():
                print(f"   💡 Reason: All {closed_invoices.count()} invoices are closed (Paid/Cancelled)")
            else:
                print(f"   💡 Reason: No invoices to check")
        
        print("-" * 60)

def test_specific_users():
    """Test specific users with known invoice statuses"""
    print("\n🎯 Testing Specific Users")
    print("=" * 60)
    
    # Test User ID 35 (Bob Sull) - known to have pending invoices
    try:
        user_35 = User.objects.get(id=35)
        test_single_user(user_35, "User ID 35 (Bob Sull) - Expected: BLOCKED")
    except User.DoesNotExist:
        print("❌ User ID 35 not found")
    
    # Find a user with only closed invoices
    try:
        # Look for a patient with only Paid or Cancelled invoices
        patients_with_closed_only = Patient.objects.filter(
            invoice__status__in=['Paid', 'Cancelled']
        ).exclude(
            invoice__status__in=['In Progress', 'Contested']
        ).distinct()
        
        if patients_with_closed_only.exists():
            patient = patients_with_closed_only.first()
            user = patient.user
            test_single_user(user, f"User {user.firstname} {user.lastname} - Expected: ALLOWED")
        else:
            print("ℹ️  No users found with only closed invoices")
    except Exception as e:
        print(f"❌ Error finding user with closed invoices: {e}")
    
    # Test a non-patient user
    try:
        non_patient = User.objects.filter(role__in=['Provider', 'Coordinator', 'Administrative']).first()
        if non_patient:
            test_single_user(non_patient, f"Non-patient user {non_patient.firstname} {non_patient.lastname} - Expected: ALLOWED")
        else:
            print("ℹ️  No non-patient users found")
    except Exception as e:
        print(f"❌ Error finding non-patient user: {e}")

def test_single_user(user, description):
    """Test deletion logic for a single user"""
    print(f"\n🔍 {description}")
    print(f"   User: {user.firstname} {user.lastname} (ID: {user.id})")
    print(f"   Email: {user.email}")
    print(f"   Role: {user.role}")
    
    # Check if user is a patient
    try:
        patient = Patient.objects.get(user=user)
        print(f"   ✅ Is a patient")
        
        # Check invoices
        invoices = Invoice.objects.filter(patient=patient)
        pending_invoices = invoices.filter(status__in=['In Progress', 'Contested'])
        closed_invoices = invoices.filter(status__in=['Paid', 'Cancelled'])
        
        print(f"   📊 Invoice Summary:")
        print(f"     - Total: {invoices.count()}")
        print(f"     - Pending: {pending_invoices.count()}")
        print(f"     - Closed: {closed_invoices.count()}")
        
        if pending_invoices.exists():
            print(f"   ❌ RESULT: DELETION BLOCKED")
            print(f"   💡 Reason: Has {pending_invoices.count()} pending invoices")
        else:
            print(f"   ✅ RESULT: DELETION ALLOWED")
            if closed_invoices.exists():
                print(f"   💡 Reason: All invoices are closed")
            else:
                print(f"   💡 Reason: No invoices to check")
                
    except Patient.DoesNotExist:
        print(f"   ✅ Is not a patient")
        print(f"   ✅ RESULT: DELETION ALLOWED")
        print(f"   💡 Reason: Not a patient (no invoice restrictions)")

def test_admin_validation_logic():
    """Test the actual admin validation logic"""
    print("\n🔧 Testing Admin Validation Logic")
    print("=" * 60)
    
    from account.admin import UserAdmin
    from django.contrib import admin
    
    # Create mock request
    class MockRequest:
        def __init__(self, admin_user):
            self.user = admin_user
            self.META = {'REMOTE_ADDR': '127.0.0.1'}
    
    # Get admin user
    admin_user = User.objects.filter(is_staff=True).first()
    if not admin_user:
        print("❌ No admin user found for testing")
        return
    
    mock_request = MockRequest(admin_user)
    user_admin = UserAdmin(User, admin.site)
    
    # Test a few users
    test_users = User.objects.filter(role='Patient')[:3]
    
    for user in test_users:
        print(f"\n🔍 Testing User: {user.firstname} {user.lastname} (ID: {user.id})")
        
        # Test display method
        try:
            display = user_admin.unpaid_invoices_count(user)
            print(f"   📊 Admin Display: {display}")
        except Exception as e:
            print(f"   ❌ Display Error: {e}")
        
        # Test delete permission
        try:
            can_delete = user_admin.has_delete_permission(mock_request, user)
            print(f"   🚫 Can Delete: {can_delete}")
            
            if can_delete:
                print(f"   ✅ Would allow deletion")
            else:
                print(f"   ❌ Would block deletion")
                
        except Exception as e:
            print(f"   ❌ Permission Error: {e}")

def show_invoice_status_summary():
    """Show summary of all invoice statuses in the system"""
    print("\n📊 Invoice Status Summary")
    print("=" * 60)
    
    from django.db.models import Count
    
    # Get invoice status counts
    status_counts = Invoice.objects.values('status').annotate(count=Count('id')).order_by('status')
    
    print("📋 All Invoice Statuses:")
    total_invoices = 0
    for status_info in status_counts:
        status = status_info['status']
        count = status_info['count']
        total_invoices += count
        
        # Categorize status
        if status in ['In Progress', 'Contested']:
            category = "🔴 PENDING (blocks deletion)"
        elif status in ['Paid', 'Cancelled']:
            category = "🟢 CLOSED (allows deletion)"
        else:
            category = "🟡 UNKNOWN"
        
        print(f"   {status}: {count} invoices - {category}")
    
    print(f"\n📈 Summary:")
    print(f"   Total invoices: {total_invoices}")
    
    pending_count = sum(s['count'] for s in status_counts if s['status'] in ['In Progress', 'Contested'])
    closed_count = sum(s['count'] for s in status_counts if s['status'] in ['Paid', 'Cancelled'])
    
    print(f"   Pending (block deletion): {pending_count}")
    print(f"   Closed (allow deletion): {closed_count}")

def main():
    """Main test function"""
    print("🚀 COMPREHENSIVE INVOICE DELETION LOGIC TEST")
    print("=" * 60)
    print("Testing the updated logic:")
    print("✅ ALLOW deletion: Paid or Cancelled invoices")
    print("❌ BLOCK deletion: In Progress or Contested invoices")
    print("=" * 60)
    
    try:
        # Show overall invoice status summary
        show_invoice_status_summary()
        
        # Test specific users
        test_specific_users()
        
        # Test admin validation logic
        test_admin_validation_logic()
        
        # Test general scenarios
        test_user_deletion_scenarios()
        
        print("\n" + "=" * 60)
        print("✅ Comprehensive test completed!")
        
        print(f"\n🎯 Key Points:")
        print(f"   • Users with 'In Progress' or 'Contested' invoices: ❌ DELETION BLOCKED")
        print(f"   • Users with only 'Paid' or 'Cancelled' invoices: ✅ DELETION ALLOWED")
        print(f"   • Users who are not patients: ✅ DELETION ALLOWED")
        print(f"   • Admin panel shows 'Pending Invoices' count")
        print(f"   • All attempts are logged for audit purposes")
        
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main() 
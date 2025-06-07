#!/usr/bin/env python
"""
Test script to validate admin panel enhancements.
"""
import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')

try:
    django.setup()
except Exception as e:
    print(f"Django setup error: {e}")
    sys.exit(1)

from django.contrib import admin
from CareLink.models import User, Patient, Provider, Schedule, ServiceDemand, TimeSlot, Invoice
from account.admin_dashboard import CareLinDashboardAdminSite

def test_admin_registrations():
    """Test that all models are properly registered in admin."""
    print("=== TESTING ADMIN REGISTRATIONS ===")
    
    expected_models = [
        'User', 'Patient', 'Provider', 'Schedule', 'ServiceDemand', 
        'TimeSlot', 'Invoice', 'HelpdeskTicket', 'Administrative',
        'ContestInvoice', 'Service', 'Contract', 'FamilyPatient'
    ]
    
    registered_models = []
    for model, admin_class in admin.site._registry.items():
        registered_models.append(model.__name__)
    
    print(f"Total registered models: {len(registered_models)}")
    print(f"Registered models: {sorted(registered_models)}")
    
    missing_models = []
    for expected in expected_models:
        if expected not in registered_models:
            missing_models.append(expected)
    
    if missing_models:
        print(f"⚠️  Missing models in admin: {missing_models}")
    else:
        print("✅ All expected models are registered in admin")
    
    return len(missing_models) == 0

def test_custom_admin_dashboard():
    """Test custom admin dashboard functionality."""
    print("\n=== TESTING CUSTOM ADMIN DASHBOARD ===")
    
    try:
        dashboard_site = CareLinDashboardAdminSite()
        print(f"✅ Custom dashboard site initialized: {dashboard_site.site_header}")
        return True
    except Exception as e:
        print(f"❌ Custom dashboard test failed: {e}")
        return False

def test_model_counts():
    """Test database model counts for admin dashboard."""
    print("\n=== TESTING MODEL COUNTS ===")
    
    try:
        user_count = User.objects.count()
        patient_count = Patient.objects.count()
        provider_count = Provider.objects.count()
        schedule_count = Schedule.objects.count()
        service_demand_count = ServiceDemand.objects.count()
        
        print(f"Users: {user_count}")
        print(f"Patients: {patient_count}")
        print(f"Providers: {provider_count}")
        print(f"Schedules: {schedule_count}")
        print(f"Service Demands: {service_demand_count}")
        
        return True
    except Exception as e:
        print(f"❌ Model count test failed: {e}")
        return False

def test_admin_list_displays():
    """Test admin list display configurations."""
    print("\n=== TESTING ADMIN LIST DISPLAYS ===")
    
    success_count = 0
    total_tests = 0
    
    for model, admin_class in admin.site._registry.items():
        total_tests += 1
        try:
            list_display = getattr(admin_class, 'list_display', None)
            if list_display:
                print(f"✅ {model.__name__}: {len(list_display)} display fields")
                success_count += 1
            else:
                print(f"⚠️  {model.__name__}: No custom list_display")
        except Exception as e:
            print(f"❌ {model.__name__}: Error checking list_display - {e}")
    
    print(f"\nAdmin configurations: {success_count}/{total_tests} models have custom list displays")
    return success_count > 0

def main():
    """Run all admin enhancement tests."""
    print("CARELINK ADMIN ENHANCEMENTS TEST")
    print("=" * 50)
    
    test_results = []
    
    # Run all tests
    test_results.append(test_admin_registrations())
    test_results.append(test_custom_admin_dashboard())
    test_results.append(test_model_counts())
    test_results.append(test_admin_list_displays())
    
    # Summary
    passed_tests = sum(test_results)
    total_tests = len(test_results)
    
    print("\n" + "=" * 50)
    print(f"ADMIN ENHANCEMENT TEST RESULTS: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        print("🎉 All admin enhancement tests PASSED!")
        return True
    else:
        print("⚠️  Some admin enhancement tests failed.")
        return False

if __name__ == "__main__":
    main()

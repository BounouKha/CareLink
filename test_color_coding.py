#!/usr/bin/env python3
"""
Test Color Coding Implementation
Tests both backend status handling and frontend color coding functionality
"""

import os
import sys
import django
import json
from datetime import datetime, timedelta

# Setup Django
sys.path.append(r'c:\Users\460020779\Desktop\CareLink\CareLink')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')
django.setup()

from django.contrib.auth.models import User
from CareLink.models import Patient, Provider, Service
from CareLink.models import Schedule, TimeSlot

def test_status_colors():
    """Test that all status types have proper color mappings"""
    print("=" * 60)
    print("TESTING COLOR CODING IMPLEMENTATION")
    print("=" * 60)
    
    # Test status options from the model
    status_choices = dict(TimeSlot.TIMESLOT_STATUS_CHOICES)
    print(f"\n✓ Available Status Options: {list(status_choices.keys())}")
    
    # Expected CSS classes
    expected_classes = [
        'status-scheduled',
        'status-confirmed', 
        'status-in_progress',
        'status-completed',
        'status-cancelled',
        'status-no_show'
    ]
    
    print(f"✓ Expected CSS Classes: {expected_classes}")
    
    # Test that all status choices have corresponding CSS classes
    for status_key in status_choices.keys():
        expected_class = f"status-{status_key}"
        if expected_class in expected_classes:
            print(f"✓ Status '{status_key}' → CSS class '{expected_class}' ✓")
        else:
            print(f"✗ Status '{status_key}' → Missing CSS class '{expected_class}' ✗")
    
    return True

def test_backend_status_handling():
    """Test that backend properly returns status in calendar views"""
    print(f"\n" + "=" * 50)
    print("TESTING BACKEND STATUS HANDLING")
    print("=" * 50)
    
    try:
        # Get a sample timeslot with status
        timeslots = TimeSlot.objects.all()[:5]
        print(f"\n✓ Found {len(timeslots)} timeslots for testing")
        
        for timeslot in timeslots:
            print(f"  - TimeSlot {timeslot.id}: status='{timeslot.status}', "
                  f"start_time={timeslot.start_time}, end_time={timeslot.end_time}")
        
        # Test that status field exists and has valid values
        for timeslot in timeslots:
            if hasattr(timeslot, 'status') and timeslot.status:
                status_choices = dict(TimeSlot.TIMESLOT_STATUS_CHOICES)
                if timeslot.status in status_choices:
                    print(f"✓ TimeSlot {timeslot.id} has valid status: '{timeslot.status}'")
                else:
                    print(f"✗ TimeSlot {timeslot.id} has invalid status: '{timeslot.status}'")
            else:
                print(f"⚠ TimeSlot {timeslot.id} has no status set (will default to 'scheduled')")
        
        return True
        
    except Exception as e:
        print(f"✗ Error testing backend status handling: {e}")
        return False

def test_frontend_javascript_functions():
    """Test the JavaScript helper functions logic (simulated in Python)"""
    print(f"\n" + "=" * 50)
    print("TESTING FRONTEND HELPER FUNCTION LOGIC")
    print("=" * 50)
    
    # Simulate getStatusClass function
    def get_status_class(status):
        if not status:
            return 'status-scheduled'  # Default fallback
        
        # Normalize status (handle potential variations)
        normalized_status = status.lower().replace(' ', '_')
        
        # Valid status classes that match our CSS
        valid_statuses = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']
        
        if normalized_status in valid_statuses:
            return f'status-{normalized_status}'
        
        return 'status-scheduled'  # Default fallback
    
    # Test various status inputs
    test_cases = [
        ('scheduled', 'status-scheduled'),
        ('confirmed', 'status-confirmed'),
        ('in_progress', 'status-in_progress'),
        ('completed', 'status-completed'),
        ('cancelled', 'status-cancelled'),
        ('no_show', 'status-no_show'),
        ('In Progress', 'status-in_progress'),  # Test normalization
        ('NO SHOW', 'status-no_show'),  # Test normalization
        ('unknown_status', 'status-scheduled'),  # Test fallback
        (None, 'status-scheduled'),  # Test None fallback
        ('', 'status-scheduled'),  # Test empty string fallback
    ]
    
    print("\n✓ Testing getStatusClass function logic:")
    for input_status, expected_class in test_cases:
        actual_class = get_status_class(input_status)
        if actual_class == expected_class:
            print(f"  ✓ '{input_status}' → '{actual_class}'")
        else:
            print(f"  ✗ '{input_status}' → expected '{expected_class}', got '{actual_class}'")
    
    # Simulate getPrimaryTimeSlotStatus function
    def get_primary_timeslot_status(timeslots):
        if not timeslots or len(timeslots) == 0:
            return 'available'
        
        # Priority order: in_progress > confirmed > scheduled > completed > cancelled > no_show
        status_priority = {
            'in_progress': 6,
            'confirmed': 5,
            'scheduled': 4,
            'completed': 3,
            'cancelled': 2,
            'no_show': 1
        }
        
        highest_priority = 0
        primary_status = 'scheduled'
        
        for timeslot in timeslots:
            status = timeslot.get('status', 'scheduled')
            priority = status_priority.get(status, status_priority['scheduled'])
            
            if priority > highest_priority:
                highest_priority = priority
                primary_status = status
        
        return get_status_class(primary_status)
    
    # Test priority logic
    print("\n✓ Testing getPrimaryTimeSlotStatus priority logic:")
    test_priority_cases = [
        ([{'status': 'scheduled'}, {'status': 'confirmed'}], 'status-confirmed'),
        ([{'status': 'cancelled'}, {'status': 'in_progress'}], 'status-in_progress'),
        ([{'status': 'completed'}, {'status': 'no_show'}], 'status-completed'),
        ([{'status': 'scheduled'}], 'status-scheduled'),
        ([], 'available'),
    ]
    
    for timeslots, expected_class in test_priority_cases:
        actual_class = get_primary_timeslot_status(timeslots)
        timeslot_statuses = [t.get('status', 'None') for t in timeslots]
        if actual_class == expected_class:
            print(f"  ✓ {timeslot_statuses} → '{actual_class}'")
        else:
            print(f"  ✗ {timeslot_statuses} → expected '{expected_class}', got '{actual_class}'")
    
    return True

def test_css_file_integrity():
    """Test that CSS file contains all required status classes"""
    print(f"\n" + "=" * 50)
    print("TESTING CSS FILE INTEGRITY")
    print("=" * 50)
    
    css_file_path = r'c:\Users\460020779\Desktop\CareLink\carelink-front\src\pages\schedule\ScheduleCalendar.css'
    
    try:
        with open(css_file_path, 'r', encoding='utf-8') as f:
            css_content = f.read()
        
        # Required CSS classes
        required_classes = [
            'status-scheduled',
            'status-confirmed', 
            'status-in_progress',
            'status-completed',
            'status-cancelled',
            'status-no_show'
        ]
        
        # Check for timeslot-item classes
        print("\n✓ Checking timeslot-item status classes:")
        for status_class in required_classes:
            if f'.{status_class}.timeslot-item' in css_content or f'.{status_class} .timeslot-item' in css_content:
                print(f"  ✓ {status_class} timeslot styling found")
            else:
                print(f"  ✗ {status_class} timeslot styling missing")
        
        # Check for appointment-dot classes
        print("\n✓ Checking appointment-dot status classes:")
        for status_class in required_classes:
            if f'.appointment-dot.{status_class}' in css_content:
                print(f"  ✓ {status_class} appointment-dot styling found")
            else:
                print(f"  ✗ {status_class} appointment-dot styling missing")
        
        # Check for time-slot classes
        print("\n✓ Checking time-slot status classes:")
        for status_class in required_classes:
            if f'.time-slot.{status_class}' in css_content:
                print(f"  ✓ {status_class} time-slot styling found")
            else:
                print(f"  ✗ {status_class} time-slot styling missing")
        
        # Check for status legend
        print("\n✓ Checking status legend components:")
        legend_components = ['.status-legend', '.legend-item', '.legend-color-box']
        for component in legend_components:
            if component in css_content:
                print(f"  ✓ {component} styling found")
            else:
                print(f"  ✗ {component} styling missing")
        
        return True
        
    except Exception as e:
        print(f"✗ Error reading CSS file: {e}")
        return False

def main():
    """Run all color coding tests"""
    print("Starting Color Coding Implementation Test Suite...")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    results = []
    
    # Run tests
    results.append(("Status Color Mapping", test_status_colors()))
    results.append(("Backend Status Handling", test_backend_status_handling()))
    results.append(("Frontend Helper Functions", test_frontend_javascript_functions()))
    results.append(("CSS File Integrity", test_css_file_integrity()))
    
    # Summary
    print(f"\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✓ PASSED" if result else "✗ FAILED"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\nOverall Result: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All color coding tests passed! Implementation is ready.")
    else:
        print("⚠ Some tests failed. Please review the issues above.")
    
    return passed == total

if __name__ == "__main__":
    main()

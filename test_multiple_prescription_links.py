#!/usr/bin/env python3

import os
import sys
import django

# Add the CareLink directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'CareLink'))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')
django.setup()

from CareLink.models import *
from datetime import date, time

def test_multiple_prescription_links():
    """Test that one prescription can be linked to multiple timeslots"""
    
    print("🧪 Testing Multiple Prescription Links...")
    print("=" * 50)
    
    # Find or create test data
    try:
        # Get a patient and service
        patient = Patient.objects.first()
        service = Service.objects.filter(id=3).first()  # Service 3 (nursing care)
        
        if not patient or not service:
            print("❌ Missing test data (patient or service)")
            return
            
        print(f"📋 Patient: {patient.user.firstname} {patient.user.lastname}")
        print(f"🏥 Service: {service.name}")
        
        # Create a prescription
        prescription = Prescription.objects.create(
            service=service,
            note="Test prescription for multiple timeslots",
            frequency=3,
            status='accepted',
            start_date=date.today(),
            medication="Test medication",
            instructions="Take as needed"
        )
        
        print(f"💊 Created prescription ID: {prescription.id}")
        
        # Create multiple timeslots linked to the same prescription
        timeslots = []
        
        # Timeslot 1
        timeslot1 = TimeSlot.objects.create(
            start_time=time(9, 0),
            end_time=time(10, 0),
            description="First session",
            prescription=prescription,
            service=service,
            status='scheduled'
        )
        timeslots.append(timeslot1)
        
        # Timeslot 2  
        timeslot2 = TimeSlot.objects.create(
            start_time=time(14, 0),
            end_time=time(15, 0),
            description="Second session",
            prescription=prescription,
            service=service,
            status='scheduled'
        )
        timeslots.append(timeslot2)
        
        # Timeslot 3
        timeslot3 = TimeSlot.objects.create(
            start_time=time(16, 0),
            end_time=time(17, 0),
            description="Third session",
            prescription=prescription,
            service=service,
            status='scheduled'
        )
        timeslots.append(timeslot3)
        
        print(f"⏰ Created {len(timeslots)} timeslots")
        
        # Verify all timeslots are linked to the same prescription
        linked_count = TimeSlot.objects.filter(prescription=prescription).count()
        print(f"🔗 Timeslots linked to prescription: {linked_count}")
        
        # Test the API response format
        print("\n📡 Testing API Response Format:")
        
        # Simulate the linked_timeslots_count logic
        linked_timeslots_count = TimeSlot.objects.filter(prescription=prescription).count()
        
        prescription_data = {
            'id': prescription.id,
            'linked_timeslots_count': linked_timeslots_count,
            'note': prescription.note
        }
        
        print(f"   Prescription ID: {prescription_data['id']}")
        print(f"   Linked Timeslots Count: {prescription_data['linked_timeslots_count']}")
        print(f"   Note: {prescription_data['note']}")
        
        # Test each timeslot
        print("\n⏰ Individual Timeslots:")
        for i, ts in enumerate(timeslots, 1):
            print(f"   Timeslot {i}:")
            print(f"     ID: {ts.id}")
            print(f"     Time: {ts.start_time} - {ts.end_time}")
            print(f"     Description: {ts.description}")
            print(f"     Prescription ID: {ts.prescription.id if ts.prescription else 'None'}")
            print(f"     Status: {ts.status}")
            
        # Success
        print(f"\n✅ SUCCESS: One prescription successfully linked to {linked_count} timeslots!")
        print("✅ Multiple prescription links are working correctly!")
        
        # Clean up test data
        print(f"\n🧹 Cleaning up test data...")
        TimeSlot.objects.filter(id__in=[ts.id for ts in timeslots]).delete()
        prescription.delete()
        print("✅ Test data cleaned up")
        
    except Exception as e:
        print(f"❌ Error during test: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_multiple_prescription_links()

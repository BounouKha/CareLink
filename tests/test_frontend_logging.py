#!/usr/bin/env python
import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')
django.setup()

from CareLink.models import UserActionLog, User, Patient, Provider
from datetime import datetime, timezone

if __name__ == "__main__":
    print("=== Testing Enhanced Frontend Logging Display ===")

    # Find or create test users
    try:
        coordinator = User.objects.filter(email__icontains='coordinator').first()
        if not coordinator:
            coordinator = User.objects.filter(role='COORDINATOR').first()
        
        patient = Patient.objects.first()
        provider = Provider.objects.first()
        
        if coordinator and patient and provider:
            # Create sample enhanced log entries
            enhanced_logs = [
                {
                    'user': coordinator,
                    'action_type': 'CREATE_SCHEDULE',
                    'target_model': 'Schedule',
                    'target_id': 999,
                    'description': 'Created quick schedule for emergency consultation',
                    'affected_patient_id': patient.id,
                    'affected_patient_name': f"{patient.user.firstname} {patient.user.lastname}" if patient.user else f"Patient ID: {patient.id}",
                    'affected_provider_id': provider.id,
                    'affected_provider_name': f"Dr. {provider.user.firstname} {provider.user.lastname}" if provider.user else f"Provider ID: {provider.id}",
                    'additional_data': {
                        'service_type': 'Emergency Consultation',
                        'scheduled_via': 'quick_schedule',
                        'priority': 'high',
                        'duration_minutes': 30
                    }
                },
                {
                    'user': coordinator,
                    'action_type': 'UPDATE_APPOINTMENT',
                    'target_model': 'Schedule',
                    'target_id': 998,
                    'description': 'Updated appointment time and added special notes',
                    'affected_patient_id': patient.id,
                    'affected_patient_name': f"{patient.user.firstname} {patient.user.lastname}" if patient.user else f"Patient ID: {patient.id}",
                    'affected_provider_id': provider.id,
                    'affected_provider_name': f"Dr. {provider.user.firstname} {provider.user.lastname}" if provider.user else f"Provider ID: {provider.id}",
                    'additional_data': {
                        'changes_made': ['time_updated', 'special_notes_added'],
                        'updated_via': 'appointment_management',
                        'previous_time': '14:00',
                        'new_time': '15:30'
                    }
                },
                {
                    'user': coordinator,
                    'action_type': 'DELETE_APPOINTMENT',
                    'target_model': 'TimeSlot',
                    'target_id': 997,
                    'description': 'Cancelled appointment due to patient request',
                    'affected_patient_id': patient.id,
                    'affected_patient_name': f"{patient.user.firstname} {patient.user.lastname}" if patient.user else f"Patient ID: {patient.id}",
                    'affected_provider_id': provider.id,
                    'affected_provider_name': f"Dr. {provider.user.firstname} {provider.user.lastname}" if provider.user else f"Provider ID: {provider.id}",
                    'additional_data': {
                        'cancellation_reason': 'patient_request',
                        'cancelled_via': 'appointment_management',
                        'refund_issued': True,
                        'advance_notice_hours': 24
                    }
                }
            ]
            
            # Create the log entries
            created_logs = []
            for log_data in enhanced_logs:
                log = UserActionLog.objects.create(**log_data)
                created_logs.append(log)
                print(f"✓ Created enhanced log entry: {log}")
            
            print(f"\n🎉 Successfully created {len(created_logs)} enhanced log entries for frontend testing!")
            print("\n📋 You can now check the frontend logs management page to see:")
            print("   - Patient and provider names displayed")
            print("   - Enhanced context information")
            print("   - Additional data in expandable sections")
            print("   - Rich descriptions with full context")
            
            print(f"\n🔗 Access the logs at: http://localhost:3000/admin/logs")
            print("   (Make sure you're logged in as a superuser)")
            print("\n✅ Enhanced frontend logging test completed successfully!")
            
        else:
            print("❌ Could not find required test data (coordinator, patient, provider)")
            print(f"   - Coordinator found: {bool(coordinator)}")
            print(f"   - Patient found: {bool(patient)}")
            print(f"   - Provider found: {bool(provider)}")
            
    except Exception as e:
        print(f"❌ Error creating test logs: {str(e)}")
        print("\n⚠️  Enhanced frontend logging test could not be completed.")
        print("Please ensure you have test data in your database.")

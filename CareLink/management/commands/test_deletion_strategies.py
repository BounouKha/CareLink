from django.core.management.base import BaseCommand
from django.test import RequestFactory
from django.contrib.auth import get_user_model
from account.models import Patient, Provider, UserPreferences
from schedule.models import Schedule, TimeSlot, Service
from schedule.views import AppointmentManagementView
from notification_service import NotificationService
from datetime import datetime, timedelta
import json

User = get_user_model()

class Command(BaseCommand):
    help = 'Test deletion strategies with notifications'

    def handle(self, *args, **options):
        print("\n" + "="*60)
        print("TESTING DELETION STRATEGIES WITH NOTIFICATIONS")
        print("="*60)
        
        # Create test users
        coordinator = User.objects.create_user(
            username='test_coordinator_del',
            email='coordinator@test.com',
            role='Coordinator'
        )
        
        patient_user = User.objects.create_user(
            username='test_patient_del',
            email='patient@test.com',
            role='Patient'
        )
        
        provider_user = User.objects.create_user(
            username='test_provider_del',
            email='provider@test.com',
            role='Provider'
        )
        
        # Create patient and provider
        patient = Patient.objects.create(
            user=patient_user,
            phone_number='+32477123456',
            date_of_birth='1990-01-01',
            address='Test Address'
        )
        
        provider = Provider.objects.create(
            user=provider_user,
            specialization='Test Specialization',
            license_number='TEST123'
        )
        
        # Set user preferences for notifications
        UserPreferences.objects.update_or_create(
            user=patient_user,
            defaults={
                'email_notifications': True,
                'sms_notifications': True,
                'appointment_reminders': True
            }
        )
        
        # Get or create a service
        service, _ = Service.objects.get_or_create(
            name='Test Service',
            defaults={
                'description': 'Test service for deletion testing',
                'duration': 30,
                'price': 50.0
            }
        )
        
        # Test each deletion strategy
        strategies = ['aggressive', 'conservative', 'smart']
        
        for strategy in strategies:
            print(f"\n📋 Testing {strategy.upper()} deletion strategy...")
            
            # Create a schedule with multiple timeslots
            schedule = Schedule.objects.create(
                patient=patient,
                provider=provider,
                service=service,
                scheduled_date=datetime.now().date() + timedelta(days=1),
                status='Confirmed',
                notes=f'Test schedule for {strategy} strategy'
            )
            
            # Create multiple timeslots
            timeslot1 = TimeSlot.objects.create(
                start_time=datetime.now().time().replace(hour=10, minute=0),
                end_time=datetime.now().time().replace(hour=10, minute=30),
                is_available=False
            )
            timeslot2 = TimeSlot.objects.create(
                start_time=datetime.now().time().replace(hour=11, minute=0),
                end_time=datetime.now().time().replace(hour=11, minute=30),
                is_available=False
            )
            
            schedule.time_slots.add(timeslot1, timeslot2)
            
            print(f"   Created schedule {schedule.id} with {schedule.time_slots.count()} timeslots")
            
            # Create request factory and simulate deletion
            factory = RequestFactory()
            view = AppointmentManagementView()
            
            # Test deleting one timeslot
            request = factory.delete(
                f'/api/appointments/{schedule.id}/?timeslot_id={timeslot1.id}&strategy={strategy}'
            )
            request.user = coordinator
            
            print(f"   🗑️  Deleting timeslot {timeslot1.id} with {strategy} strategy...")
            
            try:
                response = view.delete(request, schedule.id)
                response_data = json.loads(response.content.decode())
                
                print(f"   ✅ Response: {response_data.get('message', 'Unknown response')}")
                print(f"   📊 Deletion type: {response_data.get('deletion_type', 'Unknown')}")
                
                # Check if schedule still exists
                if Schedule.objects.filter(id=schedule.id).exists():
                    remaining_schedule = Schedule.objects.get(id=schedule.id)
                    print(f"   📅 Schedule preserved with {remaining_schedule.time_slots.count()} timeslots")
                else:
                    print(f"   🗑️  Schedule completely deleted")
                    
            except Exception as e:
                print(f"   ❌ Error during deletion: {e}")
            
            # Clean up remaining data
            try:
                if Schedule.objects.filter(id=schedule.id).exists():
                    Schedule.objects.get(id=schedule.id).delete()
                TimeSlot.objects.filter(id__in=[timeslot1.id, timeslot2.id]).delete()
            except:
                pass
        
        print(f"\n🧹 Cleaning up test data...")
        
        # Clean up test users and related data
        UserPreferences.objects.filter(user__in=[patient_user, provider_user, coordinator]).delete()
        Patient.objects.filter(user=patient_user).delete()
        Provider.objects.filter(user=provider_user).delete()
        User.objects.filter(username__in=['test_coordinator_del', 'test_patient_del', 'test_provider_del']).delete()
        
        print("✅ All deletion strategy tests completed!")
        print("="*60)

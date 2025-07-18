from django.db import models
from django.conf import settings
from django.core.management.base import BaseCommand
from CareLink.models import Patient, User, MedicalFolder, UserActionLog
import random
import string

# Create your models here.

class UserPreferences(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='preferences')
    email_notifications = models.BooleanField(default=True)
    sms_notifications = models.BooleanField(default=False)
    appointment_reminders = models.BooleanField(default=True)
    billing_notifications = models.BooleanField(default=True)
    medical_alerts = models.BooleanField(default=True)
    marketing_communications = models.BooleanField(default=False)
    preferred_contact_method = models.CharField(
        max_length=20,
        choices=[
            ('email', 'Email'),
            ('phone', 'Phone'),
            ('sms', 'SMS'),
        ],
        default='email'
    )
    # If preferred_contact_method is 'phone', this points to the preferred phone number
    primary_phone_contact = models.ForeignKey(
        'CareLink.PhoneUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='primary_for_preferences'
    )
    # Emergency contact info
    emergency_contact_name = models.CharField(max_length=100, blank=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True)
    emergency_contact_relationship = models.CharField(max_length=50, blank=True)

    def __str__(self):
        return f"Preferences for {self.user.email}"


class Command(BaseCommand):
    help = 'Anonymize a patient and their user account for GDPR compliance.'

    def add_arguments(self, parser):
        parser.add_argument('patient_id', type=int, help='ID of the patient to anonymize')

    def handle(self, *args, **options):
        patient_id = options['patient_id']
        try:
            patient = Patient.objects.get(id=patient_id)
            user = patient.user
            # Anonymize User
            if user:
                user.firstname = 'Anonymized'
                user.lastname = 'User'
                user.email = f"anon{user.id}@example.com"
                user.address = ''
                user.national_number = None
                user.birthdate = None
                user.is_active = False
                # Set a random password
                user.set_password(''.join(random.choices(string.ascii_letters + string.digits, k=32)))
                user.save()
            # Anonymize Patient
            patient.gender = None
            patient.blood_type = None
            patient.katz_score = None
            patient.it_score = None
            patient.illness = ''
            patient.critical_information = ''
            patient.medication = ''
            patient.doctor_name = ''
            patient.doctor_address = ''
            patient.doctor_phone = ''
            patient.doctor_email = ''
            patient.is_anonymized = True
            patient.save()
            # Anonymize MedicalFolder notes
            MedicalFolder.objects.filter(patient=patient).update(note='[ANONYMIZED]')
            # Log the action
            UserActionLog.objects.create(
                user=user,
                action_type='PROFILE_ANONYMIZED',
                target_model='Patient',
                target_id=patient.id,
                description='Patient and user profile anonymized for GDPR compliance.'
            )
            self.stdout.write(self.style.SUCCESS(f'Patient {patient_id} and user anonymized successfully.'))
        except Patient.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'Patient with ID {patient_id} does not exist.'))


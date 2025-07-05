from django.db import models
from django.conf import settings

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


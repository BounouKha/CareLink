from django.db import models
from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.contrib.auth.models import BaseUserManager

##Attention la base de données doit être en UTF-8 pour éviter les problèmes d'encodage


class Administrative(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    is_internal = models.BooleanField(default=True)

class ContestInvoice(models.Model):
    invoice = models.ForeignKey('Invoice', on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=[('In Progress', 'In Progress'), ('Cancelled', 'Cancelled'), ('Accepted', 'Accepted')])

class Service(models.Model):
    name = models.CharField(max_length=50)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.CharField(max_length=250)

class Contract(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    service = models.ForeignKey('Service', on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    salary = models.BigIntegerField()
    hour_quantity = models.BigIntegerField()
    type_contract = models.CharField(max_length=20, choices=[('CDD', 'CDD'), ('CDR', 'CDR'), ('Intérim', 'Intérim'), ('CDI', 'CDI'), ('Bénévole', 'Bénévole'), ('Autre', 'Autre')])

class Coordinator(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    is_internal = models.BooleanField(default=True)

class FamilyPatient(models.Model):
    patient = models.ForeignKey('Patient', on_delete=models.SET_NULL, null=True)
    link = models.CharField(max_length=50)

class HelpdeskTicket(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='created_tickets')
    subject = models.CharField(max_length=255)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=[('Open', 'Open'), ('In Progress', 'In Progress'), ('Closed', 'Closed')])
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    handled_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='handled_tickets')
    priority = models.CharField(max_length=10, choices=[('Low', 'Low'), ('Medium', 'Medium'), ('High', 'High')], default='Medium')

class InformationProviding(models.Model):
    patient = models.ForeignKey('Patient', on_delete=models.SET_NULL, null=True)
    provider = models.ForeignKey('Provider', on_delete=models.SET_NULL, null=True)
    service = models.ForeignKey('Service', on_delete=models.SET_NULL, null=True)
    coordinator = models.ForeignKey('Coordinator', on_delete=models.SET_NULL, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)

class Invoice(models.Model):
    patient = models.ForeignKey('Patient', on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=[('Paid', 'Paid'), ('In Progress', 'In Progress'), ('Cancelled', 'Cancelled'), ('Contested', 'Contested')])
    recall_at = models.DateTimeField(null=True, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)

class MedicalFolder(models.Model):
    patient = models.ForeignKey('Patient', on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    note = models.CharField(max_length=1000, null=True, blank=True)

class Patient(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    gender = models.CharField(max_length=1, choices=[('M', 'Male'), ('F', 'Female')])
    blood_type = models.CharField(max_length=3, null=True, blank=True)
    emergency_contact = models.CharField(max_length=15)
    katz_score = models.IntegerField(null=True, blank=True)
    it_score = models.IntegerField(null=True, blank=True)
    illness = models.CharField(max_length=100, null=True, blank=True)
    critical_information = models.CharField(max_length=100, null=True, blank=True)
    medication = models.CharField(max_length=100, null=True, blank=True)
    social_price = models.BooleanField(default=False)
    is_alive = models.BooleanField(default=True)
    spouse = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True)
    deletion_requested_at = models.DateTimeField(null=True, blank=True)

class Payment(models.Model):
    patient = models.ForeignKey('Patient', on_delete=models.SET_NULL, null=True)
    payment_token = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=[('Pending', 'Pending'), ('Succeeded', 'Succeeded'), ('Failed', 'Failed')])
    created_at = models.DateTimeField(auto_now_add=True)

class Prescription(models.Model):
    service = models.ForeignKey('Service', on_delete=models.SET_NULL, null=True)
    note = models.TextField(null=True, blank=True)
    frequency = models.IntegerField(default=1)
    status = models.CharField(max_length=20, choices=[('pending', 'Pending'), ('accepted', 'Accepted'), ('canceled', 'Canceled'), ('completed', 'Completed'), ('rejected', 'Rejected')], default='pending')
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    medication = models.TextField()
    instructions = models.TextField(null=True, blank=True)

class Provider(models.Model):
    user = models.ForeignKey('User', on_delete=models.SET_NULL, null=True)
    service = models.ForeignKey('Service', on_delete=models.SET_NULL, null=True)
    is_internal = models.BooleanField(default=True)

class ProvidingCare(models.Model):
    patient = models.ForeignKey('Patient', on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    service = models.ForeignKey('Service', on_delete=models.SET_NULL, null=True)
    provider = models.ForeignKey('Provider', on_delete=models.SET_NULL, null=True)
    coordinator = models.ForeignKey('Coordinator', on_delete=models.SET_NULL, null=True)
    prescription = models.ForeignKey('Prescription', on_delete=models.SET_NULL, null=True, blank=True)

class Schedule(models.Model):
    user = models.ForeignKey('User', on_delete=models.SET_NULL, null=True)
    patient = models.ForeignKey('Patient', on_delete=models.SET_NULL, null=True)
    provider = models.ForeignKey('Provider', on_delete=models.SET_NULL, null=True)
    time_slot = models.ForeignKey('TimeSlot', on_delete=models.SET_NULL, null=True)
    date = models.DateField()
    prescription = models.ForeignKey('Prescription', on_delete=models.SET_NULL, null=True)

class ServiceDemand(models.Model):
    patient = models.ForeignKey('Patient', on_delete=models.SET_NULL, null=True)
    sent_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='sent_demands')
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=[('Open', 'Open'), ('In Progress', 'In Progress'), ('Closed', 'Closed')])
    manage_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='managed_demands')
    frequency = models.IntegerField()
    service = models.ForeignKey('Service', on_delete=models.SET_NULL, null=True)
    contact = models.CharField(max_length=20, choices=[('Mail', 'Mail'), ('Appel', 'Appel'), ('Appel visio', 'Appel visio')])

class SocialAssistant(models.Model):
    user = models.ForeignKey('User', on_delete=models.SET_NULL, null=True)
    is_internal = models.BooleanField(default=False)
    from_hospital = models.CharField(max_length=100, null=True, blank=True)

class StatusHistory(models.Model):
    content_type = models.CharField(max_length=50, null=True, blank=True)
    user = models.ForeignKey('User', on_delete=models.SET_NULL, null=True)
    previous_status = models.CharField(max_length=50, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    new_status = models.CharField(max_length=50, null=True, blank=True)

class TimelineEventPatient(models.Model):
    patient = models.ForeignKey('Patient', on_delete=models.SET_NULL, null=True)
    type_event = models.CharField(max_length=50)
    description = models.CharField(max_length=255)
    state = models.CharField(max_length=50, null=True, blank=True)
    datetime = models.DateTimeField(auto_now_add=True)
    author = models.ForeignKey('User', on_delete=models.SET_NULL, null=True)

class TimeSlot(models.Model):
    start_time = models.TimeField()
    end_time = models.TimeField()
    description = models.CharField(max_length=255, null=True, blank=True)

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_admin', True)
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin):
    firstname = models.CharField(max_length=50)
    lastname = models.CharField(max_length=50)
    email = models.EmailField(unique=True, max_length=191)  # Reduced max_length to avoid key length issues
    password = models.CharField(max_length=128)  # Updated to match Django's default
    birthdate = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_admin = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    address = models.CharField(max_length=255, null=True, blank=True)
    national_number = models.CharField(max_length=11, unique=True, null=True, blank=True)  # Reduced max_length

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['firstname', 'lastname']

    objects = UserManager()

    def __str__(self):
        return self.email

class UserActionLog(models.Model):
    user = models.ForeignKey('User', on_delete=models.SET_NULL, null=True)
    action_type = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    target_model = models.TextField(null=True, blank=True)
    target_id = models.BigIntegerField(null=True, blank=True)

class UserToken(models.Model):
    user = models.ForeignKey('User', on_delete=models.SET_NULL, null=True)
    access_token_hash = models.CharField(max_length=64, unique=True)
    refresh_token_hash = models.CharField(max_length=64, unique=True)
    access_token_expires_at = models.DateTimeField()
    refresh_token_expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    revoked = models.BooleanField(default=False)

class PhoneUser(models.Model):
    user = models.ForeignKey('User', on_delete=models.CASCADE, related_name='phone_numbers')
    phone_number = models.CharField(max_length=20)
    name = models.CharField(max_length=50, null=True, blank=True)  # e.g., 'mobile phone', 'home phone'
    is_primary = models.BooleanField(default=False)




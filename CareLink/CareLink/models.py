from django.db import models
from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.contrib.auth.models import BaseUserManager
import datetime
from django.core.exceptions import ValidationError
from django.contrib.auth.models import Permission, Group

##Attention la base de données doit être en UTF-8 pour éviter les problèmes d'encodage


# Add a validator for non-negative prices
def validate_non_negative(value):
    if value < 0:
        raise ValidationError('Price cannot be negative.')

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
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[validate_non_negative])
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

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.user:
            # Ensure the coordinator exists
            coordinator_group, created = Group.objects.get_or_create(name='coordinator')

            # Assign permissions to the group if it was newly created
            if created:
                permissions = [
                    'change_patient',
                    'view_patient',
                    'view_medicalfolder',
                    'change_medicalfolder',
                    'add_medicalfolder'
                ]
                for codename in permissions:
                    permission = Permission.objects.get(codename=codename)
                    coordinator_group.permissions.add(permission)

            # Add the user to the CoordinatorGroup
            self.user.groups.add(coordinator_group)

class FamilyPatient(models.Model):
    patient = models.ForeignKey('Patient', on_delete=models.SET_NULL, null=True)
    link = models.CharField(max_length=50)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='family_patients')

class HelpdeskTicket(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='created_tickets')
    subject = models.CharField(max_length=255)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=[('Open', 'Open'), ('In Progress', 'In Progress'), ('Closed', 'Closed')])
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)  # Allow null values
    handled_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='handled_tickets')
    priority = models.CharField(max_length=10, choices=[('Low', 'Low'), ('Medium', 'Medium'), ('High', 'High')], default='Medium')

class InformationProviding(models.Model):
    patient = models.ForeignKey('Patient', on_delete=models.SET_NULL, null=True)
    provider = models.ForeignKey('Provider', on_delete=models.SET_NULL, null=True)
    service = models.ForeignKey('Service', on_delete=models.SET_NULL, null=True)
    coordinator = models.ForeignKey('Coordinator', on_delete=models.SET_NULL, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[validate_non_negative])

class Invoice(models.Model):
    patient = models.ForeignKey('Patient', on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=[('Paid', 'Paid'), ('In Progress', 'In Progress'), ('Cancelled', 'Cancelled'), ('Contested', 'Contested')])
    recall_at = models.DateTimeField(null=True, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    timeslots = models.ManyToManyField('TimeSlot', blank=True)
    service = models.ForeignKey('Service', on_delete=models.SET_NULL, null=True)

    def calculate_total_amount(self):
        """Calculate the total amount for all timeslots in this invoice."""
        if self.service:
            return sum(timeslot.calculate_price() for timeslot in self.timeslots.filter(service=self.service))
        return 0.0

    def generate_invoice(self, date, service):
        """Generate an invoice for all timeslots on a specific date and service."""
        self.service = service
        self.timeslots.set(TimeSlot.objects.filter(start_time__date=date, service=service))
        self.amount = self.calculate_total_amount()
        self.save()

class MedicalFolder(models.Model):
    patient = models.ForeignKey('Patient', on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True) 
    note = models.CharField(max_length=1000, null=True, blank=True)
    service = models.ForeignKey('Service', on_delete=models.SET_NULL, null=True)

class Patient(models.Model):
    user = models.ForeignKey('User', on_delete=models.SET_NULL, null=True)
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
    rejection_comment = models.TextField(null=True, blank=True, help_text="Commentary or reason for rejection by the coordinator.")

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
    patient = models.ForeignKey('Patient', on_delete=models.SET_NULL, null=True)
    provider = models.ForeignKey('Provider', on_delete=models.SET_NULL, null=True)
    date = models.DateField()
    time_slots = models.ManyToManyField('TimeSlot', blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_schedules')

    def generate_daily_schedule(self, date, provider):
        """Generate timeslots for a specific day and provider."""
        working_hours = [(9, 0), (17, 0)]  # Example: 9:00 AM to 5:00 PM
        duration_minutes = 30  # Each timeslot is 30 minutes

        start_time = datetime.datetime.combine(date, datetime.time(*working_hours[0]))
        end_time = datetime.datetime.combine(date, datetime.time(*working_hours[1]))

        current_time = start_time
        while current_time < end_time:
            next_time = current_time + datetime.timedelta(minutes=duration_minutes)
            timeslot = TimeSlot.objects.create(
                start_time=current_time.time(),
                end_time=next_time.time(),
                description=f"Timeslot for {provider}",
                user=self.user  # Assign the user managing the schedule
            )
            self.time_slots.add(timeslot)
            current_time = next_time

        self.date = date
        self.provider = provider
        self.save()

class ServiceDemand(models.Model):
    PRIORITY_CHOICES = [
        ('Low', 'Low'),
        ('Normal', 'Normal'),
        ('High', 'High'),
        ('Urgent', 'Urgent'),
    ]
    
    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Under Review', 'Under Review'),
        ('Approved', 'Approved'),
        ('In Progress', 'In Progress'),
        ('Completed', 'Completed'),
        ('Rejected', 'Rejected'),
        ('Cancelled', 'Cancelled'),
    ]
    
    CONTACT_CHOICES = [
        ('Email', 'Email'),
        ('Phone', 'Phone Call'),
        ('Video Call', 'Video Call'),
        ('In Person', 'In Person'),
        ('SMS', 'SMS'),
    ]
    
    FREQUENCY_CHOICES = [
        ('Once', 'One-time service'),
        ('Daily', 'Daily'),
        ('Weekly', 'Weekly'),
        ('Bi-weekly', 'Bi-weekly'),
        ('Monthly', 'Monthly'),
        ('As needed', 'As needed'),
    ]
    
    # Core Information
    patient = models.ForeignKey('Patient', on_delete=models.SET_NULL, null=True)
    sent_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='sent_demands')
    service = models.ForeignKey('Service', on_delete=models.SET_NULL, null=True)
      # Request Details
    title = models.CharField(max_length=200, default="Service Request", help_text="Brief title for the service request")
    description = models.TextField(default="", blank=True, help_text="Detailed description of the service needed")
    reason = models.TextField(default="", blank=True, help_text="Medical reason or justification for the service")
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='Normal')
    
    # Scheduling Information
    preferred_start_date = models.DateField(null=True, blank=True, help_text="When should the service start?")
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES, default='Once')
    duration_weeks = models.IntegerField(null=True, blank=True, help_text="How many weeks is this service needed?")
    preferred_time = models.CharField(max_length=100, null=True, blank=True, help_text="Preferred time of day (e.g., Morning, Afternoon, Evening)")
    
    # Contact & Communication
    contact_method = models.CharField(max_length=20, choices=CONTACT_CHOICES, default='Email')
    emergency_contact = models.CharField(max_length=15, null=True, blank=True, help_text="Emergency contact number")
    special_instructions = models.TextField(null=True, blank=True, help_text="Any special instructions or requirements")
    
    # Status & Management
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    managed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='managed_demands')
    assigned_provider = models.ForeignKey('Provider', on_delete=models.SET_NULL, null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Response & Notes
    coordinator_notes = models.TextField(null=True, blank=True, help_text="Internal notes from coordinators")
    rejection_reason = models.TextField(null=True, blank=True, help_text="Reason for rejection if applicable")
    estimated_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at', 'priority']
        verbose_name = "Service Demand"
        verbose_name_plural = "Service Demands"
    
    def __str__(self):
        return f"{self.title} - {self.patient} ({self.status})"
    
    @property
    def is_urgent(self):
        return self.priority == 'Urgent'
    
    @property
    def days_since_created(self):
        return (datetime.datetime.now().date() - self.created_at.date()).days

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
    TIMESLOT_STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('confirmed', 'Confirmed'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('no_show', 'No Show'),
    ]
    
    start_time = models.TimeField()
    end_time = models.TimeField()
    description = models.CharField(max_length=255, null=True, blank=True)
    status = models.CharField(max_length=20, choices=TIMESLOT_STATUS_CHOICES, default='scheduled')
    prescription = models.ForeignKey('Prescription', on_delete=models.SET_NULL, null=True, blank=True)
    user = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, blank=True)
    service = models.ForeignKey('Service', on_delete=models.SET_NULL, null=True, blank=True)

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
    email = models.EmailField(unique=True, max_length=191)  
    password = models.CharField(max_length=128)  # Updated to match Django's default
    birthdate = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True) 
    is_admin = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    address = models.CharField(max_length=255, null=True, blank=True)
    national_number = models.CharField(max_length=11, unique=True, null=True, blank=True)  # Reduced max_length

    ROLE_CHOICES = [
        ('Administrative', 'Administrative'),
        ('Patient', 'Patient'),
        ('Coordinator', 'Coordinator'),
        ('Family Patient', 'Family Patient'),
        ('Social Assistant', 'Social Assistant'),
        ('Provider', 'Provider'),
        ('Administrator', 'Administrator'),
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, null=True, blank=True)

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




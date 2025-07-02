from django.db import models
from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.contrib.auth.models import BaseUserManager
import datetime
from django.core.exceptions import ValidationError
from django.contrib.auth.models import Permission, Group
from django.utils import timezone

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
    
    # Enhanced contract fields
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    contract_reference = models.CharField(max_length=50, unique=True, null=True, blank=True)
    hourly_rate = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    weekly_hours = models.IntegerField(null=True, blank=True)
    department = models.CharField(max_length=100, null=True, blank=True)
    supervisor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='supervised_contracts')
    status = models.CharField(max_length=20, choices=[
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('suspended', 'Suspended'),
        ('terminated', 'Terminated'),
        ('pending', 'Pending')
    ], default='pending')    
    notes = models.TextField(null=True, blank=True)
    
    def __str__(self):
        return f"Contract {self.contract_reference} - {self.user.get_full_name() if self.user else 'No User'}"
    
    def clean(self):
        """Validate contract business rules"""
        from django.core.exceptions import ValidationError
        
        if self.user:
            # Rule 1: Prevent multiple active contracts for the same user
            if self.status == 'active':
                existing_active = Contract.objects.filter(
                    user=self.user, 
                    status='active'
                ).exclude(pk=self.pk)
                
                if existing_active.exists():
                    raise ValidationError({
                        'status': f'User {self.user.get_full_name()} already has an active contract. '
                                f'Please terminate or suspend the existing contract first.'
                    })
            
            # Rule 2: User must be active to have an active contract
            if self.status == 'active' and not self.user.is_active:
                raise ValidationError({
                    'status': f'Cannot activate contract for inactive user {self.user.get_full_name()}. '
                            f'Please activate the user first.'
                })
        
        # Rule 3: End date must be after start date
        if self.start_date and self.end_date and self.end_date <= self.start_date:
            raise ValidationError({
                'end_date': 'End date must be after start date.'
            })
        
        # Rule 4: CDI contracts should not have end dates
        if self.type_contract == 'CDI' and self.end_date:
            raise ValidationError({
                'end_date': 'CDI (permanent) contracts should not have an end date.'
            })
    
    def save(self, *args, **kwargs):
        """Override save to include validation"""
        self.full_clean()  # This calls clean() method
        
        # Auto-generate contract reference if not provided
        if not self.contract_reference:
            import string
            import random
            self.contract_reference = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        
        super().save(*args, **kwargs)
    
    @property
    def is_expired(self):
        """Check if contract has expired"""
        if self.end_date:
            from django.utils import timezone
            return timezone.now().date() > self.end_date
        return False
    
    @property
    def days_until_expiry(self):
        """Get days until contract expires"""
        if self.end_date and self.status == 'active':
            from django.utils import timezone
            days = (self.end_date - timezone.now().date()).days
            return max(0, days)
        return None
    
    def can_be_activated(self):
        """Check if contract can be activated"""
        if not self.user:
            return False, "Contract has no associated user"
        
        if not self.user.is_active:
            return False, f"User {self.user.get_full_name()} is inactive"
        
        # Check for existing active contracts
        existing_active = Contract.objects.filter(
            user=self.user, 
            status='active'
        ).exclude(pk=self.pk)
        
        if existing_active.exists():
            return False, f"User already has an active contract"
        
        return True, "Contract can be activated"
    

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

# Enhanced Ticketing System Models
class TicketCategory(models.Model):
    """Categories for tickets"""
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    team_assignment = models.CharField(max_length=20, choices=[
        ('Coordinator', 'Coordinator Team'),
        ('Administrator', 'Administrator Team'),
    ], help_text="Default team assignment for this category")
    is_active = models.BooleanField(default=True)
    
    class Meta:
        verbose_name = "Ticket Category"
        verbose_name_plural = "Ticket Categories"
        ordering = ['name']
    
    def __str__(self):
        return self.name


class EnhancedTicket(models.Model):
    """Enhanced ticket system with team assignment and workflow"""
    CATEGORY_CHOICES = [
        ('Technical Issue', 'Technical Issue'),
        ('Care Request', 'Care Request'),
        ('Planning Issue', 'Planning Issue'),
        ('Billing Issue', 'Billing Issue'),
        ('Appointment Issue', 'Appointment Issue'),
        ('General Inquiry', 'General Inquiry'),
        ('Emergency', 'Emergency'),
        ('Other', 'Other'),
    ]
    
    STATUS_CHOICES = [
        ('New', 'New'),
        ('In Progress', 'In Progress'),
        ('Resolved', 'Resolved'),
        ('Cancelled', 'Cancelled'),
    ]
    
    PRIORITY_CHOICES = [
        ('Low', 'Low'),
        ('Medium', 'Medium'),
        ('High', 'High'),
        ('Urgent', 'Urgent'),
    ]
    
    TEAM_CHOICES = [
        ('Coordinator', 'Coordinator Team'),
        ('Administrator', 'Administrator Team'),
    ]
    
    # Basic ticket information
    title = models.CharField(max_length=255, help_text="Brief title for the ticket")
    description = models.TextField(help_text="Detailed description of the issue or request")
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='General Inquiry')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='Medium')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='New')
    
    # Team assignment
    assigned_team = models.CharField(max_length=20, choices=TEAM_CHOICES, help_text="Team responsible for handling this ticket")
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_tickets', help_text="Specific team member assigned to this ticket")
    
    # User information
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='created_enhanced_tickets')
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='updated_tickets')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    
    # Additional fields
    is_urgent = models.BooleanField(default=False, help_text="Mark as urgent for immediate attention")
    internal_notes = models.TextField(blank=True, null=True, help_text="Internal notes visible only to team members")
    
    class Meta:
        ordering = ['-created_at', 'priority']
        verbose_name = "Enhanced Ticket"
        verbose_name_plural = "Enhanced Tickets"
        indexes = [
            models.Index(fields=['status', 'priority']),
            models.Index(fields=['assigned_team', 'status']),
            models.Index(fields=['created_by', 'status']),
            models.Index(fields=['assigned_to', 'status']),
        ]
    
    def __str__(self):
        return f"#{self.id} - {self.title} ({self.status})"
    
    def save(self, *args, **kwargs):
        # Auto-set urgent flag based on priority
        if self.priority == 'Urgent':
            self.is_urgent = True
        
        # Set resolved_at timestamp when status changes to Resolved
        if self.status == 'Resolved' and not self.resolved_at:
            self.resolved_at = timezone.now()
        
        # Set cancelled_at timestamp when status changes to Cancelled
        if self.status == 'Cancelled' and not self.cancelled_at:
            self.cancelled_at = timezone.now()
        
        super().save(*args, **kwargs)
    
    @property
    def days_since_created(self):
        """Calculate days since ticket was created"""
        return (timezone.now() - self.created_at).days
    
    @property
    def is_overdue(self):
        """Check if ticket is overdue based on priority"""
        if self.status in ['Resolved', 'Cancelled']:
            return False
        
        days_open = self.days_since_created
        if self.priority == 'Urgent' and days_open > 1:
            return True
        elif self.priority == 'High' and days_open > 3:
            return True
        elif self.priority == 'Medium' and days_open > 7:
            return True
        elif self.priority == 'Low' and days_open > 14:
            return True
        return False
    
    def can_user_access(self, user):
        """Check if user can access this ticket based on role and team assignment"""
        if not user or not user.is_authenticated:
            return False
        
        # Superusers and staff can access all tickets
        if user.is_superuser or user.is_staff:
            return True
        
        # Creator can always see their own tickets
        if self.created_by == user:
            return True
        
        # Assigned user can always see their tickets
        if self.assigned_to == user:
            return True
        
        # Team-based access
        if self.assigned_team == 'Coordinator':
            return user.role in ['Coordinator', 'Administrator']
        elif self.assigned_team == 'Administrator':
            return user.role in ['Administrator', 'Administrative']
        
        return False


class TicketComment(models.Model):
    """Comments for tickets to enable communication between users and team members"""
    ticket = models.ForeignKey(EnhancedTicket, on_delete=models.CASCADE, related_name='comments')
    comment = models.TextField(help_text="Comment content")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='ticket_comments')
    created_at = models.DateTimeField(auto_now_add=True)
    is_internal = models.BooleanField(default=False, help_text="Internal comment visible only to team members")
    
    class Meta:
        ordering = ['created_at']
        verbose_name = "Ticket Comment"
        verbose_name_plural = "Ticket Comments"
    
    def __str__(self):
        return f"Comment on Ticket #{self.ticket.id} by {self.created_by.firstname if self.created_by else 'System'}"
    
    def can_user_view(self, user):
        """Check if user can view this comment"""
        if not user or not user.is_authenticated:
            return False
        
        # Internal comments are only visible to team members
        if self.is_internal:
            if user.is_superuser or user.is_staff:
                return True
            
            # Check if user is part of the assigned team
            if self.ticket.assigned_team == 'Coordinator':
                return user.role in ['Coordinator', 'Administrator']
            elif self.ticket.assigned_team == 'Administrator':
                return user.role in ['Administrator', 'Administrative']
            
            return False
        
        # Public comments are visible to ticket creator and team members
        return self.ticket.can_user_access(user)


class TicketStatusHistory(models.Model):
    """Track status changes for audit purposes"""
    ticket = models.ForeignKey(EnhancedTicket, on_delete=models.CASCADE, related_name='status_history')
    previous_status = models.CharField(max_length=20, choices=EnhancedTicket.STATUS_CHOICES, null=True, blank=True)
    new_status = models.CharField(max_length=20, choices=EnhancedTicket.STATUS_CHOICES)
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='ticket_status_changes')
    changed_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True, null=True, help_text="Optional notes about the status change")
    
    class Meta:
        ordering = ['-changed_at']
        verbose_name = "Ticket Status History"
        verbose_name_plural = "Ticket Status History"
    
    def __str__(self):
        return f"Ticket #{self.ticket.id}: {self.previous_status} → {self.new_status}"

class InformationProviding(models.Model):
    patient = models.ForeignKey('Patient', on_delete=models.SET_NULL, null=True)
    provider = models.ForeignKey('Provider', on_delete=models.SET_NULL, null=True)
    service = models.ForeignKey('Service', on_delete=models.SET_NULL, null=True)
    coordinator = models.ForeignKey('Coordinator', on_delete=models.SET_NULL, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[validate_non_negative])

class Invoice(models.Model):
    patient = models.ForeignKey('Patient', on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    period_start = models.DateField(null=True, blank=True)
    period_end = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=[('Paid', 'Paid'), ('In Progress', 'In Progress'), ('Cancelled', 'Cancelled'), ('Contested', 'Contested')])
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    recall_at = models.DateTimeField(null=True, blank=True)

    def calculate_total_amount(self):
        return sum(line.price for line in self.lines.all())

    def update_amount(self):
        self.amount = self.calculate_total_amount()
        self.save()

class InvoiceLine(models.Model):
    invoice = models.ForeignKey('Invoice', on_delete=models.CASCADE, related_name='lines')
    timeslot = models.ForeignKey('TimeSlot', on_delete=models.SET_NULL, null=True)
    service = models.ForeignKey('Service', on_delete=models.SET_NULL, null=True)
    provider = models.ForeignKey('Provider', on_delete=models.SET_NULL, null=True)
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=[('scheduled', 'Scheduled'), ('confirmed', 'Confirmed'), ('in_progress', 'In Progress'), ('completed', 'Completed'), ('cancelled', 'Cancelled'), ('no_show', 'No Show')])

class MedicalFolder(models.Model):
    patient = models.ForeignKey('Patient', on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True) 
    note = models.CharField(max_length=1000, null=True, blank=True)
    service = models.ForeignKey('Service', on_delete=models.SET_NULL, null=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, help_text="User who created this medical note")

class InternalNote(models.Model):
    """
    Internal notes system for authorized staff only.
    Patients and Family Members cannot see these notes.
    Providers can only see notes for patients they have/had appointments with.
    """
    patient = models.ForeignKey('Patient', on_delete=models.CASCADE)
    created_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, related_name='created_internal_notes')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    note = models.TextField(max_length=2000)
    service = models.ForeignKey('Service', on_delete=models.SET_NULL, null=True, blank=True)
    is_critical = models.BooleanField(default=False, help_text="Mark as critical for urgent attention")
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Internal Note"
        verbose_name_plural = "Internal Notes"
    
    def __str__(self):
        patient_name = f"{self.patient.user.firstname} {self.patient.user.lastname}" if self.patient and self.patient.user else "Unknown Patient"
        created_by_name = f"{self.created_by.firstname} {self.created_by.lastname}" if self.created_by else "System"
        return f"Internal Note for {patient_name} by {created_by_name} on {self.created_at.strftime('%Y-%m-%d')}"

    def can_user_view(self, user):
        """
        Check if a user can view this internal note based on business rules:
        - Coordinators, Administrative, Social Assistants, Administrators: All notes
        - Providers: Only notes for patients they have/had appointments with
        - Patients, Family Members: No access        """
        if not user or not user.is_authenticated:
            return False
            
        user_role = user.role
        
        # Full access for superusers and staff members (check this first)
        if user.is_superuser or user.is_staff:
            return True
        
        # No access for patients and family members
        if user_role in ['Patient', 'Family Patient']:
            return False
              # Full access for coordinators, administrative, social assistants, administrators
        if user_role in ['Coordinator', 'Administrative', 'Social Assistant', 'Administrator']:
            return True
            
        # Limited access for providers - only for patients they have/had appointments with
        if user_role == 'Provider':
            try:
                from CareLink.models import Provider, Schedule
                provider = Provider.objects.get(user=user)
                # Check if provider has any past or present appointments with this patient
                has_appointments = Schedule.objects.filter(
                    provider=provider,
                    patient=self.patient
                ).exists()
                return has_appointments
            except Provider.DoesNotExist:
                return False
                
        return False
class Patient(models.Model):
    user = models.ForeignKey('User', on_delete=models.SET_NULL, null=True)
    gender = models.CharField(max_length=1, choices=[('M', 'Male'), ('F', 'Female'), ('O', 'Other')])
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
    invoice = models.ForeignKey('Invoice', on_delete=models.SET_NULL, null=True, blank=True)
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

class ProviderAbsence(models.Model):
    """Model to track provider absence periods"""
    ABSENCE_STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    ABSENCE_TYPE_CHOICES = [
        ('vacation', 'Vacation'),
        ('sick_leave', 'Sick Leave'),
        ('personal', 'Personal Leave'),
        ('training', 'Training'),
        ('other', 'Other'),
    ]
    
    provider = models.ForeignKey('Provider', on_delete=models.CASCADE, related_name='absences')
    start_date = models.DateField()
    end_date = models.DateField()
    absence_type = models.CharField(max_length=20, choices=ABSENCE_TYPE_CHOICES, default='vacation')
    status = models.CharField(max_length=20, choices=ABSENCE_STATUS_CHOICES, default='scheduled')
    reason = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_absences')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-start_date']
        
    def __str__(self):
        return f"{self.provider.user.full_name if self.provider.user else 'Unknown'} - {self.absence_type} ({self.start_date} to {self.end_date})"
    
    def clean(self):
        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise ValidationError('Start date cannot be after end date.')

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
    created_at = models.DateTimeField(default=timezone.now)

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
    
    # Enhanced fields for detailed logging
    description = models.TextField(null=True, blank=True, help_text="Detailed description of the action")
    affected_patient_id = models.BigIntegerField(null=True, blank=True, help_text="ID of affected patient")
    affected_patient_name = models.CharField(max_length=255, null=True, blank=True, help_text="Name of affected patient")
    affected_provider_id = models.BigIntegerField(null=True, blank=True, help_text="ID of affected provider")
    affected_provider_name = models.CharField(max_length=255, null=True, blank=True, help_text="Name of affected provider")
    additional_data = models.JSONField(null=True, blank=True, help_text="Additional context data in JSON format")
    
    def __str__(self):
        user_name = f"{self.user.firstname} {self.user.lastname}" if self.user else "Unknown User"
        return f"{user_name} - {self.action_type} on {self.target_model} (ID: {self.target_id})"

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


class CookieConsent(models.Model):
    """
    GDPR Cookie Consent Storage for Audit Trail
    Stores proof of user consent choices for legal compliance
    """
    CONSENT_CHOICES = [
        ('granted', 'Granted'),
        ('denied', 'Denied'),
        ('withdrawn', 'Withdrawn'),
    ]
    
    # User identification (only for logged-in users)
    user = models.ForeignKey('User', on_delete=models.CASCADE, null=True, blank=True)
    user_identifier = models.CharField(max_length=64, null=True, blank=True, 
                                     help_text="Anonymous identifier for non-logged users")
    
    # Consent details
    consent_version = models.CharField(max_length=10, default='1.0')
    consent_timestamp = models.DateTimeField(auto_now_add=True)
    expiry_date = models.DateTimeField()
    
    # Cookie categories consent
    essential_cookies = models.BooleanField(default=True, help_text="Always true for healthcare functionality")
    analytics_cookies = models.CharField(max_length=10, choices=CONSENT_CHOICES, default='denied')
    marketing_cookies = models.CharField(max_length=10, choices=CONSENT_CHOICES, default='denied')
    functional_cookies = models.CharField(max_length=10, choices=CONSENT_CHOICES, default='denied')
    
    # Technical details (minimal for privacy)
    user_agent_snippet = models.CharField(max_length=100, null=True, blank=True, 
                                        help_text="First 100 chars of user agent for audit")
    page_url = models.URLField(null=True, blank=True, help_text="Page where consent was given")
    
    # Privacy compliance
    ip_address_stored = models.BooleanField(default=False, help_text="Always False - IP not stored for privacy")
    consent_method = models.CharField(max_length=20, default='banner', 
                                    choices=[('banner', 'Cookie Banner'), ('settings', 'Settings Page')])
    
    # Audit fields
    withdrawn_at = models.DateTimeField(null=True, blank=True)
    withdrawal_reason = models.CharField(max_length=200, null=True, blank=True)
    
    class Meta:
        ordering = ['-consent_timestamp']
        verbose_name = "Cookie Consent"
        verbose_name_plural = "Cookie Consents"
        indexes = [
            models.Index(fields=['user', '-consent_timestamp']),
            models.Index(fields=['user_identifier', '-consent_timestamp']),
        ]
    
    def __str__(self):
        if self.user:
            user_display = f"{self.user.firstname} {self.user.lastname} ({self.user.email})"
        else:
            user_display = f"Anonymous ({self.user_identifier})"
        return f"Cookie Consent - {user_display} - {self.consent_timestamp.strftime('%Y-%m-%d %H:%M')}"

    @property
    def is_expired(self):
        """Check if consent has expired"""
        return timezone.now() > self.expiry_date
    
    @property
    def days_until_expiry(self):
        """Days until consent expires"""
        if self.is_expired:
            return 0
        return (self.expiry_date - timezone.now()).days
    
    def get_consent_summary(self):
        """Get a summary of all consent choices"""
        return {
            'essential': True,  # Always true
            'analytics': self.analytics_cookies == 'granted',
            'marketing': self.marketing_cookies == 'granted',
            'functional': self.functional_cookies == 'granted',
        }
    
    def to_audit_dict(self):
        """Convert to dictionary for audit purposes"""
        return {
            'consent_id': self.id,
            'user_id': self.user.id if self.user else None,
            'user_email': self.user.email if self.user else None,
            'user_identifier': self.user_identifier,
            'consent_version': self.consent_version,
            'given_on': self.consent_timestamp.isoformat(),
            'expires_on': self.expiry_date.isoformat(),
            'is_expired': self.is_expired,
            'consent_choices': self.get_consent_summary(),
            'page_url': self.page_url,
            'method': self.consent_method,
            'withdrawn': bool(self.withdrawn_at),
            'withdrawn_on': self.withdrawn_at.isoformat() if self.withdrawn_at else None,
        }

class ProviderShortAbsence(models.Model):
    """Model to track provider short (partial-day) absences, e.g., meal, training, etc."""
    SHORT_ABSENCE_TYPE_CHOICES = [
        ('meal', 'Meal Break'),
        ('training', 'Training'),
        ('personal', 'Personal'),
        ('other', 'Other'),
    ]

    provider = models.ForeignKey('Provider', on_delete=models.CASCADE, related_name='short_absences')
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    absence_type = models.CharField(max_length=20, choices=SHORT_ABSENCE_TYPE_CHOICES, default='other')
    reason = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_short_absences')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', 'start_time']
        verbose_name = "Provider Short Absence"
        verbose_name_plural = "Provider Short Absences"

    def __str__(self):
        return f"{self.provider.user.full_name if self.provider.user else 'Unknown'} - {self.absence_type} on {self.date} ({self.start_time} to {self.end_time})"

    def clean(self):
        if self.start_time and self.end_time and self.start_time >= self.end_time:
            raise ValidationError('Start time must be before end time.')




from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from django.urls import reverse
import logging
from CareLink.models import (
    Administrative, ContestInvoice, Service, Contract, Coordinator, FamilyPatient, 
    HelpdeskTicket, InformationProviding, Invoice, MedicalFolder, InternalNote, Patient, Payment, 
    Prescription, Provider, ProvidingCare, Schedule, ServiceDemand, SocialAssistant, 
    StatusHistory, TimelineEventPatient, TimeSlot, User, UserActionLog, UserToken, CookieConsent,
    EnhancedTicket, TicketComment, TicketStatusHistory, TicketCategory
)

# Configure admin logging
logger = logging.getLogger('carelink.admin')

# Custom User Admin
@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('email', 'firstname', 'lastname', 'role', 'is_active', 'is_staff', 'created_at', 'unpaid_invoices_count')
    list_filter = ('role', 'is_active', 'is_staff', 'is_admin', 'created_at')
    search_fields = ('email', 'firstname', 'lastname', 'national_number')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at', 'unpaid_invoices_count')
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('firstname', 'lastname', 'birthdate', 'address', 'national_number')}),
        ('Role & Permissions', {'fields': ('role', 'is_active', 'is_staff', 'is_admin', 'is_superuser')}),
        ('Important dates', {'fields': ('created_at', 'updated_at', 'last_login')}),
        ('Financial Status', {'fields': ('unpaid_invoices_count',), 'classes': ('collapse',)}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'firstname', 'lastname', 'role', 'password1', 'password2'),
        }),
    )
    
    def save_model(self, request, obj, form, change):
        if change:
            logger.info(f"User {obj.email} updated by {request.user.email}")
        else:
            logger.info(f"User {obj.email} created by {request.user.email}")
        super().save_model(request, obj, form, change)
    
    def unpaid_invoices_count(self, obj):
        """Display count of pending invoices for this user (In Progress or Contested)"""
        from CareLink.models import Invoice, Patient
        
        # Check if user is a patient
        try:
            patient = Patient.objects.get(user=obj)
            pending_count = Invoice.objects.filter(
                patient=patient,
                status__in=['In Progress', 'Contested']
            ).count()
            
            if pending_count > 0:
                return format_html(
                    '<span style="color: red; font-weight: bold;">{} pending invoices</span>',
                    pending_count
                )
            else:
                return format_html(
                    '<span style="color: green;">No pending invoices</span>'
                )
        except Patient.DoesNotExist:
            return format_html(
                '<span style="color: gray;">Not a patient</span>'
            )
    unpaid_invoices_count.short_description = 'Pending Invoices'
    
    def has_delete_permission(self, request, obj=None):
        """Prevent deletion if user has pending invoices (In Progress or Contested)"""
        if obj is None:
            return super().has_delete_permission(request, obj)
        
        from CareLink.models import Invoice, Patient
        
        # Check if user is a patient
        try:
            patient = Patient.objects.get(user=obj)
            pending_invoices = Invoice.objects.filter(
                patient=patient,
                status__in=['In Progress', 'Contested']
            )
            
            if pending_invoices.exists():
                # Log the deletion attempt
                logger.warning(
                    f"USER DELETION BLOCKED - User: {obj.firstname} {obj.lastname} "
                    f"({obj.email}) - Reason: Has {pending_invoices.count()} pending invoices - "
                    f"Attempted by: {request.user.firstname} {request.user.lastname} "
                    f"({request.user.email})"
                )
                
                # Log to database for admin panel
                from .services.activity_logger import ActivityLogger
                ActivityLogger.log_unauthorized_access(
                    request.user,
                    'USER_DELETION_BLOCKED',
                    'User',
                    obj.id,
                    request.META.get('REMOTE_ADDR')
                )
                
                return False
        except Patient.DoesNotExist:
            # User is not a patient, allow deletion
            pass
        
        return super().has_delete_permission(request, obj)
    
    def delete_model(self, request, obj):
        """Log successful user deletion"""
        logger.info(
            f"USER DELETED - User: {obj.firstname} {obj.lastname} "
            f"({obj.email}) - Deleted by: {request.user.firstname} "
            f"{request.user.lastname} ({request.user.email})"
        )
        
        # Log to database for admin panel
        from .services.activity_logger import ActivityLogger
        ActivityLogger.log_unauthorized_access(
            request.user,
            'USER_DELETED',
            'User',
            obj.id,
            request.META.get('REMOTE_ADDR')
        )
        
        super().delete_model(request, obj)
    
    def delete_queryset(self, request, queryset):
        """Handle bulk deletion with invoice validation"""
        from CareLink.models import Invoice, Patient
        
        blocked_users = []
        allowed_users = []
        
        for user in queryset:
            try:
                patient = Patient.objects.get(user=user)
                pending_invoices = Invoice.objects.filter(
                    patient=patient,
                    status__in=['In Progress', 'Contested']
                )
                
                if pending_invoices.exists():
                    blocked_users.append({
                        'user': user,
                        'invoice_count': pending_invoices.count()
                    })
                else:
                    allowed_users.append(user)
            except Patient.DoesNotExist:
                allowed_users.append(user)
        
        # Log blocked deletions
        for blocked in blocked_users:
            logger.warning(
                f"BULK USER DELETION BLOCKED - User: {blocked['user'].firstname} "
                f"{blocked['user'].lastname} ({blocked['user'].email}) - "
                f"Reason: Has {blocked['invoice_count']} pending invoices - "
                f"Attempted by: {request.user.firstname} {request.user.lastname} "
                f"({request.user.email})"
            )
        
        # Only delete allowed users
        if allowed_users:
            super().delete_queryset(request, User.objects.filter(id__in=[u.id for u in allowed_users]))
        
        # Show message about blocked deletions
        if blocked_users:
            blocked_names = [f"{b['user'].firstname} {b['user'].lastname}" for b in blocked_users]
            self.message_user(
                request,
                f"Could not delete {len(blocked_users)} users with pending invoices: {', '.join(blocked_names)}",
                level='WARNING'
            )
        
        if allowed_users:
            self.message_user(
                request,
                f"Successfully deleted {len(allowed_users)} users without pending invoices."
            )
    
    def get_queryset(self, request):
        """Optimize queryset with related data"""
        return super().get_queryset(request).select_related()

@admin.register(Administrative)
class AdministrativeAdmin(admin.ModelAdmin):
    list_display = ('user_name', 'user_email', 'is_internal', 'user_role')
    list_filter = ('is_internal',)
    search_fields = ('user__firstname', 'user__lastname', 'user__email')
    
    def user_name(self, obj):
        return f"{obj.user.firstname} {obj.user.lastname}" if obj.user else "No User"
    user_name.short_description = 'Name'
    
    def user_email(self, obj):
        return obj.user.email if obj.user else "No Email"
    user_email.short_description = 'Email'
    
    def user_role(self, obj):
        return obj.user.role if obj.user else "No Role"
    user_role.short_description = 'Role'

@admin.register(ContestInvoice)
class ContestInvoiceAdmin(admin.ModelAdmin):
    list_display = ('invoice_id', 'created_at', 'user_name', 'reason', 'status')
    list_filter = ('status', 'created_at')
    search_fields = ('user__firstname', 'user__lastname', 'reason')
    readonly_fields = ('created_at',)
    
    def invoice_id(self, obj):
        return obj.invoice.id if obj.invoice else "No Invoice"
    invoice_id.short_description = 'Invoice ID'
    
    def user_name(self, obj):
        return f"{obj.user.firstname} {obj.user.lastname}" if obj.user else "No User"
    user_name.short_description = 'User'

@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ('name', 'price', 'description_short', 'contracts_count')
    search_fields = ('name', 'description')
    list_per_page = 25
    
    def description_short(self, obj):
        return obj.description[:50] + "..." if len(obj.description) > 50 else obj.description
    description_short.short_description = 'Description'
    
    def contracts_count(self, obj):
        return obj.contract_set.count()
    contracts_count.short_description = 'Active Contracts'

@admin.register(Contract)
class ContractAdmin(admin.ModelAdmin):
    list_display = ('user_name', 'service_name', 'created_at', 'salary', 'hour_quantity', 'type_contract')
    list_filter = ('type_contract', 'created_at')
    search_fields = ('user__firstname', 'user__lastname', 'service__name')
    readonly_fields = ('created_at',)
    
    def user_name(self, obj):
        return f"{obj.user.firstname} {obj.user.lastname}" if obj.user else "No User"
    user_name.short_description = 'User'
    
    def service_name(self, obj):
        return obj.service.name if obj.service else "No Service"
    service_name.short_description = 'Service'

@admin.register(Coordinator)
class CoordinatorAdmin(admin.ModelAdmin):
    list_display = ('user_name', 'user_email', 'is_internal', 'managed_demands_count')
    list_filter = ('is_internal',)
    search_fields = ('user__firstname', 'user__lastname', 'user__email')
    
    def user_name(self, obj):
        return f"{obj.user.firstname} {obj.user.lastname}" if obj.user else "No User"
    user_name.short_description = 'Name'
    
    def user_email(self, obj):
        return obj.user.email if obj.user else "No Email"
    user_email.short_description = 'Email'
    
    def managed_demands_count(self, obj):
        return obj.user.managed_demands.count() if obj.user else 0
    managed_demands_count.short_description = 'Managed Demands'

@admin.register(FamilyPatient)
class FamilyPatientAdmin(admin.ModelAdmin):
    list_display = ('patient_name', 'link', 'user_name')
    search_fields = ('patient__user__firstname', 'patient__user__lastname', 'user__firstname', 'user__lastname')
    
    def patient_name(self, obj):
        return f"{obj.patient.user.firstname} {obj.patient.user.lastname}" if obj.patient and obj.patient.user else "No Patient"
    patient_name.short_description = 'Patient'
    
    def user_name(self, obj):
        return f"{obj.user.firstname} {obj.user.lastname}" if obj.user else "No User"
    user_name.short_description = 'Family Member'

@admin.register(HelpdeskTicket)
class HelpdeskTicketAdmin(admin.ModelAdmin):
    list_display = ('subject', 'user_name', 'status', 'priority', 'created_at')
    list_filter = ('status', 'priority', 'created_at')
    search_fields = ('subject', 'user__firstname', 'user__lastname')
    readonly_fields = ('created_at',)
    
    def user_name(self, obj):
        return f"{obj.user.firstname} {obj.user.lastname}" if obj.user else "No User"
    user_name.short_description = 'User'

@admin.register(InformationProviding)
class InformationProvidingAdmin(admin.ModelAdmin):
    list_display = ('patient_name', 'provider_name', 'service_name', 'coordinator_name', 'price')
    search_fields = ('patient__user__firstname', 'patient__user__lastname', 'provider__user__firstname')
    
    def patient_name(self, obj):
        return f"{obj.patient.user.firstname} {obj.patient.user.lastname}" if obj.patient and obj.patient.user else "No Patient"
    patient_name.short_description = 'Patient'
    
    def provider_name(self, obj):
        return f"{obj.provider.user.firstname} {obj.provider.user.lastname}" if obj.provider and obj.provider.user else "No Provider"
    provider_name.short_description = 'Provider'
    
    def service_name(self, obj):
        return obj.service.name if obj.service else "No Service"
    service_name.short_description = 'Service'
    
    def coordinator_name(self, obj):
        return f"{obj.coordinator.user.firstname} {obj.coordinator.user.lastname}" if obj.coordinator and obj.coordinator.user else "No Coordinator"
    coordinator_name.short_description = 'Coordinator'

@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ('id', 'patient_name', 'created_at', 'status', 'amount', 'service_name')
    list_filter = ('status', 'created_at')
    search_fields = ('patient__user__firstname', 'patient__user__lastname', 'service__name')
    readonly_fields = ('created_at',)
    
    def patient_name(self, obj):
        return f"{obj.patient.user.firstname} {obj.patient.user.lastname}" if obj.patient and obj.patient.user else "No Patient"
    patient_name.short_description = 'Patient'
    
    def service_name(self, obj):
        return obj.service.name if obj.service else "No Service"
    service_name.short_description = 'Service'

@admin.register(MedicalFolder)
class MedicalFolderAdmin(admin.ModelAdmin):
    list_display = ('patient_name', 'created_at', 'updated_at', 'note_preview')
    search_fields = ('patient__user__firstname', 'patient__user__lastname', 'note')
    readonly_fields = ('created_at', 'updated_at')
    
    def patient_name(self, obj):
        return f"{obj.patient.user.firstname} {obj.patient.user.lastname}" if obj.patient and obj.patient.user else "No Patient"
    patient_name.short_description = 'Patient'
    
    def note_preview(self, obj):
        return obj.note[:50] + "..." if len(obj.note) > 50 else obj.note
    note_preview.short_description = 'Note Preview'

@admin.register(InternalNote)
class InternalNoteAdmin(admin.ModelAdmin):
    list_display = ('patient_name', 'created_by_name', 'created_at', 'is_critical', 'service_name', 'note_preview')
    list_filter = ('is_critical', 'created_at', 'service')
    search_fields = ('patient__user__firstname', 'patient__user__lastname', 'created_by__firstname', 'created_by__lastname', 'note')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-created_at',)
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('patient', 'service', 'is_critical')
        }),
        ('Note Content', {
            'fields': ('note',)
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def patient_name(self, obj):
        return f"{obj.patient.user.firstname} {obj.patient.user.lastname}" if obj.patient and obj.patient.user else "No Patient"
    patient_name.short_description = 'Patient'
    
    def created_by_name(self, obj):
        return f"{obj.created_by.firstname} {obj.created_by.lastname}" if obj.created_by else "System"
    created_by_name.short_description = 'Created By'
    
    def service_name(self, obj):
        return obj.service.name if obj.service else "No Service"
    service_name.short_description = 'Service'
    
    def note_preview(self, obj):
        return obj.note[:75] + "..." if len(obj.note) > 75 else obj.note
    note_preview.short_description = 'Note Preview'
    
    def save_model(self, request, obj, form, change):
        if not change:  # Only set created_by on creation
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

# Additional Models Admin

@admin.register(Provider)
class ProviderAdmin(admin.ModelAdmin):
    list_display = ('user_name', 'user_email', 'service_name', 'is_internal', 'schedules_count')
    list_filter = ('is_internal', 'service')
    search_fields = ('user__firstname', 'user__lastname', 'user__email', 'service__name')
    
    def user_name(self, obj):
        return f"{obj.user.firstname} {obj.user.lastname}" if obj.user else "No User"
    user_name.short_description = 'Name'
    
    def user_email(self, obj):
        return obj.user.email if obj.user else "No Email"
    user_email.short_description = 'Email'
    
    def service_name(self, obj):
        return obj.service.name if obj.service else "No Service"
    service_name.short_description = 'Service'
    
    def schedules_count(self, obj):
        return obj.schedule_set.count()
    schedules_count.short_description = 'Schedules'

@admin.register(ProvidingCare)
class ProvidingCareAdmin(admin.ModelAdmin):
    list_display = ('patient_name', 'provider_name', 'service_name', 'coordinator_name', 'created_at')
    list_filter = ('created_at', 'service')
    search_fields = ('patient__user__firstname', 'patient__user__lastname', 'provider__user__firstname')
    readonly_fields = ('created_at',)
    
    def patient_name(self, obj):
        return f"{obj.patient.user.firstname} {obj.patient.user.lastname}" if obj.patient and obj.patient.user else "No Patient"
    patient_name.short_description = 'Patient'
    
    def provider_name(self, obj):
        return f"{obj.provider.user.firstname} {obj.provider.user.lastname}" if obj.provider and obj.provider.user else "No Provider"
    provider_name.short_description = 'Provider'
    
    def service_name(self, obj):
        return obj.service.name if obj.service else "No Service"
    service_name.short_description = 'Service'
    
    def coordinator_name(self, obj):
        return f"{obj.coordinator.user.firstname} {obj.coordinator.user.lastname}" if obj.coordinator and obj.coordinator.user else "No Coordinator"
    coordinator_name.short_description = 'Coordinator'

@admin.register(Schedule)
class ScheduleAdmin(admin.ModelAdmin):
    list_display = ('date', 'patient_name', 'provider_name', 'timeslots_count', 'created_by_name', 'created_at')
    list_filter = ('date', 'created_at')
    search_fields = ('patient__user__firstname', 'patient__user__lastname', 'provider__user__firstname')
    readonly_fields = ('created_at',)
    filter_horizontal = ('time_slots',)
    
    def patient_name(self, obj):
        return f"{obj.patient.user.firstname} {obj.patient.user.lastname}" if obj.patient and obj.patient.user else "No Patient"
    patient_name.short_description = 'Patient'
    
    def provider_name(self, obj):
        return f"{obj.provider.user.firstname} {obj.provider.user.lastname}" if obj.provider and obj.provider.user else "No Provider"
    provider_name.short_description = 'Provider'
    
    def created_by_name(self, obj):
        return f"{obj.created_by.firstname} {obj.created_by.lastname}" if obj.created_by else "System"
    created_by_name.short_description = 'Created By'
    
    def timeslots_count(self, obj):
        return obj.time_slots.count()
    timeslots_count.short_description = 'Time Slots'

@admin.register(ServiceDemand)
class ServiceDemandAdmin(admin.ModelAdmin):
    list_display = ('title', 'patient_name', 'service_name', 'status', 'priority', 'created_at', 'is_urgent')
    list_filter = ('status', 'priority', 'created_at', 'contact_method', 'frequency')
    search_fields = ('title', 'description', 'patient__user__firstname', 'patient__user__lastname')
    readonly_fields = ('created_at', 'updated_at', 'reviewed_at', 'completed_at', 'days_since_created')
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'description', 'patient', 'sent_by', 'service')
        }),
        ('Request Details', {
            'fields': ('reason', 'priority', 'preferred_start_date', 'frequency', 'duration_weeks', 'preferred_time')
        }),
        ('Contact & Communication', {
            'fields': ('contact_method', 'emergency_contact', 'special_instructions')
        }),
        ('Status & Management', {
            'fields': ('status', 'managed_by', 'assigned_provider', 'coordinator_notes', 'rejection_reason', 'estimated_cost')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'reviewed_at', 'completed_at', 'days_since_created'),
            'classes': ('collapse',)
        }),
    )
    
    def patient_name(self, obj):
        return f"{obj.patient.user.firstname} {obj.patient.user.lastname}" if obj.patient and obj.patient.user else "No Patient"
    patient_name.short_description = 'Patient'
    
    def service_name(self, obj):
        return obj.service.name if obj.service else "No Service"
    service_name.short_description = 'Service'
    
    def is_urgent(self, obj):
        return obj.is_urgent
    is_urgent.boolean = True
    is_urgent.short_description = 'Urgent'
    
    actions = ['mark_as_approved', 'mark_as_in_progress', 'mark_as_completed']
    
    def mark_as_approved(self, request, queryset):
        count = queryset.update(status='Approved')
        logger.info(f"{count} service demands marked as approved by {request.user.email}")
        self.message_user(request, f"{count} service demands marked as approved.")
    mark_as_approved.short_description = "Mark selected demands as approved"
    
    def mark_as_in_progress(self, request, queryset):
        count = queryset.update(status='In Progress')
        logger.info(f"{count} service demands marked as in progress by {request.user.email}")
        self.message_user(request, f"{count} service demands marked as in progress.")
    mark_as_in_progress.short_description = "Mark selected demands as in progress"
    
    def mark_as_completed(self, request, queryset):
        count = queryset.update(status='Completed')
        logger.info(f"{count} service demands marked as completed by {request.user.email}")
        self.message_user(request, f"{count} service demands marked as completed.")
    mark_as_completed.short_description = "Mark selected demands as completed"

@admin.register(SocialAssistant)
class SocialAssistantAdmin(admin.ModelAdmin):
    list_display = ('user_name', 'user_email', 'is_internal', 'from_hospital')
    list_filter = ('is_internal',)
    search_fields = ('user__firstname', 'user__lastname', 'user__email', 'from_hospital')
    
    def user_name(self, obj):
        return f"{obj.user.firstname} {obj.user.lastname}" if obj.user else "No User"
    user_name.short_description = 'Name'
    
    def user_email(self, obj):
        return obj.user.email if obj.user else "No Email"
    user_email.short_description = 'Email'

@admin.register(StatusHistory)
class StatusHistoryAdmin(admin.ModelAdmin):
    list_display = ('content_type', 'user_name', 'previous_status', 'new_status', 'created_at')
    list_filter = ('content_type', 'previous_status', 'new_status', 'created_at')
    search_fields = ('user__firstname', 'user__lastname', 'content_type')
    readonly_fields = ('created_at',)
    
    def user_name(self, obj):
        return f"{obj.user.firstname} {obj.user.lastname}" if obj.user else "No User"
    user_name.short_description = 'User'

@admin.register(TimelineEventPatient)
class TimelineEventPatientAdmin(admin.ModelAdmin):
    list_display = ('patient_name', 'type_event', 'description_short', 'state', 'datetime', 'author_name')
    list_filter = ('type_event', 'state', 'datetime')
    search_fields = ('patient__user__firstname', 'patient__user__lastname', 'description', 'author__firstname')
    readonly_fields = ('datetime',)
    
    def patient_name(self, obj):
        return f"{obj.patient.user.firstname} {obj.patient.user.lastname}" if obj.patient and obj.patient.user else "No Patient"
    patient_name.short_description = 'Patient'
    
    def author_name(self, obj):
        return f"{obj.author.firstname} {obj.author.lastname}" if obj.author else "No Author"
    author_name.short_description = 'Author'
    
    def description_short(self, obj):
        return obj.description[:50] + "..." if len(obj.description) > 50 else obj.description
    description_short.short_description = 'Description'

@admin.register(TimeSlot)
class TimeSlotAdmin(admin.ModelAdmin):
    list_display = ('start_time', 'end_time', 'status', 'service_name', 'user_name', 'description_short')
    list_filter = ('status', 'start_time', 'service')
    search_fields = ('description', 'user__firstname', 'user__lastname', 'service__name')
    
    def service_name(self, obj):
        return obj.service.name if obj.service else "No Service"
    service_name.short_description = 'Service'
    
    def user_name(self, obj):
        return f"{obj.user.firstname} {obj.user.lastname}" if obj.user else "No User"
    user_name.short_description = 'User'
    
    def description_short(self, obj):
        return obj.description[:50] + "..." if obj.description and len(obj.description) > 50 else obj.description or "No Description"
    description_short.short_description = 'Description'

@admin.register(UserActionLog)
class UserActionLogAdmin(admin.ModelAdmin):
    list_display = (
        'user_name', 'action_type', 'target_model', 'target_id', 
        'affected_patient_name', 'affected_provider_name', 'created_at'
    )
    list_filter = ('action_type', 'target_model', 'created_at')
    search_fields = (
        'user__firstname', 'user__lastname', 'action_type', 'target_model',
        'affected_patient_name', 'affected_provider_name', 'description'
    )
    readonly_fields = ('created_at',)
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'action_type', 'created_at')
        }),
        ('Target Information', {
            'fields': ('target_model', 'target_id', 'description')
        }),
        ('Affected Parties', {
            'fields': ('affected_patient_name', 'affected_provider_name'),
            'classes': ('collapse',)
        }),
        ('Additional Data', {
            'fields': ('additional_data',),
            'classes': ('collapse',)
        }),
    )
    
    def user_name(self, obj):
        if obj.user:
            return f"{obj.user.firstname} {obj.user.lastname} ({obj.user.role})"
        return "Anonymous/System"
    user_name.short_description = 'User'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')
    
    def has_add_permission(self, request):
        return False  # Prevent manual creation of log entries
    
    def has_change_permission(self, request, obj=None):
        return False  # Prevent editing of log entries
    
    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser  # Only superusers can delete logs
    
    # Custom admin actions
    actions = ['export_recent_activities', 'clear_old_logs']
    
    def export_recent_activities(self, request, queryset):
        """Export recent activities to CSV"""
        import csv
        from django.http import HttpResponse
        from django.utils import timezone
        from datetime import timedelta
        
        # Get activities from last 7 days
        cutoff_date = timezone.now() - timedelta(days=7)
        recent_activities = UserActionLog.objects.filter(created_at__gte=cutoff_date)
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="user_activities_{timezone.now().strftime("%Y%m%d")}.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Timestamp', 'User', 'Action', 'Target', 'Description', 'IP Address'])
        
        for activity in recent_activities:
            ip_address = activity.additional_data.get('ip_address', 'N/A') if activity.additional_data else 'N/A'
            writer.writerow([
                activity.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                self.user_name(activity),
                activity.action_type,
                f"{activity.target_model} #{activity.target_id}" if activity.target_id else activity.target_model,
                activity.description,
                ip_address
            ])
        
        return response
    export_recent_activities.short_description = "Export recent activities to CSV"
    
    def clear_old_logs(self, request, queryset):
        """Clear logs older than 30 days"""
        from django.utils import timezone
        from datetime import timedelta
        
        cutoff_date = timezone.now() - timedelta(days=30)
        old_logs = UserActionLog.objects.filter(created_at__lt=cutoff_date)
        count = old_logs.count()
        old_logs.delete()
        
        self.message_user(request, f"Successfully deleted {count} log entries older than 30 days.")
    clear_old_logs.short_description = "Clear logs older than 30 days"
    
    # Custom list display for better readability
    def get_list_display(self, request):
        """Customize list display based on user permissions"""
        base_display = list(super().get_list_display(request))
        
        # Add action type color coding for better visibility
        if 'action_type' in base_display:
            base_display[base_display.index('action_type')] = 'colored_action_type'
        
        return base_display
    
    def colored_action_type(self, obj):
        """Display action type with color coding"""
        colors = {
            'LOGIN_SUCCESSFUL': 'green',
            'LOGOUT_SUCCESSFUL': 'blue',
            'LOGIN_FAILED': 'red',
            'UNAUTHORIZED_ACCESS': 'red',
            'TICKET_CREATED': 'green',
            'TICKET_UPDATED': 'orange',
            'TICKET_STATUS_CHANGED': 'purple',
            'TICKET_ASSIGNED': 'blue',
            'TICKET_COMMENT_CREATED': 'green',
            'TICKET_COMMENT_UPDATED': 'orange',
            'TICKET_COMMENT_DELETED': 'red',
            'INVOICE_GENERATED': 'green',
            'INVOICE_CONTESTED': 'red',
        }
        
        color = colors.get(obj.action_type, 'black')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.action_type
        )
    colored_action_type.short_description = 'Action Type'
    colored_action_type.admin_order_field = 'action_type'

@admin.register(UserToken)
class UserTokenAdmin(admin.ModelAdmin):
    list_display = ('user_name', 'created_at', 'access_token_expires_at', 'refresh_token_expires_at', 'revoked')
    list_filter = ('revoked', 'created_at', 'access_token_expires_at')
    search_fields = ('user__firstname', 'user__lastname', 'user__email')
    readonly_fields = ('created_at', 'access_token_hash', 'refresh_token_hash')
    
    def user_name(self, obj):
        return f"{obj.user.firstname} {obj.user.lastname}" if obj.user else "No User"
    user_name.short_description = 'User'
    
    actions = ['revoke_tokens']
    
    def revoke_tokens(self, request, queryset):
        count = queryset.update(revoked=True)
        logger.info(f"{count} user tokens revoked by {request.user.email}")
        self.message_user(request, f"{count} tokens have been revoked.")
    revoke_tokens.short_description = "Revoke selected tokens"


@admin.register(CookieConsent)
class CookieConsentAdmin(admin.ModelAdmin):
    list_display = ('user_display', 'consent_timestamp', 'consent_version', 'consent_status', 'expiry_status', 'consent_method')
    list_filter = ('consent_timestamp', 'consent_version', 'consent_method', 'analytics_cookies', 'marketing_cookies', 'functional_cookies')
    search_fields = ('user__email', 'user__firstname', 'user__lastname', 'user_identifier')
    readonly_fields = ('consent_timestamp', 'user_agent_snippet', 'ip_address_stored')
    
    fieldsets = (
        ('Consent Information', {
            'fields': ('user', 'user_identifier', 'consent_version', 'consent_timestamp', 'expiry_date')
        }),
        ('Cookie Preferences', {
            'fields': ('essential_cookies', 'analytics_cookies', 'marketing_cookies', 'functional_cookies')
        }),
        ('Technical Details', {
            'fields': ('page_url', 'consent_method', 'user_agent_snippet', 'ip_address_stored'),
            'classes': ('collapse',)
        }),
        ('Withdrawal Information', {
            'fields': ('withdrawn_at', 'withdrawal_reason'),
            'classes': ('collapse',)
        }),
    )
    
    def user_display(self, obj):
        if obj.user:
            return f"{obj.user.firstname} {obj.user.lastname} ({obj.user.email})"
        return f"Anonymous ({obj.user_identifier})"
    user_display.short_description = 'User'
    
    def consent_status(self, obj):
        if obj.withdrawn_at:
            return "🚫 Withdrawn"
        elif obj.is_expired:
            return "⏰ Expired"
        else:
            return "✅ Active"
    consent_status.short_description = 'Status'
    
    def expiry_status(self, obj):
        if obj.is_expired:
            return "Expired"
        days = obj.days_until_expiry
        if days <= 30:
            return f"⚠️ {days} days left"
        return f"{days} days left"
    expiry_status.short_description = 'Expires'
    
    def has_delete_permission(self, request, obj=None):
        # Prevent deletion of consent records for audit compliance
        return request.user.is_superuser
    
    def get_readonly_fields(self, request, obj=None):
        # Most fields should be readonly to maintain audit integrity
        if obj:  # Editing existing record
            return self.readonly_fields + (
                'user', 'user_identifier', 'consent_version', 'expiry_date',
                'essential_cookies', 'analytics_cookies', 'marketing_cookies', 
                'functional_cookies', 'page_url', 'consent_method'
            )
        return self.readonly_fields


# Admin site customization
admin.site.site_header = "CareLink Administration"
admin.site.site_title = "CareLink Admin"
admin.site.index_title = "CareLink Healthcare Management System"

# Enhanced Ticketing System Admin
@admin.register(TicketCategory)
class TicketCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'team_assignment', 'is_active')
    list_filter = ('team_assignment', 'is_active')
    search_fields = ('name', 'description')
    list_editable = ('is_active',)


@admin.register(EnhancedTicket)
class EnhancedTicketAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'created_by_name', 'assigned_team', 'assigned_to_name', 'status', 'priority', 'category', 'is_urgent', 'created_at', 'is_overdue')
    list_filter = ('status', 'priority', 'category', 'assigned_team', 'is_urgent', 'created_at')
    search_fields = ('title', 'description', 'created_by__firstname', 'created_by__lastname', 'assigned_to__firstname', 'assigned_to__lastname')
    readonly_fields = ('created_at', 'updated_at', 'resolved_at', 'cancelled_at', 'days_since_created', 'is_overdue')
    list_editable = ('status', 'priority')
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'description', 'category', 'priority', 'status')
        }),
        ('Team Assignment', {
            'fields': ('assigned_team', 'assigned_to')
        }),
        ('User Information', {
            'fields': ('created_by', 'updated_by')
        }),
        ('Additional Information', {
            'fields': ('is_urgent', 'internal_notes')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'resolved_at', 'cancelled_at', 'days_since_created'),
            'classes': ('collapse',)
        }),
    )
    
    def created_by_name(self, obj):
        return f"{obj.created_by.firstname} {obj.created_by.lastname}" if obj.created_by else "No User"
    created_by_name.short_description = 'Created By'
    
    def assigned_to_name(self, obj):
        return f"{obj.assigned_to.firstname} {obj.assigned_to.lastname}" if obj.assigned_to else "Unassigned"
    assigned_to_name.short_description = 'Assigned To'
    
    def is_overdue(self, obj):
        return obj.is_overdue
    is_overdue.boolean = True
    is_overdue.short_description = 'Overdue'
    
    actions = ['assign_to_coordinator', 'assign_to_administrator', 'mark_as_resolved', 'mark_as_cancelled']
    
    def assign_to_coordinator(self, request, queryset):
        queryset.update(assigned_team='Coordinator')
        self.message_user(request, f"{queryset.count()} tickets assigned to Coordinator team.")
    assign_to_coordinator.short_description = "Assign to Coordinator Team"
    
    def assign_to_administrator(self, request, queryset):
        queryset.update(assigned_team='Administrator')
        self.message_user(request, f"{queryset.count()} tickets assigned to Administrator team.")
    assign_to_administrator.short_description = "Assign to Administrator Team"
    
    def mark_as_resolved(self, request, queryset):
        queryset.update(status='Resolved')
        self.message_user(request, f"{queryset.count()} tickets marked as resolved.")
    mark_as_resolved.short_description = "Mark as Resolved"
    
    def mark_as_cancelled(self, request, queryset):
        queryset.update(status='Cancelled')
        self.message_user(request, f"{queryset.count()} tickets marked as cancelled.")
    mark_as_cancelled.short_description = "Mark as Cancelled"


@admin.register(TicketComment)
class TicketCommentAdmin(admin.ModelAdmin):
    list_display = ('ticket_id', 'created_by_name', 'comment_preview', 'is_internal', 'created_at')
    list_filter = ('is_internal', 'created_at')
    search_fields = ('comment', 'created_by__firstname', 'created_by__lastname', 'ticket__title')
    readonly_fields = ('created_at',)
    
    def ticket_id(self, obj):
        return f"#{obj.ticket.id}"
    ticket_id.short_description = 'Ticket ID'
    
    def created_by_name(self, obj):
        return f"{obj.created_by.firstname} {obj.created_by.lastname}" if obj.created_by else "System"
    created_by_name.short_description = 'Created By'
    
    def comment_preview(self, obj):
        return obj.comment[:100] + "..." if len(obj.comment) > 100 else obj.comment
    comment_preview.short_description = 'Comment Preview'


@admin.register(TicketStatusHistory)
class TicketStatusHistoryAdmin(admin.ModelAdmin):
    list_display = ('ticket_id', 'previous_status', 'new_status', 'changed_by_name', 'changed_at')
    list_filter = ('previous_status', 'new_status', 'changed_at')
    search_fields = ('ticket__title', 'changed_by__firstname', 'changed_by__lastname', 'notes')
    readonly_fields = ('changed_at',)
    
    def ticket_id(self, obj):
        return f"#{obj.ticket.id}"
    ticket_id.short_description = 'Ticket ID'
    
    def changed_by_name(self, obj):
        return f"{obj.changed_by.firstname} {obj.changed_by.lastname}" if obj.changed_by else "System"
    changed_by_name.short_description = 'Changed By'



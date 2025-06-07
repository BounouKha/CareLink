from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from django.urls import reverse
import logging
from CareLink.models import (
    Administrative, ContestInvoice, Service, Contract, Coordinator, FamilyPatient, 
    HelpdeskTicket, InformationProviding, Invoice, MedicalFolder, Patient, Payment, 
    Prescription, Provider, ProvidingCare, Schedule, ServiceDemand, SocialAssistant, 
    StatusHistory, TimelineEventPatient, TimeSlot, User, UserActionLog, UserToken
)

# Configure admin logging
logger = logging.getLogger('carelink.admin')

# Custom User Admin
@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('email', 'firstname', 'lastname', 'role', 'is_active', 'is_staff', 'created_at')
    list_filter = ('role', 'is_active', 'is_staff', 'is_admin', 'created_at')
    search_fields = ('email', 'firstname', 'lastname', 'national_number')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('firstname', 'lastname', 'birthdate', 'address', 'national_number')}),
        ('Role & Permissions', {'fields': ('role', 'is_active', 'is_staff', 'is_admin', 'is_superuser')}),
        ('Important dates', {'fields': ('created_at', 'updated_at', 'last_login')}),
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
    list_display = ('user_name', 'action_type', 'target_model', 'target_id', 'created_at')
    list_filter = ('action_type', 'target_model', 'created_at')
    search_fields = ('user__firstname', 'user__lastname', 'action_type', 'target_model')
    readonly_fields = ('created_at',)
    
    def user_name(self, obj):
        return f"{obj.user.firstname} {obj.user.lastname}" if obj.user else "No User"
    user_name.short_description = 'User'

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

# Admin site customization
admin.site.site_header = "CareLink Administration"
admin.site.site_title = "CareLink Admin"
admin.site.index_title = "CareLink Healthcare Management System"



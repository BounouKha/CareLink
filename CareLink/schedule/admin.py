from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from CareLink.models import Schedule, TimeSlot, Provider
import logging

logger = logging.getLogger('carelink.admin')

# Register additional schedule-specific admin configurations here if needed
# Note: Main admin configurations are in account/admin.py

class ScheduleAdminMixin:
    """
    Mixin for schedule-related admin functionality
    """
    
    def get_provider_link(self, obj):
        if obj.provider and obj.provider.user:
            url = reverse('admin:CareLink_provider_change', args=[obj.provider.id])
            return format_html('<a href="{}">{}</a>', url, f"{obj.provider.user.firstname} {obj.provider.user.lastname}")
        return "No Provider"
    get_provider_link.short_description = 'Provider'
    get_provider_link.allow_tags = True
    
    def get_patient_link(self, obj):
        if obj.patient and obj.patient.user:
            url = reverse('admin:CareLink_patient_change', args=[obj.patient.id])
            return format_html('<a href="{}">{}</a>', url, f"{obj.patient.user.firstname} {obj.patient.user.lastname}")
        return "No Patient"
    get_patient_link.short_description = 'Patient'
    get_patient_link.allow_tags = True

# Additional admin customizations for schedule module can be added here

from django.contrib import admin
from CareLink.models import Patient, User, MedicalFolder
from django.core.management import call_command

@admin.action(description='Anonymize selected patients and their user accounts')
def anonymize_patients(modeladmin, request, queryset):
    for patient in queryset:
        call_command('anonymize_patient', patient.id)

class PatientAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'is_anonymized')
    actions = [anonymize_patients]

admin.site.register(Patient, PatientAdmin) 
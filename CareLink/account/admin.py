from django.contrib import admin
from CareLink.models import Administrative, ContestInvoice, Service, Contract, Coordinator, FamilyPatient, HelpdeskTicket, InformationProviding, Invoice, MedicalFolder, Patient, Payment, Prescription

@admin.register(Administrative)
class AdministrativeAdmin(admin.ModelAdmin):
    list_display = ('user', 'is_internal')

@admin.register(ContestInvoice)
class ContestInvoiceAdmin(admin.ModelAdmin):
    list_display = ('invoice', 'created_at', 'user', 'reason', 'status')

@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ('name', 'price', 'description')

@admin.register(Contract)
class ContractAdmin(admin.ModelAdmin):
    list_display = ('user', 'service', 'created_at', 'salary', 'hour_quantity', 'type_contract')

@admin.register(Coordinator)
class CoordinatorAdmin(admin.ModelAdmin):
    list_display = ('user', 'is_internal')

@admin.register(FamilyPatient)
class FamilyPatientAdmin(admin.ModelAdmin):
    list_display = ('patient', 'link', 'user')

@admin.register(HelpdeskTicket)
class HelpdeskTicketAdmin(admin.ModelAdmin):
    list_display = ('user', 'subject', 'status', 'created_at', 'priority')

@admin.register(InformationProviding)
class InformationProvidingAdmin(admin.ModelAdmin):
    list_display = ('patient', 'provider', 'service', 'coordinator', 'price')

@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ('patient', 'created_at', 'status', 'amount', 'service')

@admin.register(MedicalFolder)
class MedicalFolderAdmin(admin.ModelAdmin):
    list_display = ('patient', 'created_at', 'updated_at', 'note')

@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ('user', 'gender', 'blood_type', 'emergency_contact', 'katz_score', 'it_score', 'illness', 'critical_information', 'medication', 'social_price', 'is_alive', 'spouse', 'deletion_requested_at')

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('patient', 'payment_token', 'amount', 'status', 'created_at')

@admin.register(Prescription)
class PrescriptionAdmin(admin.ModelAdmin):
    list_display = ('service', 'note', 'frequency', 'status')



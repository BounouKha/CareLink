from django.urls import path

from account.views.coordinator.patients import ViewsPatient
from .views.register import RegisterAPIView
from .views.login import LoginAPIView 
from .views.logout import LogoutAPIView
from account.views.profile import ProfileView
from .views.phoneuser import PhoneUserViewSet
from .views.familypatient import FamilyPatientViewSet
from account.views.medicalfolder import MedicalFolderViewSet
from rest_framework.routers import DefaultRouter
from .views.admin import AdminUserListView
from .views.edit_user import EditUserView
from .views.admin import AdminCreateUserView
from .views.check_admin import CheckAdminView
from .views.check_user import CheckUserRoleView
from .views.create_profile import CreateProfileView
from .views.service import ServiceListView
from .views.delete_user import DeleteUserView
from account.views.check_unpaid_invoices import CheckUnpaidInvoicesView
from account.views.profile_list import ProfileListView
from account.views.fetch_logic import FetchProfileView, EditProfileView
from account.views.refresh import CustomTokenRefreshView
from account.views.coordinator.update_patient import UpdatePatientView
from account.views.coordinator.medicalfolder_simple import MedicalFolderSimpleView
from account.views.coordinator.internalnote import InternalNoteView
from account.views.servicedemand import ServiceDemandListCreateView, ServiceDemandDetailView, ServiceDemandStatsView, ServiceDemandStatusUpdateView, ServiceDemandCommentView, FamilyPatientLinkedView
from account.views.logs import LogsView, LogStatsView
from account.views.consent import ConsentStorageView, UserConsentHistoryView, ConsentWithdrawalView, consent_audit_export, consent_stats, AdminConsentListView, admin_revoke_consent, user_consent_status
from account.views.patient_timeline import patient_timeline
from account.views.provider import (
    provider_list, provider_detail, provider_contracts, provider_stats, 
    available_users_for_provider, check_user_contract_status, 
    check_current_user_contract_status, provider_schedule, provider_absences,
    provider_all_absences, provider_absence_check, ContractViewSet, my_contracts, my_schedule, my_absences
)
from account.views.ticket import EnhancedTicketViewSet, TicketCommentViewSet, TicketStatusHistoryViewSet
from .views.invoice import InvoiceListView, InvoiceDetailView, InvoiceCreateView, MyInvoicesView, ContestInvoiceView, InvoiceLinesView, GenerateInvoicesView, CronGenerateInvoicesView, AdminInvoiceListView, RegenerateInvoiceView, ResolveContestView, CreateNewInvoiceAfterContestView
from account.views.profile_settings import ChangePasswordView, LoginHistoryView, PreferredContactMethodsView, AccountDeletionRequestView
from .views.appointment_comments import AppointmentCommentAPIView, CheckCommentPermissionAPIView, CoordinatorViewCommentsAPIView
from .views.patient_details import PatientDetailsView
from .views.patient_service_pricing import PatientServicePriceViewSet, PatientServicePriceDetailView, patients_list, services_list
from .views.notification_views import (
    NotificationListView, NotificationDetailView, NotificationStatsView,
    ScheduleChangeRequestView, NotificationPreferenceView,
    mark_all_notifications_read, clear_all_notifications, get_user_schedule_change_requests
)





router = DefaultRouter()
router.register(r'phoneuser', PhoneUserViewSet, basename='phoneuser')
router.register(r'familypatient', FamilyPatientViewSet, basename='familypatient')
router.register(r'medicalFolder', MedicalFolderViewSet, basename='medicalfolder')
router.register(r'contracts', ContractViewSet, basename='contract')
router.register(r'enhanced-tickets', EnhancedTicketViewSet, basename='enhanced_ticket')
router.register(r'ticket-comments', TicketCommentViewSet, basename='ticket_comment')
router.register(r'ticket-status-history', TicketStatusHistoryViewSet, basename='ticket_status_history')



urlpatterns = [
    path('register/', RegisterAPIView.as_view(), name='register'),
    path('login/', LoginAPIView.as_view(), name='login'),
    path('token/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', LogoutAPIView.as_view(), name='logout'),
    path('profile/', ProfileView.as_view(), name='profile'),

    
] + router.urls

urlpatterns += [
    path('users/', AdminUserListView.as_view(), name='admin_users'),
    path('edit-user/<int:user_id>/', EditUserView.as_view(), name='edit_user'),
    path('create-user/', AdminCreateUserView.as_view(), name='create_user'),
    path('check-admin/', CheckAdminView.as_view(), name='check_admin'),
    path('users/<int:user_id>/check/<str:role>/', CheckUserRoleView.as_view(), name='check_user_role'),
    path('users/<int:user_id>/create/<str:role>/', CreateProfileView.as_view(), name='create_profile'),
    path('services/', ServiceListView.as_view(), name='service_list'),
    path('delete-user/<int:user_id>/', DeleteUserView.as_view(), name='delete_user'),
    path('check-unpaid-invoices/<int:user_id>/', CheckUnpaidInvoicesView.as_view(), name='check_unpaid_invoices'),
    path('profiles/', ProfileListView.as_view(), name='profile_list'),
    path('profiles/<int:profile_id>/fetch/<str:role>/', FetchProfileView.as_view(), name='fetch_profile'),
    path('profiles/<int:profile_id>/edit/<str:role>/', EditProfileView.as_view(), name='edit_profile'),
    path('views_patient/', ViewsPatient.as_view(), name='views_patient'),
    path('update_patient/<int:patient_id>/', UpdatePatientView.as_view(), name='update_patient'),
    path('medical_folder/<int:patient_id>/', MedicalFolderSimpleView.as_view(), name='medical_folder'),
    path('internal_notes/<int:patient_id>/', InternalNoteView.as_view(), name='internal_notes'),
    # Service Demand URLs
    path('service-demands/', ServiceDemandListCreateView.as_view(), name='service_demand_list_create'),
    path('service-demands/<int:pk>/', ServiceDemandDetailView.as_view(), name='service_demand_detail'),
    path('service-demands/stats/', ServiceDemandStatsView.as_view(), name='service_demand_stats'),
    path('service-demands/<int:pk>/status/', ServiceDemandStatusUpdateView.as_view(), name='service_demand_status_update'),
    path('service-demands/<int:pk>/comment/', ServiceDemandCommentView.as_view(), name='service_demand_comment'),
    path('family-patient/linked-patient/', FamilyPatientLinkedView.as_view(), name='family_patient_linked'),    # Logs API endpoints
    path('logs/', LogsView.as_view(), name='logs'),
    path('logs/stats/', LogStatsView.as_view(), name='logs_stats'),
    
    # Consent API endpoints
    path('consent/storage/', ConsentStorageView.as_view(), name='consent_storage'),
    path('consent/history/', UserConsentHistoryView.as_view(), name='user_consent_history'),
    path('consent/withdrawal/', ConsentWithdrawalView.as_view(), name='consent_withdrawal'),
    path('consent/status/', user_consent_status, name='user_consent_status'),
    path('consent/audit/export/', consent_audit_export, name='consent_audit_export'),
    path('consent/stats/', consent_stats, name='consent_stats'),
    path('consent/admin/list/', AdminConsentListView.as_view(), name='admin_consent_list'),    path('consent/admin/revoke/<int:consent_id>/', admin_revoke_consent, name='admin_revoke_consent'),
      # Patient Timeline API endpoint
    path('patient/<int:patient_id>/timeline/', patient_timeline, name='patient_timeline'),    # Provider Management API endpoints
    path('providers/', provider_list, name='provider_list'),
    path('providers/<int:provider_id>/', provider_detail, name='provider_detail'),
    path('providers/<int:provider_id>/contracts/', provider_contracts, name='provider_contracts'),
    path('providers/<int:provider_id>/schedule/', provider_schedule, name='provider_schedule'),
    path('providers/<int:provider_id>/absences/', provider_absences, name='provider_absences'),
    path('providers/<int:provider_id>/all-absences/', provider_all_absences, name='provider_all_absences'),
    path('providers/<int:provider_id>/absence-check/', provider_absence_check, name='provider_absence_check'),
    path('providers/stats/', provider_stats, name='provider_stats'),
    path('providers/available-users/', available_users_for_provider, name='available_users_for_provider'),
    
    # Contract Validation API endpoints
    path('users/<int:user_id>/contract-status/', check_user_contract_status, name='check_user_contract_status'),
    path('users/my-contract-status/', check_current_user_contract_status, name='check_current_user_contract_status'),
    path('providers/my-contracts/', my_contracts, name='my_contracts'),
    path('providers/my-schedule/', my_schedule, name='my_schedule'),
    path('providers/my-absences/', my_absences, name='my_absences'),
    path('my-invoices/', MyInvoicesView.as_view(), name='my-invoices'),
    path('patients/<int:patient_id>/invoices/', InvoiceListView.as_view(), name='invoice-list'),
    path('patients/<int:patient_id>/invoices/create/', InvoiceCreateView.as_view(), name='invoice-create'),
    path('invoices/<int:id>/', InvoiceDetailView.as_view(), name='invoice-detail'),
    path('invoices/<int:invoice_id>/lines/', InvoiceLinesView.as_view(), name='invoice-lines'),
    path('invoices/<int:invoice_id>/contest/', ContestInvoiceView.as_view(), name='invoice-contest'),
    path('invoices/<int:invoice_id>/regenerate/', RegenerateInvoiceView.as_view(), name='regenerate-invoice'),
    path('invoices/<int:invoice_id>/resolve-contest/', ResolveContestView.as_view(), name='resolve-contest'),
    path('invoices/<int:invoice_id>/create-new-after-contest/', CreateNewInvoiceAfterContestView.as_view(), name='create-new-invoice-after-contest'),
    path('invoices/admin/', AdminInvoiceListView.as_view(), name='admin-invoices'),
    path('invoices/generate/', GenerateInvoicesView.as_view(), name='generate-invoices'),
    path('invoices/cron-generate/', CronGenerateInvoicesView.as_view(), name='cron-generate-invoices'),
    path('profile/change-password/', ChangePasswordView.as_view(), name='change_password'),
    path('profile/login-history/', LoginHistoryView.as_view(), name='login_history'),
    path('profile/contact-preferences/', PreferredContactMethodsView.as_view(), name='contact_preferences'),
    path('profile/delete-account/', AccountDeletionRequestView.as_view(), name='delete_account'),
    path('appointment-comments/', AppointmentCommentAPIView.as_view(), name='appointment-comments-list'),
    path('appointment-comments/<int:timeslot_id>/', AppointmentCommentAPIView.as_view(), name='appointment-comments'),
    path('appointment-comments/<int:timeslot_id>/check-permission/', CheckCommentPermissionAPIView.as_view(), name='check-comment-permission'),
    path('coordinator-comments/<int:timeslot_id>/', CoordinatorViewCommentsAPIView.as_view(), name='coordinator-comments'),
    path('patient-details/<int:patient_id>/', PatientDetailsView.as_view(), name='patient-details'),
    
    # Notification System API endpoints
    path('notifications/', NotificationListView.as_view(), name='notification-list'),
    path('notifications/<int:notification_id>/', NotificationDetailView.as_view(), name='notification-detail'),
    path('notifications/stats/', NotificationStatsView.as_view(), name='notification-stats'),
    path('notifications/mark-all-read/', mark_all_notifications_read, name='mark-all-notifications-read'),
    path('notifications/clear-all/', clear_all_notifications, name='clear-all-notifications'),
    path('notifications/preferences/', NotificationPreferenceView.as_view(), name='notification-preferences'),
    
    # Schedule Change Request API endpoints
    path('schedule-change-requests/', ScheduleChangeRequestView.as_view(), name='schedule-change-request'),
    path('schedule-change-requests/my-requests/', get_user_schedule_change_requests, name='my-schedule-change-requests'),
    
    # Patient Service Pricing API endpoints
    path('patient-service-prices/', PatientServicePriceViewSet.as_view(), name='patient-service-prices'),
    path('patient-service-prices/<int:pk>/', PatientServicePriceDetailView.as_view(), name='patient-service-price-detail'),
    path('pricing/patients/', patients_list, name='pricing-patients-list'),
    path('pricing/services/', services_list, name='pricing-services-list'),
]
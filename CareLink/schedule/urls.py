from django.urls import path
from .views import (
    ScheduleCalendarView, 
    QuickScheduleView, 
    ScheduleAvailabilityView, 
    AppointmentManagementView,
    PatientScheduleView,
    PatientAppointmentDetailView,
    FamilyPatientScheduleView,
    FamilyPatientAppointmentDetailView,
    RecurringScheduleView,
    ConflictCheckView,
    PrescriptionOptionsView
)

app_name = 'schedule'

urlpatterns = [
    # Schedule Management URLs (for Coordinators and Admin)
    path('calendar/', ScheduleCalendarView.as_view(), name='schedule_calendar'),
    path('quick-schedule/', QuickScheduleView.as_view(), name='quick_schedule'),
    path('recurring-schedule/', RecurringScheduleView.as_view(), name='recurring_schedule'),
    path('availability/', ScheduleAvailabilityView.as_view(), name='schedule_availability'),
    path('appointment/<int:appointment_id>/', AppointmentManagementView.as_view(), name='appointment_management'),
    path('check-conflicts/', ConflictCheckView.as_view(), name='check_conflicts'),
    path('prescriptions/', PrescriptionOptionsView.as_view(), name='prescription_options'),
    
    # Patient Schedule URLs (for Patients)
    path('patient/schedule/', PatientScheduleView.as_view(), name='patient_schedule'),
    path('patient/appointment/<int:appointment_id>/', PatientAppointmentDetailView.as_view(), name='patient_appointment_detail'),
    
    # Family Patient Schedule URLs (for Family Members)
    path('family/schedule/', FamilyPatientScheduleView.as_view(), name='family_patient_schedule'),
    path('family/appointment/<int:appointment_id>/', FamilyPatientAppointmentDetailView.as_view(), name='family_patient_appointment_detail'),
]

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





router = DefaultRouter()
router.register(r'phoneuser', PhoneUserViewSet, basename='phoneuser')
router.register(r'familypatient', FamilyPatientViewSet, basename='familypatient')
router.register(r'medicalFolder', MedicalFolderViewSet, basename='medicalfolder')



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


]
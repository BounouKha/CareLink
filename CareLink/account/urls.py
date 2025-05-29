from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
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




router = DefaultRouter()
router.register(r'phoneuser', PhoneUserViewSet, basename='phoneuser')
router.register(r'familypatient', FamilyPatientViewSet, basename='familypatient')
router.register(r'medicalFolder', MedicalFolderViewSet, basename='medicalfolder')



urlpatterns = [
    path('register/', RegisterAPIView.as_view(), name='register'),
    path('login/', LoginAPIView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', LogoutAPIView.as_view(), name='logout'),
    path('profile/', ProfileView.as_view(), name='profile'),

    
] + router.urls

urlpatterns += [
    path('users/', AdminUserListView.as_view(), name='admin_users'),
    path('edit-user/<int:user_id>/', EditUserView.as_view(), name='edit_user'),
    path('create-user/', AdminCreateUserView.as_view(), name='create_user'),
    path('check-admin/', CheckAdminView.as_view(), name='check_admin'),
]
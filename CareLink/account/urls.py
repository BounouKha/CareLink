from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views.register import RegisterAPIView
from .views.login import LoginAPIView 
from .views.logout import LogoutAPIView
from account.views.profile import ProfileView
from .views.phoneuser import PhoneUserViewSet
from .views.familypatient import FamilyPatientViewSet
from rest_framework.routers import DefaultRouter




router = DefaultRouter()
router.register(r'phoneuser', PhoneUserViewSet, basename='phoneuser')
router.register(r'familypatient', FamilyPatientViewSet, basename='familypatient')



urlpatterns = [
    path('register/', RegisterAPIView.as_view(), name='register'),
    path('login/', LoginAPIView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', LogoutAPIView.as_view(), name='logout'),
    path('profile/', ProfileView.as_view(), name='profile'),

    
] + router.urls
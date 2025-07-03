from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings
from CareLink.models import CookieConsent
import logging
from datetime import datetime
from ..services.activity_logger import ActivityLogger

logger = logging.getLogger('carelink')

class LoginAPIView(APIView):
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        
        # Get client IP address
        client_ip = self.get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', 'Unknown')

        # Debugging: Log email and password
        print("[DEBUG] Email:", email)
        print("[DEBUG] Password:", password)

        if not email or not password:
            logger.warning(
                f"LOGIN FAILED - Missing credentials - IP: {client_ip}, "
                f"User Agent: {user_agent[:100]}"
            )
            print("[DEBUG] Missing email or password.")
            return Response({"error": "Email and password are required."}, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(request, email=email, password=password)

        if user is not None:
            # Log successful login
            logger.info(
                f"LOGIN SUCCESSFUL - User: {user.firstname} {user.lastname} "
                f"({user.email}) - Role: {user.role} - IP: {client_ip} - "
                f"User Agent: {user_agent[:100]}"
            )
            
            # Log to database for admin panel
            ActivityLogger.log_login(user, client_ip, user_agent)
            
            # Debugging: Log successful authentication
            print("[DEBUG] User authenticated:", user)

            # 🍪 Link anonymous consent to user account (if any exists)
            anonymous_id = request.data.get('anonymous_consent_id')
            if anonymous_id:
                try:
                    # Find anonymous consent record and link it to user
                    anonymous_consent = CookieConsent.objects.filter(
                        user_identifier=anonymous_id,
                        user__isnull=True
                    ).first()
                    
                    if anonymous_consent:
                        anonymous_consent.user = user
                        anonymous_consent.save()
                        logger.info(f"CONSENT: Linked anonymous consent {anonymous_id} to user {user.email}")                        
                        print(f"[DEBUG] CONSENT: Linked anonymous consent to user: {user.email}")
                except Exception as e:
                    logger.warning(f"CONSENT: Failed to link anonymous consent: {str(e)}")
                    print(f"[DEBUG] CONSENT: Failed to link consent: {str(e)}")

            refresh = RefreshToken.for_user(user)
            refresh['is_superuser'] = user.is_superuser  # Embed superuser status in the token
            print("[DEBUG] Access Token:", str(refresh.access_token))
            print("[DEBUG] Refresh Token:", str(refresh))

            # Create response with existing JSON data (backward compatibility)
            response = Response({
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "is_superuser": user.is_superuser,  # Include superuser status
            }, status=status.HTTP_200_OK)
            
            # 🍪 Add HttpOnly cookie for enhanced security
            # Set refresh token as secure HttpOnly cookie
            response.set_cookie(
                'carelink_refresh',
                str(refresh),
                max_age=12 * 60 * 60,  # 12 hours (matches your JWT settings)
                secure=not settings.DEBUG,  # HTTPS only in production
                httponly=True,  # Prevent XSS attacks
                samesite='Strict',  # CSRF protection
                path='/'
            )
            
            print("[DEBUG] 🍪 Refresh token set in HttpOnly cookie")
            return response
        else:
            # Log failed login attempt
            logger.warning(
                f"LOGIN FAILED - Invalid credentials for email: {email} - "
                f"IP: {client_ip} - User Agent: {user_agent[:100]}"
            )
            
            # Log to database for admin panel
            ActivityLogger.log_login_failed(email, client_ip, user_agent)
            
            # Debugging: Log failed authentication
            print("[DEBUG] Invalid credentials.")
            return Response({"error": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)
    
    def get_client_ip(self, request):
        """Get the client's IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
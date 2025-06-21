from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings
from CareLink.models import CookieConsent
import logging

logger = logging.getLogger('carelink')

class LoginAPIView(APIView):
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')

        # Debugging: Log email and password
        print("[DEBUG] Email:", email)
        print("[DEBUG] Password:", password)

        if not email or not password:
            print("[DEBUG] Missing email or password.")
            return Response({"error": "Email and password are required."}, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(request, email=email, password=password)

        if user is not None:
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
            # Debugging: Log failed authentication
            print("[DEBUG] Invalid credentials.")
            return Response({"error": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)
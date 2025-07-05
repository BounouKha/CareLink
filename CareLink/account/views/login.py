from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings
from CareLink.models import CookieConsent, User
import logging
from datetime import datetime
from ..services.activity_logger import ActivityLogger
from django.utils import timezone

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

        # Check if user exists and if account is locked
        try:
            user_obj = User.objects.get(email=email)
            
            # Check account status (this will auto-unlock if time has expired)
            is_locked = user_obj.is_account_locked()
            
            # Check if account is hard-blocked (10+ attempts and is_active=False)
            if user_obj.failed_login_attempts >= 10 and not user_obj.is_active and is_locked:
                lockout_info = user_obj.get_lockout_info()
                logger.warning(
                    f"LOGIN BLOCKED - Account hard-blocked for email: {email} - "
                    f"Failed attempts: {user_obj.failed_login_attempts} - "
                    f"IP: {client_ip} - User Agent: {user_agent[:100]}"
                )
                ActivityLogger.log_login_failed(email, client_ip, user_agent)
                
                return Response({
                    "error": "Your account is blocked, contact administrator.",
                    "lockout_info": {
                        "minutes_remaining": lockout_info['minutes_remaining'],
                        "locked_until": lockout_info['locked_until'].isoformat() if lockout_info['locked_until'] else None
                    }
                }, status=status.HTTP_423_LOCKED)
            
            # Check if account has soft warning (5+ attempts but still active)
            elif is_locked and user_obj.failed_login_attempts >= 5:
                lockout_info = user_obj.get_lockout_info()
                logger.warning(
                    f"LOGIN WARNING - Account soft-locked for email: {email} - "
                    f"Failed attempts: {user_obj.failed_login_attempts} - "
                    f"IP: {client_ip} - User Agent: {user_agent[:100]}"
                )
                ActivityLogger.log_login_failed(email, client_ip, user_agent)
                
                return Response({
                    "error": "Too many failed attempts. Please wait before trying again.",
                    "lockout_info": {
                        "minutes_remaining": lockout_info['minutes_remaining'],
                        "locked_until": lockout_info['locked_until'].isoformat() if lockout_info['locked_until'] else None
                    }
                }, status=status.HTTP_423_LOCKED)
                
        except User.DoesNotExist:
            # User doesn't exist, but we still proceed to authenticate to avoid user enumeration
            pass

        user = authenticate(request, email=email, password=password)

        if user is not None:
            # Reset failed login attempts on successful login
            user.reset_failed_login_attempts()
            
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
            # Increment failed login attempts for existing users
            try:
                user_obj = User.objects.get(email=email)
                user_obj.increment_failed_login()
                
                # Check if account is now hard-blocked (10+ attempts)
                if user_obj.failed_login_attempts >= 10 and not user_obj.is_active:
                    lockout_info = user_obj.get_lockout_info()
                    logger.warning(
                        f"LOGIN FAILED - Account now hard-blocked after {user_obj.failed_login_attempts} attempts - "
                        f"Email: {email} - IP: {client_ip} - User Agent: {user_agent[:100]}"
                    )
                    ActivityLogger.log_login_failed(email, client_ip, user_agent)
                    
                    return Response({
                        "error": "Account blocked due to many bad information.",
                        "lockout_info": {
                            "minutes_remaining": lockout_info['minutes_remaining'],
                            "locked_until": lockout_info['locked_until'].isoformat() if lockout_info['locked_until'] else None
                        }
                    }, status=status.HTTP_423_LOCKED)
                
                # Check if account has soft warning (5+ attempts but still active)
                elif user_obj.is_account_locked() and user_obj.failed_login_attempts >= 5:
                    lockout_info = user_obj.get_lockout_info()
                    logger.warning(
                        f"LOGIN FAILED - Account soft-locked after {user_obj.failed_login_attempts} attempts - "
                        f"Email: {email} - IP: {client_ip} - User Agent: {user_agent[:100]}"
                    )
                    ActivityLogger.log_login_failed(email, client_ip, user_agent)
                    
                    return Response({
                        "error": "Too many failed attempts. Please wait before trying again.",
                        "lockout_info": {
                            "minutes_remaining": lockout_info['minutes_remaining'],
                            "locked_until": lockout_info['locked_until'].isoformat() if lockout_info['locked_until'] else None
                        }
                    }, status=status.HTTP_423_LOCKED)
                else:
                    # Account not locked yet, show remaining attempts
                    remaining_attempts = 5 - user_obj.failed_login_attempts
                    if remaining_attempts > 0:
                        logger.warning(
                            f"LOGIN FAILED - Invalid credentials for email: {email} - "
                            f"Attempt {user_obj.failed_login_attempts}/5 - "
                            f"IP: {client_ip} - User Agent: {user_agent[:100]}"
                        )
                        ActivityLogger.log_login_failed(email, client_ip, user_agent)
                        
                        return Response({
                            "error": "Invalid credentials.",
                            "warning": f"Account will be temporarily locked after {remaining_attempts} more failed attempts."
                        }, status=status.HTTP_401_UNAUTHORIZED)
                    else:
                        # This shouldn't happen due to the logic above, but just in case
                        return Response({"error": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)
                    
            except User.DoesNotExist:
                # User doesn't exist - don't reveal this information
                                 logger.warning(
                     f"LOGIN FAILED - Invalid credentials for email: {email} - "
                     f"IP: {client_ip} - User Agent: {user_agent[:100]}"
                 )
            ActivityLogger.log_login_failed(email, client_ip, user_agent)
                
            return Response({"error": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)
    
    def get_client_ip(self, request):
        """Get the client's IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
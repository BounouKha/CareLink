from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from account.serializers.register import RegisterSerializer
from account.serializers.email_verification import VerifyEmailSerializer, ResendVerificationSerializer
from account.services.email_service import EmailService
from account.services.profile_verification_service import ProfileVerificationService
from CareLink.models import EmailVerification, Patient, FamilyPatient, Provider
import logging

logger = logging.getLogger(__name__)

class RegisterAPIView(APIView):
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            
            # Auto-create minimal profile based on user role
            try:
                if user.role == 'Patient':
                    # Create minimal Patient profile
                    patient = Patient.objects.create(
                        user=user,
                        gender='O',  # Default to 'Other', to be updated later
                        blood_type=None,
                        katz_score=None,
                        it_score=None,
                        illness=None,
                        critical_information=None,
                        medication=None,
                        social_price=False,
                        is_alive=True,
                        doctor_name=None,
                        doctor_address=None,
                        doctor_phone=None,
                        doctor_email=None
                    )
                    logger.info(f"✅ Minimal Patient profile created for {user.email} (ID: {patient.id})")
                    
                elif user.role == 'Family Patient':
                    # For Family Patient, we need to create both Patient and FamilyPatient
                    # Create minimal Patient profile first
                    patient = Patient.objects.create(
                        user=user,
                        gender='O',  # Default to 'Other', to be updated later
                        blood_type=None,
                        katz_score=None,
                        it_score=None,
                        illness=None,
                        critical_information=None,
                        medication=None,
                        social_price=False,
                        is_alive=True,
                        doctor_name=None,
                        doctor_address=None,
                        doctor_phone=None,
                        doctor_email=None
                    )
                    
                    # Create FamilyPatient link (will be completed later with actual patient link)
                    family_patient = FamilyPatient.objects.create(
                        user=user,
                        patient=None,  # To be linked later
                        link=''  # To be specified later (spouse, child, parent, etc.)
                    )
                    logger.info(f"✅ Minimal Patient and FamilyPatient profiles created for {user.email}")
                    
                elif user.role == 'Provider':
                    # Create minimal Provider profile
                    provider = Provider.objects.create(
                        user=user,
                        service=None,  # To be assigned later
                        is_internal=True
                    )
                    logger.info(f"✅ Minimal Provider profile created for {user.email} (ID: {provider.id})")
                    
            except Exception as profile_error:
                logger.error(f"❌ Failed to create minimal profile for {user.email}: {str(profile_error)}")
                # Continue with registration even if profile creation fails
            
            # Send verification email
            try:
                verification = EmailVerification.objects.get(user=user)
                email_service = EmailService()
                
                result = email_service.send_verification_email(
                    user=user,
                    verification_code=verification.verification_code
                )
                
                if result.get('success'):
                    logger.info(f"Verification email sent to {user.email}")
                    
                    # Create profile activation ticket if user role requires profile setup
                    if user.role in ['Patient', 'Family Patient', 'Provider']:
                        try:
                            ticket = ProfileVerificationService.create_profile_activation_ticket(user)
                            if ticket:
                                logger.info(f"Profile activation ticket created for {user.email}: {ticket.id}")
                        except Exception as ticket_error:
                            logger.error(f"Failed to create profile activation ticket for {user.email}: {str(ticket_error)}")
                    
                    return Response({
                        "message": "User registered successfully. Please check your email for verification code.",
                        "email": user.email,
                        "verification_required": True
                    }, status=status.HTTP_201_CREATED)
                else:
                    logger.error(f"Failed to send verification email to {user.email}: {result}")
                    return Response({
                        "message": "User registered but email sending failed. Please contact support.",
                        "email": user.email,
                        "verification_required": True
                    }, status=status.HTTP_201_CREATED)
                    
            except Exception as e:
                logger.error(f"Error sending verification email: {str(e)}")
                return Response({
                    "message": "User registered but email sending failed. Please contact support.",
                    "email": user.email,
                    "verification_required": True
                }, status=status.HTTP_201_CREATED)
        
        return Response(self._transform_error_messages(serializer.errors), status=status.HTTP_400_BAD_REQUEST)

    def _transform_error_messages(self, errors):
        """Transform Django's default error messages to more user-friendly ones"""
        transformed_errors = {}
        
        for field, messages in errors.items():
            if field == 'email':
                new_messages = []
                for message in messages:
                    if 'already exists' in str(message).lower() or 'unique' in str(message).lower():
                        new_messages.append('This email is already registered. Please use a different email or try logging in.')
                    else:
                        new_messages.append(str(message))
                transformed_errors[field] = new_messages
            elif field == 'national_number':
                new_messages = []
                for message in messages:
                    if 'already exists' in str(message).lower() or 'unique' in str(message).lower():
                        new_messages.append('This national number is already associated with another account. Please contact support if you believe this is an error.')
                    else:
                        new_messages.append(str(message))
                transformed_errors[field] = new_messages
            else:
                transformed_errors[field] = messages
        
        return transformed_errors


class VerifyEmailAPIView(APIView):
    def post(self, request):
        serializer = VerifyEmailSerializer(data=request.data)
        if serializer.is_valid():
            try:
                user = serializer.verify_email()
                logger.info(f"Email verified successfully for user: {user.email}")
                
                return Response({
                    "message": "Email verified successfully. Your account is now active.",
                    "user": {
                        "email": user.email,
                        "firstname": user.firstname,
                        "lastname": user.lastname,
                        "role": user.role
                    }
                }, status=status.HTTP_200_OK)
                
            except Exception as e:
                logger.error(f"Error verifying email: {str(e)}")
                return Response({
                    "error": "An error occurred during verification. Please try again."
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ResendVerificationAPIView(APIView):
    def post(self, request):
        serializer = ResendVerificationSerializer(data=request.data)
        if serializer.is_valid():
            try:
                user, new_code = serializer.resend_verification()
                
                # Send new verification email
                email_service = EmailService()
                result = email_service.send_verification_reminder_email(
                    user=user,
                    verification_code=new_code
                )
                
                if result.get('success'):
                    logger.info(f"Verification code resent to {user.email}")
                    return Response({
                        "message": "New verification code sent to your email.",
                        "email": user.email
                    }, status=status.HTTP_200_OK)
                else:
                    logger.error(f"Failed to resend verification email to {user.email}")
                    return Response({
                        "error": "Failed to send verification email. Please try again later."
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                    
            except Exception as e:
                logger.error(f"Error resending verification: {str(e)}")
                return Response({
                    "error": "An error occurred. Please try again."
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
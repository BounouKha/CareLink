from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.utils import timezone
from django.db.models import Q
from CareLink.models import UserActionLog, EnhancedTicket, Invoice, Patient
from account.models import UserPreferences
import json
import re
from datetime import datetime, timedelta

class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Change user password with validation"""
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')
        confirm_password = request.data.get('confirm_password')
        
        if not all([current_password, new_password, confirm_password]):
            return Response({
                'error': 'All password fields are required.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if current password is correct
        if not request.user.check_password(current_password):
            return Response({
                'error': 'Current password is incorrect.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if new passwords match
        if new_password != confirm_password:
            return Response({
                'error': 'New passwords do not match.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate password strength
        password_errors = self.validate_password_strength(new_password)
        if password_errors:
            return Response({
                'error': 'Password does not meet security requirements.',
                'details': password_errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update password
        request.user.set_password(new_password)
        request.user.save()
        
        # Log the password change
        UserActionLog.objects.create(
            user=request.user,
            action_type='PASSWORD_CHANGED',
            target_model='User',
            target_id=request.user.id,
            description=f"Password changed for user {request.user.email}",
            additional_data=json.dumps({
                'changed_via': 'profile_settings',
                'timestamp': timezone.now().isoformat()
            })
        )
        
        return Response({
            'message': 'Password changed successfully.',
            'strength': self.get_password_strength(new_password)
        })
    
    def validate_password_strength(self, password):
        """Validate password strength requirements"""
        errors = []
        
        if len(password) < 8:
            errors.append("Password must be at least 8 characters long")
        
        if not re.search(r'[A-Z]', password):
            errors.append("Password must contain at least one uppercase letter")
        
        if not re.search(r'[a-z]', password):
            errors.append("Password must contain at least one lowercase letter")
        
        if not re.search(r'[0-9]', password):
            errors.append("Password must contain at least one digit")
        
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            errors.append("Password must contain at least one special character")
        
        return errors
    
    def get_password_strength(self, password):
        """Calculate password strength score"""
        score = 0
        
        # Length bonus
        if len(password) >= 8:
            score += 1
        if len(password) >= 12:
            score += 1
        
        # Character variety bonus
        if re.search(r'[A-Z]', password):
            score += 1
        if re.search(r'[a-z]', password):
            score += 1
        if re.search(r'[0-9]', password):
            score += 1
        if re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            score += 1
        
        # Determine strength level
        if score <= 2:
            return "weak"
        elif score <= 4:
            return "medium"
        elif score <= 6:
            return "strong"
        else:
            return "very_strong"

class LoginHistoryView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get user's login history"""
        try:
            # Get login history from UserActionLog
            login_logs = UserActionLog.objects.filter(
                user=request.user,
                action_type__in=['LOGIN_SUCCESSFUL', 'LOGIN']
            ).order_by('-created_at')[:50]  # Last 50 logins
            
            history = []
            for log in login_logs:
                try:
                    additional_data = json.loads(log.additional_data) if log.additional_data else {}
                except (json.JSONDecodeError, TypeError):
                    additional_data = {}
                    
                history.append({
                    'timestamp': log.created_at.isoformat(),
                    'ip_address': additional_data.get('ip_address', 'Unknown'),
                    'user_agent': additional_data.get('user_agent', 'Unknown')[:100],
                    'success': True,  # Since we're only getting successful logins
                    'location': additional_data.get('location', 'Unknown')
                })
            
            return Response({
                'login_history': history,
                'total_logins': len(history)
            })
            
        except Exception as e:
            return Response({
                'error': 'Failed to retrieve login history.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PreferredContactMethodsView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get user's preferred contact methods"""
        try:
            # Get or create user preferences
            preferences, created = UserPreferences.objects.get_or_create(user=request.user)
            
            # Get primary phone if exists
            primary_phone = None
            if preferences.primary_phone_contact:
                primary_phone = {
                    'id': preferences.primary_phone_contact.id,
                    'phone_number': preferences.primary_phone_contact.phone_number,
                    'name': preferences.primary_phone_contact.name or 'Primary Phone'
                }
            
            # Get all user's phone numbers for selection
            user_phones = []
            if hasattr(request.user, 'phone_numbers'):
                user_phones = [
                    {
                        'id': phone.id,
                        'phone_number': phone.phone_number,
                        'name': phone.name or 'Phone',
                        'is_primary': phone.is_primary
                    }
                    for phone in request.user.phone_numbers.all()
                ]
            
            response_data = {
                'email_notifications': preferences.email_notifications,
                'sms_notifications': preferences.sms_notifications,
                'appointment_reminders': preferences.appointment_reminders,
                'billing_notifications': preferences.billing_notifications,
                'medical_alerts': preferences.medical_alerts,
                'marketing_communications': preferences.marketing_communications,
                'preferred_contact_method': preferences.preferred_contact_method,
                'primary_phone_contact': primary_phone,
                'available_phones': user_phones,
                'emergency_contact': {
                    'name': preferences.emergency_contact_name,
                    'phone': preferences.emergency_contact_phone,
                    'relationship': preferences.emergency_contact_relationship
                }
            }
            
            return Response(response_data)
            
        except Exception as e:
            return Response({
                'error': 'Failed to retrieve contact preferences.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def post(self, request):
        """Update user's preferred contact methods"""
        try:
            # Get or create user preferences
            preferences, created = UserPreferences.objects.get_or_create(user=request.user)
            
            data = request.data
            
            # Update notification preferences
            if 'email_notifications' in data:
                preferences.email_notifications = data['email_notifications']
            if 'sms_notifications' in data:
                preferences.sms_notifications = data['sms_notifications']
            if 'appointment_reminders' in data:
                preferences.appointment_reminders = data['appointment_reminders']
            if 'billing_notifications' in data:
                preferences.billing_notifications = data['billing_notifications']
            if 'medical_alerts' in data:
                preferences.medical_alerts = data['medical_alerts']
            if 'marketing_communications' in data:
                preferences.marketing_communications = data['marketing_communications']
            if 'preferred_contact_method' in data:
                preferences.preferred_contact_method = data['preferred_contact_method']
            
            # Update primary phone contact
            if 'primary_phone_contact_id' in data:
                if data['primary_phone_contact_id']:
                    # Verify the phone belongs to the user
                    try:
                        from CareLink.models import PhoneUser
                        phone = PhoneUser.objects.get(
                            id=data['primary_phone_contact_id'],
                            user=request.user
                        )
                        preferences.primary_phone_contact = phone
                    except PhoneUser.DoesNotExist:
                        return Response({
                            'error': 'Invalid phone contact selected.'
                        }, status=status.HTTP_400_BAD_REQUEST)
                else:
                    preferences.primary_phone_contact = None
            
            # Update emergency contact
            if 'emergency_contact' in data:
                emergency = data['emergency_contact']
                if isinstance(emergency, dict):
                    preferences.emergency_contact_name = emergency.get('name', '')
                    preferences.emergency_contact_phone = emergency.get('phone', '')
                    preferences.emergency_contact_relationship = emergency.get('relationship', '')
            
            preferences.save()
            
            # Log the preference update
            UserActionLog.objects.create(
                user=request.user,
                action_type='PREFERENCES_UPDATED',
                target_model='UserPreferences',
                target_id=preferences.id,
                description=f"Contact preferences updated for user {request.user.email}",
                additional_data=json.dumps({
                    'preferences_updated': {
                        'preferred_contact_method': preferences.preferred_contact_method,
                        'notifications': {
                            'email': preferences.email_notifications,
                            'sms': preferences.sms_notifications,
                            'appointments': preferences.appointment_reminders,
                            'billing': preferences.billing_notifications,
                            'medical': preferences.medical_alerts,
                            'marketing': preferences.marketing_communications
                        }
                    },
                    'timestamp': timezone.now().isoformat()
                })
            )
            
            return Response({
                'message': 'Contact preferences updated successfully.',
                'preferences': {
                    'email_notifications': preferences.email_notifications,
                    'sms_notifications': preferences.sms_notifications,
                    'appointment_reminders': preferences.appointment_reminders,
                    'billing_notifications': preferences.billing_notifications,
                    'medical_alerts': preferences.medical_alerts,
                    'marketing_communications': preferences.marketing_communications,
                    'preferred_contact_method': preferences.preferred_contact_method,
                }
            })
            
        except Exception as e:
            return Response({
                'error': 'Failed to update contact preferences.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AccountDeletionRequestView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Request account deletion"""
        reason = request.data.get('reason', '')
        confirm_deletion = request.data.get('confirm_deletion', False)
        
        if not confirm_deletion:
            return Response({
                'error': 'You must confirm the deletion request.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Check if user has pending invoices
            has_pending_invoices = False
            pending_invoices = None
            try:
                patient = Patient.objects.get(user=request.user)
                pending_invoices = Invoice.objects.filter(
                    patient=patient,
                    status__in=['In Progress', 'Contested']
                )
                has_pending_invoices = pending_invoices.exists()
            except Patient.DoesNotExist:
                # User is not a patient, no invoices to check
                pass
            
            # Check if user has any invoices in the last 30 days
            has_recent_invoices = False
            recent_invoices = None
            thirty_days_ago = timezone.now() - timedelta(days=30)
            
            try:
                patient = Patient.objects.get(user=request.user)
                recent_invoices = Invoice.objects.filter(
                    patient=patient,
                    created_at__gte=thirty_days_ago
                )
                has_recent_invoices = recent_invoices.exists()
            except Patient.DoesNotExist:
                pass
            
            # Determine deletion strategy
            if has_pending_invoices:
                # Create admin ticket for manual review
                ticket = EnhancedTicket.objects.create(
                    title=f"Account Deletion Request - {request.user.email}",
                    description=f"""
                    User {request.user.firstname} {request.user.lastname} ({request.user.email}) 
                    has requested account deletion.
                    
                    Reason: {reason}
                    
                    Status: PENDING REVIEW - User has pending invoices
                    Pending invoices: {pending_invoices.count() if has_pending_invoices else 0}
                    
                    Action required: Manual review by administrator
                    """,
                    category='ACCOUNT_MANAGEMENT',
                    priority='HIGH',
                    status='OPEN',
                    created_by=request.user,
                    assigned_to=None  # Will be assigned by admin
                )
                
                # Log the deletion request
                UserActionLog.objects.create(
                    user=request.user,
                    action_type='ACCOUNT_DELETION_REQUESTED',
                    target_model='User',
                    target_id=request.user.id,
                    description=f"Account deletion requested for user {request.user.email} - PENDING REVIEW",
                    additional_data=json.dumps({
                        'reason': reason,
                        'has_pending_invoices': has_pending_invoices,
                        'ticket_id': ticket.id,
                        'timestamp': timezone.now().isoformat()
                    })
                )
                
                return Response({
                    'message': 'Account deletion request submitted. An administrator will review your request due to pending invoices.',
                    'status': 'pending_review',
                    'ticket_id': ticket.id
                })
                
            elif has_recent_invoices:
                # Create admin ticket for review but allow immediate deactivation
                ticket = EnhancedTicket.objects.create(
                    title=f"Account Deletion Request - {request.user.email}",
                    description=f"""
                    User {request.user.firstname} {request.user.lastname} ({request.user.email}) 
                    has requested account deletion.
                    
                    Reason: {reason}
                    
                    Status: ACCOUNT DEACTIVATED - User had recent invoices
                    Recent invoices (last 30 days): {recent_invoices.count() if has_recent_invoices else 0}
                    
                    Action: Account deactivated immediately, admin review recommended
                    """,
                    category='ACCOUNT_MANAGEMENT',
                    priority='MEDIUM',
                    status='OPEN',
                    created_by=request.user,
                    assigned_to=None
                )
                
                # Deactivate account immediately
                request.user.is_active = False
                request.user.save()
                
                # Log the account deactivation
                UserActionLog.objects.create(
                    user=request.user,
                    action_type='ACCOUNT_DEACTIVATED',
                    target_model='User',
                    target_id=request.user.id,
                    description=f"Account deactivated for user {request.user.email} - deletion request",
                    additional_data=json.dumps({
                        'reason': reason,
                        'has_recent_invoices': has_recent_invoices,
                        'ticket_id': ticket.id,
                        'deactivated_immediately': True,
                        'timestamp': timezone.now().isoformat()
                    })
                )
                
                return Response({
                    'message': 'Account deactivated successfully. An administrator will review your request.',
                    'status': 'deactivated',
                    'ticket_id': ticket.id
                })
                
            else:
                # No invoices, deactivate immediately
                request.user.is_active = False
                request.user.save()
                
                # Log the account deactivation
                UserActionLog.objects.create(
                    user=request.user,
                    action_type='ACCOUNT_DEACTIVATED',
                    target_model='User',
                    target_id=request.user.id,
                    description=f"Account deactivated for user {request.user.email} - no invoices",
                    additional_data=json.dumps({
                        'reason': reason,
                        'has_pending_invoices': False,
                        'has_recent_invoices': False,
                        'deactivated_immediately': True,
                        'timestamp': timezone.now().isoformat()
                    })
                )
                
                return Response({
                    'message': 'Account deactivated successfully.',
                    'status': 'deactivated'
                })
                
        except Exception as e:
            return Response({
                'error': 'Failed to process account deletion request.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR) 
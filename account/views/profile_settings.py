from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.contrib.auth.hashers import make_password, check_password
from django.utils import timezone
from django.db.models import Q
from CareLink.models import User, UserActionLog, EnhancedTicket, Invoice, Patient
from ..services.activity_logger import ActivityLogger
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
        if not check_password(current_password, request.user.password):
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
        request.user.password = make_password(new_password)
        request.user.save()
        
        # Log the password change
        ActivityLogger.log_user_action(
            request.user,
            'PASSWORD_CHANGED',
            'User',
            request.user.id,
            description=f"Password changed for user {request.user.email}",
            additional_data={
                'changed_via': 'profile_settings',
                'timestamp': timezone.now().isoformat()
            }
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
                action_type='LOGIN'
            ).order_by('-timestamp')[:50]  # Last 50 logins
            
            history = []
            for log in login_logs:
                additional_data = json.loads(log.additional_data) if log.additional_data else {}
                history.append({
                    'timestamp': log.timestamp.isoformat(),
                    'ip_address': additional_data.get('ip_address', 'Unknown'),
                    'user_agent': additional_data.get('user_agent', 'Unknown')[:100],
                    'success': additional_data.get('success', True),
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
        # This would typically come from a UserPreferences model
        # For now, we'll return default preferences
        preferences = {
            'email_notifications': True,
            'sms_notifications': False,
            'appointment_reminders': True,
            'billing_notifications': True,
            'medical_alerts': True,
            'marketing_communications': False,
            'preferred_contact_method': 'email',
            'emergency_contact': {
                'name': '',
                'phone': '',
                'relationship': ''
            }
        }
        
        return Response(preferences)
    
    def post(self, request):
        """Update user's preferred contact methods"""
        try:
            # This would typically save to a UserPreferences model
            # For now, we'll just validate and return success
            
            preferences = request.data
            
            # Validate required fields
            required_fields = ['email_notifications', 'preferred_contact_method']
            for field in required_fields:
                if field not in preferences:
                    return Response({
                        'error': f'Missing required field: {field}'
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            # Log the preference update
            ActivityLogger.log_user_action(
                request.user,
                'PREFERENCES_UPDATED',
                'User',
                request.user.id,
                description=f"Contact preferences updated for user {request.user.email}",
                additional_data={
                    'preferences': preferences,
                    'timestamp': timezone.now().isoformat()
                }
            )
            
            return Response({
                'message': 'Contact preferences updated successfully.',
                'preferences': preferences
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
                ActivityLogger.log_user_action(
                    request.user,
                    'ACCOUNT_DELETION_REQUESTED',
                    'User',
                    request.user.id,
                    description=f"Account deletion requested for user {request.user.email} - PENDING REVIEW",
                    additional_data={
                        'reason': reason,
                        'has_pending_invoices': has_pending_invoices,
                        'ticket_id': ticket.id,
                        'timestamp': timezone.now().isoformat()
                    }
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
                ActivityLogger.log_user_action(
                    request.user,
                    'ACCOUNT_DEACTIVATED',
                    'User',
                    request.user.id,
                    description=f"Account deactivated for user {request.user.email} - deletion request",
                    additional_data={
                        'reason': reason,
                        'has_recent_invoices': has_recent_invoices,
                        'ticket_id': ticket.id,
                        'deactivated_immediately': True,
                        'timestamp': timezone.now().isoformat()
                    }
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
                ActivityLogger.log_user_action(
                    request.user,
                    'ACCOUNT_DEACTIVATED',
                    'User',
                    request.user.id,
                    description=f"Account deactivated for user {request.user.email} - no invoices",
                    additional_data={
                        'reason': reason,
                        'has_pending_invoices': False,
                        'has_recent_invoices': False,
                        'deactivated_immediately': True,
                        'timestamp': timezone.now().isoformat()
                    }
                )
                
                return Response({
                    'message': 'Account deactivated successfully.',
                    'status': 'deactivated'
                })
                
        except Exception as e:
            return Response({
                'error': 'Failed to process account deletion request.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR) 
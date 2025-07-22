from django.shortcuts import render
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.utils import timezone
from datetime import datetime, timedelta
from django.db.models import Count, Q
from account.models import NotificationLog
from CareLink.models import User, Patient, Provider, Schedule, TimeSlot
from account.services.email_service import EmailService
from account.services.sms_service import sms_service
from account.services.weekly_sms_service import weekly_sms_service
from account.services.sms_service import SMSService
from account.services.notification_service import NotificationService
import logging
import json

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def communication_stats(request):
    """
    Get communication statistics for the dashboard
    """
    try:
        user = request.user
        
        # Check if user has permission (coordinator or administrative only)
        if not (user.role in ['Coordinator', 'Administrative']):
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        # Get today's date range
        today = timezone.now().date()
        today_start = timezone.make_aware(datetime.combine(today, datetime.min.time()))
        today_end = timezone.make_aware(datetime.combine(today, datetime.max.time()))
        
        # Get notification logs for today
        email_logs = NotificationLog.objects.filter(
            notification_type='email',
            created_at__range=[today_start, today_end]
        )
        
        sms_logs = NotificationLog.objects.filter(
            notification_type='sms',
            created_at__range=[today_start, today_end]
        )
        
        # Count stats
        stats = {
            'emails': {
                'sent': email_logs.filter(status='sent').count(),
                'failed': email_logs.filter(status='failed').count(),
                'pending': email_logs.filter(status='pending').count()
            },
            'sms': {
                'sent': sms_logs.filter(status='sent').count(),
                'failed': sms_logs.filter(status='failed').count(),
                'pending': sms_logs.filter(status='pending').count()
            },
            'weekly': {
                'lastSent': None,  # Will implement later
                'nextScheduled': None  # Will implement later
            }
        }
        
        return Response(stats, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error fetching communication stats: {str(e)}")
        return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def communication_logs(request):
    """
    Get communication logs with pagination and filtering
    """
    try:
        user = request.user
        
        # Check permissions
        if not (user.role in ['Coordinator', 'Administrative']):
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        # Get query parameters
        notification_type = request.GET.get('type', None)  # 'email' or 'sms'
        status_filter = request.GET.get('status', None)  # 'sent', 'failed', 'pending'
        days = int(request.GET.get('days', 7))  # Last X days
        page = int(request.GET.get('page', 1))
        per_page = int(request.GET.get('per_page', 20))
        
        # Calculate date range
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)
        
        # Build query
        logs_query = NotificationLog.objects.filter(
            created_at__range=[start_date, end_date]
        ).order_by('-created_at')
        
        if notification_type:
            logs_query = logs_query.filter(notification_type=notification_type)
        
        if status_filter:
            logs_query = logs_query.filter(status=status_filter)
        
        # Pagination
        total_count = logs_query.count()
        start_index = (page - 1) * per_page
        end_index = start_index + per_page
        logs = logs_query[start_index:end_index]
        
        # Serialize data
        logs_data = []
        for log in logs:
            logs_data.append({
                'id': log.id,
                'type': log.notification_type,
                'recipient': log.recipient,
                'subject': log.subject[:50] + '...' if len(log.subject) > 50 else log.subject,
                'status': log.status,
                'created_at': log.created_at.isoformat(),
                'error_message': log.error_message,
                'metadata': log.metadata
            })
        
        response_data = {
            'logs': logs_data,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total_count,
                'pages': (total_count + per_page - 1) // per_page
            }
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error fetching communication logs: {str(e)}")
        return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_test_email(request):
    """
    Send a test email
    """
    try:
        user = request.user
        
        # Check permissions
        if not (user.role in ['Coordinator', 'Administrative']):
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        data = request.data
        recipient_email = data.get('email')
        subject = data.get('subject', 'Test Email from CareLink')
        message = data.get('message', 'This is a test email from the CareLink communication system.')
        
        if not recipient_email:
            return Response({'error': 'Email address is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Send email using EmailService
        email_service = EmailService()
        result = email_service.send_email(
            to_email=recipient_email,
            subject=subject,
            message=message,
            from_name=f"{user.first_name} {user.last_name}",
            sender_info={'user_id': user.id, 'type': 'test'}
        )
        
        if result['success']:
            return Response({
                'success': True,
                'message': 'Test email sent successfully',
                'log_id': result.get('log_id')
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'success': False,
                'error': result['error']
            }, status=status.HTTP_400_BAD_REQUEST)
        
    except Exception as e:
        logger.error(f"Error sending test email: {str(e)}")
        return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_test_sms(request):
    """
    Send a test SMS
    """
    try:
        user = request.user
        
        # Check permissions
        if not (user.role in ['Coordinator', 'Administrative']):
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        data = request.data
        phone_number = data.get('phone')
        message = data.get('message', 'This is a test SMS from CareLink communication system.')
        
        if not phone_number:
            return Response({'error': 'Phone number is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Send SMS using SMSService
        sms_service = SMSService()
        result = sms_service.send_sms(
            to_phone=phone_number,
            message=message,
            sender_info={'user_id': user.id, 'type': 'test'}
        )
        
        if result['success']:
            return Response({
                'success': True,
                'message': 'Test SMS sent successfully',
                'log_id': result.get('log_id')
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'success': False,
                'error': result['error']
            }, status=status.HTTP_400_BAD_REQUEST)
        
    except Exception as e:
        logger.error(f"Error sending test SMS: {str(e)}")
        return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def weekly_appointments(request):
    """
    Get weekly appointments for notification sending
    GET: All appointments for the week
    POST: Generate SMS message for specific user
    """
    try:
        user = request.user
        
        # Check permissions
        if not (user.role in ['Coordinator', 'Administrative']):
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        # Get parameters based on method
        if request.method == 'POST':
            data = request.data
            week_offset = data.get('week_offset', 1)
            user_email = data.get('user_email')
        else:
            week_offset = int(request.GET.get('week', 0))
            user_email = None
        
        # Calculate week start (Sunday) and end (Saturday)
        today = timezone.now().date()
        days_since_sunday = today.weekday() + 1 if today.weekday() != 6 else 0
        week_start = today - timedelta(days=days_since_sunday) + timedelta(weeks=week_offset)
        week_end = week_start + timedelta(days=6)
        
        # If specific user requested, generate their SMS message
        if request.method == 'POST' and user_email:
            return generate_user_weekly_sms(user_email, week_start, week_end)
        
        # Get schedules for the week
        schedules = Schedule.objects.filter(
            date__range=[week_start, week_end],
            patient__isnull=False  # Only schedules with patients
        ).select_related('patient', 'provider').prefetch_related('time_slots')
        
        # Group schedules by patient
        appointments_by_patient = {}
        for schedule in schedules:
            patient = schedule.patient
            patient_id = patient.id
            
            if patient_id not in appointments_by_patient:
                # Get patient's communication preference
                user_prefs = getattr(patient.user, 'preferences', None)
                comm_preference = 'email'  # default
                if user_prefs:
                    comm_preference = user_prefs.preferred_contact_method
                
                appointments_by_patient[patient_id] = {
                    'patient': {
                        'id': patient.id,
                        'name': f"{patient.user.firstname} {patient.user.lastname}" if patient.user else 'Unknown',
                        'email': patient.user.email if patient.user else '',
                        'phone': '',  # Will need to get from PhoneUser model
                        'communication_preference': comm_preference
                    },
                    'appointments': []
                }
            
            # Add each timeslot as an appointment
            for timeslot in schedule.time_slots.all():
                # Combine date and time for start/end
                start_datetime = timezone.make_aware(
                    datetime.combine(schedule.date, timeslot.start_time)
                )
                end_datetime = timezone.make_aware(
                    datetime.combine(schedule.date, timeslot.end_time)
                )
                
                appointments_by_patient[patient_id]['appointments'].append({
                    'id': f"{schedule.id}-{timeslot.id}",
                    'start_time': start_datetime.isoformat(),
                    'end_time': end_datetime.isoformat(),
                    'service_type': timeslot.service.name if timeslot.service else 'General Care',
                    'status': timeslot.status,
                    'provider': f"{schedule.provider.user.firstname} {schedule.provider.user.lastname}" if schedule.provider and schedule.provider.user else 'TBD',
                    'description': timeslot.description or ''
                })
        
        response_data = {
            'week_start': week_start.isoformat(),
            'week_end': week_end.isoformat(),
            'patients': list(appointments_by_patient.values()),
            'total_patients': len(appointments_by_patient),
            'total_appointments': sum(len(patient_data['appointments']) for patient_data in appointments_by_patient.values())
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error fetching weekly appointments: {str(e)}")
        return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_weekly_notifications(request):
    """
    Send weekly SMS notifications to patients and providers
    Only sends SMS to users with SMS preference
    """
    try:
        user = request.user
        
        # Check permissions
        if not (user.role in ['Coordinator', 'Administrative']):
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        # Get week offset (default to next week)
        week_offset = int(request.data.get('week_offset', 1))
        
        # Use the weekly SMS service
        result = weekly_sms_service.send_weekly_notifications(week_offset=week_offset)
        
        if result['success']:
            return Response({
                'success': True,
                'message': 'Weekly notifications sent successfully',
                'summary': {
                    'week_start': result['week_start'],
                    'week_end': result['week_end'],
                    'patients': {
                        'sent': result['patients']['sent'],
                        'failed': result['patients']['failed'],
                        'skipped': result['patients']['skipped']
                    },
                    'providers': {
                        'sent': result['providers']['sent'],
                        'failed': result['providers']['failed'],
                        'skipped': result['providers']['skipped']
                    },
                    'total_sent': result['total_sent'],
                    'total_failed': result['total_failed'],
                    'total_skipped': result['total_skipped']
                }
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'success': False,
                'error': result['error']
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    except Exception as e:
        return Response({
            'success': False,
            'error': f'Unexpected error: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_individual_sms(request):
    """
    Send SMS to an individual user (for manual corrections)
    """
    try:
        user = request.user
        
        # Check if user has permission (coordinator or administrative only)
        if not (user.role in ['Coordinator', 'Administrative']):
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        data = request.data
        user_email = data.get('user_email')
        message = data.get('message')
        
        if not user_email or not message:
            return Response({
                'success': False,
                'error': 'user_email and message are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Find the user
        try:
            target_user = User.objects.get(email=user_email)
        except User.DoesNotExist:
            return Response({
                'success': False,
                'error': f'User with email {user_email} not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Get user's phone number
        phone_number = weekly_sms_service._get_user_phone_number(target_user)
        if not phone_number:
            return Response({
                'success': False,
                'error': f'No phone number found for user {target_user.get_full_name()}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Send SMS
        result = sms_service.send_sms(phone_number, message)
        
        if result['success']:
            # Log successful notification
            NotificationLog.objects.create(
                notification_type='sms',
                recipient=target_user.email,
                message=message,
                status='sent',
                external_id=result.get('message_sid'),
                metadata={'notification_type': 'manual_individual', 'sent_by': user.email}
            )
            
            return Response({
                'success': True,
                'message_sid': result.get('message_sid'),
                'user': target_user.get_full_name(),
                'phone': phone_number
            }, status=status.HTTP_200_OK)
        else:
            # Log failed notification
            NotificationLog.objects.create(
                notification_type='sms',
                recipient=target_user.email,
                message=message,
                status='failed',
                external_id=f"FAILED-{timezone.now().strftime('%Y%m%d-%H%M%S')}-{target_user.id}",
                error_message=result.get('error'),
                metadata={'notification_type': 'manual_individual', 'sent_by': user.email}
            )
            
            return Response({
                'success': False,
                'error': result.get('error'),
                'user': target_user.get_full_name(),
                'phone': phone_number
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    except Exception as e:
        return Response({
            'success': False,
            'error': f'Unexpected error: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def test_sms_with_phone(request):
    """
    Test SMS sending with specific phone number (for testing invalid numbers)
    """
    try:
        user = request.user
        
        # Check if user has permission (coordinator or administrative only)
        if not (user.role in ['Coordinator', 'Administrative']):
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        data = request.data
        phone_number = data.get('phone_number')
        message = data.get('message', 'Test SMS from CareLink - Testing phone number validation')
        
        if not phone_number:
            return Response({
                'success': False,
                'error': 'phone_number is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Send SMS directly to test Twilio error responses
        result = sms_service.send_sms(phone_number, message)
        
        # Log the attempt for debugging
        recipient_email = f"test-{phone_number}@carelink.test"  # Fake email for test logs
        NotificationLog.objects.create(
            notification_type='sms',
            recipient=recipient_email,
            message=message,
            status='sent' if result['success'] else 'failed',
            external_id=result.get('message_sid') if result['success'] else f"FAILED-{timezone.now().strftime('%Y%m%d-%H%M%S')}",
            error_message=result.get('error') if not result['success'] else '',
            metadata={
                'notification_type': 'phone_test', 
                'sent_by': user.email,
                'test_phone': phone_number
            }
        )
        
        if result['success']:
            return Response({
                'success': True,
                'message_sid': result.get('message_sid'),
                'phone': phone_number,
                'formatted_phone': result.get('to_number')
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'success': False,
                'error': result.get('error'),
                'phone': phone_number
            }, status=status.HTTP_400_BAD_REQUEST)
    
    except Exception as e:
        return Response({
            'success': False,
            'error': f'Unexpected error: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_sms_logs(request):
    """
    Get detailed SMS logs for debugging
    """
    try:
        user = request.user
        
        # Check if user has permission (coordinator or administrative only)
        if not (user.role in ['Coordinator', 'Administrative']):
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        # Get recent SMS logs (last 50)
        logs = NotificationLog.objects.filter(
            notification_type='sms'
        ).order_by('-created_at')[:50]
        
        logs_data = []
        for log in logs:
            logs_data.append({
                'id': log.id,
                'recipient': log.recipient,
                'status': log.status,
                'error_message': log.error_message,
                'external_id': log.external_id,
                'created_at': log.created_at.isoformat(),
                'message_preview': log.message[:100] + '...' if len(log.message) > 100 else log.message,
                'full_message': log.message,  # Add full message for click details
                'metadata': log.metadata
            })
        
        return Response({
            'success': True,
            'logs': logs_data,
            'count': len(logs_data)
        }, status=status.HTTP_200_OK)
    
    except Exception as e:
        return Response({
            'success': False,
            'error': f'Unexpected error: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def generate_user_weekly_sms(user_email, week_start, week_end):
    """
    Generate weekly SMS message for a specific user
    """
    try:
        # Find the user
        target_user = User.objects.get(email=user_email)
        
        # Check if user is patient or provider
        try:
            patient = Patient.objects.get(user=target_user)
            return generate_patient_weekly_sms(patient, week_start, week_end)
        except Patient.DoesNotExist:
            try:
                provider = Provider.objects.get(user=target_user)
                return generate_provider_weekly_sms(provider, week_start, week_end)
            except Provider.DoesNotExist:
                return Response({
                    'success': False,
                    'error': f'User {user_email} is not a patient or provider'
                }, status=status.HTTP_400_BAD_REQUEST)
                
    except User.DoesNotExist:
        return Response({
            'success': False,
            'error': f'User with email {user_email} not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'success': False,
            'error': f'Error generating SMS: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def generate_patient_weekly_sms(patient, week_start, week_end):
    """Generate SMS for patient's appointments"""
    try:
        # Get patient's schedules for the week
        schedules = Schedule.objects.filter(
            date__range=[week_start, week_end],
            patient=patient
        ).select_related('provider', 'provider__user').prefetch_related('time_slots__service')
        
        if not schedules:
            return Response({
                'success': False,
                'error': f'No appointments found for {patient.user.get_full_name()} between {week_start} and {week_end}'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Use the weekly SMS service to generate message
        appointments = []
        for schedule in schedules:
            for timeslot in schedule.time_slots.all():
                appointments.append({
                    'date': schedule.date,
                    'start_time': timeslot.start_time,
                    'end_time': timeslot.end_time,
                    'provider_name': f"{schedule.provider.user.firstname} {schedule.provider.user.lastname}" if schedule.provider.user else 'TBD',
                    'service_name': timeslot.service.name if timeslot.service else 'General Care',
                    'status': timeslot.status
                })
        
        message = weekly_sms_service._generate_patient_sms(patient, appointments, week_start, week_end)
        
        return Response({
            'success': True,
            'message': message,
            'week_start': week_start.isoformat(),
            'week_end': week_end.isoformat(),
            'appointment_count': len(appointments),
            'user_type': 'patient'
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': f'Error generating patient SMS: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def generate_provider_weekly_sms(provider, week_start, week_end):
    """Generate SMS for provider's appointments"""
    try:
        # Get provider's schedules for the week
        schedules = Schedule.objects.filter(
            date__range=[week_start, week_end],
            provider=provider
        ).select_related('patient', 'patient__user').prefetch_related('time_slots__service')
        
        if not schedules:
            return Response({
                'success': False,
                'error': f'No appointments found for {provider.user.get_full_name()} between {week_start} and {week_end}'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Use the weekly SMS service to generate message
        appointments = []
        for schedule in schedules:
            for timeslot in schedule.time_slots.all():
                appointments.append({
                    'date': schedule.date,
                    'start_time': timeslot.start_time,
                    'end_time': timeslot.end_time,
                    'patient_name': f"{schedule.patient.user.firstname} {schedule.patient.user.lastname}" if schedule.patient.user else 'Unknown',
                    'service_name': timeslot.service.name if timeslot.service else 'General Care',
                    'status': timeslot.status
                })
        
        message = weekly_sms_service._generate_provider_sms(provider, appointments, week_start, week_end)
        
        return Response({
            'success': True,
            'message': message,
            'week_start': week_start.isoformat(),
            'week_end': week_end.isoformat(),
            'appointment_count': len(appointments),
            'user_type': 'provider'
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': f'Error generating provider SMS: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

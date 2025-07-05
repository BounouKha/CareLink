from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count
from django.utils import timezone
from django.db import transaction
import logging

from CareLink.models import (
    Notification, ScheduleChangeRequest, NotificationPreference, 
    Schedule, EnhancedTicket, User, Patient, FamilyPatient
)
from account.serializers.notification import (
    NotificationSerializer, ScheduleChangeRequestSerializer,
    CreateScheduleChangeRequestSerializer, NotificationPreferenceSerializer,
    NotificationStatsSerializer
)

logger = logging.getLogger(__name__)


class NotificationPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class NotificationListView(APIView):
    """List and manage user notifications"""
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = NotificationPagination
    
    def get(self, request):
        """Get user's notifications with filtering and pagination"""
        user = request.user
        
        # Get query parameters
        notification_type = request.query_params.get('type')
        is_read = request.query_params.get('is_read')
        priority = request.query_params.get('priority')
        
        # Build queryset
        queryset = Notification.objects.filter(recipient=user)
        
        # Apply filters
        if notification_type:
            queryset = queryset.filter(notification_type=notification_type)
        if is_read is not None:
            queryset = queryset.filter(is_read=is_read.lower() == 'true')
        if priority:
            queryset = queryset.filter(priority=priority)
        
        # Paginate
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)
        
        if page is not None:
            serializer = NotificationSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)
        
        serializer = NotificationSerializer(queryset, many=True)
        return Response(serializer.data)
    
    def patch(self, request):
        """Bulk update notifications (mark as read/unread)"""
        user = request.user
        notification_ids = request.data.get('notification_ids', [])
        action = request.data.get('action', 'mark_read')
        
        if not notification_ids:
            return Response({'error': 'notification_ids required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get user's notifications
        notifications = Notification.objects.filter(
            id__in=notification_ids,
            recipient=user
        )
        
        if action == 'mark_read':
            notifications.filter(is_read=False).update(
                is_read=True,
                read_at=timezone.now()
            )
        elif action == 'mark_unread':
            notifications.update(is_read=False, read_at=None)
        else:
            return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({'message': f'Updated {notifications.count()} notifications'})


class NotificationDetailView(APIView):
    """Get, update, or delete a specific notification"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, notification_id):
        """Get notification details"""
        notification = get_object_or_404(
            Notification,
            id=notification_id,
            recipient=request.user
        )
        
        # Mark as read when viewed
        if not notification.is_read:
            notification.mark_as_read()
        
        serializer = NotificationSerializer(notification)
        return Response(serializer.data)
    
    def patch(self, request, notification_id):
        """Update notification (mark as read/unread)"""
        notification = get_object_or_404(
            Notification,
            id=notification_id,
            recipient=request.user
        )
        
        action = request.data.get('action')
        if action == 'mark_read':
            notification.mark_as_read()
        elif action == 'mark_unread':
            notification.is_read = False
            notification.read_at = None
            notification.save(update_fields=['is_read', 'read_at'])
        else:
            return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = NotificationSerializer(notification)
        return Response(serializer.data)


class NotificationStatsView(APIView):
    """Get notification statistics for user"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get user's notification statistics"""
        user = request.user
        
        # Get counts
        total_notifications = Notification.objects.filter(recipient=user).count()
        unread_notifications = Notification.objects.filter(recipient=user, is_read=False).count()
        
        # Get unread counts by type
        unread_by_type = dict(
            Notification.objects.filter(recipient=user, is_read=False)
            .values('notification_type')
            .annotate(count=Count('id'))
            .values_list('notification_type', 'count')
        )
        
        # Get recent notifications (last 5)
        recent_notifications = Notification.objects.filter(recipient=user)[:5]
        
        stats_data = {
            'total_notifications': total_notifications,
            'unread_notifications': unread_notifications,
            'unread_by_type': unread_by_type,
            'recent_notifications': recent_notifications
        }
        
        serializer = NotificationStatsSerializer(stats_data)
        return Response(serializer.data)


class ScheduleChangeRequestView(APIView):
    """Handle schedule change requests from patients/family"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Create a new schedule change request"""
        user = request.user
        
        # Validate user can make schedule change requests
        if user.role not in ['Patient', 'Family Patient']:
            return Response(
                {'error': 'Only patients and family members can request schedule changes'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = CreateScheduleChangeRequestSerializer(
            data=request.data,
            context={'request': request}
        )
        
        if serializer.is_valid():
            try:
                with transaction.atomic():
                    # Create the schedule change request
                    change_request = serializer.save()
                    
                    # Create helpdesk ticket
                    ticket = self._create_helpdesk_ticket(change_request, user)
                    change_request.helpdesk_ticket = ticket
                    change_request.save()
                    
                    # Create notifications for coordinators
                    self._create_notifications_for_coordinators(change_request, user)
                    
                    logger.info(
                        f"Schedule change request created - "
                        f"User: {user.get_full_name()} ({user.role}), "
                        f"Type: {change_request.request_type}, "
                        f"Schedule: {change_request.schedule.id}"
                    )
                    
                    response_serializer = ScheduleChangeRequestSerializer(change_request)
                    return Response(response_serializer.data, status=status.HTTP_201_CREATED)
                    
            except Exception as e:
                logger.error(f"Error creating schedule change request: {str(e)}")
                return Response(
                    {'error': 'Failed to create schedule change request'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def _create_helpdesk_ticket(self, change_request, user):
        """Create a helpdesk ticket for the schedule change request"""
        from CareLink.models import EnhancedTicket
        
        # Determine ticket title and description based on request type
        if change_request.request_type == 'cancel':
            title = f"Appointment Cancellation Request - {change_request.schedule.patient.user.get_full_name()}"
            description = f"Patient/Family member has requested to cancel their appointment.\n\n" \
                         f"Current Appointment:\n" \
                         f"- Date: {change_request.current_date}\n" \
                         f"- Time: {change_request.current_start_time} - {change_request.current_end_time}\n" \
                         f"- Provider: {change_request.schedule.provider.user.get_full_name()}\n\n" \
                         f"Reason: {change_request.reason}\n\n" \
                         f"Requester Notes: {change_request.requester_notes or 'None'}"
        else:
            title = f"Appointment Reschedule Request - {change_request.schedule.patient.user.get_full_name()}"
            description = f"Patient/Family member has requested to reschedule their appointment.\n\n" \
                         f"Current Appointment:\n" \
                         f"- Date: {change_request.current_date}\n" \
                         f"- Time: {change_request.current_start_time} - {change_request.current_end_time}\n" \
                         f"- Provider: {change_request.schedule.provider.user.get_full_name()}\n\n"
            
            if change_request.requested_date:
                description += f"Requested New Date: {change_request.requested_date}\n"
            if change_request.requested_start_time:
                description += f"Requested New Time: {change_request.requested_start_time} - {change_request.requested_end_time}\n"
            
            description += f"\nReason: {change_request.reason}\n\n" \
                          f"Requester Notes: {change_request.requester_notes or 'None'}"
        
        ticket = EnhancedTicket.objects.create(
            title=title,
            description=description,
            category='Appointment Issue',
            priority='Medium',
            assigned_team='Coordinator',
            created_by=user
        )
        
        return ticket
    
    def _create_notifications_for_coordinators(self, change_request, user):
        """Create notifications for all coordinators about the schedule change request"""
        from CareLink.models import Coordinator
        
        coordinators = User.objects.filter(role='Coordinator', is_active=True)
        
        for coordinator in coordinators:
            Notification.objects.create(
                recipient=coordinator,
                sender=user,
                notification_type='schedule_change_request',
                title=f"New Schedule Change Request",
                message=f"{user.get_full_name()} has requested to {change_request.get_request_type_display().lower()} an appointment for {change_request.schedule.patient.user.get_full_name()}",
                priority='normal',
                schedule=change_request.schedule,
                ticket=change_request.helpdesk_ticket,
                extra_data={
                    'change_request_id': change_request.id,
                    'request_type': change_request.request_type,
                    'appointment_date': str(change_request.current_date),
                    'patient_name': change_request.schedule.patient.user.get_full_name()
                }
            )


class NotificationPreferenceView(APIView):
    """Manage user notification preferences"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get user's notification preferences"""
        user = request.user
        
        try:
            preferences = NotificationPreference.objects.get(user=user)
        except NotificationPreference.DoesNotExist:
            # Create default preferences
            preferences = NotificationPreference.objects.create(user=user)
        
        serializer = NotificationPreferenceSerializer(preferences)
        return Response(serializer.data)
    
    def patch(self, request):
        """Update user's notification preferences"""
        user = request.user
        
        try:
            preferences = NotificationPreference.objects.get(user=user)
        except NotificationPreference.DoesNotExist:
            preferences = NotificationPreference.objects.create(user=user)
        
        serializer = NotificationPreferenceSerializer(
            preferences,
            data=request.data,
            partial=True
        )
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def mark_all_notifications_read(request):
    """Mark all user's notifications as read"""
    user = request.user
    
    updated_count = Notification.objects.filter(
        recipient=user,
        is_read=False
    ).update(
        is_read=True,
        read_at=timezone.now()
    )
    
    return Response({
        'message': f'Marked {updated_count} notifications as read'
    })


@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def clear_all_notifications(request):
    """Delete all user's notifications"""
    user = request.user
    
    deleted_count = Notification.objects.filter(recipient=user).count()
    Notification.objects.filter(recipient=user).delete()
    
    return Response({
        'message': f'Cleared {deleted_count} notifications'
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_user_schedule_change_requests(request):
    """Get user's schedule change requests"""
    user = request.user
    
    # Get requests based on user role
    if user.role == 'Patient':
        try:
            patient = Patient.objects.get(user=user)
            requests = ScheduleChangeRequest.objects.filter(
                schedule__patient=patient
            ).order_by('-created_at')
        except Patient.DoesNotExist:
            requests = ScheduleChangeRequest.objects.none()
    
    elif user.role == 'Family Patient':
        try:
            family_relations = FamilyPatient.objects.filter(user=user)
            patient_ids = family_relations.values_list('patient_id', flat=True)
            requests = ScheduleChangeRequest.objects.filter(
                schedule__patient_id__in=patient_ids
            ).order_by('-created_at')
        except:
            requests = ScheduleChangeRequest.objects.none()
    
    elif user.role in ['Coordinator', 'Administrator']:
        # Coordinators can see all requests
        requests = ScheduleChangeRequest.objects.all().order_by('-created_at')
    
    else:
        requests = ScheduleChangeRequest.objects.none()
    
    serializer = ScheduleChangeRequestSerializer(requests, many=True)
    return Response(serializer.data) 
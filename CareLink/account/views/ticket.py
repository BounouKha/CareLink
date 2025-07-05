from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from django.utils import timezone
import logging
from ..services.activity_logger import ActivityLogger

from CareLink.models import (
    EnhancedTicket, 
    TicketComment, 
    TicketStatusHistory, 
    User
)
from ..serializers.ticket import (
    EnhancedTicketSerializer, EnhancedTicketDetailSerializer, TicketCommentSerializer,
    CreateTicketCommentSerializer, TicketStatusHistorySerializer, UpdateTicketStatusSerializer, TicketFilterSerializer
)

logger = logging.getLogger(__name__)

class EnhancedTicketViewSet(viewsets.ModelViewSet):
    """
    Enhanced Ticket Management API
    Provides CRUD operations for tickets with team-based access control
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'priority', 'assigned_team', 'category']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'priority', 'status']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Filter tickets based on user role and permissions"""
        user = self.request.user
        
        # Superusers and staff can see all tickets
        if user.is_superuser or user.is_staff:
            queryset = EnhancedTicket.objects.all()
        else:
            # Team-based filtering for coordinators and administrators
            if user.role == 'Coordinator':
                # Coordinators can see:
                # 1. Tickets they created for Administrator team (helpdesk tickets)
                # 2. ALL tickets assigned to Coordinator team (tickets they need to handle)
                # 3. Tickets assigned to them personally
                queryset = EnhancedTicket.objects.filter(
                    Q(created_by=user) |  # Tickets they created
                    Q(assigned_team='Coordinator') |  # ALL tickets assigned to Coordinator team
                    Q(assigned_to=user)  # Tickets assigned to them personally
                )
            elif user.role == 'Administrator' or user.role == 'Administrative':
                # Administrators can see:
                # 1. Tickets they created for Coordinator team (tickets they delegate)
                # 2. ALL tickets assigned to Administrator team (tickets they need to handle)
                # 3. Tickets assigned to them personally
                queryset = EnhancedTicket.objects.filter(
                    Q(created_by=user) |  # Tickets they created
                    Q(assigned_team='Administrator') |  # ALL tickets assigned to Administrator team
                    Q(assigned_to=user)  # Tickets assigned to them personally
                )
            else:
                # Regular users (Patient, Family Patient, Provider) can only see their own tickets
                queryset = EnhancedTicket.objects.filter(created_by=user)
        
        # Apply additional filters
        my_tickets = self.request.query_params.get('my_tickets', 'false').lower() == 'true'
        if my_tickets:
            queryset = queryset.filter(created_by=user)
        
        is_overdue = self.request.query_params.get('is_overdue', 'false').lower() == 'true'
        if is_overdue:
            queryset = queryset.filter(status__in=['New', 'In Progress'])
        
        return queryset
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return EnhancedTicketDetailSerializer
        elif self.action == 'update_status':
            return UpdateTicketStatusSerializer
        return EnhancedTicketSerializer
    
    def perform_create(self, serializer):
        """Create ticket and send notifications"""
        ticket = serializer.save()
        
        # Log ticket creation
        logger.info(
            f"TICKET CREATED - ID: {ticket.id}, Title: '{ticket.title}', "
            f"Category: {ticket.category}, Priority: {ticket.priority}, "
            f"Assigned Team: {ticket.assigned_team}, "
            f"Created by: {self.request.user.firstname} {self.request.user.lastname} "
            f"({self.request.user.role})"
        )
        
        # Log to database for admin panel
        ActivityLogger.log_ticket_created(ticket, self.request.user)
        
        # Create initial status history
        TicketStatusHistory.objects.create(
            ticket=ticket,
            previous_status=None,
            new_status=ticket.status,
            changed_by=self.request.user,
            notes="Ticket created"
        )
        
        # TODO: Send notification to assigned team
        # self.send_ticket_created_notification(ticket)
    
    def perform_update(self, serializer):
        """Update ticket and track changes"""
        previous_status = self.get_object().status
        ticket = serializer.save()
        
        # Log ticket update
        logger.info(
            f"TICKET UPDATED - ID: {ticket.id}, Title: '{ticket.title}', "
            f"Updated by: {self.request.user.firstname} {self.request.user.lastname} "
            f"({self.request.user.role})"
        )
        
        # Log to database for admin panel
        ActivityLogger.log_ticket_updated(ticket, self.request.user, previous_status, ticket.status)
        
        # Track status changes
        if previous_status != ticket.status:
            logger.info(
                f"TICKET STATUS CHANGED - ID: {ticket.id}, "
                f"From: {previous_status} To: {ticket.status}, "
                f"Changed by: {self.request.user.firstname} {self.request.user.lastname} "
                f"({self.request.user.role})"
            )
            
            TicketStatusHistory.objects.create(
                ticket=ticket,
                previous_status=previous_status,
                new_status=ticket.status,
                changed_by=self.request.user,
                notes=f"Status changed from {previous_status} to {ticket.status}"
            )
    
    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Update ticket status with notes"""
        ticket = self.get_object()
        serializer = self.get_serializer(ticket, data=request.data, partial=True)
        
        if serializer.is_valid():
            previous_status = ticket.status
            ticket = serializer.save()
            
            # Log status update
            logger.info(
                f"TICKET STATUS UPDATED - ID: {ticket.id}, "
                f"From: {previous_status} To: {ticket.status}, "
                f"Updated by: {request.user.firstname} {request.user.lastname} "
                f"({request.user.role}), Notes: {request.data.get('notes', 'No notes')}"
            )
            
            # Log to database for admin panel
            ActivityLogger.log_ticket_updated(ticket, request.user, previous_status, ticket.status)
            
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def assign_to_self(self, request, pk=None):
        """Assign ticket to the current user"""
        ticket = self.get_object()
        
        # Check if user can assign this ticket
        if not ticket.can_user_access(request.user):
            logger.warning(
                f"UNAUTHORIZED TICKET ASSIGNMENT ATTEMPT - Ticket ID: {ticket.id}, "
                f"User: {request.user.firstname} {request.user.lastname} "
                f"({request.user.role})"
            )
            
            # Log unauthorized access to database
            ActivityLogger.log_unauthorized_access(
                request.user, 
                'TICKET_ASSIGNMENT', 
                'EnhancedTicket', 
                ticket.id
            )
            
            return Response(
                {"error": "You don't have permission to assign this ticket"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        previous_assignee = ticket.assigned_to
        ticket.assigned_to = request.user
        ticket.save()
        
        # Log ticket assignment
        logger.info(
            f"TICKET ASSIGNED - ID: {ticket.id}, "
            f"From: {previous_assignee.firstname if previous_assignee else 'Unassigned'} "
            f"To: {request.user.firstname} {request.user.lastname} "
            f"({request.user.role})"
        )
        
        # Log to database for admin panel
        ActivityLogger.log_ticket_assigned(ticket, request.user, previous_assignee)
        
        # Create status history entry
        TicketStatusHistory.objects.create(
            ticket=ticket,
            previous_status=ticket.status,
            new_status=ticket.status,
            changed_by=request.user,
            notes=f"Ticket assigned to {request.user.firstname} {request.user.lastname}"
        )
        
        serializer = self.get_serializer(ticket)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        """Get dashboard statistics for the current user"""
        user = request.user
        queryset = self.get_queryset()
        
        # Apply additional filters from query parameters
        assigned_team = request.query_params.get('assigned_team')
        if assigned_team:
            queryset = queryset.filter(assigned_team=assigned_team)
        
        stats = {
            'total_tickets': queryset.count(),
            'new_tickets': queryset.filter(status='New').count(),
            'in_progress': queryset.filter(status='In Progress').count(),
            'resolved': queryset.filter(status='Resolved').count(),
            'overdue': queryset.filter(status__in=['New', 'In Progress']).count(),
            'my_tickets': queryset.filter(created_by=user).count(),
            'assigned_to_me': queryset.filter(assigned_to=user).count(),
        }
        
        return Response(stats)
    
    @action(detail=False, methods=['get'])
    def categories(self, request):
        """Get available ticket categories"""
        categories = [
            {'value': choice[0], 'label': choice[1]} 
            for choice in EnhancedTicket.CATEGORY_CHOICES
        ]
        return Response(categories)
    
    @action(detail=False, methods=['get'])
    def priorities(self, request):
        """Get available ticket priorities"""
        priorities = [
            {'value': choice[0], 'label': choice[1]} 
            for choice in EnhancedTicket.PRIORITY_CHOICES
        ]
        return Response(priorities)
    
    @action(detail=False, methods=['get'])
    def teams(self, request):
        """Get available teams"""
        teams = [
            {'value': choice[0], 'label': choice[1]} 
            for choice in EnhancedTicket.TEAM_CHOICES
        ]
        return Response(teams)


class TicketCommentViewSet(viewsets.ModelViewSet):
    """
    Ticket Comments API
    Provides CRUD operations for ticket comments
    """
    permission_classes = [IsAuthenticated]
    serializer_class = TicketCommentSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['ticket']
    ordering_fields = ['created_at']
    ordering = ['created_at']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CreateTicketCommentSerializer
        return TicketCommentSerializer
    
    def get_queryset(self):
        """Filter comments based on user permissions"""
        user = self.request.user
        
        # Superusers and staff can see all comments
        if user.is_superuser or user.is_staff:
            return TicketComment.objects.all()
        
        # Team-based filtering for coordinators and administrators
        if user.role == 'Coordinator':
            return TicketComment.objects.filter(
                Q(ticket__created_by=user) |  # Comments on tickets they created
                Q(ticket__assigned_team='Coordinator') |  # Comments on Coordinator team tickets
                Q(ticket__assigned_to=user) |  # Comments on tickets assigned to them
                Q(created_by=user)  # Comments they created
            )
        elif user.role == 'Administrator' or user.role == 'Administrative':
            return TicketComment.objects.filter(
                Q(ticket__created_by=user) |  # Comments on tickets they created
                Q(ticket__assigned_team='Administrator') |  # Comments on Administrator team tickets
                Q(ticket__assigned_to=user) |  # Comments on tickets assigned to them
                Q(created_by=user)  # Comments they created
            )
        else:
            # Regular users can only see comments on their own tickets
            return TicketComment.objects.filter(ticket__created_by=user)
    
    def perform_create(self, serializer):
        """Create comment and log the action"""
        comment = serializer.save()
        
        # Log comment creation
        logger.info(
            f"TICKET COMMENT CREATED - Ticket ID: {comment.ticket.id}, "
            f"Comment ID: {comment.id}, "
            f"Created by: {self.request.user.firstname} {self.request.user.lastname} "
            f"({self.request.user.role}), "
            f"Content: '{comment.comment[:100]}{'...' if len(comment.comment) > 100 else ''}'"
        )
        
        # Log to database for admin panel
        ActivityLogger.log_comment_created(comment, self.request.user)
    
    def perform_update(self, serializer):
        """Update comment and log the action"""
        comment = serializer.save()
        
        # Log comment update
        logger.info(
            f"TICKET COMMENT UPDATED - Ticket ID: {comment.ticket.id}, "
            f"Comment ID: {comment.id}, "
            f"Updated by: {self.request.user.firstname} {self.request.user.lastname} "
            f"({self.request.user.role}), "
            f"Content: '{comment.comment[:100]}{'...' if len(comment.comment) > 100 else ''}'"
        )
        
        # Log to database for admin panel
        ActivityLogger.log_comment_updated(comment, self.request.user)
    
    def perform_destroy(self, instance):
        """Delete comment and log the action"""
        ticket_id = instance.ticket.id
        ticket_title = instance.ticket.title
        comment_id = instance.id
        user_info = f"{self.request.user.firstname} {self.request.user.lastname} ({self.request.user.role})"
        
        # Log comment deletion
        logger.info(
            f"TICKET COMMENT DELETED - Ticket ID: {ticket_id}, "
            f"Comment ID: {comment_id}, "
            f"Deleted by: {user_info}"
        )
        
        # Log to database for admin panel
        ActivityLogger.log_comment_deleted(ticket_id, ticket_title, comment_id, self.request.user)
        
        instance.delete()

    @action(detail=False, methods=['get'])
    def by_ticket(self, request):
        """Get comments for a specific ticket"""
        ticket_id = request.query_params.get('ticket_id')
        if not ticket_id:
            return Response(
                {"error": "ticket_id parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            ticket = EnhancedTicket.objects.get(id=ticket_id)
            if not ticket.can_user_access(request.user):
                return Response(
                    {"error": "You don't have permission to view this ticket"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            comments = self.get_queryset().filter(ticket=ticket)
            serializer = self.get_serializer(comments, many=True)
            return Response(serializer.data)
        except EnhancedTicket.DoesNotExist:
            return Response(
                {"error": "Ticket not found"},
                status=status.HTTP_404_NOT_FOUND
            )


class TicketStatusHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Ticket Status History API
    Provides read-only access to ticket status history
    """
    permission_classes = [IsAuthenticated]
    serializer_class = TicketStatusHistorySerializer
    
    def get_queryset(self):
        """Filter status history based on user permissions"""
        user = self.request.user
        
        # Superusers and staff can see all history
        if user.is_superuser or user.is_staff:
            return TicketStatusHistory.objects.all()
        
        # Regular users can only see history for tickets they can access
        return TicketStatusHistory.objects.filter(
            Q(ticket__created_by=user) |  # Their own tickets
            Q(ticket__assigned_to=user) |  # Tickets assigned to them
            Q(changed_by=user)  # Changes they made
        )
    
    @action(detail=False, methods=['get'])
    def by_ticket(self, request):
        """Get status history for a specific ticket"""
        ticket_id = request.query_params.get('ticket_id')
        if not ticket_id:
            return Response(
                {"error": "ticket_id parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            ticket = EnhancedTicket.objects.get(id=ticket_id)
            if not ticket.can_user_access(request.user):
                return Response(
                    {"error": "You don't have permission to view this ticket"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            history = self.get_queryset().filter(ticket=ticket)
            serializer = self.get_serializer(history, many=True)
            return Response(serializer.data)
        except EnhancedTicket.DoesNotExist:
            return Response(
                {"error": "Ticket not found"},
                status=status.HTTP_404_NOT_FOUND
            ) 
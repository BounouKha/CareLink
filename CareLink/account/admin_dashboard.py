from django.contrib.admin import AdminSite
from django.shortcuts import render
from django.contrib.auth.decorators import staff_member_required
from django.utils.decorators import method_decorator
from django.views.generic import TemplateView
from django.db.models import Count, Q
from django.utils import timezone
from datetime import datetime, timedelta
from CareLink.models import (
    User, Patient, Provider, ServiceDemand, Schedule, TimeSlot, 
    HelpdeskTicket, Invoice, Payment
)
import logging

logger = logging.getLogger('carelink.admin')

class CareLinKAdminSite(AdminSite):
    """
    Custom admin site for CareLink with enhanced dashboard
    """
    site_header = "CareLink Administration"
    site_title = "CareLink Admin"
    index_title = "CareLink Healthcare Management System"
    
    def index(self, request, extra_context=None):
        """
        Custom admin index page with dashboard metrics
        """
        extra_context = extra_context or {}
        
        try:
            # Get dashboard statistics
            stats = self.get_dashboard_stats()
            extra_context.update(stats)
            
            # Log dashboard access
            logger.info(f"Admin dashboard accessed by {request.user.email}")
            
        except Exception as e:
            logger.error(f"Error generating dashboard stats: {str(e)}")
            extra_context['error'] = "Error loading dashboard statistics"
        
        return super().index(request, extra_context)
    
    def get_dashboard_stats(self):
        """
        Calculate dashboard statistics
        """
        today = timezone.now().date()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)
        
        # User statistics
        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        new_users_week = User.objects.filter(created_at__gte=week_ago).count()
        
        # Patient statistics
        total_patients = Patient.objects.count()
        active_patients = Patient.objects.filter(is_alive=True).count()
        
        # Provider statistics
        total_providers = Provider.objects.count()
        internal_providers = Provider.objects.filter(is_internal=True).count()
        
        # Service demand statistics
        total_demands = ServiceDemand.objects.count()
        pending_demands = ServiceDemand.objects.filter(status='Pending').count()
        urgent_demands = ServiceDemand.objects.filter(priority='Urgent').count()
        new_demands_week = ServiceDemand.objects.filter(created_at__gte=week_ago).count()
        
        # Schedule statistics
        total_schedules = Schedule.objects.count()
        today_schedules = Schedule.objects.filter(date=today).count()
        week_schedules = Schedule.objects.filter(date__gte=today, date__lt=today + timedelta(days=7)).count()
        
        # Helpdesk statistics
        open_tickets = HelpdeskTicket.objects.filter(status__in=['Open', 'In Progress']).count()
        high_priority_tickets = HelpdeskTicket.objects.filter(priority='High', status__in=['Open', 'In Progress']).count()
        
        # Financial statistics
        total_invoices = Invoice.objects.count()
        unpaid_invoices = Invoice.objects.filter(status='Unpaid').count()
        payments_this_month = Payment.objects.filter(created_at__gte=month_ago).count()
        
        # Time slot statistics
        total_timeslots = TimeSlot.objects.count()
        completed_timeslots = TimeSlot.objects.filter(status='completed').count()
        cancelled_timeslots = TimeSlot.objects.filter(status='cancelled').count()
        
        return {
            'dashboard_stats': {
                'users': {
                    'total': total_users,
                    'active': active_users,
                    'new_week': new_users_week,
                },
                'patients': {
                    'total': total_patients,
                    'active': active_patients,
                },
                'providers': {
                    'total': total_providers,
                    'internal': internal_providers,
                    'external': total_providers - internal_providers,
                },
                'demands': {
                    'total': total_demands,
                    'pending': pending_demands,
                    'urgent': urgent_demands,
                    'new_week': new_demands_week,
                },
                'schedules': {
                    'total': total_schedules,
                    'today': today_schedules,
                    'this_week': week_schedules,
                },
                'tickets': {
                    'open': open_tickets,
                    'high_priority': high_priority_tickets,
                },
                'financial': {
                    'total_invoices': total_invoices,
                    'unpaid_invoices': unpaid_invoices,
                    'payments_month': payments_this_month,
                },
                'timeslots': {
                    'total': total_timeslots,
                    'completed': completed_timeslots,
                    'cancelled': cancelled_timeslots,
                    'completion_rate': round((completed_timeslots / total_timeslots * 100) if total_timeslots > 0 else 0, 2),
                }
            }
        }

@method_decorator(staff_member_required, name='dispatch')
class AdminReportsView(TemplateView):
    """
    Custom admin reports view
    """
    template_name = 'admin/reports.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        # Generate various reports
        context['user_activity'] = self.get_user_activity_report()
        context['service_demand_trends'] = self.get_service_demand_trends()
        context['provider_utilization'] = self.get_provider_utilization()
        
        return context
    
    def get_user_activity_report(self):
        """Generate user activity report"""
        return User.objects.values('role').annotate(
            total=Count('id'),
            active=Count('id', filter=Q(is_active=True))
        ).order_by('role')
    
    def get_service_demand_trends(self):
        """Generate service demand trends"""
        return ServiceDemand.objects.values('status').annotate(
            count=Count('id')
        ).order_by('status')
    
    def get_provider_utilization(self):
        """Generate provider utilization report"""
        return Provider.objects.annotate(
            schedules_count=Count('schedule'),
            active_schedules=Count('schedule', filter=Q(schedule__date__gte=timezone.now().date()))
        ).order_by('-schedules_count')

# Create custom admin site instance
carelink_admin_site = CareLinKAdminSite(name='carelink_admin')

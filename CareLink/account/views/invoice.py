from rest_framework import generics, permissions, status
from rest_framework.response import Response
from CareLink.models import Invoice, Patient, ContestInvoice, EnhancedTicket, InvoiceLine
from account.serializers.invoice import InvoiceSerializer
from account.invoice_utils import generate_invoice_for_patient_period
from django.shortcuts import get_object_or_404
from datetime import datetime
import logging
from django.db import transaction
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.http import JsonResponse
from django.core.management import call_command
from django.conf import settings
from io import StringIO
import sys

logger = logging.getLogger(__name__)

class IsPatientOrFamily(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        user = request.user
        logger.debug(f'Checking permissions for user {user.id} ({user.role}) on object {obj}')
        
        if user.is_superuser or user.is_staff:
            logger.debug(f'User {user.id} is admin/staff - access granted')
            return True
            
        if hasattr(obj, 'patient'):
            patient = obj.patient
        else:
            patient = obj
            
        # Patient can view their own invoices
        if hasattr(patient, 'user') and patient.user == user:
            logger.debug(f'User {user.id} is the patient - access granted')
            return True
            
        # Family Patient logic
        if hasattr(user, 'family_patients') and user.family_patients.filter(patient=patient).exists():
            logger.debug(f'User {user.id} is family member of patient - access granted')
            return True
            
        logger.debug(f'User {user.id} denied access to {obj}')
        return False

class MyInvoicesView(generics.ListAPIView):
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        logger.debug(f'Fetching invoices for user {user.id} with role {user.role}')
        
        # If user is a patient, get their invoices
        if user.role == 'Patient':
            try:
                patient = Patient.objects.get(user=user)
                logger.debug(f'Found patient record for user {user.id}')
                invoices = Invoice.objects.filter(patient=patient).order_by('-created_at')
                logger.debug(f'Found {invoices.count()} invoices for patient {patient.id}')
                return invoices
            except Patient.DoesNotExist:
                logger.warning(f'No patient record found for user {user.id}')
                return Invoice.objects.none()
                
        # If user is a family member, get invoices for all linked patients
        elif user.role == 'FamilyPatient':
            patient_ids = user.family_patients.values_list('patient_id', flat=True)
            logger.debug(f'User {user.id} is family member for patients: {list(patient_ids)}')
            invoices = Invoice.objects.filter(patient_id__in=patient_ids).order_by('-created_at')
            logger.debug(f'Found {invoices.count()} total invoices for family patients')
            return invoices
            
        logger.debug(f'User {user.id} has unsupported role {user.role} for invoice access')
        return Invoice.objects.none()

    def list(self, request, *args, **kwargs):
        logger.debug(f'Processing invoice list request for user {request.user.id}')
        queryset = self.get_queryset()
        logger.debug(f'Found {queryset.count()} invoices in queryset')
        serializer = self.get_serializer(queryset, many=True)
        logger.debug(f'Serialized data: {serializer.data}')
        return Response(serializer.data)

class InvoiceListView(generics.ListAPIView):
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated, IsPatientOrFamily]

    def get_queryset(self):
        patient_id = self.kwargs['patient_id']
        patient = get_object_or_404(Patient, id=patient_id)
        self.check_object_permissions(self.request, patient)
        invoices = Invoice.objects.filter(patient=patient).order_by('-created_at')
        logger.debug(f'Found {invoices.count()} invoices for patient {patient_id}')
        return invoices

    def list(self, request, *args, **kwargs):
        logger.debug(f'Processing invoice list request for patient {self.kwargs["patient_id"]}')
        queryset = self.get_queryset()
        logger.debug(f'Found {queryset.count()} invoices in queryset')
        serializer = self.get_serializer(queryset, many=True)
        logger.debug(f'Serialized data: {serializer.data}')
        return Response(serializer.data)

class InvoiceDetailView(generics.RetrieveAPIView):
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated, IsPatientOrFamily]
    queryset = Invoice.objects.all()
    lookup_field = 'id'

    def get_object(self):
        obj = super().get_object()
        self.check_object_permissions(self.request, obj)
        return obj

class InvoiceCreateView(generics.CreateAPIView):
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]

    def create(self, request, *args, **kwargs):
        patient_id = self.kwargs['patient_id']
        patient = get_object_or_404(Patient, id=patient_id)
        period_start = request.data.get('period_start')
        period_end = request.data.get('period_end')
        if not period_start or not period_end:
            return Response({'error': 'period_start and period_end are required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            period_start = datetime.strptime(period_start, '%Y-%m-%d').date()
            period_end = datetime.strptime(period_end, '%Y-%m-%d').date()
        except Exception:
            return Response({'error': 'Invalid date format. Use YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)
        invoice = generate_invoice_for_patient_period(patient, period_start, period_end)
        serializer = self.get_serializer(invoice)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class InvoiceLinesView(generics.ListAPIView):
    """Get the invoice lines (timeslots) for a specific invoice"""
    permission_classes = [permissions.IsAuthenticated, IsPatientOrFamily]
    
    def get_queryset(self):
        invoice_id = self.kwargs['invoice_id']
        invoice = get_object_or_404(Invoice, id=invoice_id)
        
        # Check permissions
        self.check_object_permissions(self.request, invoice)
        
        lines = InvoiceLine.objects.filter(invoice=invoice).order_by('date', 'start_time')
        logger.debug(f'Found {lines.count()} invoice lines for invoice {invoice_id}')
        return lines
    
    def list(self, request, *args, **kwargs):
        invoice_id = self.kwargs['invoice_id']
        logger.debug(f'Processing invoice lines request for invoice {invoice_id}')
        
        queryset = self.get_queryset()
        
        # Custom serialization for invoice lines
        lines_data = []
        for line in queryset:
            lines_data.append({
                'id': line.id,
                'date': line.date,
                'start_time': line.start_time,
                'end_time': line.end_time,
                'service_name': line.service.name if line.service else 'Unknown Service',
                'provider_name': f"{line.provider.user.firstname} {line.provider.user.lastname}" if line.provider and line.provider.user else 'Unknown Provider',
                'price': line.price,
                'status': line.status,
                'duration_hours': self.calculate_duration(line.start_time, line.end_time)
            })
        
        logger.debug(f'Serialized {len(lines_data)} invoice lines')
        return Response(lines_data)
    
    def calculate_duration(self, start_time, end_time):
        """Calculate duration in hours"""
        if not start_time or not end_time:
            return 0
        
        from datetime import datetime, timedelta
        today = datetime.now().date()
        start_dt = datetime.combine(today, start_time)
        end_dt = datetime.combine(today, end_time)
        
        duration = end_dt - start_dt
        hours = duration.total_seconds() / 3600
        return round(hours, 2)

class ContestInvoiceView(generics.CreateAPIView):
    """Contest an invoice and create a helpdesk ticket"""
    permission_classes = [permissions.IsAuthenticated, IsPatientOrFamily]
    
    def create(self, request, *args, **kwargs):
        invoice_id = kwargs.get('invoice_id')
        invoice = get_object_or_404(Invoice, id=invoice_id)
        
        # Check permissions
        self.check_object_permissions(request, invoice)
        
        reason = request.data.get('reason', '')
        selected_timeslots = request.data.get('selected_timeslots', [])
        
        if not reason:
            return Response(
                {"error": "Reason is required to contest an invoice"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if invoice is already contested
        existing_contest = ContestInvoice.objects.filter(
            invoice=invoice,
            status__in=['In Progress', 'Accepted']
        ).first()
        
        if existing_contest:
            return Response(
                {"error": "This invoice is already being contested"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            with transaction.atomic():
                # Create ContestInvoice record
                contest = ContestInvoice.objects.create(
                    invoice=invoice,
                    user=request.user,
                    reason=reason,
                    status='In Progress'
                )
                
                # Update invoice status
                invoice.status = 'Contested'
                invoice.save()
                
                # Prepare detailed description for the ticket
                description_parts = [
                    f"Patient has contested Invoice #{invoice.id} for period {invoice.period_start} to {invoice.period_end}.",
                    "",
                    "Invoice Details:",
                    f"- Amount: €{invoice.amount}",
                    f"- Period: {invoice.period_start} to {invoice.period_end}",
                    f"- Patient: {invoice.patient.user.firstname} {invoice.patient.user.lastname}",
                    "",
                    "Reason for Contest:",
                    reason,
                    ""
                ]
                
                # If specific timeslots were selected, list them
                if selected_timeslots:
                    description_parts.extend([
                        "Specific timeslots contested:",
                        ""
                    ])
                    
                    contested_lines = InvoiceLine.objects.filter(
                        invoice=invoice,
                        id__in=selected_timeslots
                    ).order_by('date', 'start_time')
                    
                    for line in contested_lines:
                        provider_name = f"{line.provider.user.firstname} {line.provider.user.lastname}" if line.provider and line.provider.user else "Unknown Provider"
                        service_name = line.service.name if line.service else "Unknown Service"
                        description_parts.append(
                            f"- {line.date} {line.start_time}-{line.end_time}: {service_name} with {provider_name} (€{line.price})"
                        )
                else:
                    description_parts.append("All timeslots in this invoice are being contested.")
                
                description_parts.append("")
                description_parts.append("Please review this contest and take appropriate action.")
                
                # Create Enhanced Ticket for coordinator team
                ticket = EnhancedTicket.objects.create(
                    title=f"Invoice Contest - Invoice #{invoice.id}",
                    description="\n".join(description_parts),
                    category='Billing Issue',
                    priority='Medium',
                    assigned_team='Coordinator',
                    created_by=request.user,
                    status='New'
                )
                
                logger.info(f"Invoice {invoice.id} contested by user {request.user.id}, ticket {ticket.id} created")
                
                return Response({
                    "message": "Invoice contested successfully",
                    "contest_id": contest.id,
                    "ticket_id": ticket.id,
                    "status": "Contested",
                    "contested_timeslots": len(selected_timeslots) if selected_timeslots else "all"
                }, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            logger.error(f"Failed to contest invoice {invoice.id}: {str(e)}")
            return Response(
                {"error": f"Failed to contest invoice: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

@method_decorator(csrf_exempt, name='dispatch')
class GenerateInvoicesView(generics.GenericAPIView):
    """Trigger invoice generation via HTTP request for production automation"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        # Check if user is admin/staff
        if not (request.user.is_superuser or request.user.is_staff):
            return Response(
                {"error": "Only administrators can trigger invoice generation"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            # Capture command output
            out = StringIO()
            err = StringIO()
            
            # Run the management command
            call_command('generate_monthly_invoices', stdout=out, stderr=err)
            
            output = out.getvalue()
            error_output = err.getvalue()
            
            logger.info(f"Invoice generation triggered by user {request.user.id}")
            
            return Response({
                "message": "Invoice generation completed successfully",
                "output": output,
                "errors": error_output if error_output else None
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Invoice generation failed: {str(e)}")
            return Response(
                {"error": f"Invoice generation failed: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

@method_decorator(csrf_exempt, name='dispatch')
class CronGenerateInvoicesView(generics.GenericAPIView):
    """Secure endpoint for external cron services"""
    permission_classes = []  # No authentication required, uses token instead
    
    def post(self, request, *args, **kwargs):
        # Get the secret token from request headers or body
        auth_token = request.headers.get('X-Cron-Token') or request.data.get('token')
        
        # Check against your secret token from settings
        expected_token = getattr(settings, 'CRON_SECRET_TOKEN', 'default-token')
        
        if not auth_token or auth_token != expected_token:
            logger.warning(f"Invalid cron token attempt: {auth_token}")
            return Response(
                {"error": "Invalid or missing authentication token"}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        try:
            # Capture command output
            out = StringIO()
            err = StringIO()
            
            # Run the management command
            call_command('generate_monthly_invoices', stdout=out, stderr=err)
            
            output = out.getvalue()
            error_output = err.getvalue()
            
            logger.info("Invoice generation triggered by external cron service")
            
            return Response({
                "success": True,
                "message": "Invoice generation completed successfully",
                "timestamp": datetime.now().isoformat(),
                "output": output,
                "errors": error_output if error_output else None
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Cron invoice generation failed: {str(e)}")
            return Response(
                {"success": False, "error": f"Invoice generation failed: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            ) 
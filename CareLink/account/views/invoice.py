from rest_framework import generics, permissions, status
from rest_framework.response import Response
from CareLink.models import Invoice, Patient, ContestInvoice, EnhancedTicket, InvoiceLine
from account.serializers.invoice import InvoiceSerializer
from account.invoice_utils import generate_invoice_for_patient_period, get_patient_service_price, get_provider_from_schedule
from django.shortcuts import get_object_or_404
from datetime import datetime
from decimal import Decimal
import logging
from django.db import transaction
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.http import JsonResponse
from django.core.management import call_command
from django.conf import settings
from io import StringIO
import sys
from CareLink.models import Schedule, TimeSlot

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

from rest_framework.pagination import PageNumberPagination

class InvoicePagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

class AdminInvoiceListView(generics.ListAPIView):
    """Admin view to see all invoices with detailed information"""
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]
    serializer_class = InvoiceSerializer
    pagination_class = InvoicePagination
    
    def get_queryset(self):
        queryset = Invoice.objects.select_related(
            'patient', 
            'patient__user'
        ).prefetch_related(
            'lines',
            'lines__service',
            'lines__provider',
            'lines__provider__user'
        ).order_by('-created_at')
        
        # Apply filters
        status = self.request.query_params.get('status')
        if status and status != 'all':
            queryset = queryset.filter(status=status)
            
        patient_name = self.request.query_params.get('patient')
        if patient_name:
            queryset = queryset.filter(
                patient__user__firstname__icontains=patient_name
            ) | queryset.filter(
                patient__user__lastname__icontains=patient_name
            )
        
        # Month filter
        month = self.request.query_params.get('month')
        if month:
            try:
                # Parse month in format YYYY-MM
                year, month_num = month.split('-')
                queryset = queryset.filter(
                    created_at__year=year,
                    created_at__month=month_num
                )
            except (ValueError, AttributeError):
                pass  # Invalid month format, ignore filter
            
        return queryset
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        
        # Serialize with enhanced data
        invoices_data = []
        for invoice in queryset:
            invoice_data = InvoiceSerializer(invoice).data
            
            # Add patient name
            if invoice.patient and invoice.patient.user:
                invoice_data['patient_name'] = f"{invoice.patient.user.firstname} {invoice.patient.user.lastname}"
            else:
                invoice_data['patient_name'] = "Unknown Patient"
            
            # Add line count
            invoice_data['line_count'] = invoice.lines.count()
            
            # Add new invoice creation status
            invoice_data['new_invoice_created_after_contest'] = invoice.new_invoice_created_after_contest
            
            # Add contest information if contested
            if invoice.status == 'Contested':
                contest = ContestInvoice.objects.filter(
                    invoice=invoice,
                    status__in=['In Progress', 'Accepted']
                ).first()
                if contest:
                    invoice_data['contest_reason'] = contest.reason
                    invoice_data['contest'] = {
                        'reason': contest.reason,
                        'user_name': f"{contest.user.firstname} {contest.user.lastname}" if contest.user else "Unknown",
                        'created_at': contest.created_at.isoformat()
                    }
            
            # Add detailed line information
            lines_data = []
            for line in invoice.lines.all():
                line_data = {
                    'id': line.id,
                    'service_name': line.service.name if line.service else "Unknown Service",
                    'price': float(line.price),
                    'date': line.date.isoformat(),
                    'start_time': line.start_time.strftime('%H:%M'),
                    'end_time': line.end_time.strftime('%H:%M'),
                    'status': line.status
                }
                
                if line.provider and line.provider.user:
                    line_data['provider_name'] = f"{line.provider.user.firstname} {line.provider.user.lastname}"
                else:
                    line_data['provider_name'] = "Unknown Provider"
                    
                lines_data.append(line_data)
            
            invoice_data['lines'] = lines_data
            invoices_data.append(invoice_data)
        
        return Response(invoices_data) 

class RegenerateInvoiceView(generics.GenericAPIView):
    """Regenerate an invoice with updated pricing logic"""
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]
    
    def post(self, request, *args, **kwargs):
        invoice_id = kwargs.get('invoice_id')
        logger.info(f"🔄 Regenerate invoice request received for invoice {invoice_id} by user {request.user.id}")
        
        invoice = get_object_or_404(Invoice, id=invoice_id)
        
        try:
            with transaction.atomic():
                # Delete existing invoice lines
                invoice.lines.all().delete()
                
                # Get the period from the original invoice
                period_start = invoice.period_start
                period_end = invoice.period_end
                patient = invoice.patient
                
                # Get all schedules for this patient in the period
                schedules = Schedule.objects.filter(
                    patient=patient,
                    date__gte=period_start,
                    date__lte=period_end
                )
                
                logger.info(f"Found {schedules.count()} schedules for patient {patient.id} in period {period_start} to {period_end}")
                
                # Get all timeslots from these schedules that are completed or confirmed
                timeslots = TimeSlot.objects.filter(
                    schedule__in=schedules,
                    status__in=["completed", "confirmed"]
                ).distinct()
                
                logger.info(f"Found {timeslots.count()} completed/confirmed timeslots for regeneration")
                
                # Debug: show all timeslots for this patient in the period
                all_timeslots = TimeSlot.objects.filter(schedule__in=schedules).distinct()
                logger.info(f"Total timeslots in period: {all_timeslots.count()}")
                for ts in all_timeslots:
                    logger.info(f"Timeslot {ts.id}: status='{ts.status}', date={ts.schedule.date if ts.schedule else 'unknown'}")
                
                # Regenerate invoice with new pricing logic
                new_invoice = generate_invoice_for_patient_period(
                    patient=patient,
                    period_start=period_start,
                    period_end=period_end,
                    timeslots=timeslots
                )
                
                # Update the original invoice with new data
                invoice.amount = new_invoice.amount
                invoice.save()
                
                logger.info(f"✅ Invoice {invoice_id} regenerated successfully by admin {request.user.id}")
                
                response_data = {
                    "message": "Invoice regenerated successfully",
                    "invoice_id": invoice.id,
                    "new_amount": float(invoice.amount),
                    "lines_count": invoice.lines.count()
                }
                logger.info(f"📊 Regenerate response data: {response_data}")
                
                return Response(response_data, status=status.HTTP_200_OK)
                
        except Exception as e:
            logger.error(f"❌ Failed to regenerate invoice {invoice_id}: {str(e)}")
            error_response = {"error": f"Failed to regenerate invoice: {str(e)}"}
            logger.error(f"📊 Regenerate error response: {error_response}")
            return Response(error_response, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ResolveContestView(generics.GenericAPIView):
    """Resolve an invoice contest (accept or reject)"""
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]
    
    def post(self, request, *args, **kwargs):
        invoice_id = kwargs.get('invoice_id')
        invoice = get_object_or_404(Invoice, id=invoice_id)
        resolution = request.data.get('resolution')  # 'accepted' or 'rejected'
        
        if resolution not in ['accepted', 'rejected']:
            return Response(
                {"error": "Resolution must be 'accepted' or 'rejected'"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            with transaction.atomic():
                # Find the contest
                contest = ContestInvoice.objects.filter(
                    invoice=invoice,
                    status='In Progress'
                ).first()
                
                if not contest:
                    return Response(
                        {"error": "No active contest found for this invoice"}, 
                        status=status.HTTP_404_NOT_FOUND
                    )
                
                # Update contest status
                contest.status = 'Accepted' if resolution == 'accepted' else 'Cancelled'
                contest.save()
                
                # Update invoice status
                if resolution == 'accepted':
                    invoice.status = 'Cancelled'  # Invoice is cancelled due to accepted contest
                else:
                    invoice.status = 'In Progress'  # Invoice is back to normal
                invoice.save()
                
                # Create a ticket comment about the resolution
                if contest:
                    from CareLink.models import TicketComment
                    ticket = EnhancedTicket.objects.filter(
                        title__icontains=f"Invoice Contest - Invoice #{invoice_id}"
                    ).first()
                    
                    if ticket:
                        TicketComment.objects.create(
                            ticket=ticket,
                            comment=f"Contest {resolution} by administrator. Invoice status updated to '{invoice.status}'.",
                            created_by=request.user,
                            is_internal=True
                        )
                
                logger.info(f"Invoice contest {contest.id} resolved as {resolution} by admin {request.user.id}")
                
                return Response({
                    "message": f"Contest {resolution} successfully",
                    "invoice_id": invoice.id,
                    "contest_id": contest.id,
                    "resolution": resolution,
                    "new_invoice_status": invoice.status
                }, status=status.HTTP_200_OK)
                
        except Exception as e:
            logger.error(f"Failed to resolve contest for invoice {invoice_id}: {str(e)}")
            return Response(
                {"error": f"Failed to resolve contest: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class CreateNewInvoiceAfterContestView(generics.GenericAPIView):
    """Create a new invoice after contest resolution"""
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]
    
    def post(self, request, *args, **kwargs):
        original_invoice_id = kwargs.get('invoice_id')
        original_invoice = get_object_or_404(Invoice, id=original_invoice_id)
        
        # Check if this invoice was cancelled due to contest acceptance
        if original_invoice.status != 'Cancelled':
            return Response(
                {"error": "Can only create new invoice for cancelled invoices"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if a new invoice was already created
        if original_invoice.new_invoice_created_after_contest:
            return Response(
                {"error": "New invoice already created for this contest"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            with transaction.atomic():
                # Create new invoice with same period and patient
                new_invoice = Invoice.objects.create(
                    patient=original_invoice.patient,
                    period_start=original_invoice.period_start,
                    period_end=original_invoice.period_end,
                    status="In Progress",
                    amount=0,  # Will be calculated
                    new_invoice_created_after_contest=True
                )
                
                # Get all schedules for this patient in the period
                schedules = Schedule.objects.filter(
                    patient=original_invoice.patient,
                    date__gte=original_invoice.period_start,
                    date__lte=original_invoice.period_end
                )
                
                # Get all timeslots from these schedules that are completed or confirmed
                timeslots = TimeSlot.objects.filter(
                    schedule__in=schedules,
                    status__in=["completed", "confirmed"]
                ).distinct()
                
                total_amount = Decimal('0.00')
                lines_created = 0
                
                for ts in timeslots:
                    service = ts.service or (ts.prescription.service if ts.prescription else None)
                    if not service:
                        continue

                    provider = get_provider_from_schedule(ts)
                    
                    # Use new pricing logic
                    pricing_info = get_patient_service_price(original_invoice.patient, service, ts)
                    price = pricing_info['price']

                    # Get the date from the schedule
                    schedule = Schedule.objects.filter(time_slots=ts).first()
                    if not schedule:
                        date = original_invoice.period_start
                    else:
                        date = schedule.date

                    # Create invoice line
                    line = InvoiceLine.objects.create(
                        invoice=new_invoice,
                        timeslot=ts,
                        service=service,
                        provider=provider,
                        date=date,
                        start_time=ts.start_time,
                        end_time=ts.end_time,
                        price=price,
                        status=ts.status
                    )
                    
                    total_amount += price
                    lines_created += 1
                
                # Update new invoice amount
                new_invoice.amount = total_amount
                new_invoice.save()
                
                # Mark original invoice as having new invoice created
                original_invoice.new_invoice_created_after_contest = True
                original_invoice.save()
                
                # Create a ticket comment about the new invoice
                from CareLink.models import TicketComment
                ticket = EnhancedTicket.objects.filter(
                    title__icontains=f"Invoice Contest - Invoice #{original_invoice_id}"
                ).first()
                
                if ticket:
                    TicketComment.objects.create(
                        ticket=ticket,
                        comment=f"New invoice #{new_invoice.id} created after contest resolution. Amount: €{total_amount:.2f}",
                        created_by=request.user,
                        is_internal=True
                    )
                
                logger.info(f"New invoice {new_invoice.id} created after contest resolution for original invoice {original_invoice_id}")
                
                return Response({
                    "message": "New invoice created successfully",
                    "new_invoice_id": new_invoice.id,
                    "new_invoice_amount": float(new_invoice.amount),
                    "lines_count": lines_created,
                    "original_invoice_id": original_invoice_id
                }, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            logger.error(f"Failed to create new invoice after contest for invoice {original_invoice_id}: {str(e)}")
            return Response(
                {"error": f"Failed to create new invoice: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            ) 
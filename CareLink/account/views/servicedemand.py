from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.core.paginator import Paginator
from django.utils import timezone
from django.http import Http404
from CareLink.models import ServiceDemand, Patient, Service, UserActionLog, ServiceDemandPrescription
from account.serializers.servicedemand import ServiceDemandSerializer, ServiceDemandCreateSerializer, ServiceDemandPrescriptionSerializer
from account.services.notification_service import NotificationService
import json

def log_service_demand_action(user, action_type, target_model, target_id, service_demand=None, description=None, additional_data=None):
    """
    Enhanced logging function for service demand-related actions
    
    Args:
        user: The user who performed the action
        action_type: Type of action (CREATE_SERVICE_DEMAND, UPDATE_SERVICE_DEMAND_STATUS, etc.)
        target_model: Model name (ServiceDemand)
        target_id: ID of the target object
        service_demand: ServiceDemand object to extract patient/service info
        description: Optional description of the action
        additional_data: Optional dict with additional context
    """
    log_data = {
        'user': user,        'action_type': action_type,
        'target_model': target_model,
        'target_id': target_id,
        'description': description,
        'additional_data': json.dumps(additional_data) if additional_data else None
    }
    
    # Extract patient and service information if service_demand is provided
    if service_demand:
        if service_demand.patient:
            log_data['affected_patient_id'] = service_demand.patient.id
            log_data['affected_patient_name'] = f"{service_demand.patient.user.firstname} {service_demand.patient.user.lastname}" if service_demand.patient.user else f"Patient ID: {service_demand.patient.id}"
          # For service demands, we can log the service in additional_data
        if service_demand.service:
            if not additional_data:
                additional_data = {}
            additional_data['service_name'] = service_demand.service.name
            additional_data['service_id'] = service_demand.service.id
        
        # Add status and priority info
        if not additional_data:
            additional_data = {}
        additional_data.update({
            'status': service_demand.status,
            'priority': service_demand.priority,
            'title': service_demand.title
        })
        log_data['additional_data'] = json.dumps(additional_data)
    
    UserActionLog.objects.create(**log_data)

class ServiceDemandListCreateView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        """Get list of service demands with filtering and pagination"""
        # Get filter parameters
        status_filter = request.query_params.get('status', None)
        priority_filter = request.query_params.get('priority', None)
        patient_id = request.query_params.get('patient_id', None)
        service_id = request.query_params.get('service_id', None)
        search_query = request.query_params.get('search', None)
        page = request.query_params.get('page', 1)
        
        # Base queryset
        queryset = ServiceDemand.objects.select_related(
            'patient__user', 'sent_by', 'managed_by', 'service', 'assigned_provider__user'
        ).all()        # Apply filters based on user role
        user = request.user
        if user.role == 'Patient':
            # Patients can only see their own demands
            try:
                patient = Patient.objects.get(user=user)
                queryset = queryset.filter(patient=patient)
            except Patient.DoesNotExist:
                return Response({"error": "Patient profile not found."}, status=404)
        elif user.role == 'Family Patient':
            # Family members can see demands for ALL their linked patients
            from CareLink.models import FamilyPatient
            try:
                family_patients = FamilyPatient.objects.filter(user=user)
                if family_patients.exists():
                    # Get all patient IDs that this family member is linked to
                    patient_ids = [fp.patient_id for fp in family_patients if fp.patient_id]
                    if patient_ids:
                        queryset = queryset.filter(patient_id__in=patient_ids)
                    else:
                        queryset = queryset.none()
                else:
                    # No linked patients, show empty
                    queryset = queryset.none()
            except Exception:
                return Response({"error": "Error fetching family patient relationships."}, status=500)
        elif user.role in ['Coordinator', 'Administrative']:
            # Coordinators and admin can see all demands
            pass
        else:
            return Response({"error": "Permission denied."}, status=403)
          # Apply filters
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if priority_filter:
            queryset = queryset.filter(priority=priority_filter)
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
        if service_id:
            queryset = queryset.filter(service_id=service_id)
        
        # Apply search filter
        if search_query:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(title__icontains=search_query) |
                Q(description__icontains=search_query) |
                Q(reason__icontains=search_query) |
                Q(service__name__icontains=search_query) |
                Q(patient__user__firstname__icontains=search_query) |
                Q(patient__user__lastname__icontains=search_query)
            )
        
        # Order by creation date (newest first), then by priority
        queryset = queryset.order_by('-created_at', '-priority')
        
        # Paginate
        paginator = Paginator(queryset, 20)
        page_obj = paginator.get_page(page)
        
        # Serialize
        serializer = ServiceDemandSerializer(page_obj, many=True)
        
        return Response({
            "results": serializer.data,
            "has_next": page_obj.has_next(),
            "has_previous": page_obj.has_previous(),
            "total_pages": paginator.num_pages,
            "current_page": page_obj.number,
            "total_count": paginator.count        }, status=200)
    
    def post(self, request):
        """Create a new service demand"""
        serializer = ServiceDemandCreateSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            # Auto-set patient for Family Patients if not provided
            patient_id = serializer.validated_data.get('patient')
            
            if request.user.role == 'Family Patient' and not patient_id:
                # Automatically set the linked patient for Family Patients (single patient case)
                from CareLink.models import FamilyPatient
                try:
                    family_patients = FamilyPatient.objects.filter(user=request.user)
                    if not family_patients.exists():
                        return Response(
                            {"error": "No linked patients found for this family member."}, 
                            status=400
                        )
                    
                    # If only one linked patient, auto-select it
                    if family_patients.count() == 1:
                        family_patient = family_patients.first()
                        if not family_patient.patient_id:
                            return Response(
                                {"error": "No valid linked patient found for this family member."}, 
                                status=400
                            )
                        # Get the actual Patient object
                        linked_patient = Patient.objects.get(id=family_patient.patient_id)
                        serializer.validated_data['patient'] = linked_patient
                        patient_id = linked_patient
                    else:
                        return Response(
                            {"error": "Multiple linked patients found. Please specify which patient this request is for."}, 
                            status=400
                        )
                except (Patient.DoesNotExist, Exception):
                    return Response({"error": "Family patient or linked patient not found."}, status=404)
              # Additional validation
            if patient_id:
                # Check if user has permission to create demands for this patient
                if request.user.role == 'Patient':
                    try:
                        patient = Patient.objects.get(user=request.user)
                        if patient != patient_id:
                            return Response(
                                {"error": "You can only create demands for yourself."}, 
                                status=403
                            )
                    except Patient.DoesNotExist:
                        return Response({"error": "Patient profile not found."}, status=404)
                elif request.user.role == 'Family Patient':
                    # Check if user is family member of this patient
                    from CareLink.models import FamilyPatient
                    try:
                        # Check if the user has a family relationship with the specified patient
                        family_relationship = FamilyPatient.objects.filter(
                            user=request.user,
                            patient_id=patient_id.id
                        ).first()
                        
                        if not family_relationship:
                            return Response(
                                {"error": "You can only create demands for patients you are linked to."}, 
                                status=403
                            )
                    except Exception as e:
                        return Response({"error": "Error validating family relationship."}, status=500)
            
            demand = serializer.save()
            
            # Send notification to coordinators
            NotificationService.notify_service_demand_created(demand, request.user)
            
            # Enhanced logging for service demand creation
            log_service_demand_action(
                user=request.user,
                action_type="CREATE_SERVICE_DEMAND",
                target_model="ServiceDemand",
                target_id=demand.id,
                service_demand=demand,
                description=f"Created service demand '{demand.title}' for patient {demand.patient.user.firstname} {demand.patient.user.lastname if demand.patient.user else 'Unknown'}"
            )
            
            response_serializer = ServiceDemandSerializer(demand)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        
        # Add detailed error logging
        print(f"ServiceDemand validation errors: {serializer.errors}")
        print(f"Request data: {request.data}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ServiceDemandDetailView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get_object(self, pk, user):
        """Get service demand with permission checking"""
        try:
            demand = ServiceDemand.objects.select_related(
                'patient__user', 'sent_by', 'managed_by', 'service'
            ).get(pk=pk)            # Check permissions
            if user.role == 'Patient':
                patient = Patient.objects.get(user=user)
                if demand.patient != patient:
                    return None
            elif user.role == 'Family Patient':
                # Check family relationship
                from CareLink.models import FamilyPatient
                try:
                    # Check if user has family relationship with this patient
                    family_relationship = FamilyPatient.objects.filter(
                        user=user,
                        patient_id=demand.patient.id
                    ).first()
                    
                    if not family_relationship:
                        return None
                except Exception:
                    return None
            elif user.role not in ['Coordinator', 'Administrative']:
                return None
            
            return demand
        except (ServiceDemand.DoesNotExist, Patient.DoesNotExist):
            return None
    
    def get(self, request, pk):
        """Get specific service demand"""
        demand = self.get_object(pk, request.user)
        if not demand:
            return Response({"error": "Service demand not found or access denied."}, status=404)
        
        serializer = ServiceDemandSerializer(demand)
        return Response(serializer.data)
    
    def put(self, request, pk):
        """Update service demand"""
        demand = self.get_object(pk, request.user)
        if not demand:
            return Response({"error": "Service demand not found or access denied."}, status=404)
        
        # Check if user can update this demand
        if request.user.role == 'Patient' and demand.status not in ['Pending', 'Under Review']:
            return Response(
                {"error": "Cannot update demand after it has been processed."}, 
                status=403
            )
        
        serializer = ServiceDemandSerializer(demand, data=request.data, partial=True)
        if serializer.is_valid():
            # Update timestamps based on status changes
            if 'status' in request.data:
                new_status = request.data['status']
                if new_status in ['Under Review'] and not demand.reviewed_at:
                    serializer.validated_data['reviewed_at'] = timezone.now()
                elif new_status == 'Completed' and not demand.completed_at:
                    serializer.validated_data['completed_at'] = timezone.now()
            
            serializer.save()
            return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request, pk):
        """Cancel/delete service demand"""
        demand = self.get_object(pk, request.user)
        if not demand:
            return Response({"error": "Service demand not found or access denied."}, status=404)
          # Check if user can delete this demand
        if request.user.role == 'Patient':
            if demand.status not in ['Pending', 'Under Review']:
                return Response(
                    {"error": "Cannot cancel demand after it has been processed."}, 
                    status=403
                )
            # Mark as cancelled instead of deleting
            old_status = demand.status
            demand.status = 'Cancelled'
            demand.save()
            
            # Enhanced logging for cancellation
            log_service_demand_action(
                user=request.user,
                action_type="CANCEL_SERVICE_DEMAND",
                target_model="ServiceDemand",
                target_id=demand.id,
                service_demand=demand,
                description=f"Cancelled service demand '{demand.title}'",
                additional_data={'old_status': old_status, 'new_status': 'Cancelled'}
            )
            
            return Response({"message": "Service demand cancelled successfully."})
        elif request.user.role in ['Coordinator', 'Administrative']:
            # Enhanced logging for deletion
            log_service_demand_action(
                user=request.user,
                action_type="DELETE_SERVICE_DEMAND",
                target_model="ServiceDemand",
                target_id=demand.id,
                service_demand=demand,
                description=f"Deleted service demand '{demand.title}'"
            )
            
            demand.delete()
            return Response({"message": "Service demand deleted successfully."})
        
        return Response({"error": "Permission denied."}, status=403)

class ServiceDemandStatsView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get statistics about service demands"""
        if request.user.role not in ['Coordinator', 'Administrative']:
            return Response({"error": "Permission denied."}, status=403)
        
        # Get counts by status
        stats = {
            'total': ServiceDemand.objects.count(),
            'pending': ServiceDemand.objects.filter(status='Pending').count(),
            'under_review': ServiceDemand.objects.filter(status='Under Review').count(),
            'approved': ServiceDemand.objects.filter(status='Approved').count(),
            'in_progress': ServiceDemand.objects.filter(status='In Progress').count(),
            'completed': ServiceDemand.objects.filter(status='Completed').count(),
            'rejected': ServiceDemand.objects.filter(status='Rejected').count(),
            'urgent': ServiceDemand.objects.filter(priority='Urgent').count(),
        }
          # Get recent demands (last 7 days)
        from datetime import timedelta
        recent_date = timezone.now() - timedelta(days=7)
        stats['recent'] = ServiceDemand.objects.filter(created_at__gte=recent_date).count()
        
        return Response(stats)

class ServiceDemandStatusUpdateView(APIView):
    permission_classes = [IsAuthenticated]
    
    def put(self, request, pk):
        """Update service demand status (coordinator only)"""
        if request.user.role not in ['Coordinator', 'Administrative']:
            return Response({"error": "Permission denied."}, status=403)
        
        try:
            demand = ServiceDemand.objects.get(pk=pk)
        except ServiceDemand.DoesNotExist:
            return Response({"error": "Service demand not found."}, status=404)
        
        new_status = request.data.get('status')
        coordinator_notes = request.data.get('coordinator_notes', '')
        
        if not new_status:
            return Response({"error": "Status is required."}, status=400)
        
        # Validate status
        valid_statuses = [choice[0] for choice in ServiceDemand.STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response({"error": "Invalid status."}, status=400)
        
        # Update status and timestamps
        old_status = demand.status
        demand.status = new_status
        demand.managed_by = request.user
        
        # Update relevant timestamps
        if new_status == 'Under Review' and not demand.reviewed_at:
            demand.reviewed_at = timezone.now()
        elif new_status == 'Completed' and not demand.completed_at:
            demand.completed_at = timezone.now()
        
        # Add coordinator notes if provided
        if coordinator_notes:
            if demand.coordinator_notes:
                demand.coordinator_notes += f"\n\n[{timezone.now().strftime('%Y-%m-%d %H:%M')} - {request.user.firstname} {request.user.lastname}]: {coordinator_notes}"
            else:
                demand.coordinator_notes = f"[{timezone.now().strftime('%Y-%m-%d %H:%M')} - {request.user.firstname} {request.user.lastname}]: {coordinator_notes}"
        demand.save()
          # Enhanced logging for status update
        log_service_demand_action(
            user=request.user,
            action_type="UPDATE_SERVICE_DEMAND_STATUS",
            target_model="ServiceDemand",
            target_id=demand.id,
            service_demand=demand,
            description=f"Updated service demand '{demand.title}' status from {old_status} to {new_status}",
            additional_data={'old_status': old_status, 'new_status': new_status}
        )
        
        # Return updated demand
        from account.serializers.servicedemand import ServiceDemandSerializer
        serializer = ServiceDemandSerializer(demand)
        
        return Response({
            "message": f"Status updated from {old_status} to {new_status}",
            "demand": serializer.data
        })

class ServiceDemandCommentView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request, pk):
        """Add coordinator comment to service demand"""
        if request.user.role not in ['Coordinator', 'Administrative']:
            return Response({"error": "Permission denied."}, status=403)
        
        try:
            demand = ServiceDemand.objects.get(pk=pk)
        except ServiceDemand.DoesNotExist:
            return Response({"error": "Service demand not found."}, status=404)
        
        comment = request.data.get('comment')
        if not comment:
            return Response({"error": "Comment is required."}, status=400)
        
        # Add comment with timestamp and user info
        timestamp = timezone.now().strftime('%Y-%m-%d %H:%M')
        user_name = f"{request.user.firstname} {request.user.lastname}"
        new_comment = f"[{timestamp} - {user_name}]: {comment}"
        
        if demand.coordinator_notes:
            demand.coordinator_notes += f"\n\n{new_comment}"
        else:
            demand.coordinator_notes = new_comment        # Update managed_by if not already set
        if not demand.managed_by:
            demand.managed_by = request.user
        
        demand.save()
        
        # Send notification to patient about the new comment
        try:
            NotificationService.notify_service_demand_comment(
                service_demand=demand,
                comment_author=request.user,
                comment_text=comment
            )
        except Exception as e:
            # Log the error but don't fail the comment addition
            print(f"Error sending notification for service demand comment: {e}")
        
        # Enhanced logging for comment addition
        log_service_demand_action(
            user=request.user,
            action_type="ADD_SERVICE_DEMAND_COMMENT",
            target_model="ServiceDemand",
            target_id=demand.id,
            service_demand=demand,
            description=f"Added comment to service demand '{demand.title}'"
        )
        
        return Response({
            "message": "Comment added successfully",
            "coordinator_notes": demand.coordinator_notes
        })

class FamilyPatientLinkedView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get all linked patient information for Family Patients"""
        if request.user.role != 'Family Patient':
            return Response({"error": "This endpoint is only for Family Patients."}, status=403)
        
        try:
            from CareLink.models import FamilyPatient
            from account.serializers.patient import PatientWithUserSerializer
            
            # Get ALL family patient relationships for this user
            family_patients = FamilyPatient.objects.filter(user=request.user)
            
            if not family_patients.exists():
                return Response({"linked_patients": []})
            
            linked_patients_data = []
            for family_patient in family_patients:
                if family_patient.patient_id:
                    try:
                        linked_patient = Patient.objects.get(id=family_patient.patient_id)
                        patient_serializer = PatientWithUserSerializer(linked_patient)
                        patient_data = patient_serializer.data
                        # Add relationship information
                        patient_data['relationship'] = family_patient.link
                        patient_data['family_patient_id'] = family_patient.id
                        linked_patients_data.append(patient_data)
                    except Patient.DoesNotExist:
                        continue
            
            return Response({"linked_patients": linked_patients_data})
            
        except Exception as e:
            return Response({"error": "Error fetching linked patients."}, status=500)


class ServiceDemandPrescriptionView(APIView):
    """
    Handle prescription file uploads for service demands
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def get(self, request, service_demand_id):
        """Get all prescription files for a service demand"""
        try:
            # Check if service demand exists and user has access
            service_demand = ServiceDemand.objects.get(id=service_demand_id)
            
            # Basic access control - users can only see their own service demands or if they're coordinators/admin
            if (service_demand.sent_by != request.user and 
                service_demand.patient.user != request.user and 
                request.user.role not in ['Coordinator', 'Administrative']):
                return Response({"error": "Access denied."}, status=403)
            
            prescriptions = ServiceDemandPrescription.objects.filter(service_demand=service_demand)
            serializer = ServiceDemandPrescriptionSerializer(prescriptions, many=True, context={'request': request})
            
            return Response({
                "prescriptions": serializer.data,
                "count": prescriptions.count()
            })
            
        except ServiceDemand.DoesNotExist:
            return Response({"error": "Service demand not found."}, status=404)
        except Exception as e:
            return Response({"error": "Error fetching prescriptions."}, status=500)
    
    def post(self, request, service_demand_id):
        """Upload a new prescription file"""
        try:
            # Check if service demand exists and user has access
            service_demand = ServiceDemand.objects.get(id=service_demand_id)
            
            # Access control - only the requester, patient, or coordinators/admin can upload
            if (service_demand.sent_by != request.user and 
                service_demand.patient.user != request.user and 
                request.user.role not in ['Coordinator', 'Administrative']):
                return Response({"error": "Access denied."}, status=403)
            
            # Prepare data for serializer
            data = request.data.copy()
            data['service_demand'] = service_demand_id
            
            serializer = ServiceDemandPrescriptionSerializer(data=data, context={'request': request})
            
            if serializer.is_valid():
                prescription = serializer.save()
                
                # Log the upload action
                log_service_demand_action(
                    user=request.user,
                    action_type="UPLOAD_PRESCRIPTION",
                    target_model="ServiceDemandPrescription",
                    target_id=prescription.id,
                    service_demand=service_demand,
                    description=f"Uploaded prescription file: {prescription.file_name}",
                    additional_data={
                        'file_name': prescription.file_name,
                        'file_size': prescription.file_size,
                        'description': prescription.description
                    }
                )
                
                return Response({
                    "message": "Prescription uploaded successfully.",
                    "prescription": serializer.data
                }, status=201)
            else:
                return Response({
                    "error": "Invalid data.",
                    "details": serializer.errors
                }, status=400)
                
        except ServiceDemand.DoesNotExist:
            return Response({"error": "Service demand not found."}, status=404)
        except Exception as e:
            return Response({"error": f"Error uploading prescription: {str(e)}"}, status=500)
    
    def delete(self, request, service_demand_id, prescription_id=None):
        """Delete a prescription file"""
        if not prescription_id:
            return Response({"error": "Prescription ID required."}, status=400)
            
        try:
            prescription = ServiceDemandPrescription.objects.get(
                id=prescription_id, 
                service_demand_id=service_demand_id
            )
            
            # Access control - only the uploader or coordinators/admin can delete
            if (prescription.uploaded_by != request.user and 
                request.user.role not in ['Coordinator', 'Administrative']):
                return Response({"error": "Access denied."}, status=403)
            
            file_name = prescription.file_name
            service_demand = prescription.service_demand
            
            # Delete the file and record
            prescription.delete()
            
            # Log the deletion
            log_service_demand_action(
                user=request.user,
                action_type="DELETE_PRESCRIPTION",
                target_model="ServiceDemandPrescription",
                target_id=prescription_id,
                service_demand=service_demand,
                description=f"Deleted prescription file: {file_name}",
                additional_data={'file_name': file_name}
            )
            
            return Response({"message": "Prescription deleted successfully."})
            
        except ServiceDemandPrescription.DoesNotExist:
            return Response({"error": "Prescription not found."}, status=404)
        except Exception as e:
            return Response({"error": "Error deleting prescription."}, status=500)

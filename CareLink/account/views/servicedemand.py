from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.paginator import Paginator
from django.utils import timezone
from CareLink.models import ServiceDemand, Patient, Service, UserActionLog
from account.serializers.servicedemand import ServiceDemandSerializer, ServiceDemandCreateSerializer

class ServiceDemandListCreateView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get list of service demands with filtering and pagination"""
        # Get filter parameters
        status_filter = request.query_params.get('status', None)
        priority_filter = request.query_params.get('priority', None)
        patient_id = request.query_params.get('patient_id', None)
        service_id = request.query_params.get('service_id', None)
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
        
        # Order by priority and creation date
        queryset = queryset.order_by('-priority', '-created_at')
        
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
                # Automatically set the linked patient for Family Patients
                from CareLink.models import FamilyPatient
                try:
                    family_patient = FamilyPatient.objects.get(user=request.user)
                    if not family_patient.patient_id:
                        return Response(
                            {"error": "No linked patient found for this family member."}, 
                            status=400
                        )
                    # Get the actual Patient object
                    linked_patient = Patient.objects.get(id=family_patient.patient_id)
                    serializer.validated_data['patient'] = linked_patient
                    patient_id = linked_patient
                except (FamilyPatient.DoesNotExist, Patient.DoesNotExist):
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
                        family_patient = FamilyPatient.objects.get(user=request.user)
                        if not family_patient.patient_id:                            return Response(
                                {"error": "No linked patient found for this family member."}, 
                                status=400
                            )
                        if family_patient.patient_id != patient_id.id:
                            return Response(
                                {"error": "You can only create demands for your linked patient."}, 
                                status=403
                            )
                    except FamilyPatient.DoesNotExist:
                        return Response({"error": "Family patient profile not found."}, status=404)
            
            demand = serializer.save()
            
            # Log the service demand creation action
            UserActionLog.objects.create(
                user=request.user,
                action_type="CREATE_SERVICE_DEMAND",
                target_model="ServiceDemand",
                target_id=demand.id
            )
            
            response_serializer = ServiceDemandSerializer(demand)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ServiceDemandDetailView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get_object(self, pk, user):
        """Get service demand with permission checking"""
        try:
            demand = ServiceDemand.objects.select_related(
                'patient__user', 'sent_by', 'managed_by', 'service'
            ).get(pk=pk)
              # Check permissions
            if user.role == 'Patient':
                patient = Patient.objects.get(user=user)
                if demand.patient != patient:
                    return None
            elif user.role == 'Family Patient':
                # Check family relationship
                from CareLink.models import FamilyPatient
                try:
                    family_patient = FamilyPatient.objects.get(user=user)
                    if family_patient.patient_id != demand.patient.id:
                        return None
                except FamilyPatient.DoesNotExist:
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
            demand.status = 'Cancelled'
            demand.save()
            return Response({"message": "Service demand cancelled successfully."})
        elif request.user.role in ['Coordinator', 'Administrative']:
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
        
        # Log the status update action
        UserActionLog.objects.create(
            user=request.user,
            action_type="UPDATE_SERVICE_DEMAND_STATUS",
            target_model="ServiceDemand",
            target_id=demand.id
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
            demand.coordinator_notes = new_comment
          # Update managed_by if not already set
        if not demand.managed_by:
            demand.managed_by = request.user
        
        demand.save()
        
        # Log the comment addition action
        UserActionLog.objects.create(
            user=request.user,
            action_type="ADD_SERVICE_DEMAND_COMMENT",
            target_model="ServiceDemand",
            target_id=demand.id
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

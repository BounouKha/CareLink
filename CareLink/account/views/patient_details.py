from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Q
import logging

from CareLink.models import Patient, User, Provider, Schedule

logger = logging.getLogger(__name__)

class PatientDetailsView(APIView):
    """
    API view to fetch patient details for providers
    Only allows providers to access details of patients they have appointments with
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, patient_id):
        """
        Get detailed patient information for providers
        """
        try:
            # Get the patient
            patient = get_object_or_404(Patient, id=patient_id)
            
            # Check if user has permission to view this patient's details
            if not self._can_user_view_patient(request.user, patient):
                logger.warning(
                    f"Unauthorized patient details access attempt - "
                    f"User: {request.user.firstname} {request.user.lastname} ({request.user.role}), "
                    f"Patient ID: {patient_id}"
                )
                return Response({
                    'error': 'You do not have permission to view this patient\'s details'
                }, status=403)
            
            # Prepare patient data
            patient_data = {
                'id': patient.id,
                'firstname': patient.user.firstname if patient.user else None,
                'lastname': patient.user.lastname if patient.user else None,
                'full_name': f"{patient.user.firstname} {patient.user.lastname}".strip() if patient.user else None,
                'email': patient.user.email if patient.user else None,
                'address': patient.user.address if patient.user else None,
                'birth_date': patient.user.birthdate if patient.user else None,
                'national_number': patient.user.national_number if patient.user else None,
                'gender': patient.gender,
                'blood_type': patient.blood_type,
                'emergency_contact': patient.emergency_contact,
                'illness': patient.illness,
                'critical_information': patient.critical_information,
                'medication': patient.medication,
                'social_price': patient.social_price,
                'is_alive': patient.is_alive,
            }
            
            # Log successful access
            logger.info(
                f"Patient details accessed - "
                f"Provider: {request.user.firstname} {request.user.lastname} ({request.user.role}), "
                f"Patient: {patient.user.firstname} {patient.user.lastname} (ID: {patient_id})"
            )
            
            return Response(patient_data, status=200)
            
        except Patient.DoesNotExist:
            return Response({
                'error': 'Patient not found'
            }, status=404)
        except Exception as e:
            logger.error(f"Error fetching patient details: {str(e)}")
            return Response({
                'error': 'An error occurred while fetching patient details'
            }, status=500)
    
    def _can_user_view_patient(self, user, patient):
        """
        Check if a user can view patient details based on their role and relationship
        """
        if not user or not user.is_authenticated:
            return False
        
        user_role = user.role
        
        # Superusers and staff can view all patients
        if user.is_superuser or user.is_staff:
            return True
        
        # Coordinators, Administrative, Social Assistants, and Administrators can view all patients
        if user_role in ['Coordinator', 'Administrative', 'Social Assistant', 'Administrator']:
            return True
        
        # Providers can only view patients they have appointments with
        if user_role == 'Provider':
            try:
                provider = Provider.objects.get(user=user)
                # Check if provider has any appointments with this patient
                has_appointments = Schedule.objects.filter(
                    provider=provider,
                    patient=patient
                ).exists()
                return has_appointments
            except Provider.DoesNotExist:
                return False
        
        # Patients can only view their own details
        if user_role == 'Patient':
            return patient.user == user
        
        # Family patients can view details of patients they are linked to
        if user_role == 'Family Patient':
            # Check if this family member is linked to the patient
            from CareLink.models import FamilyPatient
            try:
                family_patient = FamilyPatient.objects.get(user=user)
                # Check if they are linked to this patient
                return family_patient.patient == patient
            except FamilyPatient.DoesNotExist:
                return False
        
        # Default: no access
        return False 
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db import IntegrityError
from django.core.exceptions import ValidationError
from CareLink.models import PatientServicePrice, Patient, Service, User
from account.serializers.patient import PatientSerializer
from account.serializers.service import ServiceSerializer
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)

class PatientServicePriceViewSet(APIView):
    """
    API endpoint for managing PatientServicePrice records
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        List all PatientServicePrice records with patient and service details
        """
        try:
            # Check if user has admin permissions
            if not (request.user.is_staff or request.user.is_superuser):
                return Response(
                    {'error': 'You do not have permission to access pricing data.'}, 
                    status=status.HTTP_403_FORBIDDEN
                )

            pricing_records = PatientServicePrice.objects.select_related(
                'patient__user', 'service'
            ).all().order_by('-created_at')

            # Serialize the data with additional fields
            serialized_data = []
            for record in pricing_records:
                patient_name = record.patient.user.get_full_name() if record.patient.user else f"Patient {record.patient.id}"
                service_name = record.service.name if record.service else f"Service {record.service}"
                
                serialized_data.append({
                    'id': record.id,
                    'patient': record.patient.id,
                    'patient_name': patient_name,
                    'service': record.service.id,
                    'service_name': service_name,
                    'hourly_rate': str(record.custom_price),
                    'price_type': record.price_type,
                    'notes': record.notes,
                    'created_at': record.created_at.isoformat(),
                    'updated_at': record.updated_at.isoformat() if hasattr(record, 'updated_at') else None,
                })

            return Response(serialized_data, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error fetching pricing records: {str(e)}")
            return Response(
                {'error': 'Failed to fetch pricing records'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def post(self, request):
        """
        Create a new PatientServicePrice record
        """
        try:
            # Check if user has admin permissions
            if not (request.user.is_staff or request.user.is_superuser):
                return Response(
                    {'error': 'You do not have permission to create pricing records.'}, 
                    status=status.HTTP_403_FORBIDDEN
                )

            # Extract and validate data
            patient_id = request.data.get('patient')
            service_id = request.data.get('service')
            hourly_rate = request.data.get('hourly_rate')
            notes = request.data.get('notes', '')

            # Validate required fields
            if not all([patient_id, service_id, hourly_rate]):
                return Response(
                    {'error': 'Patient, service, and hourly_rate are required fields.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Validate patient exists
            try:
                patient = Patient.objects.get(id=patient_id)
            except Patient.DoesNotExist:
                return Response(
                    {'error': f'Patient with ID {patient_id} does not exist.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Validate service exists
            try:
                service = Service.objects.get(id=service_id)
            except Service.DoesNotExist:
                return Response(
                    {'error': f'Service with ID {service_id} does not exist.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Validate hourly rate
            try:
                hourly_rate_decimal = Decimal(str(hourly_rate))
                if hourly_rate_decimal < 0:
                    raise ValueError("Hourly rate cannot be negative")
                if hourly_rate_decimal > 1000:
                    raise ValueError("Hourly rate cannot exceed €1000")
            except (ValueError, TypeError) as e:
                return Response(
                    {'error': f'Invalid hourly rate: {str(e)}'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check for existing record (patient + service combination must be unique)
            existing_record = PatientServicePrice.objects.filter(
                patient=patient, 
                service=service
            ).first()
            
            if existing_record:
                return Response(
                    {'error': f'A pricing record already exists for {patient.user.get_full_name()} and {service.name}. Please update the existing record instead.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Create the record
            pricing_record = PatientServicePrice.objects.create(
                patient=patient,
                service=service,
                custom_price=hourly_rate_decimal,
                price_type='hourly',
                notes=notes.strip() if notes else None,
                created_by=request.user
            )

            # Log the creation
            logger.info(f"Created PatientServicePrice record {pricing_record.id} for patient {patient.id} and service {service.id} by user {request.user.id}")

            # Return the created record
            patient_name = patient.user.get_full_name() if patient.user else f"Patient {patient.id}"
            service_name = service.name

            response_data = {
                'id': pricing_record.id,
                'patient': pricing_record.patient.id,
                'patient_name': patient_name,
                'service': pricing_record.service.id,
                'service_name': service_name,
                'hourly_rate': str(pricing_record.custom_price),
                'price_type': pricing_record.price_type,
                'notes': pricing_record.notes,
                'created_at': pricing_record.created_at.isoformat(),
            }

            return Response(response_data, status=status.HTTP_201_CREATED)

        except IntegrityError as e:
            logger.error(f"IntegrityError creating pricing record: {str(e)}")
            return Response(
                {'error': 'A pricing record with this patient and service combination already exists.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error creating pricing record: {str(e)}")
            return Response(
                {'error': 'Failed to create pricing record'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PatientServicePriceDetailView(APIView):
    """
    API endpoint for managing individual PatientServicePrice records
    """
    permission_classes = [IsAuthenticated]

    def get_object(self, pk):
        """Helper method to get PatientServicePrice object"""
        return get_object_or_404(PatientServicePrice, pk=pk)

    def get(self, request, pk):
        """
        Retrieve a specific PatientServicePrice record
        """
        try:
            # Check if user has admin permissions
            if not (request.user.is_staff or request.user.is_superuser):
                return Response(
                    {'error': 'You do not have permission to access pricing data.'}, 
                    status=status.HTTP_403_FORBIDDEN
                )

            pricing_record = self.get_object(pk)
            patient_name = pricing_record.patient.user.get_full_name() if pricing_record.patient.user else f"Patient {pricing_record.patient.id}"
            service_name = pricing_record.service.name

            response_data = {
                'id': pricing_record.id,
                'patient': pricing_record.patient.id,
                'patient_name': patient_name,
                'service': pricing_record.service.id,
                'service_name': service_name,
                'hourly_rate': str(pricing_record.custom_price),
                'price_type': pricing_record.price_type,
                'notes': pricing_record.notes,
                'created_at': pricing_record.created_at.isoformat(),
            }

            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error fetching pricing record {pk}: {str(e)}")
            return Response(
                {'error': 'Failed to fetch pricing record'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def put(self, request, pk):
        """
        Update a specific PatientServicePrice record
        """
        try:
            # Check if user has admin permissions
            if not (request.user.is_staff or request.user.is_superuser):
                return Response(
                    {'error': 'You do not have permission to update pricing records.'}, 
                    status=status.HTTP_403_FORBIDDEN
                )

            pricing_record = self.get_object(pk)

            # Extract and validate data
            patient_id = request.data.get('patient')
            service_id = request.data.get('service')
            hourly_rate = request.data.get('hourly_rate')
            notes = request.data.get('notes', '')

            # Validate required fields
            if not all([patient_id, service_id, hourly_rate]):
                return Response(
                    {'error': 'Patient, service, and hourly_rate are required fields.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Validate patient exists
            try:
                patient = Patient.objects.get(id=patient_id)
            except Patient.DoesNotExist:
                return Response(
                    {'error': f'Patient with ID {patient_id} does not exist.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Validate service exists
            try:
                service = Service.objects.get(id=service_id)
            except Service.DoesNotExist:
                return Response(
                    {'error': f'Service with ID {service_id} does not exist.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Validate hourly rate
            try:
                hourly_rate_decimal = Decimal(str(hourly_rate))
                if hourly_rate_decimal < 0:
                    raise ValueError("Hourly rate cannot be negative")
                if hourly_rate_decimal > 1000:
                    raise ValueError("Hourly rate cannot exceed €1000")
            except (ValueError, TypeError) as e:
                return Response(
                    {'error': f'Invalid hourly rate: {str(e)}'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check for existing record (if changing patient or service)
            if (pricing_record.patient.id != int(patient_id) or 
                pricing_record.service.id != int(service_id)):
                existing_record = PatientServicePrice.objects.filter(
                    patient=patient, 
                    service=service
                ).exclude(id=pricing_record.id).first()
                
                if existing_record:
                    return Response(
                        {'error': f'A pricing record already exists for {patient.user.get_full_name()} and {service.name}.'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # Update the record
            pricing_record.patient = patient
            pricing_record.service = service
            pricing_record.custom_price = hourly_rate_decimal
            pricing_record.price_type = 'hourly'
            pricing_record.notes = notes.strip() if notes else None
            pricing_record.save()

            # Log the update
            logger.info(f"Updated PatientServicePrice record {pricing_record.id} by user {request.user.id}")

            # Return the updated record
            patient_name = patient.user.get_full_name() if patient.user else f"Patient {patient.id}"
            service_name = service.name

            response_data = {
                'id': pricing_record.id,
                'patient': pricing_record.patient.id,
                'patient_name': patient_name,
                'service': pricing_record.service.id,
                'service_name': service_name,
                'hourly_rate': str(pricing_record.custom_price),
                'price_type': pricing_record.price_type,
                'notes': pricing_record.notes,
                'created_at': pricing_record.created_at.isoformat(),
            }

            return Response(response_data, status=status.HTTP_200_OK)

        except IntegrityError as e:
            logger.error(f"IntegrityError updating pricing record {pk}: {str(e)}")
            return Response(
                {'error': 'A pricing record with this patient and service combination already exists.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error updating pricing record {pk}: {str(e)}")
            return Response(
                {'error': 'Failed to update pricing record'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def delete(self, request, pk):
        """
        Delete a specific PatientServicePrice record
        """
        try:
            # Check if user has admin permissions
            if not (request.user.is_staff or request.user.is_superuser):
                return Response(
                    {'error': 'You do not have permission to delete pricing records.'}, 
                    status=status.HTTP_403_FORBIDDEN
                )

            pricing_record = self.get_object(pk)
            
            # Log before deletion
            logger.info(f"Deleting PatientServicePrice record {pricing_record.id} (Patient: {pricing_record.patient.id}, Service: {pricing_record.service.id}) by user {request.user.id}")
            
            pricing_record.delete()

            return Response(
                {'message': 'Pricing record deleted successfully'}, 
                status=status.HTTP_200_OK
            )

        except Exception as e:
            logger.error(f"Error deleting pricing record {pk}: {str(e)}")
            return Response(
                {'error': 'Failed to delete pricing record'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def patients_list(request):
    """
    Get a list of all patients for the pricing management interface
    """
    try:
        # Check if user has admin permissions
        if not (request.user.is_staff or request.user.is_superuser):
            return Response(
                {'error': 'You do not have permission to access patient data.'}, 
                status=status.HTTP_403_FORBIDDEN
            )

        patients = Patient.objects.select_related('user').all().order_by('user__firstname', 'user__lastname')
        
        patients_data = []
        for patient in patients:
            try:
                if hasattr(patient, 'user') and patient.user:
                    patient_name = patient.user.get_full_name() if hasattr(patient.user, 'get_full_name') else str(patient.user)
                else:
                    patient_name = f"Patient {patient.id}"
                social_price = getattr(patient, 'social_price', False)
                patients_data.append({
                    'id': patient.id,
                    'name': patient_name,
                    'social_price': social_price,
                })
            except Exception as inner_e:
                logger.error(f"Error serializing patient {patient.id}: {str(inner_e)}")
                patients_data.append({
                    'id': patient.id,
                    'name': f"Patient {patient.id}",
                    'social_price': False,
                    'error': str(inner_e)
                })

        return Response(patients_data, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error fetching patients list: {str(e)}")
        return Response(
            {'error': 'Failed to fetch patients list', 'details': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def services_list(request):
    """
    Get a list of all services for the pricing management interface
    """
    try:
        # Check if user has admin permissions
        if not (request.user.is_staff or request.user.is_superuser):
            return Response(
                {'error': 'You do not have permission to access service data.'}, 
                status=status.HTTP_403_FORBIDDEN
            )

        services = Service.objects.all().order_by('name')
        
        services_data = []
        for service in services:
            services_data.append({
                'id': service.id,
                'name': service.name,
                'default_price': str(service.price),  # Assuming price field exists
                'description': getattr(service, 'description', ''),
            })

        return Response(services_data, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error fetching services list: {str(e)}")
        return Response(
            {'error': 'Failed to fetch services list'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        ) 
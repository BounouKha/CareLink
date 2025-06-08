from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework import status
from CareLink.models import FamilyPatient, Patient
from account.serializers.familypatient import FamilyPatientSerializer

class FamilyPatientViewSet(ModelViewSet):
    queryset = FamilyPatient.objects.select_related('patient', 'user').all()
    serializer_class = FamilyPatientSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'], url_path='by-patient/(?P<patient_id>[^/.]+)')
    def by_patient(self, request, patient_id=None):
        try:
            family_patients = self.queryset.filter(patient__id=patient_id)
            if not family_patients.exists():
                raise NotFound("No family relationships found for the given patient ID.")
            serializer = self.get_serializer(family_patients, many=True)
            return Response(serializer.data)
        except ValueError:
            raise NotFound("Invalid patient ID.")

    @action(detail=True, methods=['post'], url_path='add-relation')
    def add_relation(self, request, pk=None):
        """
        Add new patient relations to an existing family patient.
        Accepts multiple patient IDs and a relationship type.
        """
        try:
            # Get the family patient instance
            family_patient = self.get_object()
            
            # Extract data from request
            patient_ids = request.data.get('patient_ids', [])
            relationship = request.data.get('relationship', '').strip()
            
            # Validate input
            if not patient_ids:
                raise ValidationError("patient_ids is required and cannot be empty.")
            
            if not relationship:
                raise ValidationError("relationship is required and cannot be empty.")
            
            # Filter out null/empty patient IDs
            valid_patient_ids = [pid for pid in patient_ids if pid is not None and str(pid).strip()]
            
            if not valid_patient_ids:
                raise ValidationError("No valid patient IDs provided.")
            
            # Get valid, active patients
            valid_patients = Patient.objects.filter(
                id__in=valid_patient_ids,
                is_alive=True
            ).exclude(user__isnull=True)
            
            # Track results
            added_relations = []
            skipped_existing = 0
            invalid_patients = len(valid_patient_ids) - valid_patients.count()
            
            # Create relationships for each valid patient
            for patient in valid_patients:
                # Check if relationship already exists
                existing = FamilyPatient.objects.filter(
                    user=family_patient.user,
                    patient=patient
                ).first()
                
                if existing:
                    skipped_existing += 1
                    continue
                
                # Create new relationship
                new_relation = FamilyPatient.objects.create(
                    user=family_patient.user,
                    patient=patient,
                    link=relationship
                )
                
                # Serialize the new relation for response
                serialized_relation = self.get_serializer(new_relation).data
                added_relations.append(serialized_relation)
            
            # Prepare response
            response_data = {
                'message': f'Successfully added {len(added_relations)} new patient relation(s).',
                'added_relations': added_relations,
                'skipped_existing': skipped_existing,
                'invalid_patients': invalid_patients
            }
            
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except ValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': f'An unexpected error occurred: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

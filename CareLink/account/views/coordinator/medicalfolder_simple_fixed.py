from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from CareLink.models import MedicalFolder


class MedicalFolderSimpleView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, patient_id):
        print(f"[DEBUG] User: {request.user}, Role: {getattr(request.user, 'role', 'No role')}")
        
        # Check if user has coordinator role
        if request.user.role in ['Coordinator', 'Administrative', 'Social Assistant', 'Administrator']:
            print(f"[DEBUG] User has coordinator permissions")
            medical_folders = MedicalFolder.objects.filter(patient_id=patient_id)
        else:
            # Check if user is a patient viewing their own medical folder
            try:
                from CareLink.models import Patient
                patient = Patient.objects.get(user=request.user, id=patient_id)
                print(f"[DEBUG] User is viewing their own medical folder")
                medical_folders = MedicalFolder.objects.filter(patient_id=patient_id)
            except Patient.DoesNotExist:
                # Check if user is a family member with access to this patient
                try:
                    from CareLink.models import FamilyPatient
                    family_patient = FamilyPatient.objects.get(user=request.user, patient_id=patient_id)
                    print(f"[DEBUG] User is family member viewing patient medical folder")
                    medical_folders = MedicalFolder.objects.filter(patient_id=patient_id)
                except FamilyPatient.DoesNotExist:
                    print(f"[DEBUG] Permission denied for user: {request.user}")
                    return Response({"error": "Permission denied."}, status=403)
        
        print(f"[DEBUG] Medical folders fetched for patient_id {patient_id}: {medical_folders}")

        folder_data = [
            {
                "id": folder.id,
                "created_at": folder.created_at,
                "updated_at": folder.updated_at,
                "note": folder.note,
                "service": folder.service.name if folder.service else None,
                "created_by": {
                    "id": folder.user.id,
                    "firstname": folder.user.firstname,
                    "lastname": folder.user.lastname,
                    "full_name": f"{folder.user.firstname} {folder.user.lastname}".strip()
                } if folder.user else {
                    "id": None,
                    "firstname": "Unknown",
                    "lastname": "User",
                    "full_name": "Unknown User"
                },
            }
            for folder in medical_folders
        ]
        print(f"[DEBUG] Folder data prepared: {folder_data}")
        return Response(folder_data, status=200)
        
    def post(self, request, patient_id):
        # Only allow coordinators to add medical entries, not patients or family members
        if request.user.role not in ['Coordinator', 'Administrative', 'Social Assistant', 'Administrator']:
            print(f"[DEBUG] Permission denied for adding entry - user: {request.user}, role: {getattr(request.user, 'role', 'No role')}")
            return Response({"error": "Permission denied. Only coordinators can add medical entries."}, status=403)

        note = request.data.get("note")
        service_id = request.data.get("service_id")
        
        print(f"[DEBUG] POST request data: {request.data}")
        print(f"[DEBUG] Note: {note}, Service ID: {service_id}")
        
        if not note:
            return Response({"error": "Note is required."}, status=400)

        # Create medical folder with service_id if provided and set the user
        create_data = {"patient_id": patient_id, "note": note, "user": request.user}
        if service_id:
            create_data["service_id"] = service_id
            
        medical_folder = MedicalFolder.objects.create(**create_data)
        return Response({
            "id": medical_folder.id,
            "created_at": medical_folder.created_at,
            "updated_at": medical_folder.updated_at,
            "note": medical_folder.note,
            "service": medical_folder.service.name if medical_folder.service else None,
            "created_by": {
                "id": medical_folder.user.id,
                "firstname": medical_folder.user.firstname,
                "lastname": medical_folder.user.lastname,
                "full_name": f"{medical_folder.user.firstname} {medical_folder.user.lastname}".strip()
            },
        }, status=201)

    def put(self, request, patient_id):
        if not request.user.has_perm('CareLink.change_medicalfolder'):
            return Response({"error": "Permission denied."}, status=403)

        folder_id = request.data.get("id")
        note = request.data.get("note")

        if not folder_id or not note:
            return Response({"error": "Folder ID and Note are required."}, status=400)

        try:
            medical_folder = MedicalFolder.objects.get(id=folder_id, patient_id=patient_id)
            medical_folder.note = note
            medical_folder.save()
            return Response({
                "id": medical_folder.id,
                "created_at": medical_folder.created_at,
                "updated_at": medical_folder.updated_at,
                "note": medical_folder.note,
                "created_by": {
                    "id": medical_folder.user.id,
                    "firstname": medical_folder.user.firstname,
                    "lastname": medical_folder.user.lastname,
                    "full_name": f"{medical_folder.user.firstname} {medical_folder.user.lastname}".strip()
                } if medical_folder.user else {
                    "id": None,
                    "firstname": "Unknown",
                    "lastname": "User",
                    "full_name": "Unknown User"
                },
            }, status=200)
        except MedicalFolder.DoesNotExist:
            return Response({"error": "Medical folder not found."}, status=404)
            
    def delete(self, request, patient_id):
        # Only allow coordinators to delete medical entries
        if request.user.role not in ['Coordinator', 'Administrative', 'Social Assistant', 'Administrator']:
            return Response({"error": "Permission denied. Only coordinators can delete medical entries."}, status=403)

        folder_id = request.data.get("id")
        if not folder_id:
            return Response({"error": "Folder ID is required."}, status=400)

        try:
            medical_folder = MedicalFolder.objects.get(id=folder_id, patient_id=patient_id)
            medical_folder.delete()
            return Response({"message": "Medical entry deleted successfully."}, status=200)
        except MedicalFolder.DoesNotExist:
            return Response({"error": "Medical folder not found."}, status=404)

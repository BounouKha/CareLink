from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from CareLink.models import MedicalFolder


class MedicalFolderSimpleView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, patient_id):
        print(f"[DEBUG] User: {request.user}, Permissions: {request.user.get_all_permissions()}")
        if not request.user.has_perm('CareLink.view_medicalfolder'):
            print(f"[DEBUG] Permission denied for user: {request.user}")
            return Response({"error": "Permission denied."}, status=403)

        medical_folders = MedicalFolder.objects.filter(patient_id=patient_id)
        print(f"[DEBUG] Medical folders fetched for patient_id {patient_id}: {medical_folders}")

        folder_data = [
            {
                "id": folder.id,
                "created_at": folder.created_at,
                "updated_at": folder.updated_at,
                "note": folder.note,
            }
            for folder in medical_folders
        ]

        print(f"[DEBUG] Folder data prepared: {folder_data}")
        return Response(folder_data, status=200)

    def post(self, request, patient_id):
        if not request.user.has_perm('CareLink.add_medicalfolder'):
            return Response({"error": "Permission denied."}, status=403)

        note = request.data.get("note")
        if not note:
            return Response({"error": "Note is required."}, status=400)

        medical_folder = MedicalFolder.objects.create(patient_id=patient_id, note=note)
        return Response({

            "created_at": medical_folder.created_at,
            "updated_at": medical_folder.updated_at,
            "note": medical_folder.note,
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
            }, status=200)
        except MedicalFolder.DoesNotExist:
            return Response({"error": "Medical folder not found."}, status=404)

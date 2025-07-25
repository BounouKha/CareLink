from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

class CheckAdminView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        is_superuser = request.user.is_superuser
        return Response({"is_superuser": is_superuser})

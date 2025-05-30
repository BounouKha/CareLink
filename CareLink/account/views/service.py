from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from CareLink.models import Service

class ServiceListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        services = Service.objects.all()
        service_data = [
            {
                "id": service.id,
                "name": service.name,
                "price": str(service.price),
                "description": service.description,
            }
            for service in services
        ]
        return Response(service_data, status=200)

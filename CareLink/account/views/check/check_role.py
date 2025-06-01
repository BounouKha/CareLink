from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from rest_framework.decorators import authentication_classes, permission_classes
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from CareLink.models import User

@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
@require_http_methods(["GET"])
def get_user_role(request, user_id):
    try:
        user = User.objects.get(id=user_id)
        return JsonResponse({'role': user.role})
    except User.DoesNotExist:
        return JsonResponse({'error': 'User not found'}, status=404)
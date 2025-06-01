from django.http import JsonResponse
from CareLink.models import User

def get_user_role(request, user_id):
    try:
        user = User.objects.get(id=user_id)
        return JsonResponse({'role': user.role})
    except User.DoesNotExist:
        return JsonResponse({'error': 'User not found'}, status=404)
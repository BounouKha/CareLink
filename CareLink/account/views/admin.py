from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from CareLink.models import User, UserActionLog
from rest_framework import status
from django.contrib.auth.hashers import make_password
from django.utils import timezone
import json

def log_user_action(user, action_type, target_model, target_id, target_user=None, description=None, additional_data=None):
    """
    Enhanced logging function for user management actions
    
    Args:
        user: The user who performed the action
        action_type: Type of action (CREATE_USER, EDIT_USER, DELETE_USER)
        target_model: Model name (User)
        target_id: ID of the target object
        target_user: User object being acted upon
        description: Optional description of the action
        additional_data: Optional dict with additional context
    """
    log_data = {
        'user': user,
        'action_type': action_type,
        'target_model': target_model,
        'target_id': target_id,
        'description': description,
        'additional_data': json.dumps(additional_data) if additional_data else None
    }
    
    # For user actions, we can add the target user as "affected patient" if they have patient profile
    # or store their basic info in additional_data
    if target_user:
        if not additional_data:
            additional_data = {}
        
        additional_data.update({
            'target_user_email': target_user.email,
            'target_user_name': f"{target_user.firstname} {target_user.lastname}",
            'target_user_role': target_user.role,
            'target_user_active': target_user.is_active
        })
        log_data['additional_data'] = json.dumps(additional_data)
        
        # Try to get patient info if target user has a patient profile
        try:
            from CareLink.models import Patient
            patient = Patient.objects.get(user=target_user)
            log_data['affected_patient_id'] = patient.id
            log_data['affected_patient_name'] = f"{target_user.firstname} {target_user.lastname}"
        except Patient.DoesNotExist:
            # Not a patient, that's fine
            pass
            
        # Try to get provider info if target user has a provider profile
        try:
            from CareLink.models import Provider
            provider = Provider.objects.get(user=target_user)
            log_data['affected_provider_id'] = provider.id
            log_data['affected_provider_name'] = f"{target_user.firstname} {target_user.lastname}"
        except Provider.DoesNotExist:
            # Not a provider, that's fine
            pass
    
    UserActionLog.objects.create(**log_data)

class AdminUserListView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Check if the user is a superuser
        if not request.user.is_superuser:
            return Response(
                {"error": "Access denied. Superuser privileges required."},
                status=403
            )

        # Get search parameters
        search_query = request.GET.get('search', '').strip()
        search_field = request.GET.get('search_field', 'all')

        # Start with all users
        users = User.objects.all()

        # Apply search filter if search query is provided
        if search_query:
            from django.db.models import Q
            
            if search_field == 'email':
                users = users.filter(email__icontains=search_query)
            elif search_field == 'name':
                users = users.filter(
                    Q(firstname__icontains=search_query) | 
                    Q(lastname__icontains=search_query) |
                    Q(firstname__icontains=search_query.split()[0] if ' ' in search_query else '') |
                    Q(lastname__icontains=search_query.split()[-1] if ' ' in search_query else '')
                )
            elif search_field == 'national_number':
                users = users.filter(national_number__icontains=search_query)
            else:  # search_field == 'all' or any other value
                users = users.filter(
                    Q(email__icontains=search_query) |
                    Q(firstname__icontains=search_query) |
                    Q(lastname__icontains=search_query) |
                    Q(national_number__icontains=search_query)
                )

        # Order users by id for consistent pagination
        users = users.order_by('id')

        # Paginate the user data
        paginator = PageNumberPagination()
        paginator.page_size = 50
        paginated_users = paginator.paginate_queryset(users, request)

        # Transform user data into a structured format
        user_data = [
            {
                "id": user.id,
                "firstname": user.firstname,
                "lastname": user.lastname,
                "email": user.email,
                "is_active": user.is_active,
                "is_superuser": user.is_superuser,
                "is_staff": user.is_staff,
                "national_number": user.national_number,
                "address": user.address,
                "role": user.role,
                "birthdate": user.birthdate.strftime('%Y-%m-%d') if user.birthdate else None,
            }
            for user in paginated_users
        ]

        # Return the paginated user data as a response
        return paginator.get_paginated_response(user_data)

class AdminCreateUserView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Check if the user is a superuser
        if not request.user.is_superuser:
            return Response(
                {"error": "Access denied. Superuser privileges required."},
                status=403
            )
        
        # Extract user data from the request
        data = request.data
        try:
            user = User.objects.create(
                firstname=data.get("firstname"),
                lastname=data.get("lastname"),
                email=data.get("email"),
                password=make_password(data.get("password")),
                is_active=data.get("is_active", True),
                is_superuser=data.get("is_superuser", False),
                is_staff=data.get("is_staff", False),
                national_number=data.get("national_number"),
                address=data.get("address"),
                role=data.get("role"),
                birthdate=data.get("birthdate"),
            )
            
            # Log the user creation action with enhanced logging
            log_user_action(
                user=request.user,
                action_type="CREATE_USER",
                target_model="User",
                target_id=user.id,
                target_user=user,
                description=f"Created new user {user.firstname} {user.lastname} ({user.email}) with role {user.role}",
                additional_data={
                    "created_via": "admin_panel",
                    "user_role": user.role,
                    "is_superuser": user.is_superuser,
                    "is_staff": user.is_staff,
                    "is_active": user.is_active,
                    "timestamp": timezone.now().isoformat()
                }
            )
            
            return Response({"message": "User created successfully.", "user_id": user.id}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
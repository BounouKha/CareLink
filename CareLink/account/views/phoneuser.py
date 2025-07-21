from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from CareLink.models import PhoneUser
from account.serializers.phoneuser import PhoneUserSerializer

class PhoneUserViewSet(viewsets.ModelViewSet):
    serializer_class = PhoneUserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Restrict to phone numbers belonging to the authenticated user
        return PhoneUser.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        # Automatically set the user to the authenticated user
        user = self.request.user
        
        # Check if user already has 3 phone numbers
        existing_count = PhoneUser.objects.filter(user=user).count()
        if existing_count >= 3:
            return Response({
                'error': 'Maximum 3 phone numbers allowed per user.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer.save(user=user)

    def create(self, request, *args, **kwargs):
        # Override create to handle the 3-number limit
        user = request.user
        existing_count = PhoneUser.objects.filter(user=user).count()
        if existing_count >= 3:
            return Response({
                'error': 'Maximum 3 phone numbers allowed per user.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        return super().create(request, *args, **kwargs)

from rest_framework import viewsets
from CareLink.models import PhoneUser
from account.serializers.phoneuser import PhoneUserSerializer

class PhoneUserViewSet(viewsets.ModelViewSet):
    queryset = PhoneUser.objects.all()
    serializer_class = PhoneUserSerializer

    def get_queryset(self):
        # Restrict to phone numbers belonging to the authenticated user
        user = self.request.user
        return PhoneUser.objects.filter(user=user)

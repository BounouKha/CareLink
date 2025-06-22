from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from CareLink.models import CookieConsent

User = get_user_model()

class AdminConsentViewTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Create admin user
        self.admin_user = User.objects.create_user(
            email='admin@test.com',
            password='testpass123',
            is_staff=True,
            is_superuser=True
        )
        
        # Create regular user
        self.regular_user = User.objects.create_user(
            email='user@test.com',
            password='testpass123'
        )
        
        # Create some consent records
        CookieConsent.objects.create(
            user=self.regular_user,
            session_id='test_session_1',
            essential_cookies='granted',
            analytics_cookies='granted',
            marketing_cookies='denied',
            functional_cookies='granted',
            ip_address='127.0.0.1',
            user_agent='Test Agent'
        )
        
        CookieConsent.objects.create(
            session_id='test_session_2',
            essential_cookies='granted',
            analytics_cookies='denied',
            marketing_cookies='denied',
            functional_cookies='denied',
            ip_address='192.168.1.1',
            user_agent='Another Test Agent'
        )
    
    def test_admin_consent_list_requires_admin(self):
        """Test that non-admin users cannot access consent list"""
        self.client.force_authenticate(user=self.regular_user)
        url = reverse('admin_consent_list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_admin_consent_list_success(self):
        """Test that admin users can access consent list"""
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('admin_consent_list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'success')
        self.assertIn('consents', response.data)
        self.assertIn('pagination', response.data)
        self.assertIn('stats', response.data)
        
        # Check that we got the expected number of consents
        self.assertEqual(len(response.data['consents']), 2)
    
    def test_admin_consent_list_filtering(self):
        """Test filtering functionality"""
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('admin_consent_list')
        
        # Test status filter
        response = self.client.get(url, {'status': 'granted'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'success')
        
        # Test type filter
        response = self.client.get(url, {'type': 'analytics'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'success')
        
        # Test search
        response = self.client.get(url, {'search': 'user@test.com'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'success')
        self.assertEqual(len(response.data['consents']), 1)
    
    def test_admin_consent_list_pagination(self):
        """Test pagination functionality"""
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('admin_consent_list')
        
        response = self.client.get(url, {'page': 1, 'page_size': 1})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'success')
        self.assertEqual(len(response.data['consents']), 1)
        self.assertEqual(response.data['pagination']['total_pages'], 2)

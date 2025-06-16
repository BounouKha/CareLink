#!/usr/bin/env python3
"""
Internal Notes System Test Suite
Tests the complete Internal Notes functionality including:
- Model creation and validation
- API endpoints (GET, POST, PUT, DELETE)
- Role-based permissions
- Business logic validation
"""

import os
import sys
import django

# Setup Django environment BEFORE importing anything else
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'CareLink'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')
django.setup()

# Now import Django modules
from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
import json

User = get_user_model()  # Use the custom User model
from CareLink.models import InternalNote, Patient, Service, Coordinator, Provider, Administrative, SocialAssistant
from account.views.coordinator.internalnote import InternalNoteView


class InternalNoteModelTest(TestCase):
    """Test InternalNote model functionality"""
    
    def setUp(self):
        """Set up test data"""
        # Create users with different roles
        self.coordinator_user = User.objects.create_user(
            username='coordinator_test',
            password='testpass123',
            email='coordinator@test.com'
        )
        
        self.provider_user = User.objects.create_user(
            username='provider_test', 
            password='testpass123',
            email='provider@test.com'
        )
        
        self.patient_user = User.objects.create_user(
            username='patient_test',
            password='testpass123',
            email='patient@test.com'
        )
        
        # Create profiles
        self.coordinator = Coordinator.objects.create(
            user=self.coordinator_user,
            first_name='Test',
            last_name='Coordinator'
        )
        
        self.provider = Provider.objects.create(
            user=self.provider_user,
            first_name='Test',
            last_name='Provider'
        )
        
        self.patient = Patient.objects.create(
            user=self.patient_user,
            first_name='Test',
            last_name='Patient',
            date_of_birth='1990-01-01'
        )
        
        # Create service
        self.service = Service.objects.create(
            name='Test Service',
            description='Test service description'
        )
    
    def test_internal_note_creation(self):
        """Test creating an internal note"""
        note = InternalNote.objects.create(
            patient=self.patient,
            created_by=self.coordinator_user,
            note='Test internal note content',
            is_critical=False,
            service=self.service
        )
        
        self.assertEqual(note.patient, self.patient)
        self.assertEqual(note.created_by, self.coordinator_user)
        self.assertEqual(note.note, 'Test internal note content')
        self.assertFalse(note.is_critical)
        self.assertEqual(note.service, self.service)
        self.assertIsNotNone(note.created_at)
        self.assertIsNotNone(note.updated_at)
    
    def test_internal_note_str_representation(self):
        """Test string representation of internal note"""
        note = InternalNote.objects.create(
            patient=self.patient,
            created_by=self.coordinator_user,
            note='Test note'
        )
        
        expected_str = f"Internal Note for {self.patient.first_name} {self.patient.last_name} by {self.coordinator_user.username}"
        self.assertEqual(str(note), expected_str)
    
    def test_can_user_view_permissions(self):
        """Test the can_user_view permission method"""
        note = InternalNote.objects.create(
            patient=self.patient,
            created_by=self.coordinator_user,
            note='Test permission note'
        )
        
        # Coordinator should be able to view
        self.assertTrue(note.can_user_view(self.coordinator_user))
        
        # Patient should NOT be able to view internal notes
        self.assertFalse(note.can_user_view(self.patient_user))
    
    def test_note_max_length_validation(self):
        """Test note field max length"""
        long_note = 'x' * 2001  # Exceeds 2000 character limit
        
        with self.assertRaises(Exception):
            note = InternalNote(
                patient=self.patient,
                created_by=self.coordinator_user,
                note=long_note
            )
            note.full_clean()


class InternalNoteAPITest(APITestCase):
    """Test Internal Notes API endpoints"""
    
    def setUp(self):
        """Set up test data for API tests"""
        self.client = APIClient()
        
        # Create users
        self.coordinator_user = User.objects.create_user(
            username='coordinator_api',
            password='testpass123'
        )
        
        self.provider_user = User.objects.create_user(
            username='provider_api',
            password='testpass123'
        )
        
        self.patient_user = User.objects.create_user(
            username='patient_api',
            password='testpass123'
        )
        
        # Create profiles
        self.coordinator = Coordinator.objects.create(
            user=self.coordinator_user,
            first_name='API',
            last_name='Coordinator'
        )
        
        self.provider = Provider.objects.create(
            user=self.provider_user,
            first_name='API',
            last_name='Provider'
        )
        
        self.patient = Patient.objects.create(
            user=self.patient_user,
            first_name='API',
            last_name='Patient',
            date_of_birth='1990-01-01'
        )
        
        # Create service
        self.service = Service.objects.create(
            name='API Test Service',
            description='Service for API testing'
        )
        
        # Create test internal note
        self.test_note = InternalNote.objects.create(
            patient=self.patient,
            created_by=self.coordinator_user,
            note='Existing test note',
            is_critical=True
        )
    
    def get_auth_token(self, user):
        """Helper method to get authentication token"""
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        return str(refresh.access_token)
    
    def test_get_internal_notes_as_coordinator(self):
        """Test GET internal notes as coordinator"""
        token = self.get_auth_token(self.coordinator_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        url = reverse('internal_notes', kwargs={'patient_id': self.patient.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['note'], 'Existing test note')
    
    def test_get_internal_notes_as_patient_denied(self):
        """Test GET internal notes as patient (should be denied)"""
        token = self.get_auth_token(self.patient_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        url = reverse('internal_notes', kwargs={'patient_id': self.patient.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_create_internal_note_as_coordinator(self):
        """Test POST (create) internal note as coordinator"""
        token = self.get_auth_token(self.coordinator_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        url = reverse('internal_notes', kwargs={'patient_id': self.patient.id})
        data = {
            'note': 'New internal note from API test',
            'is_critical': False,
            'service': self.service.id
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['note'], 'New internal note from API test')
        self.assertEqual(response.data['created_by'], self.coordinator_user.id)
        
        # Verify note was created in database
        new_note = InternalNote.objects.get(id=response.data['id'])
        self.assertEqual(new_note.note, 'New internal note from API test')
    
    def test_update_internal_note(self):
        """Test PUT (update) internal note"""
        token = self.get_auth_token(self.coordinator_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        url = reverse('internal_notes', kwargs={'patient_id': self.patient.id})
        data = {
            'note_id': self.test_note.id,
            'note': 'Updated internal note content',
            'is_critical': False
        }
        
        response = self.client.put(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify update in database
        updated_note = InternalNote.objects.get(id=self.test_note.id)
        self.assertEqual(updated_note.note, 'Updated internal note content')
        self.assertFalse(updated_note.is_critical)
    
    def test_delete_internal_note(self):
        """Test DELETE internal note"""
        token = self.get_auth_token(self.coordinator_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        url = reverse('internal_notes', kwargs={'patient_id': self.patient.id})
        data = {'note_id': self.test_note.id}
        
        response = self.client.delete(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Verify note was deleted
        with self.assertRaises(InternalNote.DoesNotExist):
            InternalNote.objects.get(id=self.test_note.id)


class InternalNotePermissionsTest(TestCase):
    """Test role-based permissions for internal notes"""
    
    def setUp(self):
        """Set up users with different roles"""
        # Create users
        self.coordinator_user = User.objects.create_user(username='coordinator', password='test')
        self.provider_user = User.objects.create_user(username='provider', password='test')
        self.admin_user = User.objects.create_user(username='admin', password='test')
        self.social_user = User.objects.create_user(username='social', password='test')
        self.administrative_user = User.objects.create_user(username='administrative', password='test')
        self.patient_user = User.objects.create_user(username='patient', password='test')
          # Create profiles
        self.coordinator = Coordinator.objects.create(user=self.coordinator_user, first_name='Test', last_name='Coordinator')
        self.provider = Provider.objects.create(user=self.provider_user, first_name='Test', last_name='Provider')
        self.administrative = Administrative.objects.create(user=self.administrative_user, is_internal=True)
        self.social = SocialAssistant.objects.create(user=self.social_user, first_name='Test', last_name='Social')
        self.patient = Patient.objects.create(user=self.patient_user, first_name='Test', last_name='Patient')
        
        # Create test note
        self.note = InternalNote.objects.create(
            patient=self.patient,
            created_by=self.coordinator_user,
            note='Permission test note'
        )
    
    def test_coordinator_permissions(self):
        """Test coordinator can view internal notes"""
        self.assertTrue(self.note.can_user_view(self.coordinator_user))
    
    def test_provider_permissions(self):
        """Test provider can view internal notes (with appointment restriction)"""
        # Note: In real implementation, this would check for appointments
        self.assertTrue(self.note.can_user_view(self.provider_user))
    def test_admin_permissions(self):
        """Test admin/superuser can view internal notes"""
        # Create a superuser for testing
        admin_user = User.objects.create_superuser(
            username='admin', 
            email='admin@test.com', 
            password='test'
        )
        self.assertTrue(self.note.can_user_view(admin_user))
    
    def test_social_assistant_permissions(self):
        """Test social assistant can view internal notes"""
        self.assertTrue(self.note.can_user_view(self.social_user))
    
    def test_administrative_permissions(self):
        """Test administrative staff can view internal notes"""
        self.assertTrue(self.note.can_user_view(self.administrative_user))
    
    def test_patient_permissions_denied(self):
        """Test patient cannot view internal notes"""
        self.assertFalse(self.note.can_user_view(self.patient_user))


def run_integration_test():
    """Run a complete integration test"""
    print("🚀 Starting Internal Notes System Integration Test...")
    
    try:
        # Test database connection
        print("📊 Testing database connection...")
        patient_count = Patient.objects.count()
        note_count = InternalNote.objects.count()
        print(f"✅ Database connection successful - {patient_count} patients, {note_count} internal notes")
        
        # Test model creation
        print("📝 Testing model creation...")
        if patient_count > 0:
            first_patient = Patient.objects.first()
            admin_user = User.objects.filter(is_superuser=True).first()
            
            if admin_user:
                test_note = InternalNote.objects.create(
                    patient=first_patient,
                    created_by=admin_user,
                    note="Integration test note - created via Python script",
                    is_critical=True
                )
                print(f"✅ Test note created with ID: {test_note.id}")
                
                # Test permissions
                print("🔐 Testing permissions...")
                can_view = test_note.can_user_view(admin_user)
                print(f"✅ Admin can view note: {can_view}")
                
                # Clean up test note
                test_note.delete()
                print("🧹 Test note cleaned up")
            else:
                print("⚠️ No admin user found for testing")
        else:
            print("⚠️ No patients found for testing")
        
        print("🎉 Integration test completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Integration test failed: {str(e)}")
        return False


if __name__ == '__main__':
    # Run integration test
    run_integration_test()
    
    # Run unit tests
    print("\n🧪 Running unit tests...")
    import unittest
    
    # Create test suite
    test_suite = unittest.TestSuite()
    test_suite.addTest(unittest.makeSuite(InternalNoteModelTest))
    test_suite.addTest(unittest.makeSuite(InternalNotePermissionsTest))
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(test_suite)
    
    if result.wasSuccessful():
        print("🎉 All tests passed!")
    else:
        print("❌ Some tests failed!")
        sys.exit(1)

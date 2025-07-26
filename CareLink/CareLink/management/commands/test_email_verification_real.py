from django.core.management.base import BaseCommand
from django.utils import timezone
from CareLink.models import User, EmailVerification
from account.services.email_service import EmailService
from account.serializers.email_verification import VerifyEmailSerializer, ResendVerificationSerializer
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Test email verification system with real email'

    def handle(self, *args, **options):
        self.stdout.write("=" * 80)
        self.stdout.write("EMAIL VERIFICATION SYSTEM TEST - REAL EMAIL")
        self.stdout.write("=" * 80)
        
        # Test email
        test_email = "khalidbounou@gmail.com"
        
        try:
            # Test 1: Create user with real email
            self.stdout.write(f"\n🔍 TEST 1: Creating test user with email: {test_email}")
            
            # Clean up any existing test user first
            User.objects.filter(email=test_email).delete()
            
            user = User.objects.create_user(
                email=test_email,
                firstname="Khalid",
                lastname="Bounou", 
                role="Patient",
                is_active=False  # Important: starts inactive
            )
            
            self.stdout.write(f"✅ User created: {user.email}")
            self.stdout.write(f"   - is_active: {user.is_active}")
            self.stdout.write(f"   - role: {user.role}")
            
            # Test 2: Create email verification
            self.stdout.write(f"\n🔍 TEST 2: Creating email verification...")
            
            # Generate 6-digit code
            import random
            import string
            code = ''.join(random.choices(string.digits, k=6))
            
            # Set expiration time (5 minutes from now)
            expires_at = timezone.now() + timedelta(minutes=5)
            
            verification = EmailVerification.objects.create(
                user=user,
                verification_code=code,
                expires_at=expires_at
            )
            
            self.stdout.write(f"✅ EmailVerification created:")
            self.stdout.write(f"   - Code: {verification.verification_code}")
            self.stdout.write(f"   - Expires: {verification.expires_at}")
            self.stdout.write(f"   - Is expired: {verification.is_expired()}")
            self.stdout.write(f"   - Is verified: {verification.is_verified()}")
            
            # Test 3: Send verification email
            self.stdout.write(f"\n🔍 TEST 3: Sending verification email to real address...")
            
            email_service = EmailService()
            result = email_service.send_verification_email(user, verification.verification_code)
            
            if result.get('success'):
                self.stdout.write(f"✅ Verification email sent successfully!")
                self.stdout.write(f"   - Email ID: {result.get('log_id')}")
                self.stdout.write(f"   - Check your inbox at: {test_email}")
                self.stdout.write(f"   - Verification code: {verification.verification_code}")
            else:
                self.stdout.write(f"❌ Failed to send verification email:")
                self.stdout.write(f"   - Error: {result.get('error')}")
            
            # Test 4: Simulate manual verification (since we can't wait for email click)
            self.stdout.write(f"\n🔍 TEST 4: Testing manual verification with code...")
            
            # Create serializer data
            verification_data = {
                'email': test_email,
                'verification_code': verification.verification_code
            }
            
            serializer = VerifyEmailSerializer(data=verification_data)
            if serializer.is_valid():
                result = serializer.save()
                self.stdout.write(f"✅ Email verified successfully")
                
                # Refresh user from database
                user.refresh_from_db()
                self.stdout.write(f"   - User is now active: {user.is_active}")
            else:
                self.stdout.write(f"❌ Verification failed: {serializer.errors}")
            
            # Test 5: Test wrong code
            self.stdout.write(f"\n🔍 TEST 5: Testing with wrong verification code...")
            
            wrong_data = {
                'email': test_email,
                'verification_code': '999999'  # Wrong code
            }
            
            wrong_serializer = VerifyEmailSerializer(data=wrong_data)
            if wrong_serializer.is_valid():
                self.stdout.write(f"❌ Wrong code was accepted (this shouldn't happen)")
            else:
                self.stdout.write(f"✅ Wrong code correctly rejected: {wrong_serializer.errors}")
            
            # Test 6: System statistics
            self.stdout.write(f"\n🔍 TEST 6: System statistics...")
            
            total_users = User.objects.count()
            active_users = User.objects.filter(is_active=True).count()
            inactive_users = User.objects.filter(is_active=False).count()
            total_verifications = EmailVerification.objects.count()
            verified_count = EmailVerification.objects.filter(is_verified=True).count()
            
            self.stdout.write(f"📊 System State:")
            self.stdout.write(f"   - Total users: {total_users}")
            self.stdout.write(f"   - Active users: {active_users}")
            self.stdout.write(f"   - Inactive users: {inactive_users}")
            self.stdout.write(f"   - Total verifications: {total_verifications}")
            self.stdout.write(f"   - Verified accounts: {verified_count}")
            
            # Clean up (optional - comment out if you want to keep the test user)
            self.stdout.write(f"\n🧹 Cleaning up test data...")
            user.delete()  # This will also delete related EmailVerification due to CASCADE
            self.stdout.write("✅ Test data cleaned up")
            
            self.stdout.write(f"\n✅ Email verification system test completed!")
            
        except Exception as e:
            self.stdout.write(f"\n❌ Test failed with error: {str(e)}")
            import traceback
            traceback.print_exc()
        
        self.stdout.write("=" * 80)

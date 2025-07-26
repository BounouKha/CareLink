from django.core.management.base import BaseCommand
from django.utils import timezone
from CareLink.models import User, EmailVerification
from account.services.email_service import EmailService
import json

class Command(BaseCommand):
    help = 'Test the email verification registration system'
    
    def handle(self, *args, **options):
        print("\n" + "="*80)
        print("EMAIL VERIFICATION SYSTEM TEST")  
        print("="*80)
        
        # Test 1: Create a test user with verification
        print("\n🔍 TEST 1: Creating test user with email verification...")
        
        test_email = f"test_user_{timezone.now().timestamp()}@example.com"
        
        # Simulate registration data
        registration_data = {
            'email': test_email,
            'password': 'TestPass123!',
            'firstname': 'Test',
            'lastname': 'User',
            'role': 'Patient'
        }
        
        # Test the registration serializer
        from account.serializers.register import RegisterSerializer
        
        serializer = RegisterSerializer(data=registration_data)
        if serializer.is_valid():
            user = serializer.save()
            print(f"✅ User created: {user.email}")
            print(f"   - is_active: {user.is_active}")
            print(f"   - role: {user.role}")
            
            # Check if EmailVerification was created
            try:
                verification = EmailVerification.objects.get(user=user)
                print(f"✅ EmailVerification created:")
                print(f"   - Code: {verification.verification_code}")
                print(f"   - Expires: {verification.expires_at}")
                print(f"   - Is expired: {verification.is_expired()}")
                print(f"   - Is verified: {verification.is_verified()}")
                
                # Test 2: Send verification email
                print(f"\n🔍 TEST 2: Sending verification email...")
                email_service = EmailService()
                result = email_service.send_verification_email(
                    user=user,
                    verification_code=verification.verification_code
                )
                
                if result.get('success'):
                    print("✅ Verification email sent successfully")
                else:
                    print(f"❌ Failed to send verification email: {result}")
                
                # Test 3: Verify email with correct code  
                print(f"\n🔍 TEST 3: Testing email verification...")
                from account.serializers.email_verification import VerifyEmailSerializer
                
                verify_data = {
                    'email': user.email,
                    'verification_code': verification.verification_code
                }
                
                verify_serializer = VerifyEmailSerializer(data=verify_data)
                if verify_serializer.is_valid():
                    verified_user = verify_serializer.verify_email()
                    print(f"✅ Email verified successfully")
                    print(f"   - User is now active: {verified_user.is_active}")
                else:
                    print(f"❌ Verification failed: {verify_serializer.errors}")
                
                # Test 4: Test with wrong code
                print(f"\n🔍 TEST 4: Testing with wrong verification code...")
                wrong_verify_data = {
                    'email': user.email,
                    'verification_code': '999999'
                }
                
                wrong_serializer = VerifyEmailSerializer(data=wrong_verify_data)
                if wrong_serializer.is_valid():
                    print("❌ Wrong code was accepted (this shouldn't happen)")
                else:
                    print(f"✅ Wrong code correctly rejected: {wrong_serializer.errors}")
                
                # Test 5: Test resend functionality
                print(f"\n🔍 TEST 5: Testing verification code resend...")
                
                # Create another user to test resend
                test_email2 = f"test_user2_{timezone.now().timestamp()}@example.com"
                registration_data2 = {
                    'email': test_email2,
                    'password': 'TestPass123!',
                    'firstname': 'Test2',
                    'lastname': 'User2',
                    'role': 'Provider'
                }
                
                serializer2 = RegisterSerializer(data=registration_data2)
                if serializer2.is_valid():
                    user2 = serializer2.save()
                    verification2 = EmailVerification.objects.get(user=user2)
                    original_code = verification2.verification_code
                    
                    # Test resend
                    from account.serializers.email_verification import ResendVerificationSerializer
                    resend_data = {'email': user2.email}
                    resend_serializer = ResendVerificationSerializer(data=resend_data)
                    
                    if resend_serializer.is_valid():
                        resent_user, new_code = resend_serializer.resend_verification()
                        print(f"✅ Verification code resent")
                        print(f"   - Original code: {original_code}")
                        print(f"   - New code: {new_code}")
                        print(f"   - Codes are different: {original_code != new_code}")
                    else:
                        print(f"❌ Resend failed: {resend_serializer.errors}")
                
                print(f"\n🔍 TEST 6: Checking system behavior...")
                
                # Count users and verifications
                total_users = User.objects.count()
                total_verifications = EmailVerification.objects.count()
                active_users = User.objects.filter(is_active=True).count()
                inactive_users = User.objects.filter(is_active=False).count()
                
                print(f"📊 System State:")
                print(f"   - Total users: {total_users}")
                print(f"   - Active users: {active_users}")
                print(f"   - Inactive users: {inactive_users}")
                print(f"   - Total verifications: {total_verifications}")
                
                # Clean up test data
                print(f"\n🧹 Cleaning up test data...")
                User.objects.filter(email__startswith='test_user_').delete()
                print("✅ Test data cleaned up")
                
            except EmailVerification.DoesNotExist:
                print("❌ EmailVerification was not created")
            
        else:
            print(f"❌ Registration failed: {serializer.errors}")
        
        print(f"\n✅ Email verification system test completed!")
        print("="*80)

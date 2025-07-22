from django.core.management.base import BaseCommand
from account.services.sms_service import sms_service
from account.services.sms_templates import sms_templates
import os

class Command(BaseCommand):
    help = 'Test SMS functionality with Twilio (following official documentation)'

    def add_arguments(self, parser):
        parser.add_argument('phone_number', type=str, help='Phone number to send test SMS (e.g. +32123456789)')
        parser.add_argument('--name', type=str, default='Test User', help='Name for the test message')
        parser.add_argument('--check-env', action='store_true', help='Check environment variables only')

    def handle(self, *args, **options):
        phone_number = options['phone_number']
        name = options['name']
        
        # Check environment variables first
        self.stdout.write("🔍 Checking Twilio environment variables...")
        
        required_vars = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER']
        missing_vars = []
        
        for var in required_vars:
            if var in os.environ and os.environ[var]:
                self.stdout.write(f"✅ {var}: Found")
            else:
                missing_vars.append(var)
                self.stdout.write(f"❌ {var}: Missing or empty")
        
        if missing_vars:
            self.stdout.write(
                self.style.ERROR(
                    f"Missing required environment variables: {', '.join(missing_vars)}"
                )
            )
            self.stdout.write("Please add them to your .env file:")
            for var in missing_vars:
                self.stdout.write(f"  {var}=your_value_here")
            return
        
        if options['check_env']:
            self.stdout.write(self.style.SUCCESS("✅ All environment variables are set!"))
            return
        
        self.stdout.write(f"\n📱 Testing SMS service...")
        self.stdout.write(f"From: {os.environ['TWILIO_PHONE_NUMBER']}")
        self.stdout.write(f"To: {phone_number}")
        self.stdout.write(f"Name: {name}")
        
        # Check if SMS service is configured
        if not sms_service.is_configured():
            self.stdout.write(
                self.style.ERROR(
                    "❌ SMS service is not configured. Please check your Twilio settings."
                )
            )
            return
        
        # Test message using our template
        message = sms_templates.test_message(name)
        
        self.stdout.write(f"\n📝 Message content:")
        self.stdout.write(f'"{message}"')
        self.stdout.write(f"\n🚀 Sending SMS...")
        
        result = sms_service.send_sms(phone_number, message)
        
        if result['success']:
            self.stdout.write(
                self.style.SUCCESS(
                    f"✅ SMS sent successfully!"
                )
            )
            self.stdout.write(f"📧 Message SID: {result['message_sid']}")
            self.stdout.write(f"📞 Formatted number: {result['to_number']}")
            
            # Check message status
            self.stdout.write("\n📊 Checking delivery status...")
            status_result = sms_service.get_message_status(result['message_sid'])
            if status_result['success']:
                self.stdout.write(f"Status: {status_result['status']}")
                if status_result['error_code']:
                    self.stdout.write(f"Error Code: {status_result['error_code']}")
                if status_result['error_message']:
                    self.stdout.write(f"Error Message: {status_result['error_message']}")
            
        else:
            self.stdout.write(
                self.style.ERROR(
                    f"❌ Failed to send SMS: {result['error']}"
                )
            )
            
        self.stdout.write(f"\n🏁 SMS test completed.")

import logging
import os
from django.conf import settings
from twilio.rest import Client
from twilio.base.exceptions import TwilioException
import re

logger = logging.getLogger(__name__)

class SMSService:
    """
    Service for sending SMS notifications using Twilio
    """
    
    def __init__(self):
        self.client = None
        self.from_number = None
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize Twilio client following official documentation"""
        try:
            # Check if SMS is enabled
            sms_enabled = getattr(settings, 'SMS_ENABLED', True)
            if not sms_enabled:
                logger.info("SMS service is disabled")
                return
                
            # Get Twilio credentials from environment variables (official way)
            try:
                account_sid = os.environ["TWILIO_ACCOUNT_SID"]
                auth_token = os.environ["TWILIO_AUTH_TOKEN"]
                from_number = os.environ["TWILIO_PHONE_NUMBER"]
            except KeyError as e:
                logger.error(f"Missing required environment variable: {e}")
                return
            
            # Initialize Twilio client (official way)
            self.client = Client(account_sid, auth_token)
            self.from_number = from_number
            logger.info(f"Twilio SMS client initialized successfully with number: {from_number}")
            
        except Exception as e:
            logger.error(f"Failed to initialize Twilio client: {str(e)}")
    
    def _format_phone_number(self, phone_number, country_code=None):
        """
        Format phone number for international SMS
        """
        if not phone_number:
            return None
            
        # Remove all non-digit characters except +
        clean_number = re.sub(r'[^\d+]', '', phone_number)
        
        # Default country code for Belgium
        default_country_code = getattr(settings, 'SMS_DEFAULT_COUNTRY_CODE', '+32')
        country_code = country_code or default_country_code
        
        # If number starts with 0, replace with country code
        if clean_number.startswith('0'):
            clean_number = country_code + clean_number[1:]
        elif not clean_number.startswith('+'):
            # Add country code if not present
            clean_number = country_code + clean_number
            
        return clean_number
    
    def send_sms(self, to_number, message, country_code=None):
        """
        Send SMS to a phone number
        
        Args:
            to_number (str): Phone number to send SMS to
            message (str): SMS message content
            country_code (str): Country code (optional, defaults to Belgium +32)
            
        Returns:
            dict: Result with success status and message_sid or error
        """
        try:
            if not self.client:
                return {
                    'success': False,
                    'error': 'SMS service not initialized',
                    'message_sid': None
                }
            
            # Format phone number
            formatted_number = self._format_phone_number(to_number, country_code)
            if not formatted_number:
                return {
                    'success': False,
                    'error': 'Invalid phone number format',
                    'message_sid': None
                }
            
            # Truncate message if too long (SMS limit is 1600 characters)
            if len(message) > 1600:
                message = message[:1597] + "..."
            
            # Send SMS via Twilio
            twilio_message = self.client.messages.create(
                body=message,
                from_=self.from_number,
                to=formatted_number
            )
            
            logger.info(f"SMS sent successfully to {formatted_number}. SID: {twilio_message.sid}")
            
            return {
                'success': True,
                'message_sid': twilio_message.sid,
                'error': None,
                'to_number': formatted_number
            }
            
        except TwilioException as e:
            logger.error(f"Twilio error sending SMS to {to_number}: {str(e)}")
            return {
                'success': False,
                'error': f'Twilio error: {str(e)}',
                'message_sid': None
            }
        except Exception as e:
            logger.error(f"Unexpected error sending SMS to {to_number}: {str(e)}")
            return {
                'success': False,
                'error': f'Unexpected error: {str(e)}',
                'message_sid': None
            }
    
    def send_bulk_sms(self, phone_numbers, message, country_code=None):
        """
        Send SMS to multiple phone numbers
        
        Args:
            phone_numbers (list): List of phone numbers
            message (str): SMS message content
            country_code (str): Country code (optional)
            
        Returns:
            dict: Results for each phone number
        """
        results = {}
        
        for phone_number in phone_numbers:
            result = self.send_sms(phone_number, message, country_code)
            results[phone_number] = result
            
        return results
    
    def get_message_status(self, message_sid):
        """
        Get the delivery status of a sent message
        
        Args:
            message_sid (str): Twilio message SID
            
        Returns:
            dict: Message status information
        """
        try:
            if not self.client:
                return {'success': False, 'error': 'SMS service not initialized'}
                
            message = self.client.messages(message_sid).fetch()
            
            return {
                'success': True,
                'status': message.status,
                'error_code': message.error_code,
                'error_message': message.error_message,
                'date_sent': message.date_sent,
                'date_updated': message.date_updated
            }
            
        except TwilioException as e:
            logger.error(f"Error fetching message status for {message_sid}: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def is_configured(self):
        """
        Check if SMS service is properly configured
        
        Returns:
            bool: True if configured, False otherwise
        """
        return self.client is not None

# Create a singleton instance
sms_service = SMSService()

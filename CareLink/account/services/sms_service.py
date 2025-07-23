import logging
import os
import requests
import base64
import json
from django.conf import settings
import re

logger = logging.getLogger(__name__)

class SMSService:
    """
    Service for sending SMS notifications using LabsMobile
    """
    
    def __init__(self):
        self.api_url = "https://api.labsmobile.com/json/send"
        self.username = None
        self.token = None
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize LabsMobile client"""
        try:
            # Check if SMS is enabled
            sms_enabled = getattr(settings, 'SMS_ENABLED', True)
            if not sms_enabled:
                logger.info("SMS service is disabled")
                return
                
            # Get LabsMobile credentials from environment variables
            try:
                self.username = os.environ.get("LABSMOBILE_USERNAME")
                self.token = os.environ.get("LABSMOBILE_TOKEN")
            except Exception as e:
                logger.error(f"Error getting LabsMobile credentials: {e}")
                return
            
            if not self.username or not self.token:
                logger.error("LabsMobile credentials not found")
                return
                
            logger.info(f"LabsMobile SMS client initialized successfully with username: {self.username}")
            
        except Exception as e:
            logger.error(f"Failed to initialize LabsMobile client: {str(e)}")
    
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
        Send SMS to a phone number using LabsMobile API
        
        Args:
            to_number (str): Phone number to send SMS to
            message (str): SMS message content
            country_code (str): Country code (optional, defaults to Belgium +32)
            
        Returns:
            dict: Result with success status and message_sid or error
        """
        try:
            if not self.username or not self.token:
                return {
                    'status': 'failed',
                    'error_message': 'LabsMobile service not initialized',
                    'external_id': None
                }
            
            # Format phone number
            formatted_number = self._format_phone_number(to_number, country_code)
            if not formatted_number:
                return {
                    'status': 'failed',
                    'error_message': 'Invalid phone number format',
                    'external_id': None
                }
            
            # Remove the + from phone number for LabsMobile API
            clean_number = formatted_number.replace('+', '')
            
            # Truncate message if too long (SMS limit is 1600 characters)
            if len(message) > 1600:
                message = message[:1597] + "..."
            
            # Create Basic Auth credentials (username:token)
            user_token = f"{self.username}:{self.token}"
            credentials = base64.b64encode(user_token.encode()).decode()
            
            # Prepare LabsMobile API payload
            payload = json.dumps({
                "message": message,
                "tpoa": "CareLink",  # Sender name (max 11 chars)
                "recipient": [
                    {
                        "msisdn": clean_number
                    }
                ]
            })
            
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Basic {credentials}',
                'Cache-Control': 'no-cache'
            }
            
            # Send SMS via LabsMobile API
            response = requests.post(self.api_url, headers=headers, data=payload, timeout=30)
            response_data = response.json()
            
            logger.info(f"LabsMobile API Response: {response_data}")
            
            if response.status_code == 200 and response_data.get("code") == "0":
                message_id = response_data.get("subid", "unknown")
                logger.info(f"SMS sent successfully to {formatted_number}. Message ID: {message_id}")
                
                return {
                    'status': 'sent',
                    'external_id': message_id,
                    'error_message': None
                }
            else:
                error_msg = response_data.get("message", f"HTTP {response.status_code}")
                logger.error(f"LabsMobile error sending SMS to {to_number}: {error_msg}")
                return {
                    'status': 'failed',
                    'error_message': f'LabsMobile error: {error_msg}',
                    'external_id': None
                }
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Network error sending SMS to {to_number}: {str(e)}")
            return {
                'status': 'failed',
                'error_message': f'Network error: {str(e)}',
                'external_id': None
            }
        except Exception as e:
            logger.error(f"Unexpected error sending SMS to {to_number}: {str(e)}")
            return {
                'status': 'failed',
                'error_message': f'Unexpected error: {str(e)}',
                'external_id': None
            }
    
    def send_bulk_sms(self, phone_numbers, message, country_code=None):
        """
        Send SMS to multiple phone numbers using LabsMobile bulk API
        
        Args:
            phone_numbers (list): List of phone numbers
            message (str): SMS message content
            country_code (str): Country code (optional)
            
        Returns:
            dict: Results for each phone number
        """
        try:
            if not self.username or not self.token:
                return {'success': False, 'error': 'LabsMobile service not initialized'}
            
            if len(phone_numbers) == 0:
                return {'success': False, 'error': 'No phone numbers provided'}
            
            # Prepare recipients list
            recipients = []
            for phone_number in phone_numbers:
                formatted_number = self._format_phone_number(phone_number, country_code)
                if formatted_number:
                    clean_number = formatted_number.replace('+', '')
                    recipients.append({"msisdn": clean_number})
            
            if not recipients:
                return {'success': False, 'error': 'No valid phone numbers found'}
            
            # Truncate message if too long
            if len(message) > 1600:
                message = message[:1597] + "..."
            
            # Create Basic Auth credentials
            user_token = f"{self.username}:{self.token}"
            credentials = base64.b64encode(user_token.encode()).decode()
            
            # Prepare bulk SMS payload
            payload = json.dumps({
                "message": message,
                "tpoa": "CareLink",
                "recipient": recipients
            })
            
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Basic {credentials}',
                'Cache-Control': 'no-cache'
            }
            
            # Send bulk SMS
            response = requests.post(self.api_url, headers=headers, data=payload, timeout=60)
            response_data = response.json()
            
            logger.info(f"LabsMobile Bulk SMS Response: {response_data}")
            
            if response.status_code == 200 and response_data.get("code") == "0":
                return {
                    'success': True,
                    'message_id': response_data.get("subid", "unknown"),
                    'sent_count': len(recipients),
                    'error': None
                }
            else:
                error_msg = response_data.get("message", f"HTTP {response.status_code}")
                logger.error(f"LabsMobile bulk SMS error: {error_msg}")
                return {
                    'success': False,
                    'error': f'LabsMobile error: {error_msg}'
                }
                
        except Exception as e:
            logger.error(f"Error sending bulk SMS: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def get_message_status(self, message_id):
        """
        Get the delivery status of a sent message
        
        Args:
            message_id (str): LabsMobile message ID
            
        Returns:
            dict: Message status information
        """
        try:
            if not self.username or not self.token:
                return {'success': False, 'error': 'LabsMobile service not initialized'}
            
            # Create Basic Auth credentials
            user_token = f"{self.username}:{self.token}"
            credentials = base64.b64encode(user_token.encode()).decode()
            
            # LabsMobile status check endpoint
            status_url = "https://api.labsmobile.com/json/status"
            
            payload = json.dumps({
                "subid": message_id
            })
            
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Basic {credentials}',
                'Cache-Control': 'no-cache'
            }
            
            response = requests.post(status_url, headers=headers, data=payload, timeout=30)
            response_data = response.json()
            
            if response.status_code == 200 and response_data.get("code") == "0":
                return {
                    'success': True,
                    'status': response_data.get("status", "unknown"),
                    'error_code': response_data.get("error_code"),
                    'error_message': response_data.get("error_message"),
                    'date_sent': response_data.get("date_sent"),
                    'date_updated': response_data.get("date_updated")
                }
            else:
                error_msg = response_data.get("message", f"HTTP {response.status_code}")
                return {'success': False, 'error': error_msg}
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching message status for {message_id}: {str(e)}")
            return {'success': False, 'error': str(e)}
        except Exception as e:
            logger.error(f"Unexpected error fetching message status for {message_id}: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def is_configured(self):
        """
        Check if SMS service is properly configured
        
        Returns:
            bool: True if configured, False otherwise
        """
        return self.username is not None and self.token is not None

# Create a singleton instance
sms_service = SMSService()

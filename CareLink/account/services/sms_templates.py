from django.utils import timezone

class SMSTemplates:
    """
    SMS templates for different notification types
    """
    
    @staticmethod
    def service_demand_created(user_name, service_name, demand_id):
        """SMS template for new service demand"""
        return (
            f"Hi {user_name}! Your service request for {service_name} "
            f"has been received (ID: {demand_id}). Our team will contact you soon. "
            f"- CareLink Team"
        )
    
    @staticmethod
    def service_demand_comment(user_name, service_name, coordinator_name, comment_preview):
        """SMS template for service demand comments"""
        return (
            f"Hi {user_name}! {coordinator_name} added an update to your {service_name} request: "
            f'"{comment_preview[:80]}..." View full details in the app. - CareLink'
        )
    
    @staticmethod
    def appointment_reminder(user_name, provider_name, appointment_date, appointment_time):
        """SMS template for appointment reminders"""
        return (
            f"Reminder: You have an appointment with {provider_name} "
            f"on {appointment_date} at {appointment_time}. - CareLink"
        )
    
    @staticmethod
    def appointment_confirmed(user_name, provider_name, appointment_date, appointment_time):
        """SMS template for appointment confirmations"""
        return (
            f"Hi {user_name}! Your appointment with {provider_name} "
            f"is confirmed for {appointment_date} at {appointment_time}. - CareLink"
        )
    
    @staticmethod
    def appointment_cancelled(user_name, provider_name, appointment_date, appointment_time):
        """SMS template for appointment cancellations"""
        return (
            f"Hi {user_name}! Your appointment with {provider_name} "
            f"on {appointment_date} at {appointment_time} has been cancelled. "
            f"Please contact us to reschedule. - CareLink"
        )
    
    @staticmethod
    def prescription_ready(user_name, medication_name, pharmacy_name=None):
        """SMS template for prescription ready notifications"""
        pharmacy_text = f" at {pharmacy_name}" if pharmacy_name else ""
        return (
            f"Hi {user_name}! Your prescription for {medication_name} "
            f"is ready for pickup{pharmacy_text}. - CareLink"
        )
    
    @staticmethod
    def emergency_notification(user_name, message):
        """SMS template for emergency notifications"""
        return (
            f"URGENT - Hi {user_name}! {message} "
            f"Please contact us immediately. - CareLink Emergency"
        )
    
    @staticmethod
    def welcome_message(user_name):
        """SMS template for welcome message"""
        return (
            f"Welcome to CareLink, {user_name}! "
            f"Your account is now active. You can manage your healthcare services through our platform. "
            f"- CareLink Team"
        )
    
    @staticmethod
    def password_reset(user_name, reset_code):
        """SMS template for password reset"""
        return (
            f"Hi {user_name}! Your CareLink password reset code is: {reset_code}. "
            f"This code expires in 10 minutes. - CareLink Security"
        )
    
    @staticmethod
    def test_message(user_name):
        """SMS template for testing"""
        return (
            f"Hello {user_name}! This is a test message from CareLink SMS service. "
            f"If you received this, SMS is working correctly! - CareLink Tech Team"
        )

# Export the templates
sms_templates = SMSTemplates()

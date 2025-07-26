from CareLink.models import User, Patient, Provider, FamilyPatient, EnhancedTicket
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

class ProfileVerificationService:
    """Service to handle profile verification and activation workflows"""
    
    @staticmethod
    def check_user_profile_status(user):
        """
        Check if user has required profile based on their role
        Returns dict with profile status information
        """
        profile_status = {
            'has_profile': False,
            'profile_type': None,
            'waiting_for_activation': False,
            'profile_data': None,
            'missing_sections': []
        }
        
        if not user or not user.role:
            return profile_status
            
        try:
            if user.role == 'Patient':
                profile_status.update(ProfileVerificationService._check_patient_profile(user))
            elif user.role == 'Family Patient':
                profile_status.update(ProfileVerificationService._check_family_patient_profile(user))
            elif user.role == 'Provider':
                profile_status.update(ProfileVerificationService._check_provider_profile(user))
            else:
                # For other roles (Administrative, Coordinator, etc.), no specific profile needed
                profile_status['has_profile'] = True
                profile_status['profile_type'] = 'administrative'
                
        except Exception as e:
            logger.error(f"Error checking profile status for user {user.id}: {str(e)}")
            
        return profile_status
    
    @staticmethod
    def _check_patient_profile(user):
        """Check Patient profile completeness"""
        try:
            patient = Patient.objects.get(user=user)
            
            # Check what sections are missing
            missing_sections = []
            
            # Medical folder checks
            if not patient.gender or not patient.blood_type:
                missing_sections.append('medical_folder')
                
            # Doctor information checks  
            if not hasattr(patient, 'doctor_name') or not patient.doctor_name:
                missing_sections.append('doctor_information')
                
            # Medical information checks
            if not patient.illness and not patient.medication:
                missing_sections.append('medical_information')
            
            return {
                'has_profile': True,
                'profile_type': 'patient',
                'waiting_for_activation': len(missing_sections) > 0,
                'profile_data': patient,
                'missing_sections': missing_sections
            }
            
        except Patient.DoesNotExist:
            return {
                'has_profile': False,
                'profile_type': 'patient',
                'waiting_for_activation': True,
                'profile_data': None,
                'missing_sections': ['medical_folder', 'doctor_information', 'medical_information']
            }
    
    @staticmethod
    def _check_family_patient_profile(user):
        """Check Family Patient profile completeness"""
        try:
            family_patient = FamilyPatient.objects.get(user=user)
            
            # For family patients, check if they have linked patients
            missing_sections = []
            if not family_patient.linked_patients.exists():
                missing_sections.append('patient_links')
            
            return {
                'has_profile': True,
                'profile_type': 'family_patient',
                'waiting_for_activation': len(missing_sections) > 0,
                'profile_data': family_patient,
                'missing_sections': missing_sections
            }
            
        except FamilyPatient.DoesNotExist:
            return {
                'has_profile': False,
                'profile_type': 'family_patient',
                'waiting_for_activation': True,
                'profile_data': None,
                'missing_sections': ['patient_links']
            }
    
    @staticmethod
    def _check_provider_profile(user):
        """Check Provider profile completeness"""
        try:
            provider = Provider.objects.get(user=user)
            
            missing_sections = []
            if not provider.service:
                missing_sections.append('service_assignment')
            
            return {
                'has_profile': True,
                'profile_type': 'provider',
                'waiting_for_activation': len(missing_sections) > 0,
                'profile_data': provider,
                'missing_sections': missing_sections
            }
            
        except Provider.DoesNotExist:
            return {
                'has_profile': False,
                'profile_type': 'provider',
                'waiting_for_activation': True,
                'profile_data': None,
                'missing_sections': ['service_assignment']
            }
    
    @staticmethod
    def create_profile_activation_ticket(user):
        """
        Create a helpdesk ticket for profile activation
        Returns the created ticket
        """
        try:
            # Check if ticket already exists for this user
            existing_ticket = EnhancedTicket.objects.filter(
                created_by=user,
                category='Care Request',
                status__in=['New', 'In Progress'],
                title__icontains='Profile Activation Request'
            ).first()
            
            if existing_ticket:
                logger.info(f"Profile activation ticket already exists for user {user.email}: {existing_ticket.id}")
                return existing_ticket
            
            # Create description based on user role
            description = ProfileVerificationService._generate_ticket_description(user)
            
            # Create new ticket
            ticket = EnhancedTicket.objects.create(
                title=f"Profile Activation Request - {user.get_full_name()} ({user.role})",
                description=description,
                category='Care Request',
                priority='Medium',
                status='New',
                team='Administrator',
                created_by=user,
                created_at=timezone.now()
            )
            
            logger.info(f"Created profile activation ticket {ticket.id} for user {user.email}")
            return ticket
            
        except Exception as e:
            logger.error(f"Error creating profile activation ticket for user {user.id}: {str(e)}")
            return None
    
    @staticmethod
    def _generate_ticket_description(user):
        """Generate ticket description based on user role and information"""
        base_info = f"""
Profile Activation Request

User Information:
- Name: {user.get_full_name()}
- Email: {user.email}
- Role: {user.role}
- Registration Date: {user.date_joined.strftime('%Y-%m-%d %H:%M')}
- Address: {user.address or 'Not provided'}
- National Number: {user.national_number or 'Not provided'}
"""
        
        role_specific = ""
        
        if user.role == 'Patient':
            role_specific = """
Required Actions:
- Create Patient profile in the system
- Set up medical folder with basic information
- Configure doctor information section
- Initialize medical information records

Please ensure all patient-specific fields are properly configured before activation.
"""
        elif user.role == 'Family Patient':
            role_specific = """
Required Actions:
- Create Family Patient profile in the system
- Link to existing patient records (if applicable)
- Configure family member access permissions
- Set up care coordination preferences

Please establish patient links and family access rights.
"""
        elif user.role == 'Provider':
            role_specific = """
Required Actions:
- Create Provider profile in the system
- Assign appropriate service categories
- Configure availability and scheduling preferences
- Set up provider-specific settings

Please complete service assignment and provider configuration.
"""
        
        return base_info + role_specific
    
    @staticmethod
    def get_waiting_message(profile_status, language='en'):
        """Get appropriate waiting message based on profile status and language"""
        messages = {
            'en': {
                'medical_folder': 'Waiting for activation - Medical folder setup pending',
                'doctor_information': 'Waiting for activation - Doctor information setup pending', 
                'medical_information': 'Waiting for activation - Medical information setup pending',
                'patient_links': 'Waiting for activation - Patient links setup pending',
                'service_assignment': 'Waiting for activation - Service assignment pending',
                'general': 'Waiting for activation - Profile setup pending'
            },
            'fr': {
                'medical_folder': 'En attente d\'activation - Configuration du dossier médical en cours',
                'doctor_information': 'En attente d\'activation - Configuration des informations médecin en cours',
                'medical_information': 'En attente d\'activation - Configuration des informations médicales en cours', 
                'patient_links': 'En attente d\'activation - Configuration des liens patients en cours',
                'service_assignment': 'En attente d\'activation - Attribution de service en cours',
                'general': 'En attente d\'activation - Configuration du profil en cours'
            },
            'nl': {
                'medical_folder': 'Wachten op activering - Medisch dossier instelling in behandeling',
                'doctor_information': 'Wachten op activering - Dokterinformatie instelling in behandeling',
                'medical_information': 'Wachten op activering - Medische informatie instelling in behandeling',
                'patient_links': 'Wachten op activering - Patiënt koppelingen instelling in behandeling', 
                'service_assignment': 'Wachten op activering - Service toewijzing in behandeling',
                'general': 'Wachten op activering - Profiel instelling in behandeling'
            }
        }
        
        lang_messages = messages.get(language, messages['en'])
        
        if profile_status.get('missing_sections'):
            # Return message for first missing section
            first_missing = profile_status['missing_sections'][0]
            return lang_messages.get(first_missing, lang_messages['general'])
        
        return lang_messages['general']

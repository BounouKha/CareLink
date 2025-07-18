from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.paginator import Paginator
from django.db.models import Q

from CareLink.models import Patient, User, Coordinator, FamilyPatient, SocialAssistant, Provider, Administrative
import logging

logger = logging.getLogger(__name__)

class ProfileListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            search_query = request.GET.get('search', '').strip()
            page_number = request.GET.get('page', 1)
            page_size = min(int(request.GET.get('page_size', 50)), 100)  # Max 100 items per page
            
            logger.info(f"ProfileList request: search='{search_query}', page={page_number}, page_size={page_size}")
            
            profiles = []
            user_profiles_map = {}  # To track users and avoid duplicates

            # Fetch profiles from each role table
            role_tables = {
                "Patient": Patient,
                "Coordinator": Coordinator,
                "SocialAssistant": SocialAssistant,
                "Provider": Provider,
                "Administrative": Administrative,
            }

            # Handle regular role tables (non-FamilyPatient)
            for role_name, model in role_tables.items():
                try:
                    for profile in model.objects.select_related('user').all():
                        user = profile.user if hasattr(profile, 'user') else None
                        if user and user.id not in user_profiles_map:
                            # Force refresh from database to avoid caching issues
                            user.refresh_from_db()
                            
                            # Debug logging for specific user (Emma Clark)
                            if user.id == 14:
                                logger.info(f"DEBUG: User 14 data - firstname='{user.firstname}', lastname='{user.lastname}', email='{user.email}', is_active={user.is_active}")
                                
                                # Direct database query to bypass ORM caching
                                from django.db import connection
                                with connection.cursor() as cursor:
                                    cursor.execute("SELECT firstname, lastname, email, is_active FROM CareLink_user WHERE id = 14")
                                    row = cursor.fetchone()
                                    if row:
                                        logger.info(f"DIRECT DB QUERY for User 14: firstname='{row[0]}', lastname='{row[1]}', email='{row[2]}', is_active={row[3]}")
                            
                            user_profiles_map[user.id] = {
                                "id": user.id,
                                "firstname": user.firstname,
                                "lastname": user.lastname,
                                "email": user.email,
                                "role": role_name,
                                "is_active": user.is_active,
                                "relations": []  # For future compatibility
                            }
                            
                            # Debug logging for anonymized users
                            if user.firstname == 'Anonymized' and user.lastname == 'User':
                                logger.info(f"Found anonymized user: ID={user.id}, email={user.email}, is_active={user.is_active}")
                except Exception as e:
                    logger.warning(f"Error processing {role_name} profiles: {str(e)}")
                    continue

            # Handle FamilyPatient specially - group multiple relations per user
            try:
                family_patients_by_user = {}
                for family_patient in FamilyPatient.objects.select_related('user', 'patient').all():
                    user = family_patient.user
                    if user:
                        if user.id not in family_patients_by_user:
                            family_patients_by_user[user.id] = {
                                "id": user.id,
                                "firstname": user.firstname,
                                "lastname": user.lastname,
                                "email": user.email,
                                "role": "FamilyPatient",
                                "is_active": user.is_active,
                                "relations": []
                            }
                        
                        # Add this relation to the user's relations list
                        relation_info = {
                            "link": family_patient.link,
                            "patient_id": family_patient.patient.id if family_patient.patient else None,
                            "patient_name": f"{family_patient.patient.user.firstname} {family_patient.patient.user.lastname}" if family_patient.patient and family_patient.patient.user else None
                        }
                        family_patients_by_user[user.id]["relations"].append(relation_info)

                # Add unique FamilyPatient users to the profiles map
                for user_id, family_patient_data in family_patients_by_user.items():
                    if user_id not in user_profiles_map:
                        user_profiles_map[user_id] = family_patient_data
            except Exception as e:
                logger.warning(f"Error processing FamilyPatient profiles: {str(e)}")

            # Convert the map to a list
            profiles = list(user_profiles_map.values())

            # Apply search filter if provided
            if search_query:
                profiles = [
                    profile for profile in profiles
                    if search_query.lower() in profile.get('firstname', '').lower() or
                       search_query.lower() in profile.get('lastname', '').lower() or
                       search_query.lower() in profile.get('email', '').lower() or
                       search_query.lower() in profile.get('role', '').lower()
                ]

            # Implement pagination
            paginator = Paginator(profiles, page_size)
            page_obj = paginator.get_page(page_number)

            response_data = {
                "results": list(page_obj),
                "count": paginator.count,
                "next": page_obj.has_next(),
                "previous": page_obj.has_previous(),
                "total_pages": paginator.num_pages,
                "current_page": page_obj.number
            }

            logger.info(f"ProfileList success: returned {len(page_obj)} profiles, total count: {paginator.count}")
            return Response(response_data, status=200)

        except Exception as e:
            error_msg = f'Failed to fetch profiles: {str(e)}'
            logger.error(f"ProfileList error: {error_msg}")
            return Response(
                {'error': error_msg}, 
                status=500
            )

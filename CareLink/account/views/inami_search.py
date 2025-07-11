"""
INAMI Healthcare Provider Search API Views
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.core.cache import cache
import logging

from account.services.inami_search import InamiSearchService, search_healthcare_provider

logger = logging.getLogger(__name__)

class InamiSearchAPIView(APIView):
    """
    API view for searching healthcare providers in the INAMI database
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Search for healthcare providers
        
        Expected payload:
        {
            "name": "Dupont",
            "firstname": "Jean",
            "profession": "Médecin",
            "inami_number": "123456789",
            "location": "Brussels"
        }
        """
        try:
            # Get search parameters from request
            search_params = {}
            
            if request.data.get('name'):
                search_params['name'] = request.data['name'].strip()
            if request.data.get('firstname'):
                search_params['firstname'] = request.data['firstname'].strip()
            if request.data.get('profession'):
                search_params['profession'] = request.data['profession'].strip()
            if request.data.get('inami_number'):
                search_params['nihdinumber'] = request.data['inami_number'].strip()
            if request.data.get('location'):
                search_params['location'] = request.data['location'].strip()
            
            # Validate that at least one parameter is provided
            if not any(search_params.values()):
                return Response({
                    "success": False,
                    "error": "At least one search parameter is required",
                    "providers": []
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Log the search attempt
            logger.info(f"User {request.user.email} searching INAMI with params: {search_params}")
            
            # Perform the search
            service = InamiSearchService()
            results = service.search_provider(**search_params)
            
            # Return results
            if results["success"]:
                return Response({
                    "success": True,
                    "providers": results["providers"],
                    "total_results": results.get("total_results", len(results["providers"])),
                    "search_params": search_params
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    "success": False,
                    "error": results.get("error", "Search failed"),
                    "providers": []
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            logger.error(f"INAMI search API error for user {request.user.email}: {e}")
            return Response({
                "success": False,
                "error": "An unexpected error occurred during the search",
                "providers": []
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class InamiConnectionTestAPIView(APIView):
    """
    API view to test connection to INAMI website
    """
    permission_classes = [IsAuthenticated]
    
    @method_decorator(cache_page(300))  # Cache for 5 minutes
    def get(self, request):
        """
        Test connection to INAMI website
        """
        try:
            service = InamiSearchService()
            result = service.test_connection()
            
            if result["success"]:
                return Response({
                    "success": True,
                    "message": result["message"],
                    "page_title": result.get("page_title")
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    "success": False,
                    "error": result["error"]
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
                
        except Exception as e:
            logger.error(f"INAMI connection test error: {e}")
            return Response({
                "success": False,
                "error": "Connection test failed"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class InamiQuickSearchAPIView(APIView):
    """
    API view for quick doctor search by name (for autocomplete/suggestions)
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Quick search for doctors by name
        
        Expected payload:
        {
            "query": "Dupont"
        }
        """
        try:
            query = request.data.get('query', '').strip()
            
            if not query or len(query) < 2:
                return Response({
                    "success": False,
                    "error": "Query must be at least 2 characters long",
                    "suggestions": []
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Search for providers with the query as name
            service = InamiSearchService()
            results = service.search_provider(name=query)
            
            if results["success"]:
                # Format results for quick suggestions
                suggestions = []
                for provider in results["providers"][:10]:  # Limit to 10 suggestions
                    suggestion = {
                        "name": provider.get("name", ""),
                        "profession": provider.get("profession", ""),
                        "inami_number": provider.get("inami_number", ""),
                        "convention_status": provider.get("convention_status", ""),
                        "work_address": provider.get("work_address", "")
                    }
                    suggestions.append(suggestion)
                
                return Response({
                    "success": True,
                    "suggestions": suggestions,
                    "total_found": len(results["providers"])
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    "success": False,
                    "error": results.get("error", "Search failed"),
                    "suggestions": []
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            logger.error(f"INAMI quick search error: {e}")
            return Response({
                "success": False,
                "error": "Quick search failed",
                "suggestions": []
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

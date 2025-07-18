"""
INAMI Healthcare Provider Search Integration for CareLink
"""
import requests
from bs4 import BeautifulSoup
import time
import logging
from urllib.parse import urlencode
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

class InamiSearchService:
    """
    Service class to integrate INAMI search functionality into CareLink Django app
    """
    
    BASE_URL = "https://webappsa.riziv-inami.fgov.be/silverpages/Home/SearchHcw"
    CACHE_TIMEOUT = 3600  # 1 hour cache
    
    def __init__(self, delay=2):
        """
        Initialize the INAMI search service
        
        Args:
            delay (int): Delay in seconds between requests to avoid overloading the server
        """
        self.session = requests.Session()
        self.delay = delay
        self.headers = {
            'User-Agent': 'CareLink Healthcare Provider Search/1.0 (khalidbounou@gmail.com)',
            'Accept': 'text/html,application/xhtml+xml,application/xml',
            'Accept-Language': 'fr-BE,fr;q=0.9,en-US;q=0.8,en;q=0.7',
            'Referer': 'https://webappsa.riziv-inami.fgov.be/silverpages/Home',
        }
    
    def search_provider(self, **kwargs):
        """
        Search for healthcare providers with the given parameters
        
        Args:
            **kwargs: Search parameters (name, firstname, profession, etc.)
        
        Returns:
            dict: Search results with providers list and metadata
        """
        # Create cache key based on search parameters
        cache_key = f"inami_search_{hash(str(sorted(kwargs.items())))}"
        
        # Try to get cached results first
        cached_result = cache.get(cache_key)
        if cached_result:
            logger.info(f"Returning cached INAMI search results for: {kwargs}")
            return cached_result
        
        search_params = {}
        
        # Convert kwargs to the format expected by the website
        for key, value in kwargs.items():
            if value and value.strip():
                search_params[f'Form.{key.capitalize()}'] = value.strip()
        
        if not search_params:
            return {
                "success": False,
                "error": "At least one search parameter is required",
                "providers": []
            }
        
        try:
            # Construct the URL with query parameters
            query_string = urlencode(search_params)
            url = f"{self.BASE_URL}/?{query_string}"
            
            logger.info(f"INAMI search request: {url}")
            
            response = self.session.get(url, headers=self.headers, timeout=30)
            
            if response.status_code == 200:
                result = self._parse_results(response.text, search_params)
                
                # Cache successful results
                if result["success"]:
                    cache.set(cache_key, result, self.CACHE_TIMEOUT)
                
                return result
            else:
                logger.error(f"INAMI search HTTP error: {response.status_code}")
                return {
                    "success": False,
                    "error": f"HTTP error {response.status_code}",
                    "providers": []
                }
                
        except requests.exceptions.Timeout:
            logger.error("INAMI search timeout")
            return {
                "success": False,
                "error": "Request timeout - the INAMI website may be slow or unavailable",
                "providers": []
            }
        except requests.exceptions.ConnectionError as e:
            logger.error(f"INAMI search connection error: {e}")
            return {
                "success": False,
                "error": "Connection error - please check your internet connection",
                "providers": []
            }
        except Exception as e:
            logger.error(f"INAMI search unexpected error: {e}")
            return {
                "success": False,
                "error": "An unexpected error occurred",
                "providers": []
            }
        finally:
            # Delay to avoid overloading the server
            time.sleep(self.delay)
    
    def _parse_results(self, html_content, search_params):
        """
        Parse the HTML content of search results
        
        Args:
            html_content (str): HTML content of the search results page
            search_params (dict): Original search parameters
            
        Returns:
            dict: Parsed search results
        """
        try:
            soup = BeautifulSoup(html_content, 'html.parser')
            
            providers = []
            
            # Look for card-based results (the actual structure used by the website)
            cards = soup.find_all('div', class_='card')
            
            for card in cards:
                provider_data = {}
                
                # Look for rows within the card
                rows = card.find_all('div', class_='row')
                
                for row in rows:
                    # Find label and value within each row
                    label_elem = row.find('label')
                    value_elem = row.find('div', class_=['col-sm-8', 'col-md-8', 'col-lg-8'])
                    
                    if label_elem and value_elem:
                        label_text = label_elem.get_text().strip()
                        value_text = value_elem.get_text().strip()
                        
                        # Clean up the label (remove trailing colon, etc.)
                        if label_text.endswith(':'):
                            label_text = label_text[:-1]
                        
                        # Map French labels to English field names
                        field_mapping = {
                            'Nom': 'name',
                            'N°INAMI': 'inami_number',
                            'Profession': 'profession',
                            'Conv.': 'convention_status',
                            'Qualification': 'qualification',
                            'Date de qualif.': 'qualification_date',
                            'Adresse de travail': 'work_address',
                            'Ville': 'city',
                            'Code postal': 'postal_code',
                            'Téléphone': 'phone',
                            'E-mail': 'email'
                        }
                        
                        field_name = field_mapping.get(label_text, label_text.lower().replace(' ', '_'))
                        provider_data[field_name] = value_text
                
                if provider_data and provider_data.get('name'):  # Only add if we found data with a name
                    providers.append(provider_data)
            
            logger.info(f"INAMI search found {len(providers)} providers")
            
            return {
                "success": True,
                "providers": providers,
                "search_params": search_params,
                "total_results": len(providers)
            }
            
        except Exception as e:
            logger.error(f"Error parsing INAMI search results: {e}")
            return {
                "success": False,
                "error": "Error parsing search results",
                "providers": []
            }
    
    def test_connection(self):
        """
        Test basic connectivity to the RIZIV-INAMI website
        
        Returns:
            dict: Connection test results
        """
        try:
            main_page_url = "https://webappsa.riziv-inami.fgov.be/silverpages/Home"
            response = self.session.get(main_page_url, headers=self.headers, timeout=30)
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                title = soup.find('title')
                
                return {
                    "success": True,
                    "message": "Connection to INAMI website successful",
                    "page_title": title.get_text() if title else None
                }
            else:
                return {
                    "success": False,
                    "error": f"Main page returned status {response.status_code}"
                }
                
        except Exception as e:
            logger.error(f"INAMI connection test failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }

# Convenience function for easy usage
def search_healthcare_provider(name=None, firstname=None, profession=None, inami_number=None, location=None):
    """
    Convenience function to search for healthcare providers
    
    Args:
        name (str): Last name of the provider
        firstname (str): First name of the provider
        profession (str): Profession of the provider
        inami_number (str): INAMI number of the provider
        location (str): Location of the provider
    
    Returns:
        dict: Search results
    """
    service = InamiSearchService()
    
    search_params = {}
    if name:
        search_params['name'] = name
    if firstname:
        search_params['firstname'] = firstname
    if profession:
        search_params['profession'] = profession
    if inami_number:
        search_params['nihdinumber'] = inami_number
    if location:
        search_params['location'] = location
    
    return service.search_provider(**search_params)

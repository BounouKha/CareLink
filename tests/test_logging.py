#!/usr/bin/env python
import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')

try:
    django.setup()
except Exception as e:
    print(f"Django setup error: {e}")
    sys.exit(1)

import logging

def test_logging():
    """Test our logging configuration"""
    print("=== TESTING LOGGING FUNCTIONALITY ===")
    
    # Test different loggers
    carelink_logger = logging.getLogger('carelink')
    admin_logger = logging.getLogger('carelink.admin')
    security_logger = logging.getLogger('carelink.security')
    
    # Test different log levels
    carelink_logger.info("Testing CareLink general logging - INFO level")
    carelink_logger.warning("Testing CareLink general logging - WARNING level")
    carelink_logger.error("Testing CareLink general logging - ERROR level")
    
    admin_logger.info("Admin action test: User viewed dashboard")
    admin_logger.warning("Admin warning test: Bulk action performed")
    
    security_logger.warning("Security test: Failed login attempt from test")
    security_logger.error("Security test: Suspicious activity detected")
    
    print("✅ Logging tests completed - check log files:")
    print("  - logs/carelink.log")
    print("  - logs/admin.log")
    print("  - logs/errors.log")

if __name__ == "__main__":
    test_logging()

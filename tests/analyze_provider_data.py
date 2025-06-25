#!/usr/bin/env python
"""
Script to analyze Provider and Contract data integrity issues
"""
import os
import sys
import django

# Add the project directory to Python path
sys.path.append('C:/Users/460020779/Desktop/CareLink/CareLink')

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')
django.setup()

from CareLink.models import Provider, Contract, User
from django.db.models import Count, Q

def analyze_provider_data():
    print("🔍 PROVIDER & CONTRACT DATA INTEGRITY ANALYSIS")
    print("=" * 60)
      # 1. Providers without contracts
    print("\n📋 1. PROVIDERS WITHOUT CONTRACTS:")
    # Get providers who either have no user or whose user has no contracts
    providers_no_user = Provider.objects.filter(user__isnull=True)
    providers_with_no_contracts = Provider.objects.filter(
        user__isnull=False
    ).exclude(
        user__in=User.objects.filter(contract__isnull=False)
    ).select_related('user', 'service')
      # Combine both querysets
    providers_no_contracts_count = providers_no_user.count() + providers_with_no_contracts.count()
    
    print(f"Total providers without contracts: {providers_no_contracts_count}")
    print(f"  - Providers with no user: {providers_no_user.count()}")
    print(f"  - Providers with user but no contracts: {providers_with_no_contracts.count()}")
    
    if providers_no_user.exists():
        print("\nProviders without users:")
        for provider in providers_no_user[:5]:  # Show first 5
            service_info = provider.service.name if provider.service else "No Service"
            print(f"  - ID: {provider.id} | NO USER | Service: {service_info} | Internal: {provider.is_internal}")
    
    if providers_with_no_contracts.exists():
        print("\nProviders with users but no contracts:")
        for provider in providers_with_no_contracts[:5]:  # Show first 5
            user_info = f"{provider.user.firstname} {provider.user.lastname}" if provider.user else "No User"
            service_info = provider.service.name if provider.service else "No Service"
            print(f"  - ID: {provider.id} | {user_info} | Service: {service_info} | Internal: {provider.is_internal}")
    
    # 2. Users with multiple active contracts
    print("\n⚠️  2. USERS WITH MULTIPLE ACTIVE CONTRACTS:")
    users_multiple_active = User.objects.annotate(
        active_contract_count=Count('contract', filter=Q(contract__status='active'))
    ).filter(active_contract_count__gt=1)
    
    print(f"Users with multiple active contracts: {users_multiple_active.count()}")
    
    if users_multiple_active.exists():
        print("\nUsers with multiple active contracts:")
        for user in users_multiple_active:
            active_contracts = user.contract_set.filter(status='active')
            print(f"  - {user.firstname} {user.lastname} ({user.email})")
            print(f"    Active contracts: {active_contracts.count()}")
            for contract in active_contracts:
                print(f"      * {contract.contract_reference} | {contract.type_contract} | {contract.start_date} to {contract.end_date}")
    
    # 3. Inactive users with active contracts
    print("\n🚫 3. INACTIVE USERS WITH ACTIVE CONTRACTS:")
    inactive_users_active_contracts = User.objects.filter(
        is_active=False,
        contract__status='active'
    ).distinct()
    
    print(f"Inactive users with active contracts: {inactive_users_active_contracts.count()}")
    
    if inactive_users_active_contracts.exists():
        print("\nInactive users with active contracts:")
        for user in inactive_users_active_contracts:
            active_contracts = user.contract_set.filter(status='active')
            print(f"  - {user.firstname} {user.lastname} ({user.email}) - INACTIVE USER")
            for contract in active_contracts:
                print(f"      * {contract.contract_reference} | {contract.status} | {contract.start_date} to {contract.end_date}")
    
    # 4. Contracts without users
    print("\n👻 4. CONTRACTS WITHOUT USERS:")
    contracts_no_user = Contract.objects.filter(user__isnull=True)
    print(f"Contracts without users: {contracts_no_user.count()}")
    
    if contracts_no_user.exists():
        print("\nContracts without users:")
        for contract in contracts_no_user[:5]:  # Show first 5
            print(f"  - ID: {contract.id} | Ref: {contract.contract_reference} | Status: {contract.status}")
    
    # 5. Active contracts with end dates in the past
    print("\n📅 5. ACTIVE CONTRACTS PAST END DATE:")
    from django.utils import timezone
    expired_active_contracts = Contract.objects.filter(
        status='active',
        end_date__lt=timezone.now().date()
    )
    print(f"Active contracts past end date: {expired_active_contracts.count()}")
    
    if expired_active_contracts.exists():
        print("\nActive contracts that should be expired:")
        for contract in expired_active_contracts:
            user_name = f"{contract.user.firstname} {contract.user.lastname}" if contract.user else "No User"
            print(f"  - {contract.contract_reference} | {user_name} | End: {contract.end_date}")
    
    # 6. Summary statistics
    print("\n📊 SUMMARY STATISTICS:")
    total_providers = Provider.objects.count()
    total_contracts = Contract.objects.count()
    active_contracts = Contract.objects.filter(status='active').count()
    
    print(f"Total Providers: {total_providers}")
    print(f"Total Contracts: {total_contracts}")
    print(f"Active Contracts: {active_contracts}")
    print(f"Providers with users: {Provider.objects.filter(user__isnull=False).count()}")
    print(f"Providers without users: {Provider.objects.filter(user__isnull=True).count()}")

if __name__ == "__main__":
    analyze_provider_data()

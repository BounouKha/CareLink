"""
Data Cleanup and Management Script for Provider/Contract Integrity
"""
import os
import sys
import django

# Setup Django
sys.path.append('C:/Users/460020779/Desktop/CareLink/CareLink')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')
django.setup()

from CareLink.models import Provider, Contract, User
from django.utils import timezone
from django.core.exceptions import ValidationError

def cleanup_orphaned_contracts():
    """Remove contracts without users"""
    print("🧹 CLEANING UP ORPHANED CONTRACTS")
    print("-" * 40)
    
    orphaned_contracts = Contract.objects.filter(user__isnull=True)
    count = orphaned_contracts.count()
    
    if count > 0:
        print(f"Found {count} orphaned contracts:")
        for contract in orphaned_contracts:
            print(f"  - Contract ID: {contract.id}, Ref: {contract.contract_reference}, Status: {contract.status}")
        
        confirm = input(f"\nDelete these {count} orphaned contracts? (y/N): ")
        if confirm.lower() == 'y':
            orphaned_contracts.delete()
            print(f"✅ Deleted {count} orphaned contracts")
        else:
            print("❌ Cleanup cancelled")
    else:
        print("✅ No orphaned contracts found")

def expire_old_contracts():
    """Mark contracts as inactive if they've passed their end date"""
    print("\n📅 EXPIRING OLD CONTRACTS")
    print("-" * 40)
    
    today = timezone.now().date()
    expired_active_contracts = Contract.objects.filter(
        status='active',
        end_date__lt=today
    )
    
    count = expired_active_contracts.count()
    
    if count > 0:
        print(f"Found {count} active contracts past their end date:")
        for contract in expired_active_contracts:
            user_name = f"{contract.user.firstname} {contract.user.lastname}" if contract.user else "No User"
            print(f"  - {contract.contract_reference} | {user_name} | Ended: {contract.end_date}")
        
        confirm = input(f"\nMark these {count} contracts as inactive? (y/N): ")
        if confirm.lower() == 'y':
            updated = expired_active_contracts.update(status='inactive')
            print(f"✅ Updated {updated} contracts to inactive status")
        else:
            print("❌ Update cancelled")
    else:
        print("✅ No expired active contracts found")

def validate_all_contracts():
    """Validate all existing contracts against business rules"""
    print("\n🔍 VALIDATING ALL CONTRACTS")
    print("-" * 40)
    
    all_contracts = Contract.objects.all()
    validation_errors = []
    
    for contract in all_contracts:
        try:
            contract.full_clean()
        except ValidationError as e:
            validation_errors.append({
                'contract': contract,
                'errors': e.message_dict if hasattr(e, 'message_dict') else str(e)
            })
    
    if validation_errors:
        print(f"Found {len(validation_errors)} contracts with validation errors:")
        for error in validation_errors:
            contract = error['contract']
            user_name = f"{contract.user.firstname} {contract.user.lastname}" if contract.user else "No User"
            print(f"\n  - Contract: {contract.contract_reference} ({user_name})")
            print(f"    Errors: {error['errors']}")
    else:
        print("✅ All contracts passed validation")

def generate_provider_report():
    """Generate a comprehensive provider status report"""
    print("\n📊 PROVIDER STATUS REPORT")
    print("-" * 40)
    
    # Provider statistics
    total_providers = Provider.objects.count()
    providers_with_users = Provider.objects.filter(user__isnull=False).count()
    providers_without_users = Provider.objects.filter(user__isnull=True).count()
    
    # Contract statistics
    providers_with_contracts = Provider.objects.filter(
        user__isnull=False,
        user__contract__isnull=False
    ).distinct().count()
    
    providers_without_contracts = Provider.objects.filter(
        user__isnull=False
    ).exclude(
        user__in=User.objects.filter(contract__isnull=False)
    ).count()
    
    # Active contract statistics
    providers_with_active_contracts = Provider.objects.filter(
        user__isnull=False,
        user__contract__status='active'
    ).distinct().count()
    
    print(f"📈 PROVIDER OVERVIEW:")
    print(f"  Total Providers: {total_providers}")
    print(f"  Providers with Users: {providers_with_users}")
    print(f"  Providers without Users: {providers_without_users}")
    print(f"  Providers with Contracts: {providers_with_contracts}")
    print(f"  Providers without Contracts: {providers_without_contracts}")
    print(f"  Providers with Active Contracts: {providers_with_active_contracts}")
    
    # Contract status breakdown
    contract_statuses = Contract.objects.values_list('status', flat=True)
    status_counts = {}
    for status in contract_statuses:
        status_counts[status] = status_counts.get(status, 0) + 1
    
    print(f"\n📋 CONTRACT STATUS BREAKDOWN:")
    for status, count in status_counts.items():
        print(f"  {status.title()}: {count}")
    
    # Users without provider profiles
    users_without_provider = User.objects.filter(
        provider__isnull=True,
        role='Provider'
    ).count()
    
    if users_without_provider > 0:
        print(f"\n⚠️  ATTENTION: {users_without_provider} users have role 'Provider' but no Provider profile!")

def main():
    """Main cleanup and management function"""
    print("🔧 PROVIDER & CONTRACT DATA MANAGEMENT TOOL")
    print("=" * 50)
    
    while True:
        print("\nSelect an action:")
        print("1. 🧹 Cleanup orphaned contracts")
        print("2. 📅 Expire old contracts") 
        print("3. 🔍 Validate all contracts")
        print("4. 📊 Generate provider report")
        print("5. 🎯 Run all cleanup tasks")
        print("6. ❌ Exit")
        
        choice = input("\nEnter your choice (1-6): ").strip()
        
        if choice == '1':
            cleanup_orphaned_contracts()
        elif choice == '2':
            expire_old_contracts()
        elif choice == '3':
            validate_all_contracts()
        elif choice == '4':
            generate_provider_report()
        elif choice == '5':
            cleanup_orphaned_contracts()
            expire_old_contracts()
            validate_all_contracts()
            generate_provider_report()
        elif choice == '6':
            print("👋 Goodbye!")
            break
        else:
            print("❌ Invalid choice. Please try again.")

if __name__ == "__main__":
    main()

/**
 * Role-based access control utilities for CareLink
 * Provides centralized role checking and permissions
 */

// Define role hierarchies and permissions
export const ROLES = {
    PATIENT: 'Patient',
    FAMILY_PATIENT: 'Family Patient',
    PROVIDER: 'Provider',
    COORDINATOR: 'Coordinator',
    ADMINISTRATIVE: 'Administrative',
    ADMINISTRATOR: 'Administrator'
};

// Define permission levels
export const PERMISSIONS = {
    READ_ONLY: 'read_only',
    FULL_ACCESS: 'full_access',
    LIMITED_ACCESS: 'limited_access'
};

/**
 * Check if user has specific role
 * @param {Object} user - User object
 * @param {string} role - Role to check
 * @returns {boolean}
 */
export const hasRole = (user, role) => {
    if (!user || !user.role) return false;
    return user.role === role;
};

/**
 * Check if user has any of the specified roles
 * @param {Object} user - User object
 * @param {Array<string>} roles - Array of roles to check
 * @returns {boolean}
 */
export const hasAnyRole = (user, roles) => {
    if (!user || !user.role || !Array.isArray(roles)) return false;
    return roles.includes(user.role);
};

/**
 * Check if user is a patient (Patient or Family Patient)
 * @param {Object} user - User object
 * @returns {boolean}
 */
export const isPatient = (user) => {
    return hasAnyRole(user, [ROLES.PATIENT, ROLES.FAMILY_PATIENT]);
};

/**
 * Check if user is staff (Coordinator, Administrative, Administrator)
 * @param {Object} user - User object
 * @returns {boolean}
 */
export const isStaff = (user) => {
    console.log('[roleUtils] isStaff - user:', user);
    console.log('[roleUtils] isStaff - checking roles:', [ROLES.COORDINATOR, ROLES.ADMINISTRATIVE, ROLES.ADMINISTRATOR]);
    const result = hasAnyRole(user, [ROLES.COORDINATOR, ROLES.ADMINISTRATIVE, ROLES.ADMINISTRATOR]);
    console.log('[roleUtils] isStaff - result:', result);
    return result;
};

/**
 * Check if user has admin privileges (Administrative, Administrator)
 * @param {Object} user - User object
 * @returns {boolean}
 */
export const isAdmin = (user) => {
    return hasAnyRole(user, [ROLES.ADMINISTRATIVE, ROLES.ADMINISTRATOR]);
};

/**
 * Check if user can access provider management
 * @param {Object|string} userOrRole - User object or role string
 * @returns {boolean}
 */
export const canAccessProviderManagement = (userOrRole) => {
    console.log('[roleUtils] canAccessProviderManagement - userOrRole:', userOrRole);
    console.log('[roleUtils] canAccessProviderManagement - typeof userOrRole:', typeof userOrRole);
    
    // Handle both user object and role string
    const role = typeof userOrRole === 'string' ? userOrRole : userOrRole?.role;
    console.log('[roleUtils] canAccessProviderManagement - role:', role);
    
    const allowedRoles = [ROLES.COORDINATOR, ROLES.ADMINISTRATIVE, ROLES.ADMINISTRATOR];
    console.log('[roleUtils] canAccessProviderManagement - allowedRoles:', allowedRoles);
    console.log('[roleUtils] canAccessProviderManagement - ROLES.COORDINATOR:', ROLES.COORDINATOR);
    const result = allowedRoles.includes(role);
    console.log('[roleUtils] canAccessProviderManagement - result:', result);
    return result;
};

/**
 * Get provider management permission level for user
 * @param {Object|string} userOrRole - User object or role string
 * @returns {string} Permission level
 */
export const getProviderManagementPermission = (userOrRole) => {
    if (!canAccessProviderManagement(userOrRole)) return null;
    
    // Handle both user object and role string
    const role = typeof userOrRole === 'string' ? userOrRole : userOrRole?.role;
    
    if (role === ROLES.COORDINATOR) {
        return PERMISSIONS.READ_ONLY;
    }
    
    if (role === ROLES.ADMINISTRATIVE || role === ROLES.ADMINISTRATOR) {
        return PERMISSIONS.FULL_ACCESS;
    }
    
    return null;
};

/**
 * Check if user can view contract details
 * @param {Object} user - User object
 * @returns {boolean}
 */
export const canViewContractDetails = (user) => {
    return isStaff(user);
};

/**
 * Check if user can edit contracts
 * @param {Object} user - User object
 * @returns {boolean}
 */
export const canEditContracts = (user) => {
    return isAdmin(user);
};

/**
 * Check if user can create providers
 * @param {Object|string} userOrRole - User object or role string
 * @returns {boolean}
 */
export const canCreateProviders = (userOrRole) => {
    // Handle both user object and role string
    const role = typeof userOrRole === 'string' ? userOrRole : userOrRole?.role;
    return role === ROLES.ADMINISTRATIVE || role === ROLES.ADMINISTRATOR;
};

/**
 * Get contract fields that user can view
 * @param {Object} user - User object
 * @returns {Array<string>} Array of field names
 */
export const getViewableContractFields = (user) => {
    if (!canViewContractDetails(user)) return [];
    
    const baseFields = ['id', 'contract_type', 'service_type', 'weekly_hours', 'start_date', 'end_date', 'status'];
    
    if (hasRole(user, ROLES.COORDINATOR)) {
        // Coordinator can only see limited fields
        return baseFields;
    }
    
    if (isAdmin(user)) {
        // Admin can see all fields
        return [...baseFields, 'created_at', 'updated_at', 'created_by', 'notes', 'compliance_status'];
    }
    
    return baseFields;
};

/**
 * Get navigation items for user role
 * @param {Object} user - User object
 * @returns {Array<Object>} Array of navigation items
 */
export const getNavigationItems = (user) => {
    if (!user || !user.role) return [];
    
    const items = [
        { key: 'profile', label: 'Profile', path: '/profile', roles: 'all' }
    ];
    
    // Patient and Family Patient items
    if (isPatient(user)) {
        items.push(
            { key: 'service-requests', label: 'Service Requests', path: '/service-demands', roles: [ROLES.PATIENT, ROLES.FAMILY_PATIENT] },
            { key: 'schedule', label: 'Schedule', path: '/schedule', roles: [ROLES.PATIENT, ROLES.FAMILY_PATIENT] },
            { key: 'invoices', label: 'Invoices', path: '/invoices', roles: [ROLES.PATIENT, ROLES.FAMILY_PATIENT] }
        );
    }
    
    // Provider items
    if (hasRole(user, ROLES.PROVIDER)) {
        items.push(
            { key: 'provider-schedule', label: 'Schedule', path: '/provider/schedule', roles: [ROLES.PROVIDER] }
        );
    }
    
    // Staff items
    if (isStaff(user)) {
        items.push(
            { key: 'patients', label: 'Patients', path: '/patients', roles: [ROLES.COORDINATOR, ROLES.ADMINISTRATIVE] },
            { key: 'service-demands', label: 'Service Demands', path: '/service-demands', roles: [ROLES.COORDINATOR, ROLES.ADMINISTRATIVE] },
            { key: 'schedule-calendar', label: 'Schedule Calendar', path: '/schedule', roles: [ROLES.COORDINATOR, ROLES.ADMINISTRATIVE] }
        );
        
        // Coordinator-specific ticket management
        if (hasRole(user, ROLES.COORDINATOR)) {
            items.push(
                { key: 'manage-tickets', label: 'Manage Tickets', path: '/coordinator/tickets', roles: [ROLES.COORDINATOR] }
            );
        } else {
            // Admin ticket management
            items.push(
                { key: 'tickets', label: 'Help Desk', path: '/tickets', roles: [ROLES.ADMINISTRATIVE, ROLES.ADMINISTRATOR] }
            );
        }
    }
    
    // Provider management for staff
    if (canAccessProviderManagement(user)) {
        items.push(
            { key: 'providers', label: 'Providers', path: '/providers', roles: [ROLES.COORDINATOR, ROLES.ADMINISTRATIVE, ROLES.ADMINISTRATOR] }
        );
    }
    
    // Add helpdesk access for all users
    // All users can submit tickets through the user helpdesk panel
    if (isPatient(user) || isAdmin(user) || hasRole(user, ROLES.PROVIDER)) {
        items.push(
            { key: 'user-helpdesk', label: 'Helpdesk', path: '/user/helpdesk', roles: [ROLES.PATIENT, ROLES.FAMILY_PATIENT, ROLES.PROVIDER, ROLES.ADMINISTRATIVE, ROLES.ADMINISTRATOR] }
        );
    }
    
    // Add coordinator helpdesk for coordinators only
    if (hasRole(user, ROLES.COORDINATOR)) {
        items.push(
            { key: 'helpdesk', label: 'Helpdesk', path: '/coordinator/helpdesk', roles: [ROLES.COORDINATOR] }
        );
    }
    
    // Filter items based on user role
    return items.filter(item => {
        if (item.roles === 'all') return true;
        if (Array.isArray(item.roles)) return item.roles.includes(user.role);
        return false;
    });
};

/**
 * Format role name for display
 * @param {string} role - Role name
 * @returns {string} Formatted role name
 */
export const formatRole = (role) => {
    if (!role) return '';
    return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

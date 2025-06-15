/**
 * Age Calculation Utilities for CareLink Application
 * Provides "leeftbare" (age-related) information functionality
 */

/**
 * Calculate age from birthdate
 * @param {string} birthdate - Date string in format YYYY-MM-DD
 * @returns {number|null} Age in years, or null if invalid date
 */
export const calculateAge = (birthdate) => {
    if (!birthdate) return null;
    
    try {
        const birth = new Date(birthdate);
        const today = new Date();
        
        // Check if birthdate is valid
        if (isNaN(birth.getTime())) return null;
        
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        
        // Adjust if birthday hasn't occurred this year yet
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        
        return age >= 0 ? age : null;
    } catch (error) {
        console.error('Error calculating age:', error);
        return null;
    }
};

/**
 * Get age display string with units
 * @param {string} birthdate - Date string in format YYYY-MM-DD
 * @returns {string} Formatted age string (e.g., "25 years", "1 year", "Invalid")
 */
export const getAgeDisplay = (birthdate) => {
    const age = calculateAge(birthdate);
    
    if (age === null) return 'Unknown';
    if (age === 0) return '< 1 year';
    if (age === 1) return '1 year';
    return `${age} years`;
};

/**
 * Get age category for medical/care purposes
 * @param {string} birthdate - Date string in format YYYY-MM-DD
 * @returns {string} Age category ('child', 'adult', 'senior', 'unknown')
 */
export const getAgeCategory = (birthdate) => {
    const age = calculateAge(birthdate);
    
    if (age === null) return 'unknown';
    if (age < 18) return 'child';
    if (age < 65) return 'adult';
    return 'senior';
};

/**
 * Check if person is of legal age (18+)
 * @param {string} birthdate - Date string in format YYYY-MM-DD
 * @returns {boolean} True if 18 or older
 */
export const isLegalAge = (birthdate) => {
    const age = calculateAge(birthdate);
    return age !== null && age >= 18;
};

/**
 * Format birthdate for display with age
 * @param {string} birthdate - Date string in format YYYY-MM-DD
 * @returns {string} Formatted string with date and age
 */
export const formatBirthdateWithAge = (birthdate) => {
    if (!birthdate) return 'Not specified';
    
    try {
        const date = new Date(birthdate);
        if (isNaN(date.getTime())) return 'Invalid date';
        
        const formattedDate = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        const age = calculateAge(birthdate);
        const ageStr = age !== null ? ` (${getAgeDisplay(birthdate)})` : '';
        
        return `${formattedDate}${ageStr}`;
    } catch (error) {
        console.error('Error formatting birthdate:', error);
        return 'Invalid date';
    }
};

/**
 * Validate birthdate (not in future, reasonable range)
 * @param {string} birthdate - Date string in format YYYY-MM-DD
 * @returns {object} Validation result with isValid and message
 */
export const validateBirthdate = (birthdate) => {
    if (!birthdate) {
        return { isValid: false, message: 'Birthdate is required' };
    }
    
    try {
        const birth = new Date(birthdate);
        const today = new Date();
        
        if (isNaN(birth.getTime())) {
            return { isValid: false, message: 'Invalid date format' };
        }
        
        if (birth > today) {
            return { isValid: false, message: 'Birthdate cannot be in the future' };
        }
        
        const age = calculateAge(birthdate);
        if (age > 150) {
            return { isValid: false, message: 'Birthdate seems unrealistic (age > 150)' };
        }
        
        return { isValid: true, message: 'Valid birthdate' };
    } catch (error) {
        return { isValid: false, message: 'Error validating date' };
    }
};

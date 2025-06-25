import { useTranslation } from 'react-i18next';

/**
 * Custom hook for CareLink translations
 * Provides commonly used translation functions and utilities
 */
export const useCareTranslation = (namespace = null) => {
  const { t, i18n } = useTranslation();

  // Helper function to get translations with fallback
  const translate = (key, options = {}) => {
    const fullKey = namespace ? `${namespace}.${key}` : key;
    return t(fullKey, options);
  };
  // Common translation shortcuts
  const common = (key, options = {}) => t(`common.${key}`, options);
  const auth = (key, options = {}) => t(`auth.${key}`, options);
  const profile = (key, options = {}) => t(`profile.${key}`, options);
  const patients = (key, options = {}) => t(`patients.${key}`, options);
  const servicedemands = (key, options = {}) => t(`servicedemands.${key}`, options);
  const schedule = (key, options = {}) => t(`schedule.${key}`, options);
  const admin = (key, options = {}) => t(`admin.${key}`, options);
  const providers = (key, options = {}) => t(`providers.${key}`, options);
  const errors = (key, options = {}) => t(`errors.${key}`, options);
  const success = (key, options = {}) => t(`success.${key}`, options);
  const navigation = (key, options = {}) => t(`navigation.${key}`, options);
  const placeholders = (key, options = {}) => t(`placeholders.${key}`, options);
  const confirmations = (key, options = {}) => t(`confirmations.${key}`, options);
  const tooltips = (key, options = {}) => t(`tooltips.${key}`, options);

  // Utility functions
  const getCurrentLanguage = () => i18n.language;
  const isRTL = () => ['ar', 'he', 'fa'].includes(i18n.language);
  const formatDate = (date, options = {}) => {
    return new Date(date).toLocaleDateString(i18n.language, options);
  };
  const formatCurrency = (amount, currency = 'EUR') => {
    return new Intl.NumberFormat(i18n.language, {
      style: 'currency',
      currency: currency
    }).format(amount);
  };
  return {
    t: translate,
    common,
    auth,
    profile,
    patients,
    servicedemands,
    schedule,
    admin,
    providers,
    errors,
    success,
    navigation,
    placeholders,
    confirmations,
    tooltips,
    getCurrentLanguage,
    isRTL,
    formatDate,
    formatCurrency,
    i18n
  };
};

export default useCareTranslation;

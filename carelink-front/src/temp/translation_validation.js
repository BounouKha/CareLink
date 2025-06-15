// Translation validation script for CareLink
// This script helps validate that all translation keys are properly defined

const fs = require('fs');
const path = require('path');

// Load translation files
const enTranslations = require('../i18n/locales/en.json');
const nlTranslations = require('../i18n/locales/nl.json');
const frTranslations = require('../i18n/locales/fr.json');

// Function to get all keys from an object recursively
function getAllKeys(obj, prefix = '') {
  let keys = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys = keys.concat(getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

// Get all keys from each translation file
const enKeys = getAllKeys(enTranslations);
const nlKeys = getAllKeys(nlTranslations);
const frKeys = getAllKeys(frTranslations);

console.log('Translation Validation Report');
console.log('============================');

console.log(`\nEnglish keys: ${enKeys.length}`);
console.log(`Dutch keys: ${nlKeys.length}`);
console.log(`French keys: ${frKeys.length}`);

// Find missing keys
const missingInDutch = enKeys.filter(key => !nlKeys.includes(key));
const missingInFrench = enKeys.filter(key => !frKeys.includes(key));

console.log(`\nMissing in Dutch (${missingInDutch.length}):`);
missingInDutch.forEach(key => console.log(`  - ${key}`));

console.log(`\nMissing in French (${missingInFrench.length}):`);
missingInFrench.forEach(key => console.log(`  - ${key}`));

// Check for keys that exist in other languages but not English
const extraInDutch = nlKeys.filter(key => !enKeys.includes(key));
const extraInFrench = frKeys.filter(key => !enKeys.includes(key));

console.log(`\nExtra in Dutch (${extraInDutch.length}):`);
extraInDutch.forEach(key => console.log(`  - ${key}`));

console.log(`\nExtra in French (${extraInFrench.length}):`);
extraInFrench.forEach(key => console.log(`  - ${key}`));

console.log('\n============================');
console.log('Validation Complete');

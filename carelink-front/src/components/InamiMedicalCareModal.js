import React, { useState, useEffect, useRef } from 'react';
import './InamiMedicalCareModal.css';
import { useCareTranslation } from '../hooks/useCareTranslation';

const InamiMedicalCareModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  initialData = null, 
  patientData = null, 
  prescriptionData = null 
}) => {
  const { schedule, common, placeholders } = useCareTranslation();
  const modalRef = useRef(null);

  const [formData, setFormData] = useState({
    care_type: '',
    care_location: 'home',
    care_duration: '30-59',
    is_weekend: false,
    is_holiday: false
  });

  const [pricing, setPricing] = useState({
    mutuelle_price: 0,
    patient_copay: 0,
    total_price: 0,
    inami_code: ''
  });

  // Care type options based on Belgian INAMI nursing codes
  // Updated with codes from domiris.be and Belgian healthcare pricing
  const careTypeOptions = [
    { 
      id: 'toilette', 
      label: 'Toilette', 
      mutuelle_price: 4.85, 
      patient_copay: 0,
      codes: {
        home_weekday: '428016',
        home_weekend: '428031',
        office: '428053',
        disability_home_weekday: '428075',
        disability_home_weekend: '428090',
        day_center: '428112'
      }
    },
    { 
      id: 'pansement_simple', 
      label: 'Pansement simple', 
      mutuelle_price: 6.30, 
      patient_copay: 0,
      codes: {
        home_weekday: '424336',
        home_weekend: '424491',
        office: '424631',
        disability_home_weekday: '427932',
        disability_home_weekend: '430150',
        day_center: '424793'
      }
    },
    { 
      id: 'pansement_complexe', 
      label: 'Pansement complexe', 
      mutuelle_price: 9.15, 
      patient_copay: 0,
      codes: {
        home_weekday: '424255',
        home_weekend: '424410',
        office: '424550',
        disability_home_weekday: '427836',
        disability_home_weekend: '430054',
        day_center: '424712'
      }
    },
    { 
      id: 'surveillance_plaie', 
      label: 'Surveillance plaie', 
      mutuelle_price: 15.20, 
      patient_copay: 0,
      codes: {
        home_weekday: '424351',
        home_weekend: '424513',
        office: '424653',
        disability_home_weekday: '427954',
        disability_home_weekend: '430172',
        day_center: '424815'
      }
    },
    { 
      id: 'injection_im_sc', 
      label: 'Injection intramusculaire/sous-cutanée', 
      mutuelle_price: 4.75, 
      patient_copay: 0,
      codes: {
        home_weekday: '422275',
        home_weekend: '422290',
        office: '422312',
        disability_home_weekday: '422334',
        disability_home_weekend: '422356',
        day_center: '422371'
      }
    },
    { 
      id: 'perfusion', 
      label: 'Perfusion', 
      mutuelle_price: 37.12, 
      patient_copay: 0,
      codes: {
        home_weekday: '423336',
        home_weekend: '423351',
        office: '423373',
        disability_home_weekday: '423395',
        disability_home_weekend: '423410',
        day_center: '423432'
      }
    },
    { 
      id: 'prise_sang', 
      label: 'Prise de sang', 
      mutuelle_price: 10.00, 
      patient_copay: 0,
      codes: {
        home_weekday: '422512',
        home_weekend: '422534',
        office: '422556',
        disability_home_weekday: '422571',
        disability_home_weekend: '422593',
        day_center: '422615'
      }
    },
    { 
      id: 'soins_forfait_a', 
      label: 'Soins journaliers Forfait A', 
      mutuelle_price: 15.90, 
      patient_copay: 0,
      codes: {
        home_weekday: '425011',
        home_weekend: '425033',
        office: '425055',
        disability_home_weekday: '425070',
        disability_home_weekend: '425092',
        day_center: '425114'
      }
    },
    { 
      id: 'soins_forfait_b', 
      label: 'Soins journaliers Forfait B', 
      mutuelle_price: 36.75, 
      patient_copay: 0,
      codes: {
        home_weekday: '425136',
        home_weekend: '425151',
        office: '425173',
        disability_home_weekday: '425195',
        disability_home_weekend: '425210',
        day_center: '425232'
      }
    },
    { 
      id: 'soins_forfait_c', 
      label: 'Soins journaliers Forfait C', 
      mutuelle_price: 50.28, 
      patient_copay: 0,
      codes: {
        home_weekday: '425254',
        home_weekend: '425276',
        office: '425291',
        disability_home_weekday: '425313',
        disability_home_weekend: '425335',
        day_center: '425350'
      }
    },
    { 
      id: 'soins_palliatifs_legers', 
      label: 'Soins palliatifs légers', 
      mutuelle_price: 36.39, 
      patient_copay: 0,
      codes: {
        home_weekday: '426372',
        home_weekend: '426394',
        office: '426416',
        disability_home_weekday: '426431',
        disability_home_weekend: '426453',
        day_center: '426475'
      }
    },
    { 
      id: 'soins_palliatifs_lourds', 
      label: 'Soins palliatifs lourds', 
      mutuelle_price: 79.89, 
      patient_copay: 0,
      codes: {
        home_weekday: '426490',
        home_weekend: '426512',
        office: '426534',
        disability_home_weekday: '426556',
        disability_home_weekend: '426571',
        day_center: '426593'
      }
    }
  ];

  const locationOptions = [
    { id: 'home', label: 'Domicile/Résidence' },
    { id: 'office', label: 'Cabinet/Convalescence' },
    { id: 'disability_home', label: 'Maison handicapés' },
    { id: 'day_center', label: 'Centre de jour' }
  ];

  const durationOptions = [
    { id: '30-59', label: '30-59 minutes', extra_fee: 0 },
    { id: '60-89', label: '60-89 minutes', extra_fee: 12.16 }, // Mutuelle pays 12.16, patient pays 3.04
    { id: '90+', label: '90+ minutes', extra_fee: 24.32 } // Mutuelle pays 24.32, patient pays 6.08
  ];

  // Initialize form data from props
  useEffect(() => {
    if (initialData) {
      console.log('[InamiModal] Initializing with data:', initialData);
      setFormData({
        care_type: initialData.care_type || '',
        care_location: initialData.care_location || 'home',
        care_duration: initialData.care_duration || '30-59',
        is_weekend: initialData.is_weekend || false,
        is_holiday: initialData.is_holiday || false
      });
    }
  }, [initialData]);

  // Debug modal opening
  useEffect(() => {
    if (isOpen) {
      console.log('[InamiModal] Modal opened, isOpen:', isOpen);
      console.log('[InamiModal] Current formData:', formData);
      
      // Focus the modal for better accessibility
      if (modalRef.current) {
        modalRef.current.focus();
      }
    }
  }, [isOpen]);

  // Calculate pricing whenever form data, patient data, or prescription data changes
  useEffect(() => {
    calculatePricing();
  }, [formData, patientData, prescriptionData]);

  const calculatePricing = () => {
    if (!formData.care_type) {
      setPricing({ mutuelle_price: 0, patient_copay: 0, total_price: 0, inami_code: '' });
      return;
    }

    const baseType = careTypeOptions.find(type => type.id === formData.care_type);
    if (!baseType) return;

    let mutuelle_price = baseType.mutuelle_price;
    let patient_copay = baseType.patient_copay;

    // BIM Logic Implementation:
    // 1. If patient has social_price (BIM) → patient pays 0
    // 2. If patient has prescription → patient pays 0 (free with prescription)
    // 3. If no social_price and no prescription → normal pricing (patient copay applies)
    
    const hasSocialPrice = patientData?.social_price === true;
    const hasPrescription = prescriptionData !== null && prescriptionData !== undefined;
    
    console.log('[InamiModal] Pricing calculation:', {
      hasSocialPrice,
      hasPrescription,
      patientData,
      prescriptionData,
      basePatientCopay: patient_copay
    });

    if (hasSocialPrice) {
      // BIM patients pay nothing
      patient_copay = 0;
      console.log('[InamiModal] BIM patient - copay set to 0');
    } else if (hasPrescription) {
      // Patients with prescription pay nothing
      patient_copay = 0;
      console.log('[InamiModal] Patient with prescription - copay set to 0');
    }
    // If no social_price and no prescription, use original patient_copay

    // Duration fees for complex care types
    const complexCareTypes = ['pansement_complexe', 'surveillance_plaie', 'soins_forfait_b', 'soins_forfait_c', 'soins_palliatifs_legers', 'soins_palliatifs_lourds'];
    if (complexCareTypes.includes(formData.care_type) && formData.care_duration !== '30-59') {
      const duration = durationOptions.find(d => d.id === formData.care_duration);
      if (duration && duration.extra_fee > 0) {
        mutuelle_price += duration.extra_fee;
        // Duration fees also follow BIM rules
        if (!hasSocialPrice && !hasPrescription) {
          patient_copay += duration.extra_fee * 0.25; // 25% copay on extra fees
        }
      }
    }

    // Weekend/holiday surcharge (25% increase)
    if (formData.is_weekend || formData.is_holiday) {
      mutuelle_price *= 1.25;
      // Surcharge also follows BIM rules
      if (!hasSocialPrice && !hasPrescription) {
        patient_copay *= 1.25;
      }
    }

    // Round to 2 decimal places
    mutuelle_price = Math.round(mutuelle_price * 100) / 100;
    patient_copay = Math.round(patient_copay * 100) / 100;
    const total_price = Math.round((mutuelle_price + patient_copay) * 100) / 100;

    // Generate INAMI code
    const inami_code = generateInamiCode(baseType, formData);

    setPricing({
      mutuelle_price,
      patient_copay,
      total_price,
      inami_code
    });

    console.log('[InamiModal] Final pricing:', {
      mutuelle_price,
      patient_copay,
      total_price,
      inami_code
    });
  };

  const generateInamiCode = (baseType, formData) => {
    const isWeekend = formData.is_weekend || formData.is_holiday;
    const location = formData.care_location;
    
    let codeKey = '';
    
    if (location === 'home') {
      codeKey = isWeekend ? 'home_weekend' : 'home_weekday';
    } else if (location === 'office') {
      codeKey = 'office';
    } else if (location === 'disability_home') {
      codeKey = isWeekend ? 'disability_home_weekend' : 'disability_home_weekday';
    } else if (location === 'day_center') {
      codeKey = 'day_center';
    }

    return baseType.codes[codeKey] || '';
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = () => {
    const saveData = {
      ...formData,
      ...pricing,
      care_type_label: careTypeOptions.find(t => t.id === formData.care_type)?.label || '',
      care_location_label: locationOptions.find(l => l.id === formData.care_location)?.label || '',
      care_duration_label: durationOptions.find(d => d.id === formData.care_duration)?.label || ''
    };
    
    onSave(saveData);
  };

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    // Only close if clicking on the overlay itself, not its children
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleModalClick = (e) => {
    // Prevent event bubbling to overlay
    e.stopPropagation();
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div 
        className="inami-modal" 
        onClick={handleModalClick}
        ref={modalRef}
        tabIndex={-1}
      >
        <div className="inami-modal-header">
          <h2>Configuration INAMI - Soins Infirmiers</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="inami-modal-content">
          <div className="inami-form-section">
            <h3>Type de soins</h3>
            <div className="form-group">
              <label>Type de plaie *</label>
              <select
                name="care_type"
                value={formData.care_type}
                onChange={handleInputChange}
                required
              >
                <option value="">-- Sélectionner le type de soin --</option>
                {careTypeOptions.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Lieu de soins</label>
              <select
                name="care_location"
                value={formData.care_location}
                onChange={handleInputChange}
              >
                {locationOptions.map(location => (
                  <option key={location.id} value={location.id}>
                    {location.label}
                  </option>
                ))}
              </select>
            </div>

            {(formData.care_type === 'pansement_complexe' || 
              formData.care_type === 'surveillance_plaie' || 
              formData.care_type === 'soins_forfait_b' || 
              formData.care_type === 'soins_forfait_c' ||
              formData.care_type === 'soins_palliatifs_legers' ||
              formData.care_type === 'soins_palliatifs_lourds') && (
              <div className="form-group">
                <label>Durée des soins</label>
                <select
                  name="care_duration"
                  value={formData.care_duration}
                  onChange={handleInputChange}
                >
                  {durationOptions.map(duration => (
                    <option key={duration.id} value={duration.id}>
                      {duration.label}
                      {duration.extra_fee > 0 && ` (+€${duration.extra_fee.toFixed(2)})`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="is_weekend"
                  checked={formData.is_weekend}
                  onChange={handleInputChange}
                />
                Weekend/Jour férié (+25%)
              </label>
            </div>
          </div>

          {formData.care_type && (
            <div className="inami-pricing-section">
              <h3>Tarification INAMI</h3>
              
              <div className="pricing-breakdown">
                <div className="pricing-row">
                  <span className="pricing-label">💳 Mutuelle paie:</span>
                  <span className="pricing-value mutuelle">€{pricing.mutuelle_price.toFixed(2)}</span>
                </div>
                <div className="pricing-row">
                  <span className="pricing-label">👤 Patient paie:</span>
                  <span className={`pricing-value patient ${pricing.patient_copay === 0 ? 'free' : ''}`}>
                    €{pricing.patient_copay.toFixed(2)}
                  </span>
                </div>
                <div className="pricing-row total">
                  <span className="pricing-label">💰 Total:</span>
                  <span className="pricing-value total-price">€{pricing.total_price.toFixed(2)}</span>
                </div>
              </div>

              {/* BIM/Prescription Status */}
              {(patientData?.social_price || prescriptionData) && (
                <div className="payment-status">
                  {patientData?.social_price && (
                    <div className="status-badge bim">
                      🏥 BIM - Patient avec statut social préférentiel
                    </div>
                  )}
                  {prescriptionData && (
                    <div className="status-badge prescription">
                      📋 Prescription médicale - Soins remboursés intégralement
                    </div>
                  )}
                  <div className="status-explanation">
                    Les soins sont entièrement pris en charge par la mutuelle.
                  </div>
                </div>
              )}

              <div className="inami-code-display">
                <h4>Code INAMI: <span className="code">{pricing.inami_code}</span></h4>
              </div>

              {(formData.is_weekend || formData.is_holiday) && (
                <div className="surcharge-notice">
                  ⚠️ Majoration weekend/jour férié appliquée (+25%)
                </div>
              )}
            </div>
          )}
        </div>

        <div className="inami-modal-footer">
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={onClose}
          >
            Annuler
          </button>
          <button 
            type="button" 
            className="btn-primary" 
            onClick={handleSave}
            disabled={!formData.care_type}
          >
            Enregistrer Configuration
          </button>
        </div>
      </div>
    </div>
  );
};

export default InamiMedicalCareModal;

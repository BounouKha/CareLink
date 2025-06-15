import React from 'react';
import { useCareTranslation } from '../hooks/useCareTranslation';
import LanguageSwitcher from './LanguageSwitcher';

/**
 * Translation Demo Component
 * Shows examples of how to use translations throughout CareLink
 */
const TranslationDemo = () => {
  const { 
    common, 
    auth, 
    profile, 
    patients, 
    servicedemands, 
    admin, 
    navigation,
    errors,
    success,
    placeholders,
    confirmations,
    formatDate,
    formatCurrency,
    getCurrentLanguage 
  } = useCareTranslation();

  const currentDate = new Date();
  const samplePrice = 150.50;

  return (
    <div className="container py-4">
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h4 className="mb-0">🌍 {common('title', { defaultValue: 'Translation Demo' })}</h4>
              <LanguageSwitcher />
            </div>
            <div className="card-body">
              <div className="row">
                
                {/* Common Terms */}
                <div className="col-md-6 mb-4">
                  <h5 className="text-primary">💬 {common('common', { defaultValue: 'Common Terms' })}</h5>
                  <ul className="list-group list-group-flush">
                    <li className="list-group-item d-flex justify-content-between">
                      <span>{common('welcome')}</span>
                      <span className="text-muted">common.welcome</span>
                    </li>
                    <li className="list-group-item d-flex justify-content-between">
                      <span>{common('save')}</span>
                      <span className="text-muted">common.save</span>
                    </li>
                    <li className="list-group-item d-flex justify-content-between">
                      <span>{common('loading')}</span>
                      <span className="text-muted">common.loading</span>
                    </li>
                    <li className="list-group-item d-flex justify-content-between">
                      <span>{common('search')}</span>
                      <span className="text-muted">common.search</span>
                    </li>
                  </ul>
                </div>

                {/* Navigation */}
                <div className="col-md-6 mb-4">
                  <h5 className="text-success">🧭 {navigation('title', { defaultValue: 'Navigation' })}</h5>
                  <ul className="list-group list-group-flush">
                    <li className="list-group-item d-flex justify-content-between">
                      <span>{navigation('dashboard')}</span>
                      <span className="text-muted">navigation.dashboard</span>
                    </li>
                    <li className="list-group-item d-flex justify-content-between">
                      <span>{navigation('patients')}</span>
                      <span className="text-muted">navigation.patients</span>
                    </li>
                    <li className="list-group-item d-flex justify-content-between">
                      <span>{navigation('schedule')}</span>
                      <span className="text-muted">navigation.schedule</span>
                    </li>
                    <li className="list-group-item d-flex justify-content-between">
                      <span>{navigation('serviceDemands')}</span>
                      <span className="text-muted">navigation.serviceDemands</span>
                    </li>
                  </ul>
                </div>

                {/* Authentication */}
                <div className="col-md-6 mb-4">
                  <h5 className="text-warning">🔐 {auth('title', { defaultValue: 'Authentication' })}</h5>
                  <ul className="list-group list-group-flush">
                    <li className="list-group-item d-flex justify-content-between">
                      <span>{auth('signIn')}</span>
                      <span className="text-muted">auth.signIn</span>
                    </li>
                    <li className="list-group-item d-flex justify-content-between">
                      <span>{auth('email')}</span>
                      <span className="text-muted">auth.email</span>
                    </li>
                    <li className="list-group-item d-flex justify-content-between">
                      <span>{auth('password')}</span>
                      <span className="text-muted">auth.password</span>
                    </li>
                    <li className="list-group-item d-flex justify-content-between">
                      <span>{auth('loginSuccess')}</span>
                      <span className="text-muted">auth.loginSuccess</span>
                    </li>
                  </ul>
                </div>

                {/* Profile */}
                <div className="col-md-6 mb-4">
                  <h5 className="text-info">👤 {profile('title')}</h5>
                  <ul className="list-group list-group-flush">
                    <li className="list-group-item d-flex justify-content-between">
                      <span>{profile('firstName')}</span>
                      <span className="text-muted">profile.firstName</span>
                    </li>
                    <li className="list-group-item d-flex justify-content-between">
                      <span>{profile('lastName')}</span>
                      <span className="text-muted">profile.lastName</span>
                    </li>
                    <li className="list-group-item d-flex justify-content-between">
                      <span>{profile('age')}</span>
                      <span className="text-muted">profile.age</span>
                    </li>
                    <li className="list-group-item d-flex justify-content-between">
                      <span>{profile('contactInfo')}</span>
                      <span className="text-muted">profile.contactInfo</span>
                    </li>
                  </ul>
                </div>

                {/* Service Demands */}
                <div className="col-md-6 mb-4">
                  <h5 className="text-danger">🏥 {servicedemands('title')}</h5>
                  <ul className="list-group list-group-flush">
                    <li className="list-group-item d-flex justify-content-between">
                      <span>{servicedemands('newDemand')}</span>
                      <span className="text-muted">servicedemands.newDemand</span>
                    </li>
                    <li className="list-group-item d-flex justify-content-between">
                      <span>{servicedemands('priority')}</span>
                      <span className="text-muted">servicedemands.priority</span>
                    </li>
                    <li className="list-group-item d-flex justify-content-between">
                      <span>{servicedemands('statusOptions.urgent')}</span>
                      <span className="text-muted">servicedemands.statusOptions.urgent</span>
                    </li>
                  </ul>
                </div>

                {/* Formatting Examples */}
                <div className="col-md-6 mb-4">
                  <h5 className="text-secondary">📊 {common('formatting', { defaultValue: 'Formatting' })}</h5>
                  <ul className="list-group list-group-flush">
                    <li className="list-group-item d-flex justify-content-between">
                      <span>{common('currentLanguage', { defaultValue: 'Current Language' })}: {getCurrentLanguage()}</span>
                    </li>
                    <li className="list-group-item d-flex justify-content-between">
                      <span>{common('date', { defaultValue: 'Date' })}: {formatDate(currentDate)}</span>
                    </li>
                    <li className="list-group-item d-flex justify-content-between">
                      <span>{common('currency', { defaultValue: 'Currency' })}: {formatCurrency(samplePrice)}</span>
                    </li>
                    <li className="list-group-item d-flex justify-content-between">
                      <span>{common('age', { defaultValue: 'Age' })}: {profile('years', { count: 25 })}</span>
                    </li>
                  </ul>
                </div>

                {/* Placeholders */}
                <div className="col-12 mb-4">
                  <h5 className="text-dark">📝 {common('placeholders', { defaultValue: 'Placeholders & Forms' })}</h5>
                  <div className="row">
                    <div className="col-md-4">
                      <input 
                        type="text" 
                        className="form-control mb-2" 
                        placeholder={placeholders('enterEmail')} 
                      />
                    </div>
                    <div className="col-md-4">
                      <input 
                        type="text" 
                        className="form-control mb-2" 
                        placeholder={placeholders('searchPatients')} 
                      />
                    </div>
                    <div className="col-md-4">
                      <textarea 
                        className="form-control mb-2" 
                        placeholder={placeholders('enterNotes')}
                        rows="2"
                      />
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                <div className="col-12">
                  <h5 className="text-primary">🔘 {common('buttons', { defaultValue: 'Action Buttons' })}</h5>
                  <div className="d-flex gap-2 flex-wrap">
                    <button className="btn btn-primary">{common('save')}</button>
                    <button className="btn btn-secondary">{common('cancel')}</button>
                    <button className="btn btn-success">{common('create')}</button>
                    <button className="btn btn-warning">{common('edit')}</button>
                    <button className="btn btn-danger">{common('delete')}</button>
                    <button className="btn btn-info">{common('view')}</button>
                  </div>
                </div>

              </div>
            </div>
            <div className="card-footer text-muted">
              <small>
                💡 {common('tip', { defaultValue: 'Tip' })}: 
                {getCurrentLanguage() === 'en' 
                  ? ' Switch to Dutch using the language selector above to see translations in action!'
                  : ' Schakel naar Engels met de taalkiezer hierboven om vertalingen in actie te zien!'
                }
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TranslationDemo;

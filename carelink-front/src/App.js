import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './auth/layout/HomePage';
import RegisterPage from './auth/register/RegisterPage';
import ProfilePage from './auth/profile/ProfilePage';
import LoginPage from './auth/login/LoginPage';
import AdminPanel from './admin/AdminPanel';
import PatientsPageNew from './pages/patient/PatientsPageNew';
import ServiceDemandPage from './pages/servicedemand/ServiceDemandPage';
import SchedulePage from './pages/schedule/SchedulePage';
import ScheduleCalendar from './pages/schedule/ScheduleCalendar';
import PatientSchedule from './pages/schedule/PatientSchedule';
import ScheduleRouter from './pages/schedule/ScheduleRouter';
import TestUserAuth from './auth/test/TestUserAuth';
import TokenTestPage from './pages/test/TokenTestPage';
import TranslationDemo from './components/TranslationDemo';
import './auth/layout/UnifiedBaseLayout.css';
import ProtectedRoute from './auth/login/ProtectedRoute';
import { AdminProvider } from './auth/login/AdminContext';
import { SpinnerOnly } from './components/LoadingComponents';
import './i18n'; // Initialize i18n

function App() {
    return (
        <Suspense fallback={
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 9999
            }}>
                <SpinnerOnly size="large" />
            </div>
        }>
            <AdminProvider>
                <Router>
                    <div className="App">
                        <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/register" element={<RegisterPage />} />
                        <Route path="/profile" element={<ProfilePage />} />
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
                        <Route path="/patients" element={<PatientsPageNew />} />
                        <Route path="/service-demands" element={<ServiceDemandPage />} />
                        {/* New unified schedule route that stays in BaseLayout */}
                        <Route path="/schedule" element={<SchedulePage />} />
                        
                        {/* Keep the old routes for backward compatibility */}
                        <Route path="/schedule/router" element={<ScheduleRouter />} />
                        <Route path="/schedule/coordinator" element={<ScheduleCalendar />} />
                        <Route path="/schedule/patient" element={<PatientSchedule />} />                        <Route path="/schedule/family" element={<PatientSchedule />} />
                        <Route path="/test-auth" element={<TestUserAuth />} />
                        <Route path="/test-tokens" element={<TokenTestPage />} />
                        <Route path="/translation-demo" element={<TranslationDemo />} />
                    </Routes>
                </div>
            </Router>
        </AdminProvider>
    </Suspense>
    );
}

export default App;


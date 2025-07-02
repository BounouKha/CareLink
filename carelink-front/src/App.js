import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom';
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
import ProviderManagement from './pages/providers/ProviderManagement';
import ProviderSchedule from './pages/provider/ProviderSchedule';
import TicketDashboard from './components/EnhancedTicketSystem/TicketDashboard';
import SubmitTicketPage from './components/EnhancedTicketSystem/SubmitTicketPage';
import ManageTicketsPage from './components/EnhancedTicketSystem/ManageTicketsPage';
import CoordinatorTicketPanel from './components/EnhancedTicketSystem/CoordinatorTicketPanel';
import CoordinatorHelpdeskPanel from './components/EnhancedTicketSystem/CoordinatorHelpdeskPanel';
import UserHelpdeskPanel from './components/EnhancedTicketSystem/UserHelpdeskPanel';
import TestUserAuth from './auth/test/TestUserAuth';
import TokenTestPage from './pages/test/TokenTestPage';
import TranslationDemo from './components/TranslationDemo';
import ToastManager from './components/ToastManager';
import './auth/layout/UnifiedBaseLayout.css';
import ProtectedRoute from './auth/login/ProtectedRoute';
import { AdminProvider } from './auth/login/AdminContext';
import { SpinnerOnly } from './components/LoadingComponents';
import CookieSettingsButton from './components/CookieSettingsButton';
import './i18n'; // Initialize i18n
import PatientInvoices from './pages/invoices/PatientInvoices';

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
                <ToastManager />
                <Router>
                    <div className="App">
                        <Routes>
                            <Route path="/" element={<HomePage />} />
                            <Route path="/register" element={<RegisterPage />} />
                            <Route path="/profile" element={<ProfilePage />} />
                            <Route path="/login" element={<LoginPage />} />
                            <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
                            <Route path="/patients" element={<PatientsPageNew />} />
                            <Route path="/providers" element={<ProviderManagement />} />
                            <Route path="/service-demands" element={<ServiceDemandPage />} />
                            <Route path="/schedule" element={<SchedulePage />} />
                            
                            {/* Ticket System Routes */}
                            <Route path="/tickets" element={<TicketDashboard />} />
                            <Route path="/submit-ticket" element={<ProtectedRoute><SubmitTicketPage /></ProtectedRoute>} />
                            <Route path="/manage-tickets" element={<ProtectedRoute><ManageTicketsPage /></ProtectedRoute>} />
                            
                            {/* Coordinator Specific Routes */}
                            <Route path="/coordinator/tickets" element={<CoordinatorTicketPanel />} />
                            <Route path="/coordinator/helpdesk" element={<CoordinatorHelpdeskPanel />} />
                            
                            {/* User Helpdesk Route */}
                            <Route path="/user/helpdesk" element={<UserHelpdeskPanel />} />
                            
                            {/* Provider Schedule Route */}
                            <Route path="/provider/schedule" element={<ProviderSchedule />} />
                            
                            {/* Keep the old routes for backward compatibility */}
                            <Route path="/schedule/router" element={<ScheduleRouter />} />
                            <Route path="/schedule/coordinator" element={<ScheduleCalendar />} />
                            <Route path="/schedule/patient" element={<PatientSchedule />} />
                            <Route path="/schedule/family" element={<PatientSchedule />} />
                            <Route path="/test-auth" element={<TestUserAuth />} />
                            <Route path="/test-tokens" element={<TokenTestPage />} />
                            <Route path="/translation-demo" element={<TranslationDemo />} />
                            <Route path="/invoices/:patientId?" element={<PatientInvoicesWrapper />} />
                        </Routes>
                        <CookieSettingsButton />
                    </div>
                </Router>
            </AdminProvider>
        </Suspense>
    );
}

// Wrapper component to handle patientId from URL
function PatientInvoicesWrapper() {
    const { patientId } = useParams();
    return <PatientInvoices patientId={patientId} />;
}

export default App;


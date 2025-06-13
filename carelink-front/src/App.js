import React from 'react';
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
import './auth/layout/UnifiedBaseLayout.css';
import ProtectedRoute from './auth/login/ProtectedRoute';
import { AdminProvider } from './auth/login/AdminContext';

function App() {
    return (
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
                    </Routes>
                </div>
            </Router>
        </AdminProvider>
    );
}

export default App;


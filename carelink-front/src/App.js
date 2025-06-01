import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './auth/layout/HomePage';
import RegisterPage from './auth/register/RegisterPage';
import ProfilePage from './auth/profile/ProfilePage';
import LoginPage from './auth/login/LoginPage';
import AdminPanel from './admin/AdminPanel';
import PatientsPage from './pages/patient/PatientsPage';
import './auth/layout/HomePage.css';
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
                        <Route path="/patients" element={<PatientsPage />} />
                    </Routes>
                </div>
            </Router>
        </AdminProvider>
    );
}

export default App;
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './auth/HomePage';
import RegisterPage from './auth/RegisterPage';
import ProfilePage from './auth/ProfilePage';
import LoginPage from './auth/LoginPage';
import AdminPanel from './admin/AdminPanel';
import './auth/HomePage.css';
import ProtectedRoute from './auth/ProtectedRoute';
import { AdminProvider } from './auth/AdminContext';

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
                    </Routes>
                </div>
            </Router>
        </AdminProvider>
    );
}

export default App;
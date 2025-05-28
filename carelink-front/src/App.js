import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './auth/HomePage';
import RegisterPage from './auth/RegisterPage';
import ProfilePage from './auth/ProfilePage';
import LoginPage from './auth/LoginPage';
import AdminPanel from './admin/AdminPanel';
import ManageUsers from './admin/ManageUsers';
import './auth/HomePage.css';

function App() {
    return (
        <Router>
            <div className="App">
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/admin" element={<AdminPanel />} />
                    <Route path="/admin/users" element={<ManageUsers />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
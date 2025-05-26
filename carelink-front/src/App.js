import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './auth/HomePage';
import RegisterPage from './auth/RegisterPage';
import './auth/HomePage.css';

function App() {
    return (
        <Router>
            <div className="App">
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/register" element={<RegisterPage />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
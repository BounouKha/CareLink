import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BaseLayout from '../layout/BaseLayout';
import './RegisterPage.css';

const RegisterPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [firstname, setFirstname] = useState('');
    const [lastname, setLastname] = useState('');
    const [birthdate, setBirthdate] = useState('');
    const [address, setAddress] = useState('');
    const [isGDPRChecked, setIsGDPRChecked] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        if (!isGDPRChecked) {
            alert('You must accept the GDPR terms to register.');
            return;
        }
        try {
            const response = await fetch('http://localhost:8000/account/register/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                throw new Error('Registration failed.');
            }

            alert('Registration successful! Please log in.');
            navigate('/login');
        } catch (err) {
            setError(err.message);
        }
    };

    const handleBirthdateChange = (e) => {
        const selectedDate = new Date(e.target.value);
        const today = new Date();
        const minDate = new Date();
        minDate.setFullYear(today.getFullYear() - 18); // 18 years ago

        if (selectedDate > today) {
            alert('Birthdate cannot be in the future.');
            return;
        }

        if (selectedDate > minDate) {
            alert('You must be at least 18 years old.');
            return;
        }

        setBirthdate(e.target.value);
    };    return (
        <BaseLayout>
            <div className="register-page">
                <div className="register-container">
                    <h2>Create an Account</h2>
                    <form onSubmit={handleRegister}>
                    <div className="form-group">
                        <label>First Name</label>
                        <input
                            type="text"
                            placeholder="Enter your first name"
                            value={firstname}
                            onChange={(e) => setFirstname(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Last Name</label>
                        <input
                            type="text"
                            placeholder="Enter your last name"
                            value={lastname}
                            onChange={(e) => setLastname(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Birthdate</label>
                        <input
                            type="date"
                            value={birthdate}
                            onChange={handleBirthdateChange}
                        />
                    </div>
                    <div className="form-group">
                        <label>Address</label>
                        <input
                            type="text"
                            placeholder="Enter your address"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Confirm Password</label>
                        <input
                            type="password"
                            placeholder="Confirm your password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <input
                            type="checkbox"
                            id="gdprConsent"
                            checked={isGDPRChecked}
                            onChange={(e) => setIsGDPRChecked(e.target.checked)}
                        />
                        <label htmlFor="gdprConsent">
                            I accept the GDPR terms and conditions.
                        </label>
                    </div>                    {error && <p className="error-message">{error}</p>}
                    <button type="submit" className="btn">Register</button>
                </form>
            </div>
            </div>
        </BaseLayout>
    );
};

export default RegisterPage;

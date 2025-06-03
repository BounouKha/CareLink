import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const ScheduleRouter = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          setError('Please log in to access the schedule');
          setLoading(false);
          return;
        }

        console.log('ScheduleRouter: Fetching user profile to determine role...');
        
        const response = await fetch('http://localhost:8000/account/profile/', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });        if (response.ok) {
          const profileData = await response.json();
          const role = profileData?.user?.role;
          
          console.log('ScheduleRouter: User role from profile API:', role);
          
          // Navigate to the appropriate route based on role
          if (role === 'Coordinator' || role === 'Administrative') {
            console.log('ScheduleRouter: Redirecting to coordinator schedule');
            navigate('/schedule/coordinator');
          } else if (role === 'Patient') {
            console.log('ScheduleRouter: Redirecting to patient schedule');
            navigate('/schedule/patient');
          } else if (role === 'Family Patient') {
            console.log('ScheduleRouter: Redirecting to family schedule');
            navigate('/schedule/family');
          } else {
            console.error('ScheduleRouter: Unknown role:', role);
            setError(`Unknown user role: ${role}`);
          }
        } else {
          console.error('ScheduleRouter: Failed to fetch profile:', response.status);
          setError('Failed to verify user permissions');
        }
      } catch (err) {
        console.error('ScheduleRouter: Error fetching user role:', err);
        setError('Network error occurred');
      } finally {
        setLoading(false);
      }
    };    fetchUserRole();
  }, [navigate]);  if (loading) {
    return <div>Loading user profile...</div>;
  }

  if (error) {
    return (
      <div className="error-message">
        <h2>Schedule Access Error</h2>
        <p>{error}</p>
        <button 
          onClick={() => window.location.href = '/login'} 
          style={{ padding: '8px 15px', background: '#4285f4', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Go to Login
        </button>
      </div>
    );
  }

  // If we reach here, it means we're still loading or there was an issue
  return <div>Redirecting to schedule...</div>;
};

export default ScheduleRouter;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const TestUserAuth = () => {
  const [userData, setUserData] = useState(null);
  const [localStorageContent, setLocalStorageContent] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    // Get all localStorage items related to user authentication
    const authItems = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      try {
        // Try to parse JSON values
        const value = localStorage.getItem(key);
        try {
          authItems[key] = JSON.parse(value);
        } catch {
          // If not valid JSON, store as string
          authItems[key] = value;
        }
      } catch (e) {
        authItems[key] = "Error reading value";
      }
    }
    setLocalStorageContent(authItems);

    // Get userData specifically
    const storedUserData = localStorage.getItem('userData');
    if (storedUserData) {
      try {
        setUserData(JSON.parse(storedUserData));
      } catch (error) {
        console.error('Error parsing userData:', error);
      }
    }
  }, []);

  const handleFixUserRole = () => {
    if (userData) {
      // Ensure user object exists
      const updatedUserData = { ...userData };
      if (!updatedUserData.user) {
        updatedUserData.user = {};
      }
      
      // Set role to Patient
      updatedUserData.user.role = 'Patient';
      
      // Save to localStorage
      localStorage.setItem('userData', JSON.stringify(updatedUserData));
      
      // Refresh page
      window.location.reload();
    } else {
      // Create basic user data if none exists
      const newUserData = {
        user: {
          role: 'Patient'
        }
      };
      localStorage.setItem('userData', JSON.stringify(newUserData));
      window.location.reload();
    }
  };

  const goToSchedule = () => {
    navigate('/schedule');
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>User Authentication Debug</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Current User Data</h2>
        {userData ? (
          <div>
            <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '5px' }}>
              {JSON.stringify(userData, null, 2)}
            </pre>
            <p><strong>User Role:</strong> {userData.user?.role || 'No role defined'}</p>
          </div>
        ) : (
          <p>No user data found in localStorage</p>
        )}
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>All LocalStorage Items</h2>
        <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '5px', maxHeight: '300px', overflow: 'auto' }}>
          {JSON.stringify(localStorageContent, null, 2)}
        </pre>
      </div>
      
      <div style={{ marginTop: '30px', display: 'flex', gap: '10px' }}>
        <button
          onClick={handleFixUserRole}
          style={{
            padding: '10px 15px',
            background: '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Fix User Role (Set to Patient)
        </button>
        
        <button
          onClick={goToSchedule}
          style={{
            padding: '10px 15px',
            background: '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Go to Schedule Page
        </button>
      </div>
    </div>
  );
};

export default TestUserAuth;

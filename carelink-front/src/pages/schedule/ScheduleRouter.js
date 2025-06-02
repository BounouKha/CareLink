import React, { useState, useEffect } from 'react';
import ScheduleCalendar from './ScheduleCalendar';
import PatientSchedule from './PatientSchedule';

const ScheduleRouter = () => {
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState({});
  useEffect(() => {
    // Get user role from localStorage - try multiple possible storage keys
    let userRole = null;
    const userDataString = localStorage.getItem('userData');
    const roleString = localStorage.getItem('userRole');
    const userString = localStorage.getItem('user');
    const tokenString = localStorage.getItem('accessToken');
    
    console.log('userData from localStorage:', userDataString ? 'Found' : 'Not found');
    console.log('userRole from localStorage:', roleString ? 'Found' : 'Not found');
    console.log('user from localStorage:', userString ? 'Found' : 'Not found');
    console.log('accessToken from localStorage:', tokenString ? 'Found' : 'Not found');
    
    const debugData = {
      hasUserData: false,
      hasUserProperty: false,
      hasRoleProperty: false,
      roleValue: null,
      alternativeChecks: {}
    };

    // Try to get role from userData
    if (userDataString) {
      try {
        const userData = JSON.parse(userDataString);
        console.log('Parsed userData:', userData);
        
        debugData.hasUserData = !!userData;
        debugData.hasUserProperty = userData && !!userData.user;
        debugData.hasRoleProperty = userData && userData.user && !!userData.user.role;
        debugData.roleValue = userData && userData.user && userData.user.role;
        
        if (userData && userData.user && userData.user.role) {
          console.log('User role found in userData:', userData.user.role);
          userRole = userData.user.role;
        } else if (userData && userData.role) {
          // Alternative structure
          console.log('User role found directly in userData:', userData.role);
          userRole = userData.role;
          debugData.alternativeChecks.roleInUserData = userData.role;
        }
      } catch (err) {
        console.error('Error parsing userData', err);
      }
    }

    // Try direct userRole if still not found
    if (!userRole && roleString) {
      try {
        const roleData = JSON.parse(roleString);
        console.log('Parsed roleData:', roleData);
        if (typeof roleData === 'string') {
          userRole = roleData;
          debugData.alternativeChecks.directRole = roleData;
        }
      } catch {
        // If it's not JSON, maybe it's a direct string
        userRole = roleString;
        debugData.alternativeChecks.directRoleString = roleString;
      }
    }

    // Try user object if still not found
    if (!userRole && userString) {
      try {
        const user = JSON.parse(userString);
        console.log('Parsed user:', user);
        if (user && user.role) {
          userRole = user.role;
          debugData.alternativeChecks.roleFromUser = user.role;
        }
      } catch (err) {
        console.error('Error parsing user', err);
      }
    }

    // Set debug info
    setDebugInfo(debugData);
    
    // Default to Patient if we have a token but no role information
    // This is temporary for testing - in production you'd want better verification
    if (!userRole && tokenString) {
      console.log('No role found but token exists - defaulting to Patient role for testing');
      userRole = 'Patient';
      debugData.alternativeChecks.defaultedToPatient = true;
    }
    
    setUserRole(userRole);
    setLoading(false);
  }, []);
  if (loading) {
    return <div>Loading...</div>;
  }

  // Show debug info for troubleshooting
  console.log('Current userRole state:', userRole);
  // Render the appropriate component based on user role
  if (userRole === 'Coordinator' || userRole === 'Administrative') {
    console.log('Rendering ScheduleCalendar for admin/coordinator user');
    return <ScheduleCalendar />;
  } else if (userRole === 'Patient' || userRole === 'Family Patient') {
    console.log('Rendering PatientSchedule for patient/family user');
    return <PatientSchedule />;
  } else {
    // Force coordinator view if we can't determine user role (temporary fix)
    if (localStorage.getItem('accessToken')) {
      console.log('Could not determine user role, defaulting to ScheduleCalendar');
      return <ScheduleCalendar />;
    }
    // Log the issue and show detailed debug info
    console.error('No valid role found for schedule access', debugInfo);
    return (
      <div className="unauthorized-message">
        <h2>Access Denied</h2>
        <p>You don't have permission to view schedules. Please contact support if you believe this is an error.</p>
        <div style={{ margin: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '5px' }}>
          <h3>Debug Information</h3>
          <p>This information might help support troubleshoot your access:</p>
          <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
          <p>Try logging out and logging back in to refresh your access.</p>
          <button 
            onClick={() => window.location.reload()} 
            style={{ padding: '8px 15px', background: '#4285f4', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }
};

export default ScheduleRouter;

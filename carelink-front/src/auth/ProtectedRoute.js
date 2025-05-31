import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AdminContext } from './AdminContext';

const ProtectedRoute = ({ children }) => {
    const { isSuperUser } = useContext(AdminContext);

    if (isSuperUser === null) {
        return <p>Loading...</p>; // Show a loading state while checking admin status
    }

    if (!isSuperUser) {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default ProtectedRoute;

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthContext } from '../hooks/AuthContext'; // 1. Import the context hook

const ProtectedRoute: React.FC = () => {
  // 2. Get the shared authentication state from the context
  const { admin, loading } = useAuthContext();

  // 3. While the authentication check is in progress, render nothing.
  //    This is the key to preventing the redirect loop.
  if (loading) {
    return null; // You could also return a loading spinner here
  }

  // 4. Once loading is false, we can safely check the admin status.
  return admin ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
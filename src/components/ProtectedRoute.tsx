import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
// 👇 CORRECTED: Use the absolute path alias '@/' to point to the 'src' directory.
import { supabase } from '@/supabase/client';

const ProtectedRoute = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(session ? true : false);
    };

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(session ? true : false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // While we're checking authentication, don't render anything
  if (isAuthenticated === null) {
    return null; // Or a loading spinner
  }

  // If authenticated, render the child route (the AI Chat page).
  // Otherwise, redirect to the login page.
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
};

export default ProtectedRoute;
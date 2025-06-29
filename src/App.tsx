import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuthContext } from './hooks/AuthContext';
import { useToast } from './hooks/useToast';
import { ToastContainer } from './components/ui/Toast';
import './index.css';

function App() {
  const { admin, loading } = useAuthContext();
  const { toasts, removeToast } = useToast();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-quickcart-600 mx-auto mb-4" />
          <div className="text-gray-600">Loading QuickCart Dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* The Outlet will render the matched child route from your router config */}
        <Outlet />
      </div>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      
      {/* 2. Add the floating image here */}
      <img
        src="/assets/bolt.png"
        alt="Floating Action"
        className="
          fixed          // Keep it in place while scrolling
          bottom-5       // 5 units from the bottom
          right-5        // 5 units from the right
          w-16 h-16      // Base size for mobile
          md:w-20 md:h-20// Larger size for medium screens and up
          z-50           // Ensure it's on top of other content
          cursor-pointer // Show a pointer on hover
          hover:scale-110// Enlarge slightly on hover
          transition-transform // Smoothly animate the hover effect
          duration-200   // Animation speed
        "
        onClick={() => alert('Floating image clicked!')} // Example action
      />
    </>
  );
}

export default App;
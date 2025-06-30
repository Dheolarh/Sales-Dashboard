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
        src="/assets/bolt.jpg"
        alt="Floating Action"
        className="
          fixed
          bottom-4 right-4 sm:bottom-5 sm:right-5
          w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20
          z-50
          cursor-pointer
          hover:scale-110
          transition-transform
          duration-200
        "
        onClick={() => alert('Floating image clicked!')}
      />
    </>
  );
}

export default App;
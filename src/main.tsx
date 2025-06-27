import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from './hooks/AuthContext';
import { SettingsProvider } from './hooks/SettingsContext';
import App from './App';
import { ChatPage } from './pages/ChatPage';
import { EcommercePage } from './pages/EcommercePage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import './index.css';

// --- Router Configuration ---
const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        path: '/ecommerce',
        element: <EcommercePage />,
      },
      {
        path: '/dashboard',
        element: <DashboardPage />,
      },
      // This wrapper protects the child routes
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: '/ai-chat',
            element: <ChatPage />,
          },
        ],
      },
    ],
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
]);


// --- Render the Application ---
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* Wrap the entire router with your context providers */}
    <AuthProvider>
      <SettingsProvider>
        <RouterProvider router={router} />
      </SettingsProvider>
    </AuthProvider>
  </React.StrictMode>
);
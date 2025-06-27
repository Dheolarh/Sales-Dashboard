import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from './hooks/AuthContext';
import { SettingsProvider } from './hooks/SettingsContext';

// Import all your components and pages
import App from './App';
import { LoginPage } from './pages/LoginPage';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { DashboardPage } from './pages/DashboardPage';
import { EcommercePage } from './pages/EcommercePage';
import { MonitorPage } from './pages/MonitorPage';
import { ErrorLogsPage } from './pages/ErrorLogsPage';
import { ProductsPage } from './pages/ProductsPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { CompaniesPage } from './pages/CompaniesPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { AdminsPage } from './pages/AdminsPage';
import { AccessLogsPage } from './pages/AccessLogsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ChatPage } from './pages/ChatPage';
import { SettingsPage } from './pages/SettingsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import ProtectedRoute from './components/ProtectedRoute'; // This remains your protected route logic
import './index.css';

// --- Centralized Router Configuration ---
const router = createBrowserRouter([
  {
    path: '/',
    element: <App />, // App component is now a layout shell
    children: [
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'store',
        element: <EcommercePage />,
      },
      // Admin dashboard routes are protected
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: '/',
            element: <DashboardLayout />,
            children: [
              { path: 'dashboard', element: <DashboardPage /> },
              { path: 'products', element: <ProductsPage /> },
              { path: 'transactions', element: <TransactionsPage /> },
              { path: 'companies', element: <CompaniesPage /> },
              { path: 'categories', element: <CategoriesPage /> },
              { path: 'analytics', element: <AnalyticsPage /> },
              { path: 'monitor', element: <MonitorPage /> },
              { path: 'errors', element: <ErrorLogsPage /> },
              { path: 'admins', element: <AdminsPage /> },
              { path: 'access-logs', element: <AccessLogsPage /> },
              { path: 'chat', element: <ChatPage /> },
              { path: 'settings', element: <SettingsPage /> },
              { path: 'notifications', element: <NotificationsPage /> },
              // Redirect from root of protected routes to the dashboard
              { index: true, element: <DashboardPage /> },
            ],
          },
        ],
      },
    ],
  },
]);

// --- Render the Application ---
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <SettingsProvider>
        <RouterProvider router={router} />
      </SettingsProvider>
    </AuthProvider>
  </React.StrictMode>
);
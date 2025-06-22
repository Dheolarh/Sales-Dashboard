import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import { DashboardLayout } from './components/layout/DashboardLayout'
import { DashboardPage } from './pages/DashboardPage'
import { EcommercePage } from './pages/EcommercePage'
import { MonitorPage } from './pages/MonitorPage'
import { ErrorLogsPage } from './pages/ErrorLogsPage'
import { ProductsPage } from './pages/ProductsPage'
import { TransactionsPage } from './pages/TransactionsPage'
import { CompaniesPage } from './pages/CompaniesPage'
import { CategoriesPage } from './pages/CategoriesPage'
import { AdminsPage } from './pages/AdminsPage'
import { AccessLogsPage } from './pages/AccessLogsPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { ChatPage } from './pages/ChatPage'
import { SettingsPage } from './pages/SettingsPage'
import { useAuth } from './hooks/useAuth'
import { useToast } from './hooks/useToast'
import { ToastContainer } from './components/ui/Toast'
import './index.css'

function App() {
  const { admin, loading } = useAuth()
  const { toasts, removeToast } = useToast()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-quickcart-600 mx-auto mb-4" />
          <div className="text-gray-600">Loading QuickCart Dashboard...</div>
        </div>
      </div>
    )
  }

  return (
    <>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            {/* Public Routes */}
            <Route path="/store" element={<EcommercePage />} />
            <Route path="/login" element={!admin ? <LoginPage /> : <Navigate to="/dashboard" replace />} />
            
            {/* Protected Admin Routes */}
            <Route path="/" element={admin ? <DashboardLayout /> : <Navigate to="/login" replace />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="transactions" element={<TransactionsPage />} />
              <Route path="companies" element={<CompaniesPage />} />
              <Route path="categories" element={<CategoriesPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="monitor" element={<MonitorPage />} />
              <Route path="errors" element={<ErrorLogsPage />} />
              <Route path="admins" element={<AdminsPage />} />
              <Route path="access-logs" element={<AccessLogsPage />} />
              <Route path="chat" element={<ChatPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </div>
      </Router>

      {/* Global Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </>
  )
}

export default App
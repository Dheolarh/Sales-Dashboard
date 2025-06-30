import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { 
  Settings, 
  Bell, 
  Eye,
  Clock,
  Moon, 
  Sun, 
  Globe, 
  Save,
  RefreshCw
} from 'lucide-react'
import { useSettingsContext, UserPreferencesData } from '../../hooks/SettingsContext';
import { useToast } from '../../hooks/useToast'

interface UserPreferences {
  theme: 'light' | 'dark' | 'auto'
  language: string
  timezone: string
  notifications: {
    email: boolean
    push: boolean
    desktop: boolean
    lowStock: boolean
    systemAlerts: boolean
    salesReports: boolean
  }
  dashboard: {
    autoRefresh: boolean
    refreshInterval: number
    defaultView: string
    compactMode: boolean
  }
  privacy: {
    analytics: boolean
    crashReports: boolean
    usageData: boolean
  }
}

const defaultPreferences: UserPreferences = {
  theme: 'light',
  language: 'en',
  timezone: 'UTC',
  notifications: {
    email: true,
    push: true,
    desktop: false,
    lowStock: true,
    systemAlerts: true,
    salesReports: false
  },
  dashboard: {
    autoRefresh: true,
    refreshInterval: 30,
    defaultView: 'dashboard',
    compactMode: false
  },
  privacy: {
    analytics: true,
    crashReports: true,
    usageData: false
  }
}

export const UserPreferences: React.FC = () => {
  const { preferences, setPreferences } = useSettingsContext();
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  const updatePreference = (section: keyof UserPreferencesData, key: string, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [section]: {
        ...(prev[section] as Record<string, any>),
        [key]: value
      }
    }));
  };

  const updateTopLevelPreference = (key: keyof UserPreferencesData, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      // The useLocalStorage hook already saves on change, so this is just for UX feedback
      await new Promise(resolve => setTimeout(resolve, 1000));
      addToast({
        type: 'success',
        title: 'Preferences Saved',
        message: 'Your preferences have been updated successfully.'
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: 'Failed to save preferences. Please try again.'
      });
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    setPreferences(defaultPreferences);
    addToast({
      type: 'info',
      title: 'Preferences Reset',
      message: 'All preferences have been reset to default values.'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Settings className="h-8 w-8 text-quickcart-600 mr-3" />
            User Preferences
          </h1>
          <p className="text-gray-600 mt-1">Customize your dashboard experience</p>
        </div>
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <Button variant="outline" onClick={resetToDefaults} className="w-full sm:w-auto">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={savePreferences} disabled={saving} className="w-full sm:w-auto">
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Timezone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
        

          <div className="grid grid-cols-2 gap-4">
            <div>
              <select
                value={preferences.timezone}
                onChange={(e) => updateTopLevelPreference('timezone', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-quickcart-500"
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
                <option value="Europe/London">London</option>
                <option value="Asia/Tokyo">Tokyo</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Delivery Methods</h4>
              <div className="space-y-3">
                {[
                  { key: 'email', label: 'Email Notifications' },
                  { key: 'push', label: 'Push Notifications' },
                  { key: 'desktop', label: 'Desktop Notifications' }
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`notification-${key}`}
                      checked={preferences.notifications[key as keyof typeof preferences.notifications]}
                      onChange={(e) => updatePreference('notifications', key, e.target.checked)}
                      className="rounded border-gray-300 text-quickcart-600 focus:ring-quickcart-500"
                    />
                    <label htmlFor={`notification-${key}`} className="ml-2 text-sm text-gray-700">
                      {label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">Notification Types</h4>
              <div className="space-y-3">
                {[
                  { key: 'lowStock', label: 'Low Stock Alerts' },
                  { key: 'systemAlerts', label: 'System Alerts' },
                  { key: 'salesReports', label: 'Sales Reports' }
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`type-${key}`}
                      checked={preferences.notifications[key as keyof typeof preferences.notifications]}
                      onChange={(e) => updatePreference('notifications', key, e.target.checked)}
                      className="rounded border-gray-300 text-quickcart-600 focus:ring-quickcart-500"
                    />
                    <label htmlFor={`type-${key}`} className="ml-2 text-sm text-gray-700">
                      {label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Globe className="h-5 w-5 mr-2" />
            Dashboard Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default View</label>
              <select
                value={preferences.dashboard.defaultView}
                onChange={(e) => updatePreference('dashboard', 'defaultView', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-quickcart-500"
              >
                <option value="dashboard">Dashboard</option>
                <option value="products">Products</option>
                <option value="analytics">Analytics</option>
                <option value="transactions">Transactions</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Auto-refresh Interval (seconds)</label>
              <Input
                type="number"
                min="10"
                max="300"
                value={preferences.dashboard.refreshInterval}
                onChange={(e) => updatePreference('dashboard', 'refreshInterval', parseInt(e.target.value))}
                disabled={!preferences.dashboard.autoRefresh}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="auto-refresh"
                checked={preferences.dashboard.autoRefresh}
                onChange={(e) => updatePreference('dashboard', 'autoRefresh', e.target.checked)}
                className="rounded border-gray-300 text-quickcart-600 focus:ring-quickcart-500"
              />
              <label htmlFor="auto-refresh" className="ml-2 text-sm text-gray-700">
                Enable auto-refresh
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="compact-mode"
                checked={preferences.dashboard.compactMode}
                onChange={(e) => updatePreference('dashboard', 'compactMode', e.target.checked)}
                className="rounded border-gray-300 text-quickcart-600 focus:ring-quickcart-500"
              />
              <label htmlFor="compact-mode" className="ml-2 text-sm text-gray-700">
                Compact mode (smaller cards and spacing)
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy */}
      <Card>
        <CardHeader>
          <CardTitle>Privacy & Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { key: 'analytics', label: 'Allow analytics tracking', description: 'Help us improve the dashboard by sharing usage analytics' },
              { key: 'crashReports', label: 'Send crash reports', description: 'Automatically send error reports to help us fix issues' },
              { key: 'usageData', label: 'Share usage data', description: 'Share anonymized usage patterns for product improvement' }
            ].map(({ key, label, description }) => (
              <div key={key} className="flex items-start">
                <input
                  type="checkbox"
                  id={`privacy-${key}`}
                  checked={preferences.privacy[key as keyof typeof preferences.privacy]}
                  onChange={(e) => updatePreference('privacy', key, e.target.checked)}
                  className="rounded border-gray-300 text-quickcart-600 focus:ring-quickcart-500 mt-1"
                />
                <div className="ml-3">
                  <label htmlFor={`privacy-${key}`} className="text-sm font-medium text-gray-700">
                    {label}
                  </label>
                  <p className="text-xs text-gray-500 mt-1">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
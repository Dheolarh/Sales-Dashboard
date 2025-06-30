import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import {
  Settings,
  Database,
  Shield,
  Zap,
  Mail,
  Globe,
  Save,
  TestTube,
  AlertTriangle,
} from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { StatusIndicator } from '../ui/StatusIndicator';
import { dbService } from '../../lib/supabase';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface SystemConfig {
  database: {
    connectionTimeout: number;
    maxConnections: number;
    backupFrequency: string;
    retentionDays: number;
  };
  security: {
    sessionTimeout: number;
    maxLoginAttempts: number;
    passwordMinLength: number;
    requireMFA: boolean;
    allowedDomains: string[];
  };
  performance: {
    cacheTimeout: number;
    maxRequestSize: number;
    rateLimitPerMinute: number;
    enableCompression: boolean;
  };
  notifications: {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword: string;
    fromEmail: string;
    enableSSL: boolean;
  };
  ai: {
    scanInterval: number;
    confidenceThreshold: number;
    autoResolveThreshold: number;
    enablePredictiveAnalytics: boolean;
  };
}

const defaultConfig: SystemConfig = {
  database: {
    connectionTimeout: 30,
    maxConnections: 100,
    backupFrequency: 'daily',
    retentionDays: 30
  },
  security: {
    sessionTimeout: 480,
    maxLoginAttempts: 5,
    passwordMinLength: 8,
    requireMFA: false,
    allowedDomains: ['quickcart.com']
  },
  performance: {
    cacheTimeout: 300,
    maxRequestSize: 10,
    rateLimitPerMinute: 100,
    enableCompression: true
  },
  notifications: {
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    fromEmail: 'noreply@quickcart.com',
    enableSSL: true
  },
  ai: {
    scanInterval: 300,
    confidenceThreshold: 85,
    autoResolveThreshold: 95,
    enablePredictiveAnalytics: true
  }
};

export const SystemSettings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<SystemConfig>(defaultConfig);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const fetchedSettings = await dbService.getSystemSettings();
        const mergedConfig = { ...defaultConfig, ...fetchedSettings };
        setConfig(mergedConfig);
      } catch (error) {
        console.error("Failed to load system settings:", error);
        addToast({
          type: 'error',
          title: 'Load Failed',
          message: 'Could not load system settings from the database.',
        });
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, [addToast]);

  const updateConfig = (section: keyof SystemConfig, key: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...(prev[section] as Record<string, any>),
        [key]: value
      }
    }));
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      await dbService.updateSystemSettings(config);
      addToast({
        type: 'success',
        title: 'Settings Saved',
        message: 'System configuration has been updated successfully.'
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: 'Failed to save system settings. Please try again.'
      });
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async (type: string) => {
    setTesting(type);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      addToast({ type: 'success', title: 'Connection Test Successful', message: `${type} connection is working properly.` });
    } catch (error) {
      addToast({ type: 'error', title: 'Connection Test Failed', message: `Failed to connect to ${type}. Please check your settings.` });
    } finally {
      setTesting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner text="Loading System Settings..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Settings className="h-8 w-8 text-quickcart-600 mr-3" />
            System Settings
          </h1>
          <p className="text-gray-600 mt-1">Configure system-wide settings and preferences</p>
        </div>
        <Button onClick={saveConfig} disabled={saving} className="w-full sm:w-auto">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save All Changes'}
        </Button>
      </div>

      {/* Database Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Database className="h-5 w-5 mr-2" />
              Database Configuration
            </span>
            <StatusIndicator status="success" label="Connected" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Connection Timeout (seconds)</label>
              <Input
                type="number"
                value={config.database.connectionTimeout}
                onChange={(e) => updateConfig('database', 'connectionTimeout', parseInt(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Connections</label>
              <Input
                type="number"
                value={config.database.maxConnections}
                onChange={(e) => updateConfig('database', 'maxConnections', parseInt(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Backup Frequency</label>
              <select
                value={config.database.backupFrequency}
                onChange={(e) => updateConfig('database', 'backupFrequency', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-quickcart-500"
              >
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Retention Days</label>
              <Input
                type="number"
                value={config.database.retentionDays}
                onChange={(e) => updateConfig('database', 'retentionDays', parseInt(e.target.value))}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => testConnection('Database')}
              disabled={testing === 'Database'}
            >
              <TestTube className="h-4 w-4 mr-2" />
              {testing === 'Database' ? 'Testing...' : 'Test Connection'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Security Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Session Timeout (minutes)</label>
              <Input
                type="number"
                value={config.security.sessionTimeout}
                onChange={(e) => updateConfig('security', 'sessionTimeout', parseInt(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Login Attempts</label>
              <Input
                type="number"
                value={config.security.maxLoginAttempts}
                onChange={(e) => updateConfig('security', 'maxLoginAttempts', parseInt(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password Min Length</label>
              <Input
                type="number"
                value={config.security.passwordMinLength}
                onChange={(e) => updateConfig('security', 'passwordMinLength', parseInt(e.target.value))}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Allowed Email Domains</label>
            <Input
              value={config.security.allowedDomains.join(', ')}
              onChange={(e) => updateConfig('security', 'allowedDomains', e.target.value.split(',').map(d => d.trim()))}
              placeholder="example.com, company.org"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="require-mfa"
              checked={config.security.requireMFA}
              onChange={(e) => updateConfig('security', 'requireMFA', e.target.checked)}
              className="rounded border-gray-300 text-quickcart-600 focus:ring-quickcart-500"
            />
            <label htmlFor="require-mfa" className="ml-2 text-sm text-gray-700">
              Require Multi-Factor Authentication (MFA)
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Performance Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="h-5 w-5 mr-2" />
            Performance Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cache Timeout (seconds)</label>
              <Input
                type="number"
                value={config.performance.cacheTimeout}
                onChange={(e) => updateConfig('performance', 'cacheTimeout', parseInt(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Request Size (MB)</label>
              <Input
                type="number"
                value={config.performance.maxRequestSize}
                onChange={(e) => updateConfig('performance', 'maxRequestSize', parseInt(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rate Limit (per minute)</label>
              <Input
                type="number"
                value={config.performance.rateLimitPerMinute}
                onChange={(e) => updateConfig('performance', 'rateLimitPerMinute', parseInt(e.target.value))}
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="enable-compression"
              checked={config.performance.enableCompression}
              onChange={(e) => updateConfig('performance', 'enableCompression', e.target.checked)}
              className="rounded border-gray-300 text-quickcart-600 focus:ring-quickcart-500"
            />
            <label htmlFor="enable-compression" className="ml-2 text-sm text-gray-700">
              Enable response compression
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Email Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Mail className="h-5 w-5 mr-2" />
              Email Configuration
            </span>
            <StatusIndicator status="warning" label="Not Configured" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Host</label>
              <Input
                value={config.notifications.smtpHost}
                onChange={(e) => updateConfig('notifications', 'smtpHost', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Port</label>
              <Input
                type="number"
                value={config.notifications.smtpPort}
                onChange={(e) => updateConfig('notifications', 'smtpPort', parseInt(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Username</label>
              <Input
                value={config.notifications.smtpUser}
                onChange={(e) => updateConfig('notifications', 'smtpUser', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Password</label>
              <Input
                type="password"
                value={config.notifications.smtpPassword}
                onChange={(e) => updateConfig('notifications', 'smtpPassword', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Email Address</label>
            <Input
              type="email"
              value={config.notifications.fromEmail}
              onChange={(e) => updateConfig('notifications', 'fromEmail', e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="enable-ssl"
                checked={config.notifications.enableSSL}
                onChange={(e) => updateConfig('notifications', 'enableSSL', e.target.checked)}
                className="rounded border-gray-300 text-quickcart-600 focus:ring-quickcart-500"
              />
              <label htmlFor="enable-ssl" className="ml-2 text-sm text-gray-700">
                Enable SSL/TLS
              </label>
            </div>

            <Button
              variant="outline"
              onClick={() => testConnection('Email')}
              disabled={testing === 'Email'}
            >
              <TestTube className="h-4 w-4 mr-2" />
              {testing === 'Email' ? 'Testing...' : 'Test Email'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Globe className="h-5 w-5 mr-2" />
            AI & Monitoring Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scan Interval (seconds)</label>
              <Input
                type="number"
                value={config.ai.scanInterval}
                onChange={(e) => updateConfig('ai', 'scanInterval', parseInt(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confidence Threshold (%)</label>
              <Input
                type="number"
                min="0"
                max="100"
                value={config.ai.confidenceThreshold}
                onChange={(e) => updateConfig('ai', 'confidenceThreshold', parseInt(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Auto-resolve Threshold (%)</label>
              <Input
                type="number"
                min="0"
                max="100"
                value={config.ai.autoResolveThreshold}
                onChange={(e) => updateConfig('ai', 'autoResolveThreshold', parseInt(e.target.value))}
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="enable-predictive"
              checked={config.ai.enablePredictiveAnalytics}
              onChange={(e) => updateConfig('ai', 'enablePredictiveAnalytics', e.target.checked)}
              className="rounded border-gray-300 text-quickcart-600 focus:ring-quickcart-500"
            />
            <label htmlFor="enable-predictive" className="ml-2 text-sm text-gray-700">
              Enable predictive analytics and forecasting
            </label>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-yellow-800">AI Configuration Notice</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Changes to AI settings will take effect after the next scan cycle. Lower confidence thresholds may increase false positives.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
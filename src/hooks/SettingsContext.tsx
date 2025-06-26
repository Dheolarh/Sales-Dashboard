import React, { createContext, useContext, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';

// Define the shape of your user preferences to match UserPreferences.tsx
export interface UserPreferencesData {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  notifications: {
    email: boolean;
    push: boolean;
    desktop: boolean;
    lowStock: boolean;
    systemAlerts: boolean;
    salesReports: boolean;
  };
  dashboard: {
    autoRefresh: boolean;
    refreshInterval: number;
    defaultView: string;
    compactMode: boolean;
  };
  privacy: {
    analytics: boolean;
    crashReports: boolean;
    usageData: boolean;
  };
}

// Define the context type
interface SettingsContextType {
  preferences: UserPreferencesData;
  setPreferences: (prefs: UserPreferencesData | ((val: UserPreferencesData) => UserPreferencesData)) => void;
}

// Default preferences matching those in UserPreferences.tsx
const defaultPreferences: UserPreferencesData = {
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
};

// Create the context
const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Create the provider component
export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preferences, setPreferences] = useLocalStorage<UserPreferencesData>('user-preferences', defaultPreferences);

  // Effect to apply the theme to the root HTML element
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (preferences.theme === 'auto') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(preferences.theme);
    }
  }, [preferences.theme]);

  return (
    <SettingsContext.Provider value={{ preferences, setPreferences }}>
      {children}
    </SettingsContext.Provider>
  );
};

// Create a custom hook for easy access to the context
export const useSettingsContext = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettingsContext must be used within a SettingsProvider');
  }
  return context;
};
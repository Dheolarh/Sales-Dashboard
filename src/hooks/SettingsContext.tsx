import React, { createContext, useContext, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';
import i18n from 'i18next';

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

interface SettingsContextType {
    preferences: UserPreferencesData;
    setPreferences: (prefs: UserPreferencesData | ((val: UserPreferencesData) => UserPreferencesData)) => void;
}

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

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [preferences, setPreferences] = useLocalStorage<UserPreferencesData>('user-preferences', defaultPreferences);

    // --- REVISED useEffect for Theme ---
    useEffect(() => {
        const root = window.document.documentElement;
        const theme = preferences.theme;

        // First, clean up any existing theme classes
        root.classList.remove('light', 'dark');

        // Apply the new theme
        if (theme === 'auto') {
            const systemIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            root.classList.add(systemIsDark ? 'dark' : 'light');
        } else {
            root.classList.add(theme);
        }
    }, [preferences.theme]); // This effect re-runs only when the theme preference changes


    return (
        <SettingsContext.Provider value={{ preferences, setPreferences }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettingsContext = () => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettingsContext must be used within a SettingsProvider');
    }
    return context;
};
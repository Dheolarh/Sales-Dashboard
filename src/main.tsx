import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { AuthProvider } from './hooks/AuthContext';
import { SettingsProvider } from './hooks/SettingsContext'; // <-- IMPORT

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <SettingsProvider> {/* <-- WRAP WITH PROVIDER */}
        <App />
      </SettingsProvider>
    </AuthProvider>
  </React.StrictMode>
);
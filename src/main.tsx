// main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import App from './App';
import './index.css';  
import { CONFIG } from './config';

// ✅ Handle unauthorized event (improved)
window.addEventListener('auth:unauthorized', () => {
  console.warn('Unauthorized access detected, redirecting to login...');
  
  // Clear all storage
  localStorage.clear();
  sessionStorage.clear();
  
  // Optional: Clear cookies if any
  document.cookie.split(";").forEach((c) => {
    document.cookie = c
      .replace(/^ +/, "")
      .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
  });
  
  // Redirect to login
  window.location.href = `${CONFIG.MAIN_SITE}#login`;
});

// ✅ Optional: Handle online/offline status
window.addEventListener('online', () => {
  console.log('App is online');
});

window.addEventListener('offline', () => {
  console.warn('App is offline');
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router>
      <AuthProvider>
        <App />
      </AuthProvider>
    </Router>
  </React.StrictMode>
);
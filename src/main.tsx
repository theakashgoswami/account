// main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import App from './App';
import './index.css';
import { CONFIG } from './config';

// ✅ Add this to prevent multiple Supabase clients
if (import.meta.env.DEV) {
  // @ts-ignore
  window.__SUPABASE_CLIENT__ = null;
}

// ✅ Handle unauthorized event
window.addEventListener('auth:unauthorized', () => {
  // Clear storage before redirect
  localStorage.clear();
  sessionStorage.clear();
  window.location.href = `${CONFIG.MAIN_SITE}#login`;
});

// ✅ Also handle beforeunload to cleanup
window.addEventListener('beforeunload', () => {
  // Optional: cleanup if needed
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
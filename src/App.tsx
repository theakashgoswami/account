/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Dashboard } from './pages/Dashboard';
import { Earn } from './pages/Earn';
import { Rewards } from './pages/Rewards';
import { History } from './pages/History';
import { Profile } from './pages/Profile';
import { Claim } from './pages/Claim';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, login } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-zinc-950 px-4 text-center">
        <h2 className="mb-4 text-2xl font-bold text-white">Authentication Required</h2>
        <p className="mb-8 text-zinc-400">Please login to access this page.</p>
       <a
         href="https://agtechscript.in#login"
          className="inline-block rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white transition-all hover:bg-indigo-500"
        >
         Login Now
      </a>
      </div>
    );
  }

  return <>{children}</>;
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default function App() {
  return (
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/earn" element={<ProtectedRoute><Earn /></ProtectedRoute>} />
            <Route path="/claim" element={<ProtectedRoute><Claim /></ProtectedRoute>} />
            <Route path="/rewards" element={<ProtectedRoute><Rewards /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </Router>
  );
}


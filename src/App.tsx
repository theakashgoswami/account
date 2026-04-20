/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Dashboard } from './pages/Dashboard';
import { Earn } from './pages/Earn';
import { Rewards } from './pages/Rewards';
import { History } from './pages/History';
import { Profile } from './pages/Profile';
import { Claim } from './pages/Claim';
import { Leaderboard } from './pages/Leaderboard';
import { ResetPassword } from './pages/ResetPassword';

// ✅ login removed — <a> tag directly used instead
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

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
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
};

// ✅ Router removed from here — moved to main.tsx so AuthProvider & Router are siblings
// ✅ AuthProvider import removed — it lives in main.tsx now
export default function App() {
  return (
    <Routes>
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/" element={<Layout><ProtectedRoute><Dashboard /></ProtectedRoute></Layout>} />
      <Route path="/earn" element={<Layout><ProtectedRoute><Earn /></ProtectedRoute></Layout>} />
      <Route path="/claim" element={<Layout><ProtectedRoute><Claim /></ProtectedRoute></Layout>} />
      <Route path="/rewards" element={<Layout><ProtectedRoute><Rewards /></ProtectedRoute></Layout>} />
      <Route path="/history" element={<Layout><ProtectedRoute><History /></ProtectedRoute></Layout>} />
      <Route path="/profile" element={<Layout><ProtectedRoute><Profile /></ProtectedRoute></Layout>} />
      <Route path="/leaderboard" element={<Layout><ProtectedRoute><Leaderboard /></ProtectedRoute></Layout>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

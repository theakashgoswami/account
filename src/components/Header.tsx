import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Menu, X, User, LogOut, Settings, History, Gift, LayoutDashboard, BrainCircuit, Ticket, Trophy } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { name: 'Home', path: '/', icon: LayoutDashboard },
    { name: 'Claim', path: '/claim', icon: Ticket },
    { name: 'Earn', path: '/earn', icon: BrainCircuit },
    { name: 'Rewards', path: '/rewards', icon: Gift },
    { name: 'History', path: '/history', icon: History },
    { name: 'Leaderboard', path: '/leaderboard', icon: Trophy },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src="https://cdn.agtechscript.in/AGTechScript.webp" alt="AG TechScript Logo" className="h-8 w-8" />
          <span className="text-lg font-bold tracking-tight text-white">AG TechScript</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex md:items-center md:gap-6">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "text-sm font-medium transition-colors hover:text-indigo-400",
                location.pathname === item.path ? "text-indigo-400" : "text-zinc-400"
              )}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 transition-colors hover:bg-zinc-800"
              >
                {user.profile_image ? (
                  <img src={user.profile_image} alt={user.name} className="h-full w-full rounded-full object-cover" />
                ) : (
                  <User className="h-5 w-5 text-zinc-400" />
                )}
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-56 rounded-xl border border-zinc-800 bg-zinc-900 p-2 shadow-2xl"
                  >
                    <div className="mb-2 px-3 py-2">
                      <p className="text-sm font-medium text-white">{user.name || user.user_id}</p>
                      <p className="text-xs text-zinc-500">@{user.user_id}</p>
                    </div>
                    <div className="h-px bg-zinc-800" />
                    <div className="mt-2 space-y-1">
                      <Link
                        to="/profile"
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        <Settings className="h-4 w-4" />
                        Edit Profile
                      </Link>
                      <button
                        onClick={() => {
                          setIsProfileOpen(false);
                          logout();
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10"
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <button
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-indigo-500 active:scale-95"
            >
              Loading....
            </button>
          )}

          <button
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-6 w-6 text-white" /> : <Menu className="h-6 w-6 text-white" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-zinc-800 bg-zinc-950 md:hidden"
          >
            <div className="space-y-1 px-4 py-4">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-base font-medium transition-colors",
                    location.pathname === item.path ? "bg-indigo-600/10 text-indigo-400" : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                  )}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API } from '../services/api';
import { User, Camera, Save, Loader2, AlertCircle, CheckCircle2, Key, Lock, Eye, EyeOff, Shield, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { CONFIG } from '../config';

export const Profile: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', profile_image: '' });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    new_password: '',
    confirm_password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  useEffect(() => {
  if (showPasswordModal) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
}, [showPasswordModal]);

  useEffect(() => {
    if (user) setForm({ 
      name: user.name || '', 
      email: user.email || '', 
      phone: user.phone || '', 
      address: user.address || '', 
      profile_image: user.profile_image || '' 
    });
  }, [user]);

  const checkPasswordStrength = (password: string) => {
    let strength = 0;
    const errors: string[] = [];
    
    if (password.length < 6) errors.push('At least 6 characters');
    if (password.length >= 6) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[!@#$%^&*]/.test(password)) strength++;
    
    setPasswordStrength(Math.min(strength, 5));
    setPasswordErrors(errors);
    return errors.length === 0 && password.length >= 6;
  };

  useEffect(() => {
    if (passwordData.new_password) {
      checkPasswordStrength(passwordData.new_password);
    } else {
      setPasswordStrength(0);
      setPasswordErrors([]);
    }
  }, [passwordData.new_password]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setMsg({ type: 'error', text: 'Please select an image file.' }); return; }
    if (file.size > 5 * 1024 * 1024) { setMsg({ type: 'error', text: 'Image must be under 5MB.' }); return; }

    const reader = new FileReader();
    reader.onload = e => setForm(f => ({ ...f, profile_image: e.target?.result as string }));
    reader.readAsDataURL(file);

    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch(`${CONFIG.WORKER_URL}/api/user/upload-image`, {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      const data = await res.json();
      if (data.success) {
        setForm(f => ({ ...f, profile_image: data.url }));
        setMsg({ type: 'success', text: 'Image uploaded!' });
        await refreshProfile();
      } else {
        setMsg({ type: 'error', text: data.error || 'Upload failed.' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Upload failed. Try again.' });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    
    const res = await API.updateProfile({ 
      name: form.name, 
      address: form.address, 
      profile_image: form.profile_image 
    });
    
    if (res.success) {
      setMsg({ type: 'success', text: 'Profile updated!' });
      await refreshProfile();
    } else {
      setMsg({ type: 'error', text: res.error || 'Update failed.' });
    }
    setSaving(false);
  };

  const handlePasswordChange = async () => {
    if (!passwordData.new_password) {
      setMsg({ type: 'error', text: 'New password is required' });
      return;
    }
    
    if (passwordData.new_password !== passwordData.confirm_password) {
      setMsg({ type: 'error', text: 'Passwords do not match' });
      return;
    }
    
    if (passwordData.new_password.length < 6) {
      setMsg({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }
    
    setChangingPassword(true);
    setMsg(null);
    
    try {
      const res = await API.updateProfile({
        newPassword: passwordData.new_password
      });
      
      if (res.success) {
        setMsg({ type: 'success', text: 'Password changed successfully!' });
        setShowPasswordModal(false);
        setPasswordData({ new_password: '', confirm_password: '' });
      } else {
        setMsg({ type: 'error', text: res.error || 'Failed to change password' });
      }
    } catch (error) {
      setMsg({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setChangingPassword(false);
    }
  };

  const PasswordStrengthIndicator = () => {
    const colors = ['#ef4444', '#f59e0b', '#eab308', '#84cc16', '#10b981'];
    const labels = ['Very Weak', 'Weak', 'Medium', 'Strong', 'Very Strong'];
    
    if (!passwordData.new_password) return null;
    
    return (
      <div className="mt-2">
        <div className="flex gap-1 h-1.5">
          {[0, 1, 2, 3, 4].map(i => (
            <div
              key={i}
              className="flex-1 rounded-full transition-all"
              style={{
                backgroundColor: i < passwordStrength ? colors[passwordStrength - 1] : '#27272a',
                opacity: i < passwordStrength ? 1 : 0.3
              }}
            />
          ))}
        </div>
        <p className="mt-1 text-[10px] font-black uppercase tracking-widest" style={{ color: colors[Math.max(0, passwordStrength - 1)] }}>
          {labels[passwordStrength - 1] || 'Weak'} Password
        </p>
        {passwordErrors.length > 0 && (
          <div className="mt-2 space-y-1">
            {passwordErrors.map((err, i) => (
              <p key={i} className="text-[9px] text-red-400">• {err}</p>
            ))}
          </div>
        )}
      </div>
    );
  };

  const PasswordModal = () => (
    <AnimatePresence>
      {showPasswordModal && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowPasswordModal(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
           className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
           <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-indigo-400" />
                  <h2 className="text-xl font-black text-white">Change Password</h2>
                </div>
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="rounded-full p-1 hover:bg-zinc-800 transition-colors"
                >
                  <Lock className="h-4 w-4 text-zinc-500" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-zinc-600">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordData.new_password}
                      onChange={e => setPasswordData({ ...passwordData, new_password: e.target.value })}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-3 pl-4 pr-10 text-sm text-white focus:border-indigo-500 focus:outline-none"
                      placeholder="Enter new password (min 6 chars)"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4 text-zinc-500" /> : <Eye className="h-4 w-4 text-zinc-500" />}
                    </button>
                  </div>
                  <PasswordStrengthIndicator />
                </div>
                
                <div>
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-zinc-600">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordData.confirm_password}
                      onChange={e => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                      className={cn(
                        'w-full rounded-xl border bg-zinc-950 py-3 pl-4 pr-10 text-sm text-white focus:outline-none',
                        passwordData.confirm_password && passwordData.confirm_password !== passwordData.new_password
                          ? 'border-red-500 focus:border-red-500'
                          : passwordData.confirm_password && passwordData.confirm_password === passwordData.new_password
                          ? 'border-green-500 focus:border-green-500'
                          : 'border-zinc-800 focus:border-indigo-500'
                      )}
                      placeholder="Confirm new password"
                    />
                    {passwordData.confirm_password && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {passwordData.confirm_password === passwordData.new_password ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mt-4 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5" />
                    <p className="text-[10px] text-amber-400/80">
                      Password must be at least 6 characters. After changing, you may be logged out from other devices.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 rounded-xl bg-zinc-900 py-3 text-xs font-black uppercase tracking-widest text-zinc-500 hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePasswordChange}
                  disabled={changingPassword || !passwordData.new_password || passwordData.new_password !== passwordData.confirm_password || passwordData.new_password.length < 6}
                  className="flex-1 rounded-xl bg-indigo-600 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-indigo-500 disabled:opacity-50 transition-all active:scale-95"
                >
                  {changingPassword ? (
                    <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                  ) : (
                    'Change Password'
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <PasswordModal />
      
      <header className="mb-10">
        <h1 className="flex items-center gap-3 text-3xl font-black uppercase tracking-tight text-white">
          <User className="h-8 w-8 text-indigo-400" /> Edit Profile
        </h1>
        <p className="mt-2 text-zinc-500">Manage your personal information and security.</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-8 text-center">
            <div className="group relative mx-auto mb-6 h-32 w-32 overflow-hidden rounded-full border-4 border-indigo-600/30 bg-zinc-950 shadow-2xl">
              {form.profile_image ? (
                <img src={form.profile_image} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-zinc-800">
                  <User className="h-16 w-16" />
                </div>
              )}
              <label className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center bg-indigo-600/80 opacity-0 transition-opacity group-hover:opacity-100">
                {uploading ? <Loader2 className="h-6 w-6 animate-spin text-white" /> : <Camera className="mb-1 h-6 w-6 text-white" />}
                <span className="text-[10px] font-black uppercase tracking-widest text-white">{uploading ? 'Uploading…' : 'Change Photo'}</span>
                <input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" disabled={uploading} />
              </label>
            </div>
            <p className="text-xl font-black text-white">@{user?.user_id}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">
              Member since {user?.created_at ? new Date(user.created_at).getFullYear() : '—'}
            </p>
            <div className="mt-4 flex items-center justify-center gap-2 rounded-full bg-emerald-500/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="h-3 w-3" /> Active
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-zinc-950 p-3 text-center">
                <p className="text-xl font-black text-yellow-400">{user?.points ?? 0}</p>
                <p className="text-[9px] font-black uppercase text-zinc-700">Points</p>
              </div>
              <div className="rounded-2xl bg-zinc-950 p-3 text-center">
                <p className="text-xl font-black text-indigo-400">{user?.stamps ?? 0}</p>
                <p className="text-[9px] font-black uppercase text-zinc-700">Stamps</p>
              </div>
            </div>
            
            <button
              onClick={() => setShowPasswordModal(true)}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 py-3 text-xs font-black uppercase tracking-widest text-indigo-400 hover:bg-zinc-800 transition-all"
            >
              <Key className="h-4 w-4" />
              Change Password
            </button>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Field label="Full Name" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="Your name" />
                <Field label="Email" value={form.email} disabled placeholder="" />
                <Field label="Phone" value={form.phone} disabled placeholder="" />
                <Field label="Address / City" value={form.address} onChange={v => setForm({ ...form, address: v })} placeholder="City, State" />
              </div>

              <AnimatePresence>
                {msg && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={cn('flex items-center gap-3 rounded-2xl p-4 text-sm font-bold', msg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400')}
                  >
                    {msg.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                    {msg.text}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-4 pt-2">
                <button type="button" onClick={() => window.history.back()} className="flex-1 rounded-2xl bg-zinc-900 py-4 text-xs font-black uppercase tracking-widest text-zinc-500 hover:bg-zinc-800 transition-colors">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex flex-[2] items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-4 text-xs font-black uppercase tracking-widest text-white shadow-[0_10px_30px_rgba(79,70,229,0.3)] hover:bg-indigo-500 active:scale-95 disabled:opacity-50 transition-all"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" /> Save Changes</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

const Field: React.FC<{ label: string; value: string; onChange?: (v: string) => void; placeholder: string; disabled?: boolean }> = ({ label, value, onChange, placeholder, disabled }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600">{label}</label>
    <input
      type="text"
      value={value}
      onChange={e => onChange?.(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
        'w-full rounded-2xl border border-zinc-800 py-3.5 px-5 text-sm font-bold text-white focus:border-indigo-500 focus:outline-none transition-all',
        disabled ? 'bg-zinc-900/50 text-zinc-600 cursor-not-allowed' : 'bg-zinc-950 hover:border-zinc-700'
      )}
    />
  </div>
);
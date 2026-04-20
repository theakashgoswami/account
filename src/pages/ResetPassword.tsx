import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupabaseClient } from '../lib/SupabaseClient';

export const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('Checking your reset link...');
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    const prepare = async () => {
      try {
        const supabase = getSupabaseClient();
        const hash = window.location.hash.startsWith('#')
          ? window.location.hash.slice(1)
          : window.location.hash;

        if (hash) {
          const params = new URLSearchParams(hash);
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');

          if (access_token && refresh_token) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (sessionError) throw sessionError;
          }
        }

        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          throw new Error('This reset link is invalid or has expired.');
        }

        if (mounted) {
          setReady(true);
          setMessage('Choose a new password for your account.');
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unable to verify reset link.');
          setMessage('');
        }
      }
    };

    void prepare();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      const supabase = getSupabaseClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      setMessage('Password updated successfully. Redirecting to your account...');
      setTimeout(() => navigate('/', { replace: true }), 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-zinc-100">
      <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900/90 p-8 shadow-2xl shadow-black/30">
        <div className="mb-6 flex items-center gap-4">
          <img
            src="https://cdn.agtechscript.in/AGTechScript.webp"
            alt="AG TechScript"
            className="h-12 w-12 rounded-xl object-cover ring-1 ring-white/10"
          />
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-indigo-400">Secure Reset</p>
            <h1 className="text-2xl font-black text-white">Set New Password</h1>
          </div>
        </div>

        {message ? <p className="mb-5 text-sm text-zinc-300">{message}</p> : null}
        {error ? <p className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p> : null}

        {ready ? (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="mb-2 block text-sm font-semibold text-zinc-300">New password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-indigo-500"
                placeholder="Enter new password"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-zinc-300">Confirm password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-indigo-500"
                placeholder="Repeat new password"
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-black uppercase tracking-[0.22em] text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
};

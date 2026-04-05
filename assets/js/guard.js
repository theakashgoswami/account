// guard.js — Auth guard + waitForUser utility
// Depends on: config.js (must load first)

(function () {
  // ─── Internal state ────────────────────────────────────────
  let _user = null;
  let _authChecked = false;
  let _authCheckPromise = null;

  // ─── Core auth check (runs once, result cached) ────────────
  async function _checkAuth() {
    if (_authChecked) return _user;
    if (_authCheckPromise) return _authCheckPromise;

    _authCheckPromise = fetch(`${window.CONFIG.WORKER_URL}/api/auth/status`, {
      credentials: "include",
      headers: { "X-Client-Host": window.location.host },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Auth check failed");
        const data = await res.json();

        if (data.authenticated) {
          _user = data; // { user_id, role, profile_image, redirect, supabase_token, ... }
          window.currentUser = _user;
          console.log("✅ Auth OK →", _user.user_id, _user.role);
        } else {
          _user = null;
          window.currentUser = null;
        }
        _authChecked = true;
        return _user;
      })
      .catch((err) => {
        console.error("Auth check error:", err);
        _authChecked = true;
        return null;
      });

    return _authCheckPromise;
  }

  // ─── Public: wait until auth is resolved ───────────────────
  // Usage: const user = await waitForUser();
  window.waitForUser = async function (timeoutMs = 8000) {
    const deadline = Date.now() + timeoutMs;
    const user = await _checkAuth();
    if (user) return user;

    // Poll while check is still in progress (shouldn't normally be needed)
    while (!_authChecked && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 100));
    }
    return _user;
  };

  // ─── Page guard — call on protected pages ──────────────────
  // Returns true if authenticated, false + redirects if not.
  window.requireAuth = async function () {
    const user = await _checkAuth();

    if (!user) {
      // Not logged in → send to main site login overlay
      const returnUrl = encodeURIComponent(window.location.href);
      window.location.replace(`${window.CONFIG.MAIN_SITE}#login`);
      return false;
    }

    return true;
  };

  // ─── Redirect guard — call on LOGIN / HOME pages ───────────
  // If already logged in, redirect to their role-based dashboard.
  window.redirectIfAuthed = async function () {
    const user = await _checkAuth();

    if (user && user.redirect) {
      // Already logged in — send to dashboard, but avoid redirect loops
      const dest = new URL(user.redirect);
      const here = new URL(window.location.href);
      if (dest.hostname !== here.hostname || dest.pathname !== here.pathname) {
        window.location.replace(user.redirect);
        return true;
      }
    }
    return false;
  };

  // ─── Auto-guard: runs based on data-guard attribute ────────
  // Add data-guard="auth"    → page requires login
  // Add data-guard="public"  → redirect away if already logged in
  function autoGuard() {
    const guard = document.documentElement.dataset.guard;
    if (guard === "auth") {
      requireAuth();
    } else if (guard === "public") {
      redirectIfAuthed();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoGuard);
  } else {
    autoGuard();
  }
})();
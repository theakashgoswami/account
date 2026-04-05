// guard.js — Auth guard + waitForUser utility
// Depends on: config.js (must load first)

(function () {
  let _user = null;
  let _authChecked = false;
  let _authCheckPromise = null;

  async function _checkAuth() {
    if (_authChecked) return _user;
    if (_authCheckPromise) return _authCheckPromise;

    _authCheckPromise = fetch(`${window.CONFIG.WORKER_URL}/api/auth/status`, {
      credentials: "include",
      headers: { "X-Client-Host": window.location.host },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Auth failed");
        const data = await res.json();

        if (data.authenticated) {
          _user = data;
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
        console.error("Auth error:", err.message);
        _authChecked = true;
        return null;
      });

    return _authCheckPromise;
  }

  // 🔥 FIX: always wait properly (no race issue)
  window.waitForUser = async function (timeoutMs = 8000) {
    const deadline = Date.now() + timeoutMs;

    while (!_authChecked && Date.now() < deadline) {
      await _checkAuth();
      if (_authChecked) break;
      await new Promise((r) => setTimeout(r, 50));
    }

    return _user;
  };

  window.requireAuth = async function () {
    const user = await _checkAuth();
    if (!user) {
      window.location.replace(`${window.CONFIG.MAIN_SITE}#login`);
      return false;
    }
    return true;
  };

  window.redirectIfAuthed = async function () {
    const user = await _checkAuth();
    if (user && user.redirect) {
      const dest = new URL(user.redirect);
      const here = new URL(window.location.href);

      if (dest.href !== here.href) {
        window.location.replace(user.redirect);
        return true;
      }
    }
    return false;
  };

  function autoGuard() {
    const guard = document.documentElement.dataset.guard;
    if (guard === "auth") requireAuth();
    else if (guard === "public") redirectIfAuthed();
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", autoGuard)
    : autoGuard();
})();
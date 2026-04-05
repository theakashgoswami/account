// dashboard.js
document.addEventListener("DOMContentLoaded", initDashboard);

async function initDashboard() {
  console.log("📊 Initializing dashboard...");
  try {
    // Wait for auth — guard.js sets window.currentUser
    const user = await waitForUser();
    if (!user) {
      window.location.replace(`${window.CONFIG.MAIN_SITE}#login`);
      return;
    }

    if (typeof loadHeader === "function") await loadHeader();

    // Load all sections in parallel
    await Promise.all([
      loadDashboardStats(),
      loadFullUserProfile(),
      loadNotifications(),
      loadReferralStats(),
    ]);

    document.getElementById("dashboardContent").style.display = "block";
    const usernameEl = document.getElementById("username");
    if (usernameEl) usernameEl.innerText = window.currentUser.name || window.currentUser.user_id || "Welcome";

    const codeEl = document.getElementById("referralCode");
    if (codeEl) codeEl.innerText = window.currentUser.user_id || "—";
  } catch (err) {
    console.error("Dashboard init error:", err);
  }
}

// ─── Stats ────────────────────────────────────────────────────
async function loadDashboardStats() {
  try {
    // Try Supabase direct first
    if (window._supabaseReady && window.supabaseClient && window.currentUser?.user_id) {
      const uid = window.currentUser.user_id;

      const [quizRes, purchaseRes, referralRes, scoreRes] = await Promise.all([
        window.supabaseClient
          .from("quiz_submissions")         // ← correct table name
          .select("id", { count: "exact", head: true })
          .eq("user_id", uid),
        window.supabaseClient
          .from("purchases")
          .select("id", { count: "exact", head: true })
          .eq("user_id", uid),
        window.supabaseClient
          .from("referrals")
          .select("id", { count: "exact", head: true })
          .eq("referrer_id", uid),
        window.supabaseClient
          .from("leaderboard")
          .select("score")
          .eq("user_id", uid)
          .maybeSingle(),
      ]);

      if (!quizRes.error) setEl("quizPlayed", quizRes.count ?? 0);
      if (!purchaseRes.error) setEl("purchaseCount", purchaseRes.count ?? 0);
      if (!referralRes.error) setEl("referralCount", referralRes.count ?? 0);
      if (!scoreRes.error) setEl("quizScore", scoreRes.data?.score ?? 0);
      return;
    }

    // Fallback to worker
    const res = await workerGet("/api/user/dashboard-stats");
    if (res?.success) {
      setEl("quizPlayed", res.quizPlayed ?? 0);
      setEl("quizScore", res.quizScore ?? 0);
      setEl("purchaseCount", res.purchases ?? 0);
      setEl("referralCount", res.referrals ?? 0);
    }
  } catch (err) {
    console.error("Stats error:", err);
  }
}

// ─── Full profile ─────────────────────────────────────────────
async function loadFullUserProfile() {
  try {
    if (window._supabaseReady && window.supabaseClient && window.currentUser?.user_id) {
      const { data, error } = await window.supabaseClient
        .from("user_profiles")
        .select("*")
        .eq("user_id", window.currentUser.user_id)
        .maybeSingle();

      if (!error && data) {
        window.currentUser = { ...window.currentUser, ...data };
        setEl("username", data.name || data.user_id);
        return;
      }
    }

    // Fallback to worker
    const res = await workerGet(`/api/user/profile?user_id=${window.currentUser.user_id}`);
    if (res?.success) {
      window.currentUser = { ...window.currentUser, ...res };
      setEl("username", res.name || res.user_id);
    }
  } catch (err) {
    console.error("Profile load error:", err);
  }
}

// ─── Notifications ────────────────────────────────────────────
async function loadNotifications() {
  const box = document.getElementById("notifications");
  if (!box) return;

  try {
    let notes = null;

    // Try Supabase direct (needs RLS policy: anon can read global notifications)
    if (window._supabaseReady && window.supabaseClient) {
      const { data, error } = await window.supabaseClient
        .from("notifications")
        .select("title, message, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      if (!error && data?.length) notes = data;
    }

    // Fallback to worker
    if (!notes) {
      const res = await workerGet("/api/user/notifications");
      if (res?.success && res.notifications?.length) notes = res.notifications;
    }

    if (notes?.length) {
      box.innerHTML = notes
        .map(
          (n) => `
          <div class="note-card">
            <b>${esc(n.title || "Notification")}</b>
            <p>${esc(n.message || "")}</p>
            <span class="note-time">${timeAgo(n.created_at)}</span>
          </div>`
        )
        .join("");
    } else {
      box.innerHTML = `<div class="note-card">Welcome to AG TechScript! Complete your first quiz to earn points. 🎯</div>`;
    }
  } catch (err) {
    box.innerHTML = `<div class="note-card">Welcome to AG TechScript!</div>`;
  }
}

// ─── Referral ─────────────────────────────────────────────────
let referralData = { count: 0, earnings: 0, referrals: [] };

async function loadReferralStats() {
  try {
    const res = await workerGet("/api/user/referral-stats");
    if (res?.success) {
      referralData = res;
      updateReferralUI();
    }
  } catch (err) {
    console.error("Referral stats error:", err);
  }
}

function updateReferralUI() {
  setEl("referralCount", referralData.count ?? 0);
  setEl("referralEarnings", referralData.earnings ?? 0);

  const codeEl = document.getElementById("referralCode");
  if (codeEl) codeEl.innerText = window.currentUser?.user_id || "—";

  // Progress bar (milestone every 5 referrals)
  const count = referralData.count || 0;
  const nextMilestone = Math.ceil((count + 1) / 5) * 5;
  const progress = ((count % 5) / 5) * 100;
  const progressBar = document.getElementById("referralProgress");
  if (progressBar) progressBar.style.width = `${progress}%`;

  const nextText = document.getElementById("nextRewardText");
  if (nextText) nextText.textContent = `${nextMilestone - count} more to reach ${nextMilestone} referrals`;

  renderReferralList();
}

function renderReferralList() {
  const container = document.getElementById("referralList");
  if (!container) return;

  if (!referralData.referrals?.length) {
    container.innerHTML = `<div class="empty-state"><span>👥</span><p>No referrals yet. Share your code!</p></div>`;
    return;
  }

  container.innerHTML = referralData.referrals
    .slice(0, 5)
    .map(
      (ref) => `
      <div class="referral-item">
        <div class="referral-user">
          <div class="user-avatar">${ref.name ? ref.name.charAt(0).toUpperCase() : "?"}</div>
          <div class="user-info">
            <div class="user-name">${esc(ref.name || ref.user_id || "New User")}</div>
            <div class="user-date">Joined ${timeAgo(ref.joined_at)}</div>
          </div>
        </div>
        <div class="referral-badge">+2000 pts</div>
      </div>`
    )
    .join("");
}

// ─── Share actions ────────────────────────────────────────────
function copyReferralCode() {
  const code = window.currentUser?.user_id;
  if (!code) return;
  navigator.clipboard.writeText(code).then(() => {
    const fb = document.getElementById("copyFeedback");
    if (fb) { fb.classList.add("show"); setTimeout(() => fb.classList.remove("show"), 2000); }
  });
}

function shareViaWhatsApp() {
  const code = window.currentUser?.user_id;
  const msg = `Join AG TechScript! Use my referral code: ${code}\nhttps://agtechscript.in`;
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
}

function shareViaTelegram() {
  const code = window.currentUser?.user_id;
  window.open(`https://t.me/share/url?url=${encodeURIComponent("https://agtechscript.in")}&text=${encodeURIComponent(`Join AG TechScript! Code: ${code}`)}`, "_blank");
}

function shareViaTwitter() {
  const code = window.currentUser?.user_id;
  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Join AG TechScript! Code: ${code} https://agtechscript.in`)}`, "_blank");
}

function shareViaSMS() {
  const code = window.currentUser?.user_id;
  window.open(`sms:?body=${encodeURIComponent(`Join AG TechScript! Code: ${code}. https://agtechscript.in`)}`, "_blank");
}

function viewAllReferrals() {
  const items = referralData.referrals?.map(
    (r) => `<div class="referral-item" style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #eee;">
      <div><strong>${esc(r.name || r.user_id)}</strong><br><small>${timeAgo(r.joined_at)}</small></div>
      <div class="referral-badge">+2000</div>
    </div>`
  ).join("") || "<p>No referrals yet.</p>";

  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:999;";
  modal.innerHTML = `
    <div style="background:#fff;border-radius:14px;padding:28px;max-width:480px;width:90%;max-height:80vh;overflow-y:auto;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <h3 style="margin:0;">📋 All Referrals (${referralData.count || 0})</h3>
        <span onclick="this.closest('.modal-overlay').remove()" style="cursor:pointer;font-size:20px;">✕</span>
      </div>
      ${items}
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.remove(); });
}

// ─── Utilities ────────────────────────────────────────────────
function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.innerText = val;
}

function esc(text) {
  if (!text) return "";
  const d = document.createElement("div");
  d.textContent = text;
  return d.innerHTML;
}

function timeAgo(ts) {
  if (!ts) return "recently";
  try {
    const diff = Math.floor((Date.now() - new Date(ts)) / 86400000);
    if (diff === 0) return "today";
    if (diff === 1) return "yesterday";
    if (diff < 30) return `${diff} days ago`;
    return new Date(ts).toLocaleDateString();
  } catch {
    return ts;
  }
}

async function workerGet(path) {
  try {
    const res = await fetch(`${window.CONFIG.WORKER_URL}${path}`, {
      credentials: "include",
      headers: { "X-Client-Host": window.location.host },
    });
    return res.ok ? res.json() : null;
  } catch {
    return null;
  }
}

// Expose share functions globally (used by inline onclick)
window.copyReferralCode = copyReferralCode;
window.shareViaWhatsApp = shareViaWhatsApp;
window.shareViaTelegram = shareViaTelegram;
window.shareViaTwitter = shareViaTwitter;
window.shareViaSMS = shareViaSMS;
window.viewAllReferrals = viewAllReferrals;
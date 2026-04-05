// dashboard.js - Top of file
document.addEventListener("DOMContentLoaded", initDashboard);

async function initDashboard() {
    console.log("📊 Initializing dashboard...");

    try {
        const user = await waitForUser();
        if (!user) {
            window.location.href = "https://agtechscript.in";
            return;
        }

        if (typeof loadHeader === 'function') await loadHeader();
        // Wait for Supabase (optional, don't block)
        if (typeof waitForSupabase === 'function') {
            await waitForSupabase(3000);
        }

        // Load all data (auto uses Supabase if ready)
        await loadDashboardStats();
        await loadFullUserProfile();
        await loadNotifications();
        await loadReferralStats();

        const dashboardContent = document.getElementById("dashboardContent");
        if (dashboardContent) dashboardContent.style.display = "block";

        const usernameEl = document.getElementById("username");
        if (usernameEl) {
            if (window.currentUser && (window.currentUser.name || window.currentUser.user_id)) {
                usernameEl.innerText = window.currentUser.name || window.currentUser.user_id;
            } else {
                usernameEl.innerText = "Guest";
            }
        }

        const referralCodeEl = document.getElementById("referralCode");
        if (referralCodeEl) {
            if (window.currentUser && window.currentUser.user_id) {
                referralCodeEl.innerText = window.currentUser.user_id;
            } else {
                referralCodeEl.innerText = "AG0000";
            }
        }

    } catch (err) {
        console.error("Dashboard init error:", err);
    }
}

async function loadDashboardStats() {
    try {
        if (window._supabaseSessionReady && window.currentUser?.user_id) {
            try {
                const [quizCount, purchaseCount, referralCount] = await Promise.all([
                    window.supabase.from('quizzes').select('id', { count: 'exact', head: true }).eq('user_id', window.currentUser.user_id),
                    window.supabase.from('purchases').select('id', { count: 'exact', head: true }).eq('user_id', window.currentUser.user_id),
                    window.supabase.from('referrals').select('id', { count: 'exact', head: true }).eq('referrer_id', window.currentUser.user_id)
                ]);

                document.getElementById("quizPlayed") && (document.getElementById("quizPlayed").innerText = quizCount.count || 0);
                document.getElementById("purchaseCount") && (document.getElementById("purchaseCount").innerText = purchaseCount.count || 0);
                document.getElementById("referralCount") && (document.getElementById("referralCount").innerText = referralCount.count || 0);
                return;
            } catch (e) {
                console.log("Supabase stats failed, using worker");
            }
        }

        const res = await fetch(`${window.CONFIG.WORKER_URL}/api/user/dashboard-stats`, {
            credentials: "include",
            headers: { "X-Client-Host": window.location.host }
        });
        const data = await res.json();
        if (data.success) {
            document.getElementById("quizPlayed") && (document.getElementById("quizPlayed").innerText = data.quizPlayed || 0);
            document.getElementById("quizScore") && (document.getElementById("quizScore").innerText = data.quizScore || 0);
            document.getElementById("purchaseCount") && (document.getElementById("purchaseCount").innerText = data.purchases || 0);
            document.getElementById("referralCount") && (document.getElementById("referralCount").innerText = data.referrals || 0);
        }
    } catch (err) {
        console.error("Stats error:", err);
    }
}

async function loadFullUserProfile() {
    try {
        if (window._supabaseSessionReady && window.currentUser?.user_id) {
            try {
                const { data, error } = await window.supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('user_id', window.currentUser.user_id)
                    .maybeSingle();

                if (!error && data) {
                    window.currentUser = { ...window.currentUser, ...data };
                    const usernameEl = document.getElementById("username");
                    if (usernameEl) usernameEl.innerText = data.name || data.user_id;
                    return;
                }
            } catch (e) {
                console.error("Supabase profile fetch error:", e);
            }
        }

        const res = await fetch(`${window.CONFIG.WORKER_URL}/api/user/profile?user_id=${window.currentUser.user_id}`, {
            credentials: "include",
            headers: { "X-Client-Host": window.location.host }
        });
        const data = await res.json();
        if (data.success) {
            window.currentUser = { ...window.currentUser, ...data };
            const usernameEl = document.getElementById("username");
            if (usernameEl) usernameEl.innerText = data.name || data.user_id;
        }
    } catch (err) {
        console.error("Profile error:", err);
    }
}

async function loadNotifications() {
    const box = document.getElementById("notifications");
    if (!box) return;

    try {
        if (window._supabaseSessionReady) {
            try {
                const { data, error } = await window.supabase
                    .from('notifications')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (!error && data?.length) {
                    box.innerHTML = data.map(n => `
                        <div class="note-card">
                            <b>${escapeHtml(n.title || 'Notification')}</b>
                            <p>${escapeHtml(n.message || '')}</p>
                            <span class="note-time">${formatDate(n.created_at)}</span>
                        </div>
                    `).join("");
                    return;
                }
            } catch (e) {
                console.error("Error in loadNotifications Supabase fetch:", e);
            }
        }

        const res = await fetch(`${window.CONFIG.WORKER_URL}/api/user/notifications`, {
            credentials: "include",
            headers: { "X-Client-Host": window.location.host }
        });

        if (res.ok) {
            const data = await res.json();
            if (data.success && data.notifications?.length) {
                box.innerHTML = data.notifications.slice(0,5).map(n => `
                    <div class="note-card">
                        <b>${escapeHtml(n.title || 'Notification')}</b>
                        <p>${escapeHtml(n.message || '')}</p>
                        <span class="note-time">${formatDate(n.created_at)}</span>
                    </div>
                `).join("");
                return;
            }
        }

        box.innerHTML = `<div class="note-card">Welcome to AG TechScript! Complete your first quiz to earn points.</div>`;
    } catch (error) {
        box.innerHTML = `<div class="note-card">Welcome to AG TechScript!</div>`;
    }
}

let referralData = { count: 0, earnings: 0, referrals: [] };

async function loadReferralStats() {
    try {
        const response = await fetch(`${window.CONFIG.WORKER_URL}/api/user/referral-stats`, {
            credentials: "include",
            headers: { "X-Client-Host": window.location.host }
        });
        const data = await response.json();
        if (data.success) {
            referralData = data;
            updateReferralUI();
        }
    } catch (err) {
        console.error("Referral stats error:", err);
    }
}

function updateReferralUI() {
    const countEl = document.getElementById('referralCount');
    const earningsEl = document.getElementById('referralEarnings');
    const codeSpan = document.getElementById('referralCode');

    if (countEl) countEl.innerText = referralData.count || 0;
    if (earningsEl) earningsEl.innerText = referralData.earnings || 0;
    if (codeSpan && window.currentUser?.user_id) {
        codeSpan.innerText = window.currentUser.user_id;
    }
    updateReferralList();
}

function updateReferralList() {
    const container = document.getElementById('referralList');
    if (!container) return;
    if (!referralData.referrals?.length) {
        container.innerHTML = `<div class="empty-state"><span>👥</span><p>No referrals yet. Share your code!</p></div>`;
        return;
    }
    container.innerHTML = referralData.referrals.slice(0,5).map(ref => `
        <div class="referral-item">
            <div class="referral-user">
                <div class="user-avatar">${ref.name ? ref.name.charAt(0) : '👤'}</div>
                <div class="user-info">
                    <div class="user-name">${escapeHtml(ref.name || ref.user_id || 'New User')}</div>
                    <div class="user-date">Joined ${formatDate(ref.joined_at)}</div>
                </div>
            </div>
            <div class="referral-badge">+2000 pts</div>
        </div>
    `).join('');
}

async function copyReferralCode() {
    const code = window.currentUser?.user_id;
    if (!code) return;
    try {
        await navigator.clipboard.writeText(code);
        const feedback = document.getElementById('copyFeedback');
        if (feedback) {
            feedback.classList.add('show');
            setTimeout(() => feedback.classList.remove('show'), 2000);
        }
    } catch (err) {
        console.error("Clipboard copy error:", err);
    }
}

function shareViaWhatsApp() {
    const code = window.currentUser?.user_id;
    if (!code) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(`Join AG TechScript! Use code: ${code} https://agtechscript.in/register`)}`, "_blank");
}

function shareViaTelegram() {
    const code = window.currentUser?.user_id;
    if (!code) return;
    window.open(`https://t.me/share/url?url=${encodeURIComponent('https://agtechscript.in/register')}&text=${encodeURIComponent(`Join AG TechScript! Use code: ${code}`)}`, "_blank");
}

function shareViaTwitter() {
    const code = window.currentUser?.user_id;
    if (!code) return;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Join AG TechScript! Use code: ${code} https://agtechscript.in/register`)}`, "_blank");
}

function shareViaSMS() {
    const code = window.currentUser?.user_id;
    if (!code) return;
    window.open(`sms:?body=${encodeURIComponent(`Join AG TechScript! Referral code: ${code}. Register at https://agtechscript.in/register`)}`, "_blank");
}

function viewAllReferrals() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `<div class="modal-content"><div class="modal-header"><h3>📋 All Referrals (${referralData.count || 0})</h3><span class="close-modal" onclick="this.closest('.modal-overlay').remove()">✕</span></div><div>${referralData.referrals?.map(ref => `<div class="referral-item"><div class="referral-user"><div class="user-avatar">${ref.name?.charAt(0) || '👤'}</div><div><strong>${escapeHtml(ref.name || ref.user_id)}</strong><br><small>${formatDate(ref.joined_at)}</small></div></div><div class="referral-badge">+2000</div></div>`).join('') || 'No referrals yet'}</div></div>`;
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('open'), 10);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(timestamp) {
    if (!timestamp) return 'Recently';
    try {
        const date = new Date(timestamp);
        const now = new Date();
        const diffDays = Math.floor((now - date) / 86400000);
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString();
    } catch (e) {
        return timestamp;
    }
}

window.copyReferralCode = copyReferralCode;
window.shareViaWhatsApp = shareViaWhatsApp;
window.shareViaTelegram = shareViaTelegram;
window.shareViaTwitter = shareViaTwitter;
window.shareViaSMS = shareViaSMS;
window.viewAllReferrals = viewAllReferrals;
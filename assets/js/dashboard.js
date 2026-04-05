// dashboard.js - Fixed version without import

document.addEventListener("DOMContentLoaded", initDashboard);

async function initDashboard() {
    try {
        const user = await waitForUser();
        if (!user) {
            console.error("User not loaded - auth failed");
            return;
        }

        loadHeader();
        
        // Wait for Supabase session to be ready
        await waitForSupabaseSession();
        
        await loadDashboardStats();
        
        const [profileResult, notificationsResult] = await Promise.all([
            loadFullUserProfile(),
            loadNotifications()
        ]);

        document.getElementById("dashboardContent").style.display = "block";
        document.getElementById("username").innerText = window.currentUser?.name || window.currentUser?.user_id;
        document.getElementById("referralCode").innerText = window.currentUser?.user_id;
        
        // Load referral stats
        await loadReferralStats();
    } catch (err) {
        console.error("Dashboard init error:", err);
    }
}

async function waitForUser() {
    let tries = 0;
    while (!window.currentUser && tries < 20) {
        await new Promise(r => setTimeout(r, 100));
        tries++;
    }
    return window.currentUser || null;
}

async function waitForSupabaseSession() {
    if (!window.supabase) return;
    
    let tries = 0;
    while (tries < 30) {
        const { data: { session } } = await window.supabase.auth.getSession();
        if (session) {
            console.log("✅ Supabase session ready");
            return;
        }
        await new Promise(r => setTimeout(r, 100));
        tries++;
    }
    console.warn("⚠️ Supabase session not ready, using fallback");
}

// ===========================================
// NOTIFICATIONS - Use Worker Fallback
// ===========================================
async function loadNotifications() {
    const box = document.getElementById("notifications");
    if (!box) return;

    try {
        let notifications = [];
        
        // Try worker first (since it's more reliable)
        if (window.CONFIG) {
            try {
                const res = await fetch(`${window.CONFIG.WORKER_URL}/api/user/notifications`, {
                    credentials: "include",
                    headers: { "X-Client-Host": window.location.host }
                });
                const data = await res.json();
                if (data.success && data.notifications) {
                    notifications = data.notifications;
                }
            } catch (err) {
                console.log("Worker notifications failed, trying Supabase");
            }
        }
        
        // Fallback to Supabase direct
        if (notifications.length === 0 && window.supabase) {
            const { data, error } = await window.supabase
                .from('notifications')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10);
            
            if (!error && data) {
                notifications = data;
            }
        }

        if (!notifications.length) {
            box.innerHTML = "<div class='note-card'>No notifications</div>";
            return;
        }

        const html = notifications.map(n => `
            <div class="note-card">
                <b>${escapeHtml(n.title || 'Notification')}</b>
                <p>${escapeHtml(n.message || '')}</p>
                <span class="note-time">${formatDate(n.created_at)}</span>
            </div>
        `).join("");

        box.innerHTML = html;
    } catch (error) {
        console.error("Error loading notifications:", error);
        box.innerHTML = "<div class='note-card error'>Failed to load notifications</div>";
    }
}

async function loadFullUserProfile() {
    try {
        let userData = null;
        
        // Try worker first
        if (window.CONFIG && window.currentUser?.user_id) {
            const res = await fetch(`${window.CONFIG.WORKER_URL}/api/user/profile?user_id=${window.currentUser.user_id}`, {
                credentials: "include",
                headers: { "X-Client-Host": window.location.host }
            });
            const data = await res.json();
            if (data.success) userData = data;
        }
        
        // Fallback to Supabase
        if (!userData && window.supabase && window.currentUser?.user_id) {
            const { data, error } = await window.supabase
                .from('user_profiles')
                .select('*')
                .eq('user_id', window.currentUser.user_id)
                .maybeSingle();
            
            if (!error && data) {
                userData = data;
            }
        }

        if (userData) {
            window.currentUser = { ...window.currentUser, ...userData };
            const usernameEl = document.getElementById("username");
            if (usernameEl) usernameEl.innerText = userData.name || userData.user_id;
        }
        return userData;
    } catch (err) {
        console.error("Profile load error:", err);
        return null;
    }
}

async function loadDashboardStats() {
    try {
        // Use worker for stats (more reliable)
        if (window.CONFIG) {
            const res = await fetch(`${window.CONFIG.WORKER_URL}/api/user/dashboard-stats`, {
                credentials: "include",
                headers: { "X-Client-Host": window.location.host }
            });
            const data = await res.json();
            if (data.success) {
                document.getElementById("quizPlayed").innerText = data.quizPlayed || 0;
                document.getElementById("quizScore").innerText = data.quizScore || 0;
                document.getElementById("purchaseCount").innerText = data.purchases || 0;
                document.getElementById("referralCount").innerText = data.referrals || 0;
                return;
            }
        }
        
        // Fallback: use defaults
        document.getElementById("quizPlayed").innerText = "0";
        document.getElementById("quizScore").innerText = "0";
        document.getElementById("purchaseCount").innerText = "0";
        document.getElementById("referralCount").innerText = "0";
    } catch (err) {
        console.error("Stats error:", err);
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(timestamp) {
    if (!timestamp) return new Date().toLocaleString();
    return new Date(timestamp).toLocaleString();
}

// ===========================================
// REFERRAL SYSTEM (Keep as is, but add error handling)
// ===========================================
let referralData = {
    count: 0,
    earnings: 0,
    rank: 1,
    referrals: [],
    nextMilestone: 5,
    currentMilestone: 0
};

const MILESTONE_REWARDS = {
    1: { points: 50, badge: "🎁 Starter" },
    3: { points: 100, badge: "🏅 Bronze" },
    5: { points: 200, badge: "🥈 Silver" },
    10: { points: 500, badge: "🥇 Gold" },
    20: { points: 1000, badge: "👑 Legend" }
};

async function loadReferralStats() {
    try {
        if (window.CONFIG) {
            const response = await fetch(`${window.CONFIG.WORKER_URL}/api/user/referral-stats`, {
                credentials: "include",
                headers: { "X-Client-Host": window.location.host }
            });
            const data = await response.json();
            
            if (data.success) {
                referralData = data;
                updateReferralUI();
            }
        }
    } catch (err) {
        console.error("Failed to load referral stats:", err);
    }
}

function updateReferralUI() {
    const countEl = document.getElementById('referralCount');
    const earningsEl = document.getElementById('referralEarnings');
    const rankEl = document.getElementById('referralRank');
    const codeSpan = document.getElementById('referralCode');
    
    if (countEl) countEl.innerText = referralData.count || 0;
    if (earningsEl) earningsEl.innerText = referralData.earnings || 0;
    if (rankEl) rankEl.innerHTML = `#${referralData.rank || 1}`;
    if (codeSpan && window.currentUser?.user_id) {
        codeSpan.innerText = window.currentUser.user_id;
    }
    
    const count = referralData.count || 0;
    let nextMilestone = 1;
    
    for (const milestone in MILESTONE_REWARDS) {
        if (count >= parseInt(milestone)) {
            nextMilestone = parseInt(milestone) + 1;
            while (!MILESTONE_REWARDS[nextMilestone] && nextMilestone < 50) {
                nextMilestone++;
            }
        } else {
            nextMilestone = parseInt(milestone);
            break;
        }
    }
    
    const progressBar = document.getElementById('referralProgress');
    if (progressBar) {
        const progressPercent = Math.min((count / nextMilestone) * 100, 100);
        progressBar.style.width = `${progressPercent}%`;
    }
    
    const nextRewardText = document.getElementById('nextRewardText');
    const nextReward = MILESTONE_REWARDS[nextMilestone];
    if (nextRewardText && nextReward) {
        const remaining = nextMilestone - count;
        nextRewardText.innerHTML = `${nextReward.badge}: ${nextReward.points} points at ${nextMilestone} referrals (${remaining} more)`;
    }
    
    updateReferralList();
}

function updateReferralList() {
    const container = document.getElementById('referralList');
    if (!container) return;
    
    if (!referralData.referrals || referralData.referrals.length === 0) {
        container.innerHTML = `<div class="empty-state"><span>👥</span><p>No referrals yet. Share your code!</p></div>`;
        return;
    }
    
    container.innerHTML = referralData.referrals.slice(0, 5).map(ref => `
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
    if (!code) {
        toast("Please login first", "#ef4444");
        return;
    }
    
    try {
        await navigator.clipboard.writeText(code);
        const feedback = document.getElementById('copyFeedback');
        if (feedback) {
            feedback.classList.add('show');
            setTimeout(() => feedback.classList.remove('show'), 2000);
        }
        toast("✅ Referral code copied!", "#10b981");
    } catch (err) {
        toast("Failed to copy", "#ef4444");
    }
}

function shareViaWhatsApp() {
    const code = window.currentUser?.user_id;
    if (!code) return;
    const message = `🎁 Join AG TechScript & Earn Rewards! 🎁\n\nUse my referral code: ${code}\nhttps://agtechscript.in/register`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
}

function shareViaTelegram() {
    const code = window.currentUser?.user_id;
    if (!code) return;
    const message = `🎁 Join AG TechScript!\nReferral code: ${code}\nhttps://agtechscript.in/register`;
    window.open(`https://t.me/share/url?url=${encodeURIComponent('https://agtechscript.in/register')}&text=${encodeURIComponent(message)}`, "_blank");
}

function shareViaTwitter() {
    const code = window.currentUser?.user_id;
    if (!code) return;
    const text = `Join AG TechScript! Use my referral code: ${code}\nhttps://agtechscript.in/register`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
}

function shareViaSMS() {
    const code = window.currentUser?.user_id;
    if (!code) return;
    const message = `Join AG TechScript! Referral code: ${code}. Register at https://agtechscript.in/register`;
    window.open(`sms:?body=${encodeURIComponent(message)}`, "_blank");
}

function viewAllReferrals() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `<div class="modal-content"><div class="modal-header"><h3>📋 All Referrals (${referralData.count || 0})</h3><span class="close-modal" onclick="this.closest('.modal-overlay').remove()">✕</span></div><div id="allReferralsList">${referralData.referrals?.map(ref => `<div class="referral-item"><div class="referral-user"><div class="user-avatar">${ref.name?.charAt(0) || '👤'}</div><div><div><strong>${escapeHtml(ref.name || ref.user_id)}</strong></div><small>${formatDate(ref.joined_at)}</small></div></div><div class="referral-badge">+2000</div></div>`).join('') || '<div class="empty-state">No referrals yet</div>'}</div></div>`;
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('open'), 10);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

function toast(msg, color) {
    const toastEl = document.createElement('div');
    toastEl.style.cssText = `position:fixed;bottom:20px;right:20px;background:${color};color:white;padding:12px 24px;border-radius:8px;z-index:9999;animation:slideIn 0.3s ease`;
    toastEl.textContent = msg;
    document.body.appendChild(toastEl);
    setTimeout(() => toastEl.remove(), 3000);
}

// Make functions global
window.copyReferralCode = copyReferralCode;
window.shareViaWhatsApp = shareViaWhatsApp;
window.shareViaTelegram = shareViaTelegram;
window.shareViaTwitter = shareViaTwitter;
window.shareViaSMS = shareViaSMS;
window.viewAllReferrals = viewAllReferrals;
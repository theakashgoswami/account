// dashboard.js - No import, no module, pure vanilla JS

document.addEventListener("DOMContentLoaded", initDashboard);

async function initDashboard() {
    console.log("📊 Initializing dashboard...");
    
    try {
        const user = await waitForUser();
        if (!user) {
            console.error("User not loaded - auth failed");
            window.location.href = "https://agtechscript.in#login";
            return;
        }

        // Load header
        if (typeof loadHeader === 'function') {
            await loadHeader();
        }
        
        // 🔥 Wait for Supabase session (optional, don't block)
        if (typeof waitForSupabase === 'function') {
            waitForSupabase(3000).then(ready => {
                if (ready) {
                    console.log("✅ Supabase ready, using direct reads");
                } else {
                    console.log("ℹ️ Using worker-only mode");
                }
            });
        }
        
        // Load dashboard data
        await loadDashboardStats();
        await loadFullUserProfile();
        await loadNotifications();
        await loadReferralStats();

        // Show dashboard
        const dashboardContent = document.getElementById("dashboardContent");
        if (dashboardContent) dashboardContent.style.display = "block";
        
        const usernameEl = document.getElementById("username");
        if (usernameEl) usernameEl.innerText = window.currentUser?.name || window.currentUser?.user_id;
        
        const referralCodeEl = document.getElementById("referralCode");
        if (referralCodeEl) referralCodeEl.innerText = window.currentUser?.user_id || "AG0000";
        
    } catch (err) {
        console.error("Dashboard init error:", err);
        showDashboardError();
    }
}                   

async function waitForUser() {
    let tries = 0;
    while (!window.currentUser && tries < 30) {
        await new Promise(r => setTimeout(r, 100));
        tries++;
    }
    
    if (!window.currentUser) {
        // Try one last time
        try {
            const res = await fetch(`${window.CONFIG.WORKER_URL}/api/auth/status`, {
                credentials: 'include',
                headers: { 'X-Client-Host': window.location.host }
            });
            const data = await res.json();
            if (data.authenticated) {
                window.currentUser = data;
            }
        } catch(e) {}
    }
    
    return window.currentUser || null;
}

function showDashboardError() {
    const container = document.querySelector('.dashboard-container');
    if (container) {
        container.innerHTML = `
            <div class="error-state" style="text-align:center;padding:50px;">
                <i class="fas fa-exclamation-triangle" style="font-size:48px;color:#f44336;"></i>
                <h2>Unable to load dashboard</h2>
                <p>Please <a href="https://agtechscript.in">login again</a> or refresh the page.</p>
                <button onclick="location.reload()" style="padding:10px 20px;background:#667eea;color:white;border:none;border-radius:8px;">Refresh</button>
            </div>
        `;
    }
}

// ===========================================
// DASHBOARD STATS - Worker Only (Reliable)
// ===========================================
async function loadDashboardStats() {
    try {
        if (!window.CONFIG) return;
        
        const res = await fetch(`${window.CONFIG.WORKER_URL}/api/user/dashboard-stats`, {
            credentials: "include",
            headers: { "X-Client-Host": window.location.host }
        });
        const data = await res.json();
        
        if (data.success) {
            const quizPlayed = document.getElementById("quizPlayed");
            const quizScore = document.getElementById("quizScore");
            const purchaseCount = document.getElementById("purchaseCount");
            const referralCount = document.getElementById("referralCount");
            
            if (quizPlayed) quizPlayed.innerText = data.quizPlayed || 0;
            if (quizScore) quizScore.innerText = data.quizScore || 0;
            if (purchaseCount) purchaseCount.innerText = data.purchases || 0;
            if (referralCount) referralCount.innerText = data.referrals || 0;
        }
    } catch (err) {
        console.error("Stats error:", err);
        // Set default values
        document.getElementById("quizPlayed") && (document.getElementById("quizPlayed").innerText = "0");
        document.getElementById("quizScore") && (document.getElementById("quizScore").innerText = "0");
        document.getElementById("purchaseCount") && (document.getElementById("purchaseCount").innerText = "0");
        document.getElementById("referralCount") && (document.getElementById("referralCount").innerText = "0");
    }
}

// ===========================================
// USER PROFILE - Worker Only
// ===========================================
async function loadFullUserProfile() {
    try {
        if (!window.CONFIG || !window.currentUser?.user_id) return null;
        
        const res = await fetch(`${window.CONFIG.WORKER_URL}/api/user/profile?user_id=${window.currentUser.user_id}`, {
            credentials: "include",
            headers: { "X-Client-Host": window.location.host }
        });
        const data = await res.json();
        
        if (data.success) {
            window.currentUser = { ...window.currentUser, ...data };
            const usernameEl = document.getElementById("username");
            if (usernameEl) usernameEl.innerText = data.name || data.user_id;
            return data;
        }
        return null;
    } catch (err) {
        console.error("Profile load error:", err);
        return null;
    }
}

// ===========================================
// NOTIFICATIONS - Worker Only (Fix 404)
// ===========================================
async function loadNotifications() {
    const box = document.getElementById("notifications");
    if (!box) return;

    try {
        // Try worker endpoint
        if (window.CONFIG) {
            const res = await fetch(`${window.CONFIG.WORKER_URL}/api/user/notifications`, {
                credentials: "include",
                headers: { "X-Client-Host": window.location.host }
            });
            
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.notifications?.length) {
                    renderNotifications(box, data.notifications);
                    return;
                }
            }
        }
        
        // If no notifications from API, show default
        box.innerHTML = `
            <div class="note-card">
                <b>✨ Welcome to AG TechScript!</b>
                <p>Complete daily quiz and spin the wheel to earn points!</p>
                <span class="note-time">Just now</span>
            </div>
            <div class="note-card">
                <b>🏆 Leaderboard Challenge</b>
                <p>Top users get special rewards every week!</p>
                <span class="note-time">Today</span>
            </div>
        `;
        
    } catch (error) {
        console.error("Error loading notifications:", error);
        box.innerHTML = "<div class='note-card'>No notifications at this time</div>";
    }
}

function renderNotifications(container, notifications) {
    if (!notifications.length) {
        container.innerHTML = "<div class='note-card'>No notifications</div>";
        return;
    }
    
    const html = notifications.slice(0, 5).map(n => `
        <div class="note-card">
            <b>${escapeHtml(n.title || 'Notification')}</b>
            <p>${escapeHtml(n.message || '')}</p>
            <span class="note-time">${formatDate(n.created_at)}</span>
        </div>
    `).join("");
    
    container.innerHTML = html;
}

// ===========================================
// REFERRAL SYSTEM - Worker Only
// ===========================================
let referralData = {
    count: 0,
    earnings: 0,
    referrals: []
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
        if (!window.CONFIG) return;
        
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

// ===========================================
// SHARE FUNCTIONS
// ===========================================
async function copyReferralCode() {
    const code = window.currentUser?.user_id;
    if (!code) {
        showToast("Please login first", "error");
        return;
    }
    
    try {
        await navigator.clipboard.writeText(code);
        const feedback = document.getElementById('copyFeedback');
        if (feedback) {
            feedback.classList.add('show');
            setTimeout(() => feedback.classList.remove('show'), 2000);
        }
        showToast("✅ Referral code copied!", "success");
    } catch (err) {
        showToast("Failed to copy", "error");
    }
}

function shareViaWhatsApp() {
    const code = window.currentUser?.user_id;
    if (!code) return;
    const message = `🎁 Join AG TechScript & Earn Rewards! 🎁\n\nUse my referral code: ${code}\nhttps://agtechscript.in/#login`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
}

function shareViaTelegram() {
    const code = window.currentUser?.user_id;
    if (!code) return;
    const message = `🎁 Join AG TechScript!\nReferral code: ${code}\nhttps://agtechscript.in/#login`;
    window.open(`https://t.me/share/url?url=${encodeURIComponent('https://agtechscript.in/#login')}&text=${encodeURIComponent(message)}`, "_blank");
}

function shareViaTwitter() {
    const code = window.currentUser?.user_id;
    if (!code) return;
    const text = `Join AG TechScript! Use my referral code: ${code}\nhttps://agtechscript.in/#login`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
}

function shareViaSMS() {
    const code = window.currentUser?.user_id;
    if (!code) return;
    const message = `Join AG TechScript! Referral code: ${code}. Register at https://agtechscript.in/#login`;
    window.open(`sms:?body=${encodeURIComponent(message)}`, "_blank");
}

function viewAllReferrals() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>📋 All Referrals (${referralData.count || 0})</h3>
                <span class="close-modal" onclick="this.closest('.modal-overlay').remove()">✕</span>
            </div>
            <div id="allReferralsList">
                ${referralData.referrals?.map(ref => `
                    <div class="referral-item">
                        <div class="referral-user">
                            <div class="user-avatar">${ref.name?.charAt(0) || '👤'}</div>
                            <div>
                                <div><strong>${escapeHtml(ref.name || ref.user_id)}</strong></div>
                                <small>${formatDate(ref.joined_at)}</small>
                            </div>
                        </div>
                        <div class="referral-badge">+2000</div>
                    </div>
                `).join('') || '<div class="empty-state">No referrals yet</div>'}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('open'), 10);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

function showToast(msg, type) {
    const toastEl = document.createElement('div');
    const bgColor = type === 'error' ? '#f44336' : (type === 'success' ? '#4caf50' : '#2196f3');
    toastEl.style.cssText = `position:fixed;bottom:20px;right:20px;background:${bgColor};color:white;padding:12px 24px;border-radius:8px;z-index:9999;animation:slideIn 0.3s ease;box-shadow:0 2px 10px rgba(0,0,0,0.2)`;
    toastEl.textContent = msg;
    document.body.appendChild(toastEl);
    setTimeout(() => toastEl.remove(), 3000);
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================
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
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        return date.toLocaleDateString();
    } catch(e) {
        return timestamp;
    }
}

// Make functions global
window.copyReferralCode = copyReferralCode;
window.shareViaWhatsApp = shareViaWhatsApp;
window.shareViaTelegram = shareViaTelegram;
window.shareViaTwitter = shareViaTwitter;
window.shareViaSMS = shareViaSMS;
window.viewAllReferrals = viewAllReferrals;
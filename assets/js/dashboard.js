document.addEventListener("DOMContentLoaded", initDashboard);
import { supabase, getNotifications, getCurrentUserProfile } from './supabase-client.js';
async function initDashboard() {

    try {

        // Wait until guard.js loads user (max 2s)
        const user = await waitForUser();

        if (!user) {
            console.error("User not loaded - auth failed");
            return;
        }

        // Load header instantly (no await needed)
        loadHeader();
        await loadDashboardStats();
        // Parallel loading (FAST)
        const [profileResult, notificationsResult] = await Promise.all([
            loadFullUserProfile(),
            loadNotifications()
        ]);

        // Show dashboard
        document.getElementById("dashboardContent").style.display = "block";
        document.getElementById("username").innerText =
            window.currentUser?.name || window.currentUser?.user_id;
            document.getElementById("referralCode").innerText =
    window.currentUser?.user_id;

    } catch (err) {
        console.error("Dashboard init error:", err);
    }
}

async function waitForUser() {

    let tries = 0;

    while (!window.currentUser && tries < 20) {
        await new Promise(r => setTimeout(r,100));
        tries++;
    }

    return window.currentUser || null;
}
// ===========================================
// REFERRAL SYSTEM - FULL VERSION
// ===========================================

let referralData = {
    count: 0,
    earnings: 0,
    rank: 1,
    referrals: [],
    nextMilestone: 5,
    currentMilestone: 0
};

// Milestone rewards
const MILESTONE_REWARDS = {
    1: { points: 50, badge: "🎁 Starter" },
    3: { points: 100, badge: "🏅 Bronze" },
    5: { points: 200, badge: "🥈 Silver" },
    10: { points: 500, badge: "🥇 Gold" },
    20: { points: 1000, badge: "👑 Legend" }
};

async function loadReferralStats() {
    try {
        const response = await fetch(`${CONFIG.WORKER_URL}/api/user/referral-stats`, {
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
    // Update stats
    document.getElementById('referralCount').innerText = referralData.count || 0;
    document.getElementById('referralEarnings').innerText = referralData.earnings || 0;
    document.getElementById('referralRank').innerHTML = `#${referralData.rank || 1}`;
    
    // Update referral code
    const codeSpan = document.getElementById('referralCode');
    if (codeSpan && window.currentUser?.user_id) {
        codeSpan.innerText = window.currentUser.user_id;
    }
    
    // Update progress bar
    const count = referralData.count || 0;
    let nextMilestone = 1;
    let currentMilestone = 0;
    
    for (const milestone in MILESTONE_REWARDS) {
        if (count >= parseInt(milestone)) {
            currentMilestone = parseInt(milestone);
            nextMilestone = parseInt(milestone) + 1;
            while (!MILESTONE_REWARDS[nextMilestone] && nextMilestone < 50) {
                nextMilestone++;
            }
        } else {
            nextMilestone = parseInt(milestone);
            break;
        }
    }
    
    const progressPercent = Math.min((count / nextMilestone) * 100, 100);
    document.getElementById('referralProgress').style.width = `${progressPercent}%`;
    
    const nextReward = MILESTONE_REWARDS[nextMilestone];
    if (nextReward) {
        const remaining = nextMilestone - count;
        document.getElementById('nextRewardText').innerHTML = 
            `${nextReward.badge}: ${nextReward.points} points at ${nextMilestone} referrals (${remaining} more)`;
    } else {
        document.getElementById('nextRewardText').innerHTML = "🏆 You're a legend! Keep sharing!";
    }
    
    // Update referral list
    updateReferralList();
}

function updateReferralList() {
    const container = document.getElementById('referralList');
    if (!container) return;
    
    if (!referralData.referrals || referralData.referrals.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span>👥</span>
                <p>No referrals yet. Share your code!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = referralData.referrals.slice(0, 5).map(ref => `
        <div class="referral-item">
            <div class="referral-user">
                <div class="user-avatar">
                    ${ref.name ? ref.name.charAt(0) : '👤'}
                </div>
                <div class="user-info">
                    <div class="user-name">${ref.name || ref.user_id || 'New User'}</div>
                    <div class="user-date">Joined ${formatDate(ref.joined_at)}</div>
                </div>
            </div>
            <div class="referral-badge">+2000 pts</div>
        </div>
    `).join('');
}

function formatDate(dateString) {
    if (!dateString) return 'Recently';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
}

async function copyReferralCode() {
    const code = window.currentUser?.user_id;
    if (!code) {
        toast("Please login first", "#ef4444");
        return;
    }
    
    try {
        await navigator.clipboard.writeText(code);
        
        // Show feedback
        const feedback = document.getElementById('copyFeedback');
        feedback.classList.add('show');
        setTimeout(() => feedback.classList.remove('show'), 2000);
        
        // Play success sound (optional)
        if (window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(50);
        }
        
        toast("✅ Referral code copied!", "#10b981");
    } catch (err) {
        toast("Failed to copy", "#ef4444");
    }
}

function shareViaWhatsApp() {
    const code = window.currentUser?.user_id;
    if (!code) {
        toast("Please login first", "#ef4444");
        return;
    }
    
    const link = "https://agtechscript.in/register";
    const message = `🎁 *Join AG TechScript & Earn Rewards!* 🎁

📝 Daily Quiz → Win Points
🎰 Spin Wheel → Get Bonuses
🏆 Leaderboard → Top Rewards

✨ Use my referral code: *${code}*
🔗 Register here: ${link}

Earn 2000 points when you join! 🚀`;
    
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
    
    // Track share event
    trackReferralShare('whatsapp');
}

function shareViaTelegram() {
    const code = window.currentUser?.user_id;
    if (!code) return;
    
    const message = `🎁 Join AG TechScript and earn rewards!\n\nUse my referral code: ${code}\nhttps://agtechscript.in/register`;
    const url = `https://t.me/share/url?url=${encodeURIComponent('https://agtechscript.in/register')}&text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
    trackReferralShare('telegram');
}

function shareViaTwitter() {
    const code = window.currentUser?.user_id;
    if (!code) return;
    
    const text = `🎁 Join AG TechScript and earn rewards! Use my referral code: ${code}\n\nhttps://agtechscript.in/register`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
    trackReferralShare('twitter');
}

function shareViaSMS() {
    const code = window.currentUser?.user_id;
    if (!code) return;
    
    const message = `Join AG TechScript and earn rewards! Use my referral code: ${code}. Register at https://agtechscript.in/register`;
    const url = `sms:?body=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
    trackReferralShare('sms');
}

function trackReferralShare(platform) {
    console.log(`Referral shared on ${platform}`);
    // Optional: Send analytics to backend
    fetch(`${CONFIG.WORKER_URL}/api/user/track-share`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform })
    }).catch(console.error);
}

async function viewAllReferrals() {
    // Create modal to show all referrals
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
                                <div><strong>${ref.name || ref.user_id}</strong></div>
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
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", async () => {
    if (window.currentUser?.user_id) {
        await loadReferralStats();
    }
});

// Make functions global
window.copyReferralCode = copyReferralCode;
window.shareViaWhatsApp = shareViaWhatsApp;
window.shareViaTelegram = shareViaTelegram;
window.shareViaTwitter = shareViaTwitter;
window.shareViaSMS = shareViaSMS;
window.viewAllReferrals = viewAllReferrals;
/* ===============================
   LOAD PROFILE
================================ */
async function loadFullUserProfile() {

    try {

        const res = await fetch(
            `${CONFIG.WORKER_URL}/api/user/profile?user_id=${window.currentUser.user_id}`,
            {
                credentials: "include",
                headers: { "X-Client-Host": window.location.host }
            }
        );

        const data = await res.json();

        if (data.success) {

            window.currentUser = data;

            document.getElementById("username").innerText =
                data.name || data.user_id;

        }

        return data;

    } catch (err) {
        console.error("Profile load error:", err);
        return null;
    }
}
async function loadDashboardStats(){

const res = await fetch(
`${CONFIG.WORKER_URL}/api/user/dashboard-stats`,
{
credentials:"include",
headers:{ "X-Client-Host":window.location.host }
});

const data = await res.json();

if(!data.success) return;

document.getElementById("quizPlayed").innerText = data.quizPlayed;
document.getElementById("quizScore").innerText = data.quizScore;
document.getElementById("purchaseCount").innerText = data.purchases;
document.getElementById("referralCount").innerText = data.referrals;

}

/* ===============================
   LOAD NOTIFICATIONS
================================ */
async function loadNotifications() {
    const box = document.getElementById("notifications");
    if (!box) return;

    try {
        // DIRECT SUPABASE READ - NO WORKER
        let notifications = [];
        
        if (window.supabase) {
            const { data, error } = await window.supabase
                .from('notifications')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10);
            
            if (!error && data) {
                notifications = data;
            }
        }
        
        // Fallback to worker if Supabase fails
        if (notifications.length === 0) {
            const result = await getNotifications();
            if (result?.success) {
                notifications = result.notifications || [];
            }
        }

        if (!notifications.length) {
            box.innerHTML = "<div class='note-card'>No notifications</div>";
            return;
        }

        const html = notifications.map(n => `
            <div class="note-card">
                <b>${n.title || 'Notification'}</b>
                <p>${n.message || ''}</p>
                <span class="note-time">${formatDate(n.created_at)}</span>
            </div>
        `).join("");

        box.innerHTML = html;

    } catch (error) {
        console.error("Error loading notifications:", error);
        box.innerHTML = "<div class='note-card error'>Failed to load notifications</div>";
    }
}

/* ===============================
   DATE FORMATTER
================================ */
function formatDate(timestamp) {
    if (!timestamp) return new Date().toLocaleString();
    return new Date(timestamp).toLocaleString();
}
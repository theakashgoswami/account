// State Management
const AppState = {
    isProcessing: false,
    currentReward: null
};

// ==========================================
// 2. UTILITY FUNCTIONS (Notifications, Stats, Dates)
// ==========================================
const UI = {
    showNotification(message, type = 'info') {
        const colors = { success: '#4CAF50', error: '#f44336', info: '#2196F3' };
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = message;
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px; background: ${colors[type]};
            color: white; padding: 12px 24px; border-radius: 8px; z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-weight: 500;
            transition: all 0.3s ease; transform: translateX(120%);
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.style.transform = 'translateX(0)', 10);
        setTimeout(() => {
            notification.style.transform = 'translateX(120%)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    },

    updateAllStats(points, stamps) {
        const ids = ['overlayPoints', 'usePagePoints', 'overlayStamps', 'usePageStamps'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = (id.includes('Points')) ? points : stamps;
        });
    },

    formatDate(ts) {
        if (!ts) return "-";
        const d = new Date(ts);
        return isNaN(d) ? "-" : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    }
};

// ==========================================
// 3. HEADER & NAVIGATION LOGIC
// ==========================================
async function loadHeader() {
    try {
        const container = document.getElementById("header-container");
        if (!container) return;
        
        const res = await fetch("/partials/header.html");
        container.innerHTML = await res.text();
        
        initHeaderControls();
        console.log("✅ Header Loaded");
    } catch (err) {
        console.error("❌ Header Error:", err);
    }
}

function initHeaderControls() {
    const navToggle = document.getElementById("navToggle");
    const mainNav = document.getElementById("mainNav");
    const header = document.getElementById("header");

    if (!navToggle || !mainNav) return;

    // Toggle Mobile Menu
    navToggle.onclick = (e) => {
        e.preventDefault();
        mainNav.classList.toggle("active");
        navToggle.innerHTML = mainNav.classList.contains("active") ? "✕" : "☰";
    };

    // Scroll Hide/Show
    let lastY = window.scrollY;
    window.addEventListener("scroll", () => {
        const currentY = window.scrollY;
        if (header) {
            header.style.transform = (currentY > lastY && currentY > 100) ? "translateY(-100%)" : "translateY(0)";
        }
        lastY = currentY;
    }, { passive: true });

    // Close on link click
    document.querySelectorAll(".nav-menu a").forEach(link => {
        link.onclick = () => {
            mainNav.classList.remove("active");
            navToggle.innerHTML = "☰";
        };
    });
}

// ==========================================
// 4. USER AUTH & OVERLAY LOGIC
// ==========================================
async function waitForUser() {
    if (window.currentUser) return window.currentUser;
    for (let i = 0; i < 30; i++) { // Max 3 seconds
        if (window.currentUser) return window.currentUser;
        await new Promise(r => setTimeout(r, 100));
    }
    return null;
}

async function fetchUserProfile() {
    try {
        const res = await fetch(`${CONFIG.WORKER_URL}/api/user/profile`, {
            credentials: "include",
            headers: { 'X-Client-Host': window.location.host }
        });
        const data = await res.json();
        if (data.success) {
            window.currentUser = data;
            syncUserUI(data);
            return data;
        }
    } catch (err) { console.error("Profile Fetch Failed"); }
    return null;
}

function syncUserUI(user) {
    // 1. Update Header/Overlay Icon
    const iconDiv = document.getElementById("userIcon");
    if (iconDiv) {
        iconDiv.innerHTML = `
            <img src="${user.profile_image || '/assets/images/default-avatar.png'}" class="user-avatar-img" onerror="this.src='/assets/images/default-avatar.png'"/>
            <span class="user-status online"></span>
        `;
    }

    // 2. Update Overlay Details
    const oName = document.getElementById('overlayUserName');
    const oId = document.getElementById('overlayUserId');
    const oImg = document.getElementById('overlayUserImage');
    if (oName) oName.textContent = user.name || 'User';
    if (oId) oId.textContent = `@${user.user_id}`;
    if (oImg) oImg.src = user.profile_image || '/assets/images/default-avatar.png';

    // 3. Update Dashboard/Profile Page
    const dashName = document.getElementById("username");
    if (dashName) dashName.textContent = user.name;
    
    const profName = document.getElementById('fullName');
    if (profName) {
        profName.value = user.name || '';
        if(document.getElementById('email')) document.getElementById('email').value = user.email || '';
        if(document.getElementById('phone')) document.getElementById('phone').value = user.phone || '';
        if(document.getElementById('address')) document.getElementById('address').value = user.address || '';
        if(document.getElementById('profileAvatar')) document.getElementById('profileAvatar').src = user.profile_image || '/assets/images/default-avatar.png';
        if(document.getElementById('metaUserId')) document.getElementById('metaUserId').textContent = user.user_id;
    }
}

// Global Overlay Functions
window.toggleUserOverlay = function() {
    const overlay = document.getElementById('userOverlay');
    const backdrop = document.getElementById('overlayBackdrop');
    if (!overlay) return;

    if (!overlay.classList.contains('active')) {
        // Close Nav first
        const mainNav = document.getElementById('mainNav');
        if (mainNav) mainNav.classList.remove('active');
        
        overlay.classList.add('active');
        if (backdrop) backdrop.classList.add('active');
        fetchUserProfile(); // Refresh data
    } else {
        overlay.classList.remove('active');
        if (backdrop) backdrop.classList.remove('active');
    }
};

window.logout = async function() {
    try {
        const res = await fetch(`${CONFIG.WORKER_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' });
        if (res.ok) window.location.href = 'https://agtechscript.in';
    } catch (err) { UI.showNotification("Logout failed", "error"); }
};

// ==========================================
// 5. DASHBOARD & NOTIFICATIONS
// ==========================================
async function loadDashboard() {
    const dash = document.getElementById("dashboardContent");
    if (!dash) return;

    const user = await waitForUser();
    if (!user) return;

    dash.style.display = "block";
    await loadNotifications();
}

async function loadNotifications() {
    const box = document.getElementById("notifications");
    if (!box) return;

    box.innerHTML = '<div class="note-card">Loading...</div>';
    try {
        const res = await fetch(`${CONFIG.WORKER_URL}/api/user/notifications`, { credentials: 'include' });
        const data = await res.json();

        if (data.success && data.notifications?.length > 0) {
            box.innerHTML = data.notifications.map(n => `
                <div class="note-card">
                    <b>${n.activity}</b>
                    <p>${n.details}</p>
                    <span class="note-time">${UI.formatDate(n.timestamp)}</span>
                </div>
            `).join("");
        } else {
            box.innerHTML = '<div class="note-card">No notifications found.</div>';
        }
    } catch (err) { box.innerHTML = '<div class="note-card error">Error loading updates</div>'; }
}

// ==========================================
// 6. REWARDS & REDEMPTION (Use Page)
// ==========================================
async function loadRewardsPage() {
    const grid = document.getElementById('rewardsGrid');
    if (!grid) return;

    try {
        const res = await fetch(`${CONFIG.WORKER_URL}/api/user/use`, { credentials: 'include' });
        const data = await res.json();
        
        if (data.success) {
            UI.updateAllStats(data.userPoints, data.userStamps);
            grid.innerHTML = data.rewards.map(r => `
                <div class="reward-card ${!r.canAfford ? 'cannot-afford' : ''}">
                    <h3>${r.reward_name}</h3>
                    <div class="cost">${r.cost_points} Pts | ${r.cost_stamps} Stamps</div>
                    <button class="redeem-btn" 
                        onclick="openRedeemModal('${r.reward_id}', '${r.reward_name}', ${r.cost_points}, ${r.cost_stamps})"
                        ${!r.canAfford ? 'disabled' : ''}>Redeem</button>
                </div>
            `).join('');
            loadHistoryList();
        }
    } catch (err) { grid.innerHTML = 'Error loading rewards'; }
}

async function loadHistoryList() {
    const list = document.getElementById('historyList');
    if (!list) return;
    try {
        const res = await fetch(`${CONFIG.WORKER_URL}/api/user/pointslog`, { credentials: 'include' });
        const data = await res.json();
        if (data.success) {
            list.innerHTML = data.use.map(h => `
                <div class="history-item">
                    <span>${h.description}</span>
                    <span style="color:red">-${h.points}</span>
                </div>
            `).join('');
        }
    } catch (e) { console.log("History failed"); }
}

window.openRedeemModal = function(id, name, pts, stp) {
    AppState.currentReward = { id, name, pts, stp };
    document.getElementById('modalRewardDetails').innerHTML = `Redeem <b>${name}</b> for ${pts} points?`;
    document.getElementById('confirmModal').style.display = 'flex';
};

window.closeModal = () => { document.getElementById('confirmModal').style.display = 'none'; };

window.confirmRedeem = async function() {
    if (AppState.isProcessing || !AppState.currentReward) return;
    AppState.isProcessing = true;
    
    try {
        const res = await fetch(`${CONFIG.WORKER_URL}/api/user/redeem`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                rewardId: AppState.currentReward.id, 
                rewardName: AppState.currentReward.name,
                pointsCost: AppState.currentReward.pts,
                stampsCost: AppState.currentReward.stp
            }),
            credentials: 'include'
        });
        const data = await res.json();
        if (data.success) {
            UI.showNotification("Redeemed successfully!", "success");
            closeModal();
            loadRewardsPage(); // Refresh
        } else {
            UI.showNotification(data.error, "error");
        }
    } catch (e) { UI.showNotification("Server error", "error"); }
    finally { AppState.isProcessing = false; }
};

// ==========================================
// 7. PROFILE UPDATE LOGIC
// ==========================================
async function handleProfileUpdate(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    
    const formData = {
        user_id: window.currentUser.user_id,
        name: document.getElementById('fullName').value,
        phone: document.getElementById('phone').value,
        address: document.getElementById('address').value,
        newPassword: document.getElementById('newPassword').value || undefined
    };

    try {
        const res = await fetch(`${CONFIG.WORKER_URL}/api/user/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
            credentials: 'include'
        });
        const data = await res.json();
        if (data.success) {
            UI.showNotification("Profile Updated!", "success");
            fetchUserProfile();
        }
    } catch (e) { UI.showNotification("Update Failed", "error"); }
    finally { btn.disabled = false; }
}

// ==========================================
// 8. INITIALIZE EVERYTHING
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
    
    // Core loads
    await loadHeader();
    await fetchUserProfile();
    
    // Page specific loads
    loadDashboard();
    loadRewardsPage();
    
    const profForm = document.getElementById('editProfileForm');
    if (profForm) profForm.addEventListener('submit', handleProfileUpdate);

    // Click outside to close overlays/modals
    document.addEventListener('click', (e) => {
        if (e.target.id === 'overlayBackdrop') window.toggleUserOverlay();
        if (e.target.id === 'confirmModal') window.closeModal();
    });

    // Footer Year
    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();
    
    console.log("🚀 AG Tech App Ready");
});
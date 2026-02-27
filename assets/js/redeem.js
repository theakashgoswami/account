let currentUser = null;
let userStamps = 0;

document.addEventListener("DOMContentLoaded", async () => {
    // Check if user is logged in
    const userData = localStorage.getItem("ag_user");
    if (!userData) {
        window.location.href = "login.html";
        return;
    }
    
    currentUser = JSON.parse(userData);
    
    // Load user's current stamps
    await loadUserStamps();
    
    // Load rewards
    loadRewards();
});

async function loadUserStamps() {
    try {
        const res = await apiGet({ 
            action: "getUserProfile", 
            id: currentUser.id 
        });
        
        if (res.status === "success") {
            userStamps = res.stamps || 0;
            
            // Update stamp counter in header
            updateStampCounter();
            
            // Update local storage
            currentUser.stamps = userStamps;
            localStorage.setItem("ag_user", JSON.stringify(currentUser));
        }
    } catch (e) {
        console.error("Error loading stamps:", e);
    }
}

function updateStampCounter() {
    const counterEl = document.getElementById("stampCounter");
    if (counterEl) {
        counterEl.innerHTML = `
            <div class="stamp-badge">
                <i class="fas fa-ticket-alt"></i>
                Your Stamps
                <span class="stamp-count">${userStamps}</span>
            </div>
        `;
    }
}

async function loadRewards() {
    const container = document.getElementById("rewardList");

    // Show skeleton loader
    container.innerHTML = `
        <div class="rewards-skeleton">
            <div class="skeleton-card"></div>
            <div class="skeleton-card"></div>
            <div class="skeleton-card"></div>
            <div class="skeleton-card"></div>
        </div>
    `;

    try {
        const res = await apiGet({ action: "getRewardList" });

        if (res.status !== "success" || !res.rewards?.length) {
            container.innerHTML = `
                <div class="no-rewards">
                    <i class="fas fa-gift"></i>
                    <h3>No Rewards Available</h3>
                    <p>Check back soon for exciting new rewards!</p>
                </div>
            `;
            return;
        }

        let html = `<div class="rewards-grid">`;
        
        // Reward icons mapping
        const rewardIcons = {
            "gift card": "fa-gift",
            "voucher": "fa-ticket",
            "discount": "fa-percent",
            "product": "fa-box",
            "merch": "fa-shirt",
            "cash": "fa-money-bill",
            "coupon": "fa-tag",
            "membership": "fa-crown"
        };

        res.rewards.forEach(r => {
            // Determine icon based on reward name
            let icon = "fa-star";
            const nameLower = r.name.toLowerCase();
            
            for (const [key, value] of Object.entries(rewardIcons)) {
                if (nameLower.includes(key)) {
                    icon = value;
                    break;
                }
            }
            
            // Random gradient color for icon
            const colors = ['#00ffe0', '#ff44b0', '#6e44ff', '#ffd700', '#ff8c9e', '#66ffcc'];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            
            const cost = r.stamps || 10;
            const canRedeem = userStamps >= cost;
            
            html += `
                <div class="reward-card">
                    <div class="reward-icon" style="color: ${randomColor};">
                        <i class="fas ${icon}"></i>
                    </div>
                    
                    <div class="reward-name">${r.name}</div>
                    
                    <div class="reward-desc">
                        ${r.description || 'Redeem this exciting reward with your stamps!'}
                    </div>
                    
                    <div class="stamp-cost">
                        <i class="fas fa-ticket-alt"></i>
                        <span class="cost-amount">${cost}</span>
                        <span class="cost-label">stamps required</span>
                    </div>
                    
                    <button onclick="redeem('${r.name}', ${cost})" 
                            class="redeem-btn ${!canRedeem ? 'disabled' : ''}"
                            ${!canRedeem ? 'disabled' : ''}>
                        <i class="fas ${canRedeem ? 'fa-gem' : 'fa-lock'}"></i>
                        ${canRedeem ? 'Redeem Now' : 'Insufficient Stamps'}
                    </button>
                    
                    ${!canRedeem ? `
                        <div class="insufficient">
                            <i class="fas fa-exclamation-triangle"></i>
                            You need ${cost - userStamps} more stamps
                        </div>
                    ` : ''}
                </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;

    } catch (e) {
        console.error("Error loading rewards:", e);
        container.innerHTML = `
            <div class="no-rewards" style="color: #ff9999;">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error Loading Rewards</h3>
                <p>Please try again later</p>
            </div>
        `;
    }
}

async function redeem(rewardName, cost) {
    if (!currentUser) {
        alert("Please login first");
        window.location.href = "login.html";
        return;
    }

    // Check if user has enough stamps
    if (userStamps < cost) {
        showToast(`❌ You need ${cost - userStamps} more stamps!`, "error");
        return;
    }

    // Find and disable the button to prevent double submission
    const buttons = document.querySelectorAll('.redeem-btn');
    let clickedBtn = null;
    
    buttons.forEach(btn => {
        if (btn.innerHTML.includes(rewardName) || btn.onclick?.toString().includes(rewardName)) {
            clickedBtn = btn;
            btn.disabled = true;
            btn.style.opacity = '0.7';
        }
    });

    // Show loading state
    if (clickedBtn) {
        const originalHTML = clickedBtn.innerHTML;
        clickedBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Redeeming...';
        
        // Store original HTML to restore later
        clickedBtn.dataset.originalHTML = originalHTML;
    }

    try {
        const res = await apiPost({
            action: "redeemReward",
            id: currentUser.id,
            name: currentUser.name,
            reward: rewardName,
            mobile: currentUser.mobile
        });

        if (res.status === "success") {
            // Update stamp count
            userStamps -= cost;
            
            // Update counter in UI
            updateStampCounter();
            
            // Show success animation
            showSuccessAnimation(rewardName);
            
            // Reload rewards to update button states
            setTimeout(() => {
                loadRewards();
            }, 2000);
            
        } else {
            // Show error message
            showToast(`❌ ${res.message || "Redemption failed"}`, "error");
            
            // Reset button
            if (clickedBtn) {
                clickedBtn.disabled = false;
                clickedBtn.style.opacity = '1';
                clickedBtn.innerHTML = clickedBtn.dataset.originalHTML || '<i class="fas fa-gem"></i> Redeem Now';
            }
        }

    } catch (e) {
        console.error("Redemption error:", e);
        showToast("⚠️ Network error. Please try again.", "error");
        
        // Reset button
        if (clickedBtn) {
            clickedBtn.disabled = false;
            clickedBtn.style.opacity = '1';
            clickedBtn.innerHTML = clickedBtn.dataset.originalHTML || '<i class="fas fa-gem"></i> Redeem Now';
        }
    }
}

// Success animation
function showSuccessAnimation(rewardName) {
    // Create success popup
    const popup = document.createElement('div');
    popup.className = 'redeem-success';
    popup.innerHTML = `
        <i class="fas fa-check-circle" style="font-size: 5rem; color: #00ff88; margin-bottom: 20px;"></i>
        <h2 style="font-size: 2rem; margin-bottom: 15px; color: white;">Redeemed!</h2>
        <p style="font-size: 1.3rem; color: #00ff88; margin-bottom: 25px;">${rewardName}</p>
        <div style="display: flex; align-items: center; justify-content: center; gap: 20px;">
            <div style="background: rgba(255,255,255,0.1); padding: 15px 25px; border-radius: 50px;">
                <i class="fas fa-ticket-alt" style="color: #ffd700; margin-right: 10px;"></i>
                <span style="font-size: 1.2rem; font-weight: 700; color: #ffd700;">${userStamps} left</span>
            </div>
        </div>
    `;
    
    document.body.appendChild(popup);
    
    // Show toast
    showToast(`🎉 Successfully redeemed: ${rewardName}!`, "success");
    
    // Remove popup after 3 seconds
    setTimeout(() => {
        popup.style.animation = 'successPop 0.3s reverse';
        setTimeout(() => popup.remove(), 300);
    }, 3000);
}

// Toast notification
function showToast(message, type = 'info') {
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
        `;
        document.body.appendChild(toastContainer);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
        background: ${type === 'success' ? 'rgba(0, 200, 100, 0.95)' : 
                     type === 'error' ? 'rgba(255, 80, 80, 0.95)' : 
                     'rgba(0, 200, 255, 0.95)'};
        backdrop-filter: blur(10px);
        color: white;
        padding: 16px 28px;
        border-radius: 50px;
        margin-bottom: 12px;
        border: 1px solid rgba(255,255,255,0.2);
        box-shadow: 0 15px 40px rgba(0,0,0,0.3);
        animation: slideIn 0.3s ease;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 1rem;
    `;
    
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 
                        type === 'error' ? 'fa-exclamation-circle' : 
                        'fa-info-circle'}" style="font-size: 1.2rem;"></i>
        ${message}
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);
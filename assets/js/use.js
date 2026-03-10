// assets/js/use.js

let currentReward = null;
let isProcessing = false;

document.addEventListener("DOMContentLoaded", async function() {
    console.log("🎁 Use page loaded");
    await loadHeader();
    await Promise.all([
        loadRewards(),
        loadUseHistory()
    ]);
    
    // Add event listeners for redeem buttons (delegation)
    setupRedeemButtons();
});

// Load header
async function loadHeader() {
    try {
        const res = await fetch("/partials/header.html");
        const html = await res.text();
        document.getElementById("header-container").innerHTML = html;
        if (typeof initHeader === 'function') initHeader();
    } catch (err) {
        console.error("Header error:", err);
    }
}

// Setup redeem button listeners
function setupRedeemButtons() {
    document.addEventListener('click', function(e) {
        const btn = e.target.closest('.redeem-btn');
        if (!btn || btn.disabled) return;

        openRedeemModal(
            btn.dataset.id,
            btn.dataset.name,
            btn.dataset.points,
            btn.dataset.stamps
        );
    });
}

// LOAD REWARDS
async function loadRewards() {
    const grid = document.getElementById('rewardsGrid');
    
    try {
        const res = await fetch(`${CONFIG.WORKER_URL}/api/user/use`, {
            credentials: 'include',
            headers: { 'X-Client-Host': window.location.host }
        });
        
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        
        if (data.success) {
            displayRewards(data.rewards);
            updateStats(data.userPoints, data.userStamps);
        } else {
            grid.innerHTML = `<div class="error">${data.error || 'Failed to load rewards'}</div>`;
        }
    } catch (err) {
        console.error("Rewards error:", err);
        grid.innerHTML = '<div class="error">Failed to load rewards. Please try again.</div>';
    }
}

// DISPLAY REWARDS
function displayRewards(rewards) {
    const grid = document.getElementById('rewardsGrid');
    
    if (!rewards?.length) {
        grid.innerHTML = '<div class="empty">✨ No rewards available at the moment</div>';
        return;
    }

    grid.innerHTML = rewards.map(r => `
        <div class="reward-card ${!r.canAfford ? 'cannot-afford' : ''}">
            <div class="reward-badge">
                <i class="fas fa-gift"></i>
            </div>
            <div class="reward-content">
                <h3>${escapeHtml(r.reward_name || 'Reward')}</h3>
                <p class="description">${escapeHtml(r.description || 'No description available')}</p>
                <div class="cost">
                    ${r.cost_points > 0 ? 
                        `<span class="cost-points"><i class="fas fa-star"></i> ${r.cost_points} Points</span>` : ''}
                    ${r.cost_stamps > 0 ? 
                        `<span class="cost-stamps"><i class="fas fa-ticket-alt"></i> ${r.cost_stamps} Stamps</span>` : ''}
                </div>
                <button class="redeem-btn ${!r.canAfford ? 'disabled' : ''}"
                    data-id="${r.reward_id}"
                    data-name="${escapeHtml(r.reward_name)}"
                    data-points="${r.cost_points}"
                    data-stamps="${r.cost_stamps}"
                    ${!r.canAfford ? 'disabled' : ''}>
                    <i class="fas fa-exchange-alt"></i>
                    Redeem
                </button>
            </div>
        </div>
    `).join('');
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Update stats
function updateStats(points, stamps) {
    const pointsEl = document.getElementById('usePagePoints');
    const stampsEl = document.getElementById('usePageStamps');
    
    if (pointsEl) pointsEl.textContent = points || 0;
    if (stampsEl) stampsEl.textContent = stamps || 0;
}

// LOAD USE HISTORY
async function loadUseHistory() {
    const list = document.getElementById('historyList');
    
    try {
        const res = await fetch(
            `${CONFIG.WORKER_URL}/api/user/redeemhistory`,
            {
                credentials: 'include',
                headers: { 'X-Client-Host': window.location.host }
            }
        );

        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();

        if (data.success) {
            displayUseHistory(data.history || []);
        } else {
            list.innerHTML = `<div class="error">${data.error || 'Failed to load history'}</div>`;
        }

    } catch (err) {
        console.error("History error:", err);
        list.innerHTML = '<div class="error">Failed to load history</div>';
    }
}

// Display use history
function displayUseHistory(history) {
    const list = document.getElementById('historyList');

    if (!history?.length) {
        list.innerHTML = '<div class="empty">📭 No redemption history yet</div>';
        return;
    }

    list.innerHTML = history.map(h => {
        const date = h.created_at ? new Date(h.created_at) : new Date();
        const formattedDate = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        return `
            <div class="history-item">
                <div class="history-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="history-details">
                    <span class="history-name">${escapeHtml(h.reward_name)}</span>
                    <span class="history-date">${formattedDate}</span>
                </div>
                <div class="history-cost">
                    ${h.points > 0 ? `<span class="points-used">-${h.points} <i class="fas fa-star"></i></span>` : ''}
                    ${h.stamps > 0 ? `<span class="stamps-used">-${h.stamps} <i class="fas fa-ticket-alt"></i></span>` : ''}
                </div>
                <span class="history-status status-${h.status || 'completed'}">
                    ${h.status || 'Completed'}
                </span>
            </div>
        `;
    }).join('');
}

// Open redeem modal
function openRedeemModal(rewardId, rewardName, points, stamps) {
    console.log("📦 Opening modal with:", { rewardId, rewardName, points, stamps });
    
    if (!rewardId || !rewardName) {
        console.error("❌ Invalid reward data");
        showToast("Invalid reward data", "error");
        return;
    }
    
    currentReward = { 
        rewardId: String(rewardId),
        rewardName: String(rewardName), 
        points: Number(points) || 0,
        stamps: Number(stamps) || 0
    };
    
    let costText = [];
    if (currentReward.points > 0) costText.push(`${currentReward.points} Points`);
    if (currentReward.stamps > 0) costText.push(`${currentReward.stamps} Stamps`);
    
    document.getElementById('modalRewardDetails').innerHTML = `
        <div class="reward-preview">
            <i class="fas fa-gift fa-3x"></i>
            <h4>${escapeHtml(currentReward.rewardName)}</h4>
            <p class="cost-display">${costText.join(' + ')}</p>
        </div>
    `;
    
    document.getElementById('confirmModal').style.display = 'flex';
}

// Close modal
function closeModal() {
    document.getElementById('confirmModal').style.display = 'none';
    currentReward = null;
}

// Confirm redemption
async function confirmRedeem() {
    if (!currentReward) {
        console.error("❌ No reward selected");
        return;
    }
    
    if (isProcessing) {
        console.log("⏳ Already processing...");
        return;
    }
    
    isProcessing = true;
    const confirmBtn = document.querySelector('.btn-confirm');
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    }
    
    console.log("🎁 Redeeming reward:", currentReward);
    
    try {
        // Sirf rewardId bhejo - backend sirf yahi expect kar raha hai
        const requestBody = {
            rewardId: currentReward.rewardId
        };
        
        console.log("📤 Sending data:", requestBody);
        
        const res = await fetch(`${CONFIG.WORKER_URL}/api/user/redeem`, {
            method: 'POST',
            credentials: 'include',
            headers: { 
                'Content-Type': 'application/json',
                'X-Client-Host': window.location.host
            },
            body: JSON.stringify(requestBody)
        });
        
        console.log("📥 Response status:", res.status);
        
        // Check if response is JSON
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            const text = await res.text();
            throw new Error(`Invalid response: ${text.substring(0, 100)}`);
        }
        
        const data = await res.json();
        console.log("📥 Response data:", data);
        
        if (data.success) {
            showToast(data.message || 'Reward redeemed successfully!', 'success');
            closeModal();
            
            // Update stats with remaining balance
            if (data.remainingPoints !== undefined && data.remainingStamps !== undefined) {
                updateStats(data.remainingPoints, data.remainingStamps);
            }
            
            // Reload rewards and history
            await Promise.all([
                loadRewards(),
                loadUseHistory()
            ]);
        } else {
            showToast(data.error || 'Redemption failed', 'error');
        }
    } catch (err) {
        console.error("❌ Redeem error:", err);
        showToast('Error: ' + err.message, 'error');
    } finally {
        isProcessing = false;
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<i class="fas fa-check"></i> Yes, Redeem';
        }
    }
}

// Show toast message
function showToast(message, type = 'success') {
    const toast = document.getElementById('successToast');
    const toastMessage = document.getElementById('toastMessage');
    
    if (!toast || !toastMessage) return;
    
    toastMessage.textContent = message;
    toast.className = `toast ${type}-toast show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    const modal = document.getElementById('confirmModal');
    if (e.target === modal) closeModal();
});

// Make functions globally available
window.openRedeemModal = openRedeemModal;
window.closeModal = closeModal;
window.confirmRedeem = confirmRedeem;
window.showToast = showToast;
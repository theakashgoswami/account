// assets/js/use.js

let currentReward = null;

document.addEventListener("DOMContentLoaded", async function() {
    console.log("🎁 Use page loaded");
    await loadHeader();
    await Promise.all([
        loadRewards(),
        loadUseHistory()
    ]);
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

// 🔥 LOAD REWARDS - matches worker's /api/user/use
async function loadRewards() {
    try {
        const res = await fetch(`${CONFIG.WORKER_URL}/api/user/use`, {
            credentials: 'include',
            headers: { 'X-Client-Host': window.location.host }
        });
        
        const data = await res.json();
        
        if (data.success) {
            displayRewards(data.rewards);
            document.getElementById('userPoints').textContent = data.userPoints;
            document.getElementById('userStamps').textContent = data.userStamps;
        } else {
            document.getElementById('rewardsGrid').innerHTML = '<div class="error">Failed to load rewards</div>';
        }
    } catch (err) {
        console.error("Rewards error:", err);
        document.getElementById('rewardsGrid').innerHTML = '<div class="error">Failed to load rewards</div>';
    }
}

// 🔥 DISPLAY REWARDS - matches worker's response structure
function displayRewards(rewards) {
    const grid = document.getElementById('rewardsGrid');
    
    if (!rewards?.length) {
        grid.innerHTML = '<div class="empty">No rewards available</div>';
        return;
    }

    grid.innerHTML = rewards.map(r => `
        <div class="reward-card ${!r.canAfford ? 'cannot-afford' : ''}">
            <div class="reward-content">
                <h3>${r.reward_name || 'Reward'}</h3>
                <p class="description">${r.description || ''}</p>
                <div class="cost">
                    ${r.cost_points > 0 ? `<span><i class="fas fa-star"></i> ${r.cost_points} Points</span>` : ''}
                    ${r.cost_stamps > 0 ? `<span><i class="fas fa-ticket-alt"></i> ${r.cost_stamps} Stamps</span>` : ''}
                </div>
                <button class="redeem-btn" onclick="openRedeemModal('${r.reward_id}', '${r.reward_name}', ${r.cost_points}, ${r.cost_stamps})"
                    ${!r.canAfford ? 'disabled' : ''}>
                    Redeem
                </button>
            </div>
        </div>
    `).join('');
}

// 🔥 LOAD USE HISTORY - matches worker's /api/user/pointslog
async function loadUseHistory() {
    try {
        const res = await fetch(`${CONFIG.WORKER_URL}/api/user/pointslog`, {
            credentials: 'include',
            headers: { 'X-Client-Host': window.location.host }
        });
        const data = await res.json();
        
        if (data.success) {
            displayUseHistory(data.use);
        } else {
            document.getElementById('historyList').innerHTML = '<div class="error">Failed to load history</div>';
        }
    } catch (err) {
        console.error("History error:", err);
        document.getElementById('historyList').innerHTML = '<div class="error">Failed to load history</div>';
    }
}

// Display use history
function displayUseHistory(history) {
    const list = document.getElementById('historyList');
    
    if (!history?.length) {
        list.innerHTML = '<div class="empty">No redemption history</div>';
        return;
    }

    list.innerHTML = history.map(h => `
        <div class="history-item">
            <span class="date">${new Date(h.date || h.created_at).toLocaleDateString()}</span>
            <span class="reason">${h.reason || 'Redeemed'}</span>
            <span class="points">-${h.points || 0} <i class="fas fa-star"></i></span>
        </div>
    `).join('');
}

// Open redeem modal

function openRedeemModal(rewardId, rewardName, points, stamps) {
    console.log("📦 Opening modal with:", { rewardId, rewardName, points, stamps });
    
    // Validate data
    if (!rewardId || !rewardName) {
        console.error("❌ Invalid reward data");
        alert("Invalid reward data");
        return;
    }
    
    currentReward = { 
        rewardId: String(rewardId),  // Ensure string
        rewardName: String(rewardName), 
        points: Number(points) || 0,  // Ensure number
        stamps: Number(stamps) || 0
    };
    
    let costText = '';
    if (currentReward.points > 0) costText += `${currentReward.points} Points `;
    if (currentReward.stamps > 0) costText += `${currentReward.stamps} Stamps`;
    
    document.getElementById('modalRewardDetails').innerHTML = `
        <p><strong>${currentReward.rewardName}</strong></p>
        <p>Cost: ${costText}</p>
    `;
    document.getElementById('confirmModal').style.display = 'flex';
}
// Close modal
function closeModal() {
    document.getElementById('confirmModal').style.display = 'none';
    currentReward = null;
}

// Confirm redemption - FIXED VERSION
async function confirmRedeem() {
    if (!currentReward) {
        console.error("❌ No reward selected");
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
        // 🔥 IMPORTANT: Create clean JSON object
        const requestBody = {
            rewardId: currentReward.rewardId,
            rewardName: currentReward.rewardName,
            pointsCost: Number(currentReward.points) || 0,
            stampsCost: Number(currentReward.stamps) || 0
        };
        
        console.log("📤 Sending data:", requestBody);
        
        const res = await fetch(`${CONFIG.WORKER_URL}/api/user/redeem`, {
            method: 'POST',
            credentials: 'include',
            headers: { 
                'Content-Type': 'application/json',  // 🔥 MUST be set
                'X-Client-Host': window.location.host
            },
            body: JSON.stringify(requestBody)  // 🔥 Properly stringified
        });
        
        console.log("📥 Response status:", res.status);
        
        const data = await res.json();
        console.log("📥 Response data:", data);
        
        if (data.success) {
            alert('✅ ' + (data.message || 'Reward redeemed successfully!'));
            closeModal();
            
            // Reload all data
            await Promise.all([
                loadUserStats(),
                loadRewards(),
                loadUseHistory()
            ]);
        } else {
            alert('❌ ' + (data.error || 'Redemption failed'));
        }
    } catch (err) {
        console.error("❌ Redeem error:", err);
        alert('❌ Network error: ' + err.message);
    } finally {
        isProcessing = false;
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = 'Yes, Redeem';
        }
    }
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
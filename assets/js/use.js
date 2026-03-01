// assets/js/use.js

let currentReward = null;

document.addEventListener("DOMContentLoaded", async function() {
    await loadHeader();
    await waitForUser();
    await Promise.all([
        loadUserStats(),
        loadRewards(),
        loadUseHistory()
    ]);
});

async function loadHeader() {
    const res = await fetch("/partials/header.html");
    document.getElementById("header-container").innerHTML = await res.text();
    if (typeof initHeader === 'function') initHeader();
}

async function waitForUser() {
    let wait = 0;
    while (!window.currentUser && wait < 3000) {
        await new Promise(r => setTimeout(r, 100));
        wait += 100;
    }
    if (!window.currentUser) window.location.href = "https://agtechscript.in";
}

// Load rewards from getuse action
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
        }
    } catch (err) {
        console.error("Rewards error:", err);
        document.getElementById('rewardsGrid').innerHTML = '<div class="error">Failed to load rewards</div>';
    }
}

// Display rewards
function displayRewards(rewards) {
    const grid = document.getElementById('rewardsGrid');
    
    if (!rewards?.length) {
        grid.innerHTML = '<div class="empty">No rewards available</div>';
        return;
    }

    grid.innerHTML = rewards.map(r => `
        <div class="reward-card ${!r.canAfford ? 'cannot-afford' : ''}">
            <div class="reward-content">
                <h3>${r.name || 'Reward'}</h3>
                <p class="description">${r.description || ''}</p>
                <div class="cost">
                    ${r.cost_points > 0 ? `<span><i class="fas fa-star"></i> ${r.cost_points}</span>` : ''}
                    ${r.cost_stamps > 0 ? `<span><i class="fas fa-ticket-alt"></i> ${r.cost_stamps}</span>` : ''}
                </div>
                <button class="redeem-btn" onclick="openRedeemModal('${r.reward}', '${r.name}', ${r.cost_points}, ${r.cost_stamps})"
                    ${!r.canAfford ? 'disabled' : ''}>
                    Redeem
                </button>
            </div>
        </div>
    `).join('');
}

// Load use history
async function loadUseHistory() {
    try {
        const res = await fetch(`${CONFIG.WORKER_URL}/api/user/pointslog`, {
            credentials: 'include',
            headers: { 'X-Client-Host': window.location.host }
        });
        const data = await res.json();
        
        if (data.success) {
            displayUseHistory(data.use);
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
            <span class="reason">${h.reason || h.description || 'Redeemed'}</span>
            <span class="points">-${h.points || 0} <i class="fas fa-star"></i></span>
        </div>
    `).join('');
}

// Modal functions
function openRedeemModal(rewardId, name, points, stamps) {
    currentReward = { rewardId, name, points, stamps };
    
    let costText = '';
    if (points > 0) costText += `${points} Points `;
    if (stamps > 0) costText += `${stamps} Stamps`;
    
    document.getElementById('modalRewardDetails').innerHTML = `
        <p><strong>${name}</strong></p>
        <p>Cost: ${costText}</p>
    `;
    document.getElementById('confirmModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('confirmModal').style.display = 'none';
    currentReward = null;
}

async function confirmRedeem() {
    if (!currentReward) return;
    
    try {
        const res = await fetch(`${CONFIG.WORKER_URL}/api/user/use`, {
            method: 'POST',
            credentials: 'include',
            headers: { 
                'Content-Type': 'application/json',
                'X-Client-Host': window.location.host
            },
            body: JSON.stringify({
                rewardId: currentReward.rewardId,
                rewardName: currentReward.name,
                pointsCost: currentReward.points,
                stampsCost: currentReward.stamps
            })
        });
        
        const data = await res.json();
        
        if (data.success) {
            alert('✅ Reward redeemed successfully!');
            closeModal();
            // Reload data
            await Promise.all([
                loadUserStats(),
                loadRewards(),
                loadUseHistory()
            ]);
        } else {
            alert('❌ ' + (data.error || 'Redemption failed'));
        }
    } catch (err) {
        console.error("Redeem error:", err);
        alert('❌ Error processing redemption');
    }
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    const modal = document.getElementById('confirmModal');
    if (e.target === modal) closeModal();
});
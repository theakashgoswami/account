// ==========================================
// REWARDS & REDEMPTION LOGIC (use.js logic)
// ==========================================

const RewardsManager = {
    currentReward: null,
    isProcessing: false,

    async init() {
        console.log("🎁 Rewards Logic Initialized");
        await Promise.all([
            this.loadRewards(),
            this.loadUseHistory()
        ]);
        this.setupEventListeners();
    },

    setupEventListeners() {
        // Event delegation for Redeem Buttons
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.redeem-btn');
            if (btn) {
                this.openRedeemModal({
                    id: btn.dataset.id,
                    name: btn.dataset.name,
                    points: btn.dataset.points,
                    stamps: btn.dataset.stamps
                });
            }

            // Close modal on backdrop click
            if (e.target.id === 'confirmModal') this.closeModal();
        });

        // Confirm button click
        const confirmBtn = document.querySelector('.btn-confirm');
        if (confirmBtn) {
            confirmBtn.onclick = () => this.confirmRedeem();
        }
    },

    async loadRewards() {
        try {
            const res = await fetch(`${CONFIG.WORKER_URL}/api/user/use`, {
                credentials: 'include',
                headers: { 'X-Client-Host': window.location.host }
            });
            const data = await res.json();

            if (data.success) {
                this.renderRewardsGrid(data.rewards);
                // Update global stats using UI utility from main code
                if (typeof UI.updateUserStats === 'function') {
                    UI.updateUserStats(data.userPoints, data.userStamps);
                }
            } else {
                this.showGridError('Failed to load rewards');
            }
        } catch (err) {
            this.showGridError('Server connection error');
        }
    },

    renderRewardsGrid(rewards) {
        const grid = document.getElementById('rewardsGrid');
        if (!grid) return;

        if (!rewards?.length) {
            grid.innerHTML = '<div class="empty">No rewards available at the moment.</div>';
            return;
        }

        grid.innerHTML = rewards.map(r => `
            <div class="reward-card ${!r.canAfford ? 'cannot-afford' : ''}">
                <div class="reward-content">
                    <div class="reward-icon"><i class="fas fa-gift"></i></div>
                    <h3>${r.reward_name}</h3>
                    <p>${r.description || ''}</p>
                    <div class="cost-tags">
                        ${r.cost_points > 0 ? `<span><i class="fas fa-star"></i> ${r.cost_points}</span>` : ''}
                        ${r.cost_stamps > 0 ? `<span><i class="fas fa-ticket-alt"></i> ${r.cost_stamps}</span>` : ''}
                    </div>
                    <button class="redeem-btn" 
                        data-id="${r.reward_id}" 
                        data-name="${r.reward_name}" 
                        data-points="${r.cost_points}" 
                        data-stamps="${r.cost_stamps}"
                        ${!r.canAfford ? 'disabled' : ''}>
                        ${r.canAfford ? 'Redeem Now' : 'Not Enough Points'}
                    </button>
                </div>
            </div>
        `).join('');
    },

    async loadUseHistory() {
        const list = document.getElementById('historyList');
        if (!list) return;

        try {
            const res = await fetch(`${CONFIG.WORKER_URL}/api/user/pointslog`, {
                credentials: 'include',
                headers: { 'X-Client-Host': window.location.host }
            });
            const data = await res.json();
            
            if (data.success && data.use) {
                list.innerHTML = data.use.map(h => `
                    <div class="history-item">
                        <div class="h-info">
                            <span class="h-name">${h.description || 'Redeemed'}</span>
                            <span class="h-date">${new Date(h.created_at).toLocaleDateString()}</span>
                        </div>
                        <span class="h-amount">-${Math.abs(h.points || 0)} pts</span>
                    </div>
                `).join('');
            } else {
                list.innerHTML = '<div class="empty">No history found</div>';
            }
        } catch (err) {
            list.innerHTML = '<div class="error">Error loading history</div>';
        }
    },

    openRedeemModal(data) {
        this.currentReward = data;
        const detailsEl = document.getElementById('modalRewardDetails');
        if (detailsEl) {
            detailsEl.innerHTML = `
                <h4>Confirm Redemption</h4>
                <p>Are you sure you want to redeem <strong>${data.name}</strong>?</p>
                <p class="modal-cost">Cost: ${data.points > 0 ? data.points + ' Points' : ''} ${data.stamps > 0 ? data.stamps + ' Stamps' : ''}</p>
            `;
        }
        const modal = document.getElementById('confirmModal');
        if (modal) modal.style.display = 'flex';
    },

    closeModal() {
        const modal = document.getElementById('confirmModal');
        if (modal) modal.style.display = 'none';
        this.currentReward = null;
    },

    async confirmRedeem() {
        if (!this.currentReward || this.isProcessing) return;

        const confirmBtn = document.querySelector('.btn-confirm');
        const originalText = confirmBtn.innerHTML;

        try {
            this.isProcessing = true;
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

            const res = await fetch(`${CONFIG.WORKER_URL}/api/user/redeem`, {
                method: 'POST',
                credentials: 'include',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Client-Host': window.location.host
                },
                body: JSON.stringify({
                    rewardId: this.currentReward.id,
                    rewardName: this.currentReward.name,
                    pointsCost: Number(this.currentReward.points),
                    stampsCost: Number(this.currentReward.stamps)
                })
            });

            const data = await res.json();

            if (data.success) {
                UI.showNotification(data.message || 'Reward redeemed!', 'success');
                this.closeModal();
                // Refresh everything
                this.loadRewards();
                this.loadUseHistory();
                if (typeof loadUserData === 'function') loadUserData(); // Refresh overlay stats
            } else {
                UI.showNotification(data.error || 'Redemption failed', 'error');
            }
        } catch (err) {
            UI.showNotification('Server error occurred', 'error');
        } finally {
            this.isProcessing = false;
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = originalText;
        }
    },

    showGridError(msg) {
        const grid = document.getElementById('rewardsGrid');
        if (grid) grid.innerHTML = `<div class="error">${msg}</div>`;
    }
};

// ==========================================
// UPDATE DOMCONTENTLOADED TO INCLUDE REWARDS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // ... baki functions ...
    if (window.location.pathname.includes('use')) {
        RewardsManager.init();
    }
});
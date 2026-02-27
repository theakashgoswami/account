let currentUser = null;
let historyData = null;

// Initialize
document.addEventListener("DOMContentLoaded", async function() {
    // Check authentication
    const userData = localStorage.getItem("ag_user");
    if (!userData) {
        window.location.href = "login.html";
        return;
    }
    
    currentUser = JSON.parse(userData);
    
    // Load summary stats
    await loadSummaryStats();
    
    // Load history
    loadHistory();
    
    // Add event listener for filter change
    document.getElementById('historyType').addEventListener('change', function() {
        // Add animation effect
        const table = document.querySelector('.table-wrapper');
        table.style.opacity = '0.5';
        setTimeout(() => {
            table.style.opacity = '1';
        }, 300);
        loadHistory();
    });
});

// Load summary statistics
async function loadSummaryStats() {
    try {
        const container = document.querySelector('.summary-stats');
        if (!container) return;
        
        // Fetch total points, total spins, etc.
        const [pointsRes, spinsRes, quizzesRes] = await Promise.all([
            apiGet({ action: "getPointsLog", id: currentUser.id }),
            apiGet({ action: "getSpinHistory", id: currentUser.id }),
            apiGet({ action: "getQuizHistory", id: currentUser.id })
        ]);
        
        let totalPoints = 0;
        let totalSpins = 0;
        let totalQuizzes = 0;
        
        if (pointsRes.status === 'success' && pointsRes.history) {
            totalPoints = pointsRes.history.reduce((sum, item) => sum + (item.points || 0), 0);
        }
        
        if (spinsRes.status === 'success' && spinsRes.history) {
            totalSpins = spinsRes.history.length;
        }
        
        if (quizzesRes.status === 'success' && quizzesRes.history) {
            totalQuizzes = quizzesRes.history.length;
        }
        
        container.innerHTML = `
            <div class="summary-card">
                <div class="summary-icon">
                    <i class="fas fa-star"></i>
                </div>
                <div class="summary-info">
                    <h4>TOTAL POINTS</h4>
                    <p>${totalPoints}</p>
                </div>
            </div>
            <div class="summary-card">
                <div class="summary-icon">
                    <i class="fas fa-dharmachakra"></i>
                </div>
                <div class="summary-info">
                    <h4>TOTAL SPINS</h4>
                    <p>${totalSpins}</p>
                </div>
            </div>
            <div class="summary-card">
                <div class="summary-icon">
                    <i class="fas fa-brain"></i>
                </div>
                <div class="summary-info">
                    <h4>QUIZZES</h4>
                    <p>${totalQuizzes}</p>
                </div>
            </div>
            <div class="summary-card">
                <div class="summary-icon">
                    <i class="fas fa-calendar"></i>
                </div>
                <div class="summary-info">
                    <h4>MEMBER SINCE</h4>
                    <p>${new Date().getFullYear()}</p>
                </div>
            </div>
        `;
        
    } catch (e) {
        console.error("Error loading summary:", e);
    }
}

// Main history loader
async function loadHistory() {
    const type = document.getElementById('historyType').value;
    const header = document.getElementById('historyHeader');
    const body = document.getElementById('historyBody');
    const tableWrapper = document.querySelector('.table-wrapper');
    
    // Show loading state with skeleton
    body.innerHTML = generateSkeletonRows(5);
    
    try {
        let response;
        switch (type) {
            case 'purchase':
                response = await apiGet({ action: "getPurchaseHistory", id: currentUser.id });
                break;
            case 'spin':
                response = await apiGet({ action: "getSpinHistory", id: currentUser.id });
                break;
            case 'quiz':
                response = await apiGet({ action: "getQuizHistory", id: currentUser.id });
                break;
            case 'points':
                response = await apiGet({ action: "getPointsLog", id: currentUser.id });
                break;
        }
        
        if (response.status !== 'success') {
            showEmptyState(body, 'Failed to load history', 'error');
            return;
        }
        
        const history = response.history || response.logs || [];
        
        if (history.length === 0) {
            showEmptyState(body, 'No history found', 'empty', type);
            return;
        }
        
        // Render based on type
        switch (type) {
            case 'purchase':
                renderPurchaseHistory(header, body, history);
                break;
            case 'spin':
                renderSpinHistory(header, body, history);
                break;
            case 'quiz':
                renderQuizHistory(header, body, history);
                break;
            case 'points':
                renderPointsHistory(header, body, history);
                break;
        }
        
    } catch (error) {
        console.error('History error:', error);
        showEmptyState(body, 'Error loading history', 'error');
    }
}

// Generate skeleton rows
function generateSkeletonRows(count) {
    let html = '';
    for (let i = 0; i < count; i++) {
        html += `<tr><td colspan="5"><div class="skeleton-row"></div></td></tr>`;
    }
    return html;
}

// Show empty state
function showEmptyState(body, message, type = 'empty', category = '') {
    let icon = 'fa-history';
    let title = message;
    
    if (type === 'error') {
        icon = 'fa-exclamation-triangle';
    } else if (type === 'empty') {
        icon = 'fa-inbox';
        
        // Category specific messages
        const categoryMessages = {
            'purchase': 'No purchases yet',
            'spin': 'No spins recorded',
            'quiz': 'No quizzes attempted',
            'points': 'No points activity'
        };
        title = categoryMessages[category] || message;
    }
    
    body.innerHTML = `
        <tr>
            <td colspan="5">
                <div class="empty-state">
                    <i class="fas ${icon}"></i>
                    <h3>${title}</h3>
                    <p style="color: rgba(255,255,255,0.5);">${type === 'error' ? 'Please try again later' : 'Start earning to see activity here!'}</p>
                </div>
            </td>
        </tr>
    `;
}

// Render purchase history
function renderPurchaseHistory(header, body, history) {
    header.innerHTML = `
        <th>Invoice</th>
        <th>Date</th>
        <th>Item</th>
        <th>Amount</th>
        <th>Points</th>
    `;
    
    let rows = '';
    history.slice(0, 50).forEach(item => {
        rows += `
            <tr>
                <td><span class="invoice-id">#${item.invoice || 'N/A'}</span></td>
                <td><span class="date-cell"><i class="far fa-calendar-alt" style="margin-right: 6px;"></i>${formatDate(item.date)}</span></td>
                <td><i class="fas fa-box" style="color: #66ccff; margin-right: 8px;"></i>${item.item || '-'}</td>
                <td><span class="amount-positive">₹${formatNumber(item.amount || 0)}</span></td>
                <td><span class="points-gain"><i class="fas fa-star" style="font-size: 0.7rem;"></i> +${item.points || 0}</span></td>
            </tr>
        `;
    });
    
    body.innerHTML = rows;
}

// Render spin history
function renderSpinHistory(header, body, history) {
    header.innerHTML = `
        <th>Reward</th>
        <th>Date</th>
        <th>Status</th>
    `;
    
    let rows = '';
    history.slice(0, 50).forEach(item => {
        // Random icon based on reward
        let rewardIcon = 'fa-gift';
        const reward = (item.reward || '').toLowerCase();
        if (reward.includes('point') || reward.includes('pts')) rewardIcon = 'fa-star';
        else if (reward.includes('discount')) rewardIcon = 'fa-percent';
        else if (reward.includes('cash')) rewardIcon = 'fa-money-bill';
        else if (reward.includes('stamp')) rewardIcon = 'fa-ticket-alt';
        
        rows += `
            <tr>
                <td><i class="fas ${rewardIcon}" style="color: #ffd700; margin-right: 10px;"></i>${item.reward || '-'}</td>
                <td><span class="date-cell"><i class="far fa-calendar-alt" style="margin-right: 6px;"></i>${formatDate(item.time)}</span></td>
                <td><span class="badge badge-success"><i class="fas fa-check-circle"></i> ${item.redeemed || 'Completed'}</span></td>
            </tr>
        `;
    });
    
    body.innerHTML = rows;
}

// Render quiz history
function renderQuizHistory(header, body, history) {
    header.innerHTML = `
        <th>Date</th>
        <th>Question</th>
        <th>Your Answer</th>
        <th>Week</th>
    `;
    
    let rows = '';
    history.slice(0, 50).forEach(item => {
        rows += `
            <tr>
                <td><span class="date-cell"><i class="far fa-calendar-alt" style="margin-right: 6px;"></i>${formatDate(item.timestamp)}</span></td>
                <td><span class="badge badge-info">Q${item.qid || '?'}</span></td>
                <td><span class="badge badge-primary">${item.answer || '-'}</span></td>
                <td>Week ${item.week || 'N/A'}</td>
            </tr>
        `;
    });
    
    body.innerHTML = rows;
}

// Render points history
function renderPointsHistory(header, body, history) {
    header.innerHTML = `
        <th>Date</th>
        <th>Type</th>
        <th>Points</th>
        <th>Reason</th>
    `;
    
    let rows = '';
    history.slice(0, 50).forEach(item => {
        const isCredit = item.type === 'Credit' || item.points > 0;
        const badgeClass = isCredit ? 'badge-success' : 'badge-warning';
        const icon = isCredit ? 'fa-arrow-up' : 'fa-arrow-down';
        const pointsClass = isCredit ? 'points-gain' : 'amount-negative';
        const pointsSign = isCredit ? '+' : '-';
        
        rows += `
            <tr>
                <td><span class="date-cell"><i class="far fa-calendar-alt" style="margin-right: 6px;"></i>${formatDate(item.date)}</span></td>
                <td><span class="badge ${badgeClass}"><i class="fas ${icon}"></i> ${item.type || (isCredit ? 'Credit' : 'Debit')}</span></td>
                <td><span class="${pointsClass}">${pointsSign}${Math.abs(item.points || 0)}</span></td>
                <td><i class="fas fa-info-circle" style="color: #66ccff; margin-right: 6px;"></i>${item.reason || '-'}</td>
            </tr>
        `;
    });
    
    body.innerHTML = rows;
}

// Format date helper
function formatDate(dateInput) {
    if (!dateInput) return '-';
    
    try {
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return '-';
        
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days} days ago`;
        if (days < 30) return `${Math.floor(days / 7)}w ago`;
        
        return date.toLocaleDateString('en-IN', { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric' 
        });
    } catch {
        return '-';
    }
}

// Format number helper
function formatNumber(num) {
    if (!num) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Export functions for global access
window.loadHistory = loadHistory;
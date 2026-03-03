// assets/js/history.js

let currentHistoryType = 'all';
let allHistoryData = {
    quiz: [],
    purchases: [],
    points: []
};

// Auto refresh every 60 seconds
setInterval(loadAllHistory, 60000);

document.addEventListener("DOMContentLoaded", async function () {
    console.log("📜 History page loaded");
    
    await waitForUser();
    await loadHeader();
    await loadAllHistory();

    document.getElementById('historyType')
        .addEventListener('change', changeHistoryType);
});

// ------------------------------------------------
// WAIT FOR AUTH
// ------------------------------------------------
async function waitForUser() {
    let retries = 0;
    while (!window.currentUser?.user_id && retries < 10) {
        await new Promise(r => setTimeout(r, 300));
        retries++;
    }
    if (!window.currentUser?.user_id) {
        window.location.href = "https://agtechscript.in";
    }
}

// ------------------------------------------------
// LOAD HEADER
// ------------------------------------------------
async function loadHeader() {
    try {
        const res = await fetch("/partials/header.html");
        document.getElementById("header-container").innerHTML = await res.text();
        if (window.initHeader) window.initHeader();
        
        if (window.currentUser?.user_id && window.loadUserProfileIcon) {
            await window.loadUserProfileIcon(window.currentUser.user_id);
        }
    } catch (err) {
        console.error("Header error:", err);
    }
}

// ------------------------------------------------
// LOAD FULL HISTORY
// ------------------------------------------------
async function loadAllHistory() {
    try {
        const res = await fetch(
            `${CONFIG.WORKER_URL}/api/user/full-history`,
            {
                credentials: 'include',
                headers: { 'X-Client-Host': window.location.host }
            }
        );

        const data = await res.json();
        console.log("📥 History data:", data);

        if (!data.success) throw new Error("API failed");

        allHistoryData.quiz = data.quiz || [];
        allHistoryData.purchases = data.purchases || [];
        allHistoryData.points = data.points || [];

        updateSummaryStats();
        renderHistory();

    } catch (err) {
        console.error("❌ History load error:", err);
        document.getElementById('historyBody').innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    Failed to load history. Please try again.
                </td>
            </tr>
        `;
    }
}

// ------------------------------------------------
// SUMMARY STATS
// ------------------------------------------------
function updateSummaryStats() {
    const totalQuiz = allHistoryData.quiz.length;
    const totalPurchase = allHistoryData.purchases.length;
    
    // Calculate total points (earn - use)
    const totalPoints = allHistoryData.points.reduce((sum, p) => {
        if (p.type === "earn") return sum + (Number(p.points) || 0);
        if (p.type === "use") return sum - (Number(p.points) || 0);
        return sum;
    }, 0);
    
    const totalScore = allHistoryData.quiz.reduce((sum, q) => sum + (Number(q.score) || 0), 0);

    document.getElementById('summaryStats').innerHTML = `
        <div class="stat-card">
            <div class="stat-icon">🧠</div>
            <div class="stat-info">
                <span class="stat-label">Quizzes</span>
                <span class="stat-value">${totalQuiz}</span>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">🛒</div>
            <div class="stat-info">
                <span class="stat-label">Purchases</span>
                <span class="stat-value">${totalPurchase}</span>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">💎</div>
            <div class="stat-info">
                <span class="stat-label">Net Points</span>
                <span class="stat-value">${totalPoints}</span>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">🏆</div>
            <div class="stat-info">
                <span class="stat-label">Quiz Score</span>
                <span class="stat-value">${totalScore}</span>
            </div>
        </div>
    `;
}

// ------------------------------------------------
// RENDER HISTORY
// ------------------------------------------------
function renderHistory() {
    const tableBody = document.getElementById('historyBody');

    let merged = [
        ...formatQuiz(),
        ...formatPurchase(),
        ...formatPoints()
    ];

    if (currentHistoryType !== 'all') {
        merged = merged.filter(i => i.type === currentHistoryType);
    }

    // Sort by date (newest first)
    merged.sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
    });

    // Update record count
    document.getElementById('recordCount').textContent = `(${merged.length} records)`;

    if (!merged.length) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>No history found</p>
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = merged.map(item => `
        <tr class="type-${item.type}">
            <td>${formatDate(item.date)}</td>
            <td><strong>${item.activity}</strong></td>
            <td>${item.details}</td>
            <td class="${item.points > 0 ? 'points-positive' : item.points < 0 ? 'points-negative' : ''}">
                ${item.points > 0 ? '+' : ''}${item.points}
            </td>
            <td>
                <span class="status-badge status-${safeClass(item.status)}">
                    ${item.status}
                </span>
            </td>
        </tr>
    `).join('');
}

// ------------------------------------------------
// FORMATTERS
// ------------------------------------------------
function formatQuiz() {
    return allHistoryData.quiz.map(q => ({
        date: q.timestamp || q.created_at,
        activity: '📝 Quiz',
        details: `Week ${q.week || 'N/A'} | Score: ${q.score || 0}/40`,
        points: Number(q.score) || 0,
        status: q.score > 0 ? 'completed' : 'attempted',
        type: 'quiz'
    }));
}

function formatPurchase() {
    return allHistoryData.purchases.map(p => ({
        date: p.date || p.created_at,
        activity: '🛒 Purchase',
        details: `${p.item || 'Item'} - ₹${p.amount || 0}`,
        points: Number(p.points) || 0,
        status: p.stamp === 'Yes' ? 'stamp earned' : 'completed',
        type: 'purchase'
    }));
}

function formatPoints() {
    return allHistoryData.points.map(p => ({
        date: p.created_at || p.date,
        activity: p.type === 'earn' ? '✨ Points Earned' : '💸 Points Used',
        details: p.description || p.reason || 'Transaction',
        points: p.type === 'earn' 
            ? Math.abs(Number(p.points) || 0)
            : -Math.abs(Number(p.points) || 0),
        status: 'completed',
        type: 'points'
    }));
}

// ------------------------------------------------
// HELPERS
// ------------------------------------------------
function formatDate(d) {
    if (!d) return '-';
    try {
        const date = new Date(d);
        return date.toLocaleString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return String(d);
    }
}

function safeClass(str) {
    return String(str || '').replace(/\s+/g, '-').toLowerCase();
}

// ------------------------------------------------
// FILTER CHANGE
// ------------------------------------------------
function changeHistoryType(event) {
    currentHistoryType = event?.target?.value || 'all';
    renderHistory();
}

window.changeHistoryType = changeHistoryType;
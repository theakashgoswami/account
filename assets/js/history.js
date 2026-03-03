// assets/js/history.js
setInterval(loadAllHistory, 60000); // refresh every 60 sec
let currentHistoryType = 'all';
let allHistoryData = {
    quiz: [],
    purchases: [],
    points: []
};

document.addEventListener("DOMContentLoaded", async function () {

    await waitForUser();
    await loadHeader();
    await loadAllHistory();

    document.getElementById('historyType')
        .addEventListener('change', changeHistoryType);
});


// ------------------------------------------------
// WAIT FOR AUTH (SAFE LOAD)
// ------------------------------------------------
async function waitForUser() {
    let retries = 0;
    while (!window.currentUser?.user_id && retries < 10) {
        await new Promise(r => setTimeout(r, 300));
        retries++;
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
    } catch (err) {
        console.error("Header error:", err);
    }
}


// ------------------------------------------------
// LOAD FULL HISTORY (Single API)
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

        if (!data.success) throw new Error("API failed");

        allHistoryData.quiz = data.quiz || [];
        allHistoryData.purchases = data.purchases || [];
        allHistoryData.points = data.points || [];

        updateSummaryStats();
        renderHistory();

    } catch (err) {

        console.error("History load error:", err);

        document.getElementById('historyBody').innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    Failed to load history.
                </td>
            </tr>
        `;
    }
}


// ------------------------------------------------
// SUMMARY CARDS
// ------------------------------------------------
function updateSummaryStats() {

    const totalQuiz = allHistoryData.quiz.length;
    const totalPurchase = allHistoryData.purchases.length;
    const totalPoints = allHistoryData.points.reduce((sum, p) => {
    if (p.type === "earn") return sum + (p.points || 0);
    if (p.type === "use") return sum - Math.abs(p.points || 0);
    return sum;
}, 0);
    const totalScore = allHistoryData.quiz.reduce((sum, q) => sum + (q.score || 0), 0);

    document.getElementById('summaryStats').innerHTML = `
        <div class="stat-card">🧠 ${totalQuiz} Quizzes</div>
        <div class="stat-card">🛒 ${totalPurchase} Purchases</div>
        <div class="stat-card">💎 ${totalPoints} Points</div>
        <div class="stat-card">🏆 ${totalScore} Score</div>
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

    merged.sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
    });

    if (!merged.length) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    No history found
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
        date: q.timestamp,
        activity: 'Quiz',
        details: `Week ${q.week} | Score ${q.score}/40`,
        points: q.score,
        status: 'completed',
        type: 'quiz'
    }));
}

function formatPurchase() {
    return allHistoryData.purchases.map(p => ({
        date: p.date || p.created_at,
        activity: 'Purchase',
        details: `${p.item} - ₹${p.amount}`,
        points: p.points || 0,
        status: 'completed',
        type: 'purchase'
    }));
}

function formatPoints() {
    return allHistoryData.points.map(p => ({
        date: p.created_at,
        activity: p.type === 'earn' ? 'Points Earned' : 'Points Used',
        details: p.description || 'Transaction',
       points: p.type === 'earn'
    ? Math.abs(p.points || 0)
    : -Math.abs(p.points || 0),
        status: 'completed',
        type: 'points'
    }));
}


// ------------------------------------------------
// HELPERS
// ------------------------------------------------
function formatDate(d) {
    if (!d) return '-';
    return new Date(d).toLocaleString('en-IN');
}

function safeClass(str) {
    return String(str).replace(/\s+/g, '-').toLowerCase();
}


// ------------------------------------------------
// FILTER CHANGE
// ------------------------------------------------
function changeHistoryType(e) {
    currentHistoryType = e.target.value;
    renderHistory();
}

window.changeHistoryType = changeHistoryType;
// assets/js/history.js

let currentHistoryType = 'all';
let allHistoryData = {
    quiz: [],
    purchases: [],
    points: []
};

let refreshInterval = null;

// ------------------------------------------------
// INIT
// ------------------------------------------------
document.addEventListener("DOMContentLoaded", async function () {

    await waitForUser();
    await loadHeader();
    await loadAllHistory();

    document.getElementById('historyType')
        .addEventListener('change', changeHistoryType);

    // Auto refresh (safe single instance)
    refreshInterval = setInterval(loadAllHistory, 60000);
});

// ------------------------------------------------
// WAIT FOR AUTH
// ------------------------------------------------
async function waitForUser() {
    let retries = 0;
    while (!window.currentUser?.user_id && retries < 15) {
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

        if (!data.success) throw new Error("API failed");

        allHistoryData.quiz = Array.isArray(data.quiz) ? data.quiz : [];
        allHistoryData.purchases = Array.isArray(data.purchases) ? data.purchases : [];
        allHistoryData.points = Array.isArray(data.points) ? data.points : [];

        updateSummaryStats();
        renderHistory();

    } catch (err) {
        console.error("History load error:", err);

        document.getElementById('historyBody').innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    Failed to load history.
                </td>
            </tr>
        `;
    }
}

// ------------------------------------------------
// SUMMARY
// ------------------------------------------------
function updateSummaryStats() {

    const totalQuiz = allHistoryData.quiz.length;
    const totalPurchase = allHistoryData.purchases.length;

    const totalPoints = allHistoryData.points.reduce((sum, p) => {
        const value = Number(p.points) || 0;
        return p.type === "earn" ? sum + value : sum - Math.abs(value);
    }, 0);

    const totalScore = allHistoryData.quiz.reduce(
        (sum, q) => sum + (Number(q.score) || 0),
        0
    );

    document.getElementById('summaryStats').innerHTML = `
        <div class="stat-card">🧠 ${totalQuiz} Quizzes</div>
        <div class="stat-card">🛒 ${totalPurchase} Purchases</div>
        <div class="stat-card">💎 ${totalPoints} Net Points</div>
        <div class="stat-card">🏆 ${totalScore} Total Score</div>
    `;
}

// ------------------------------------------------
// RENDER
// ------------------------------------------------
function renderHistory() {

    const tableHeader = document.getElementById('historyHeader');
    const tableBody = document.getElementById('historyBody');
    const pageTitle = document.querySelector('.history-title');

    const merged = buildMergedData();

    const headers = getHeaders();
    tableHeader.innerHTML = `
        <tr>
            ${headers.map(h => `<th>${h}</th>`).join('')}
        </tr>
    `;

    if (!merged.length) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="${headers.length}" class="empty-state">
                    No records found
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = merged.map(renderRow).join('');

    pageTitle.innerHTML = `
        <i class="fas fa-history"></i>
        ${getTitle()}
        <span class="record-count">${merged.length} records</span>
    `;
}

// ------------------------------------------------
// BUILD MERGED DATA
// ------------------------------------------------
function buildMergedData() {

    let merged = [
        ...formatQuiz(),
        ...formatPurchase(),
        ...formatPoints()
    ];

    if (currentHistoryType !== 'all') {
        merged = merged.filter(i => i.category === currentHistoryType);
    }

    merged.sort((a, b) => {
        const A = a.date ? new Date(a.date).getTime() : 0;
        const B = b.date ? new Date(b.date).getTime() : 0;
        return B - A;
    });

    return merged;
}

// ------------------------------------------------
// HEADERS
// ------------------------------------------------
function getHeaders() {

    const map = {
        all: ['Date & Time', 'Activity', 'Details', 'Points', 'Status'],
        quiz: ['Date & Time', 'Quiz', 'Week', 'Score', 'Status'],
        purchase: ['Date & Time', 'Item', 'Amount', 'Points', 'Stamp'],
        points: ['Date & Time', 'Type', 'Description', 'Points', 'Status']
    };

    return map[currentHistoryType] || map.all;
}

// ------------------------------------------------
// TITLE
// ------------------------------------------------
function getTitle() {
    const map = {
        all: '📊 All Activities',
        quiz: '🧠 Quiz History',
        purchase: '🛒 Purchase History',
        points: '💎 Points Log'
    };
    return map[currentHistoryType] || 'Activity History';
}

// ------------------------------------------------
// ROW RENDERER
// ------------------------------------------------
function renderRow(item) {

    if (currentHistoryType === 'quiz') {
        return `
        <tr>
            <td>${formatDate(item.date)}</td>
            <td>Quiz</td>
            <td>${item.week}</td>
            <td class="points-positive">${item.score}</td>
            <td><span class="status-badge status-completed">Completed</span></td>
        </tr>`;
    }

    if (currentHistoryType === 'purchase') {
        return `
        <tr>
            <td>${formatDate(item.date)}</td>
            <td>${item.item}</td>
            <td>₹${item.amount}</td>
            <td class="points-positive">+${item.points}</td>
            <td><span class="status-badge">${item.stamp === 'Yes' ? '✅ Stamp' : '—'}</span></td>
        </tr>`;
    }

    if (currentHistoryType === 'points') {
        return `
        <tr>
            <td>${formatDate(item.date)}</td>
            <td>${item.typeLabel}</td>
            <td>${item.description}</td>
            <td class="${item.points > 0 ? 'points-positive' : 'points-negative'}">
                ${item.points > 0 ? '+' : ''}${item.points}
            </td>
            <td><span class="status-badge status-completed">Completed</span></td>
        </tr>`;
    }

    return `
    <tr>
        <td>${formatDate(item.date)}</td>
        <td>${item.activity}</td>
        <td>${item.details}</td>
        <td class="${item.points > 0 ? 'points-positive' : item.points < 0 ? 'points-negative' : ''}">
            ${item.points > 0 ? '+' : ''}${item.points}
        </td>
        <td><span class="status-badge">${item.status}</span></td>
    </tr>`;
}

// ------------------------------------------------
// FORMATTERS
// ------------------------------------------------
function formatQuiz() {
    return allHistoryData.quiz.map(q => ({
        category: 'quiz',
        date: q.timestamp,
        week: q.week || '-',
        score: Number(q.score) || 0,
        activity: 'Quiz Attempt',
        details: `Week ${q.week}`,
        points: Number(q.score) || 0,
        status: 'completed'
    }));
}

function formatPurchase() {
    return allHistoryData.purchases.map(p => ({
        category: 'purchase',
        date: p.date,
        item: p.item || 'Item',
        amount: p.amount || 0,
        points: Number(p.points) || 0,
        stamp: p.stamp || 'No',
        activity: 'Purchase',
        details: `${p.item} - ₹${p.amount}`,
        status: 'completed'
    }));
}

function formatPoints() {
    return allHistoryData.points.map(p => {
        const val = Number(p.points) || 0;
        return {
            category: 'points',
            date: p.created_at,
            typeLabel: p.type === 'earn' ? '✨ Earned' : '💸 Used',
            description: p.description || 'Transaction',
            points: p.type === 'earn' ? Math.abs(val) : -Math.abs(val),
            activity: p.type === 'earn' ? 'Points Earned' : 'Points Used',
            details: p.description,
            status: 'completed'
        };
    });
}

// ------------------------------------------------
// HELPERS
// ------------------------------------------------
function formatDate(d) {
    if (!d) return '-';
    return new Date(d).toLocaleString('en-IN');
}

// ------------------------------------------------
// FILTER
// ------------------------------------------------
function changeHistoryType(e) {
    currentHistoryType = e?.target?.value || 'all';
    renderHistory();
}

window.changeHistoryType = changeHistoryType;
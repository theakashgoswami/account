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
        console.log("📥 Raw history data:", data);

        if (!data.success) throw new Error("API failed");

        // Ensure data is arrays
        allHistoryData.quiz = Array.isArray(data.quiz) ? data.quiz : [];
        allHistoryData.purchases = Array.isArray(data.purchases) ? data.purchases : [];
        allHistoryData.points = Array.isArray(data.points) ? data.points : [];

        console.log("✅ Processed data:", {
            quiz: allHistoryData.quiz.length,
            purchases: allHistoryData.purchases.length,
            points: allHistoryData.points.length
        });

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
// GET DYNAMIC TABLE HEADERS
// ------------------------------------------------
function getTableHeaders() {
    const headers = {
        'all': ['Date & Time', 'Activity', 'Details', 'Points', 'Status'],
        'quiz': ['Date & Time', 'Quiz', 'Week', 'Score', 'Status'],
        'purchase': ['Date & Time', 'Item', 'Amount', 'Points', 'Stamp'],
        'points': ['Date & Time', 'Type', 'Description', 'Points', 'Status']
    };
    
    return headers[currentHistoryType] || headers.all;
}

// ------------------------------------------------
// FIXED FORMATTERS
// ------------------------------------------------
function formatQuiz() {
    return allHistoryData.quiz.map(q => {
        // Handle different possible field names
        const week = q.week || q.Week || 'N/A';
        const score = Number(q.score || q.Score || 0);
        const timestamp = q.timestamp || q.Timestamp || q.created_at || q.date || new Date();
        
        return {
            date: timestamp,
            type: 'quiz',
            activity: '📝 Quiz Attempt',
            details: `Week ${week}`,
            points: score,
            status: score > 0 ? 'completed' : 'attempted',
            // For specific views
            quizName: `Quiz ${week}`,
            week: week,
            score: score
        };
    });
}

function formatPurchase() {
    return allHistoryData.purchases.map(p => {
        // Handle different possible field names
        const item = p.item || p.Item || p.product || 'Item';
        const amount = p.amount || p.Amount || p.price || 0;
        const points = Number(p.points || p.Points || 0);
        const stamp = p.stamp || p.Stamp || p.stampGiven || 'No';
        const timestamp = p.date || p.Date || p.created_at || p.timestamp || new Date();
        
        return {
            date: timestamp,
            type: 'purchase',
            activity: '🛒 Purchase',
            details: `${item} - ₹${amount}`,
            points: points,
            status: stamp === 'Yes' ? 'stamp earned' : 'completed',
            // For specific views
            itemName: item,
            amount: amount,
            stamp: stamp
        };
    });
}

function formatPoints() {
    return allHistoryData.points.map(p => {
        // Handle different possible field names
        const type = p.type || p.Type || p.transaction_type || 'earn';
        const points = Number(p.points || p.Points || 0);
        const description = p.description || p.Description || p.reason || p.Reason || 'Transaction';
        const timestamp = p.created_at || p.Created_at || p.date || p.Date || p.timestamp || new Date();
        
        // Ensure points is a number
        const pointValue = Math.abs(points);
        const isEarn = type.toLowerCase() === 'earn';
        
        return {
            date: timestamp,
            type: 'points',
            activity: isEarn ? '✨ Points Earned' : '💸 Points Used',
            details: description,
            points: isEarn ? pointValue : -pointValue,
            status: 'completed',
            // For specific views
            pointType: isEarn ? '✨ Earned' : '💸 Used',
            typeClass: isEarn ? 'points-positive' : 'points-negative',
            description: description
        };
    });
}

// ------------------------------------------------
// RENDER HISTORY - FIXED
// ------------------------------------------------
function renderHistory() {
    const tableHeader = document.getElementById('historyHeader');
    const tableBody = document.getElementById('historyBody');
    const pageTitle = document.querySelector('.history-title');

    // Update table headers
    const headers = getTableHeaders();
    tableHeader.innerHTML = `
        <tr>
            ${headers.map(h => `<th>${h}</th>`).join('')}
        </tr>
    `;

    // Get and merge data
    let merged = [
        ...formatQuiz(),
        ...formatPurchase(),
        ...formatPoints()
    ];

    console.log("📊 Merged data:", merged);

    if (currentHistoryType !== 'all') {
        merged = merged.filter(i => i.type === currentHistoryType);
    }

    // Sort by date (newest first)
    merged.sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
    });

    // Update page title
    const typeNames = {
        'all': '📊 All Activities',
        'quiz': '🧠 Quiz History',
        'purchase': '🛒 Purchase History',
        'points': '💎 Points Log'
    };
    
    pageTitle.innerHTML = `
        <i class="fas fa-history"></i>
        ${typeNames[currentHistoryType] || 'Activity History'}
        <span class="record-count">${merged.length} records</span>
    `;

    // Handle empty state
    if (!merged.length) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="${headers.length}" class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>No ${typeNames[currentHistoryType].toLowerCase()} found</p>
                </td>
            </tr>
        `;
        return;
    }

    // Render rows based on current type
    tableBody.innerHTML = merged.map(item => {
        switch(currentHistoryType) {
            case 'quiz':
                return `
                    <tr class="type-${item.type}">
                        <td>${formatDate(item.date)}</td>
                        <td><strong>${item.quizName || 'Quiz'}</strong></td>
                        <td>${item.week}</td>
                        <td class="points-positive">${item.score}</td>
                        <td><span class="status-badge status-${safeClass(item.status)}">${item.status}</span></td>
                    </tr>
                `;
                
            case 'purchase':
                return `
                    <tr class="type-${item.type}">
                        <td>${formatDate(item.date)}</td>
                        <td><strong>${item.itemName}</strong></td>
                        <td>₹${item.amount}</td>
                        <td class="points-positive">+${item.points}</td>
                        <td><span class="status-badge status-${item.stamp === 'Yes' ? 'completed' : 'pending'}">
                            ${item.stamp === 'Yes' ? '✅ Stamp' : '➖ No Stamp'}
                        </span></td>
                    </tr>
                `;
                
            case 'points':
                return `
                    <tr class="type-${item.type}">
                        <td>${formatDate(item.date)}</td>
                        <td><span class="${item.typeClass}">${item.pointType}</span></td>
                        <td>${item.description}</td>
                        <td class="${item.points > 0 ? 'points-positive' : 'points-negative'}">
                            ${item.points > 0 ? '+' : ''}${item.points}
                        </td>
                        <td><span class="status-badge status-completed">Completed</span></td>
                    </tr>
                `;
                
            default: // 'all' view
                return `
                    <tr class="type-${item.type}">
                        <td>${formatDate(item.date)}</td>
                        <td><strong>${item.activity || 'Activity'}</strong></td>
                        <td>${item.details || '-'}</td>
                        <td class="${item.points > 0 ? 'points-positive' : item.points < 0 ? 'points-negative' : ''}">
                            ${item.points !== 0 ? (item.points > 0 ? '+' : '') + item.points : '-'}
                        </td>
                        <td>
                            <span class="status-badge status-${safeClass(item.status || 'completed')}">
                                ${item.status || 'completed'}
                            </span>
                        </td>
                    </tr>
                `;
        }
    }).join('');
}

// ------------------------------------------------
// HELPERS
// ------------------------------------------------
function formatDate(d) {
    if (!d) return '-';
    try {
        const date = new Date(d);
        if (isNaN(date.getTime())) return String(d);
        
        return date.toLocaleString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
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
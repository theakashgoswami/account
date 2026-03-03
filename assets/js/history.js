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
        purchase: ['Date & Time', 'Item', 'Amount', 'Points', 'Stamp', 'Invoice'],
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
        <td>
            <span class="status-badge">
                ${item.stamp === 'Yes' ? '✅ Stamp' : '—'}
            </span>
        </td>
        <td>
            ${item.invoiceId
                ? `<button class="invoice-btn"
                    onclick="openInvoice('${item.invoiceId}')">
                    View
                   </button>`
                : '—'}
        </td>
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
    return (allHistoryData.purchases || []).map(p => ({
        category: 'purchase',  // ✅ MUST BE category
        invoiceId: p.invoice || '',
        date: p.date || p.created_at,
        item: p.item || 'Item', // ✅ rename to item
        amount: Number(p.amount) || 0,
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
async function openInvoice(invoiceId) {
    const overlay = document.getElementById("invoiceOverlay");
    const content = document.getElementById("invoiceContent");
    
    overlay.style.display = "flex";
    content.innerHTML = `
        <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i> Loading invoice...
        </div>
    `;

    try {
        // Fetch invoice details from worker
        const res = await fetch(
            `${CONFIG.WORKER_URL}/api/user/invoice?invoice=${invoiceId}`,
            {
                credentials: "include",
                headers: { "X-Client-Host": window.location.host }
            }
        );

        const data = await res.json();

        if (!data.success) {
            content.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    Invoice not found
                </div>
            `;
            return;
        }

        const inv = data.invoice;
        const user = inv.user;

        // Format the invoice HTML
        content.innerHTML = `
            <div class="invoice-header">
                <h2>AG Electronics</h2>
                <p class="invoice-subtitle">A Unit of AG TechScript™</p>
                <p class="invoice-address">Baba Jaharveer Mandir, Kisrauli, Kasganj UP 207124</p>
                <p class="invoice-contact">📞 6397563847 | GSTIN: 09JYTPK4090Q123</p>
            </div>
            
            <div class="invoice-body">
                <div class="invoice-details">
                    <p><strong>Invoice No:</strong> ${inv.invoice_id}</p>
                    <p><strong>Date:</strong> ${new Date(inv.date).toLocaleDateString('en-IN', {
                        day: '2-digit', month: '2-digit', year: 'numeric'
                    })}</p>
                </div>
                
                <div class="customer-details">
                    <h3>Customer Details</h3>
                    <p><strong>User ID:</strong> ${user.user_id}</p>
                    <p><strong>Name:</strong> ${user.name || 'N/A'}</p>
                    <p><strong>Email:</strong> ${user.email || 'N/A'}</p>
                    <p><strong>Phone:</strong> ${user.phone || 'N/A'}</p>
                    <p><strong>Address:</strong> ${user.address || 'N/A'}</p>
                    ${user.gstin ? `<p><strong>GSTIN:</strong> ${user.gstin}</p>` : ''}
                </div>
                
                <div class="invoice-items">
                    <h3>Item Details</h3>
                    <table class="invoice-table">
                        <thead>
                            <tr>
                                <th>S No.</th>
                                <th>Item</th>
                                <th>Rate</th>
                                <th>Qty</th>
                                <th>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>1</td>
                                <td>${inv.item}</td>
                                <td>₹${inv.amount}</td>
                                <td>1</td>
                                <td>₹${inv.amount}</td>
                            </tr>
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="4" style="text-align:right;"><strong>Total Amount:</strong></td>
                                <td><strong>₹${inv.amount}</strong></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                
                <div class="invoice-footer">
                    <p class="tax-note">Composition taxable person, not eligible to collect tax on supplies.</p>
                    <p class="return-policy">*No return. 7 days replacement applicable only for manufacturing defects.</p>
                    <p class="signature">Authorised Signatory</p>
                </div>
            </div>
        `;

    } catch (err) {
        console.error("Invoice error:", err);
        content.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                Error loading invoice. Please try again.
            </div>
        `;
    }
}

function closeInvoice() {
    document.getElementById("invoiceOverlay").style.display = "none";
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


// ------------------------------------------------
// FILTER
// ------------------------------------------------
function changeHistoryType(e) {
    currentHistoryType = e?.target?.value || 'all';
    renderHistory();
}

window.changeHistoryType = changeHistoryType;
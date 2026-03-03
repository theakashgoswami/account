// assets/js/history.js - OPTIMIZED & FIXED

let currentHistoryType = 'all';
let allHistoryData = {
    quiz: [],
    purchases: [],
    points: []
};
let isLoading = false;
let currentPage = 1;
const pageSize = 20;
let refreshInterval = null;

// ------------------------------------------------
// INIT - SINGLE ENTRY POINT
// ------------------------------------------------
document.addEventListener("DOMContentLoaded", async function () {
    console.time("history-load");
    
    await waitForUser();
    await loadHeader();
    
    // Show skeleton loading
    showSkeleton();
    
    // Load history data
    await loadAllHistory();

    // Setup filter change listener
    const filterEl = document.getElementById('historyType');
    if (filterEl) {
        filterEl.addEventListener('change', changeHistoryType);
    }

    // Auto refresh every 60 seconds
    refreshInterval = setInterval(loadAllHistory, 60000);
    
    console.timeEnd("history-load");
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
        
        // Load user profile icon if available
        if (window.currentUser?.user_id && window.loadUserProfileIcon) {
            await window.loadUserProfileIcon(window.currentUser.user_id);
        }
    } catch (err) {
        console.error("Header error:", err);
    }
}

// ------------------------------------------------
// SHOW SKELETON LOADING
// ------------------------------------------------
function showSkeleton() {
    const tableBody = document.getElementById('historyBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = `
        <tr>
            <td colspan="5">
                <div class="skeleton-loader">
                    <div class="skeleton-line"></div>
                    <div class="skeleton-line"></div>
                    <div class="skeleton-line"></div>
                    <div class="skeleton-line"></div>
                </div>
            </td>
        </tr>
    `;
}

// ------------------------------------------------
// SHOW ERROR
// ------------------------------------------------
function showError() {
    const tableBody = document.getElementById('historyBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = `
        <tr>
            <td colspan="5" class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                Failed to load history. Please refresh the page.
            </td>
        </tr>
    `;
}

// ------------------------------------------------
// LOAD HISTORY - WITH CACHE CHECK
// ------------------------------------------------
async function loadAllHistory() {
    if (isLoading) return;
    isLoading = true;

    try {
        // Check session storage cache (2 minutes)
        const cached = sessionStorage.getItem('history_cache');
        const cacheTime = sessionStorage.getItem('history_cache_time');
        
        if (cached && cacheTime && (Date.now() - Number(cacheTime) < 120000)) {
            // Use cached data
            allHistoryData = JSON.parse(cached);
            updateSummaryStats();
            renderHistory();
            isLoading = false;
            return;
        }

        // Fetch fresh data
        const res = await fetch(
            `${CONFIG.WORKER_URL}/api/user/full-history`,
            {
                credentials: 'include',
                headers: { 'X-Client-Host': window.location.host }
            }
        );

        const data = await res.json();

        if (!data.success) throw new Error("API failed");

        allHistoryData = {
            quiz: Array.isArray(data.quiz) ? data.quiz : [],
            purchases: Array.isArray(data.purchases) ? data.purchases : [],
            points: Array.isArray(data.points) ? data.points : []
        };

        // Store in session storage
        sessionStorage.setItem('history_cache', JSON.stringify(allHistoryData));
        sessionStorage.setItem('history_cache_time', Date.now());

        updateSummaryStats();
        renderHistory();

    } catch (err) {
        console.error("History load error:", err);
        showError();
    } finally {
        isLoading = false;
    }
}

// ------------------------------------------------
// UPDATE SUMMARY STATS
// ------------------------------------------------
function updateSummaryStats() {
    const statsEl = document.getElementById('summaryStats');
    if (!statsEl) return;
    
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

    statsEl.innerHTML = `
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
                <span class="stat-label">Total Score</span>
                <span class="stat-value">${totalScore}</span>
            </div>
        </div>
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
// GET HEADERS
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
// GET TITLE
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
// RENDER HISTORY
// ------------------------------------------------
function renderHistory() {
    const tableHeader = document.getElementById('historyHeader');
    const tableBody = document.getElementById('historyBody');
    const pageTitle = document.querySelector('.history-title');
    
    if (!tableHeader || !tableBody) return;

    const merged = buildMergedData();

    // Update headers
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
                    <i class="fas fa-inbox"></i>
                    <p>No records found</p>
                </td>
            </tr>
        `;
        return;
    }

    // Pagination - show only current page
    const start = 0;
    const end = currentPage * pageSize;
    const paginatedData = merged.slice(0, end);

    tableBody.innerHTML = paginatedData.map(item => {
        if (currentHistoryType === 'quiz') {
            return `
            <tr class="type-quiz">
                <td>${formatDate(item.date)}</td>
                <td><strong>Quiz</strong></td>
                <td>Week ${item.week}</td>
                <td class="points-positive">${item.score}</td>
                <td><span class="status-badge status-completed">Completed</span></td>
            </tr>`;
        }

        if (currentHistoryType === 'purchase') {
            return `
            <tr class="type-purchase">
                <td>${formatDate(item.date)}</td>
                <td><strong>${item.item}</strong></td>
                <td>₹${item.amount}</td>
                <td class="points-positive">+${item.points}</td>
                <td>
                    <span class="status-badge ${item.stamp === 'Yes' ? 'status-completed' : 'status-pending'}">
                        ${item.stamp === 'Yes' ? '✅ Stamp' : '—'}
                    </span>
                </td>
                <td>
                    ${item.invoiceId
                        ? `<button class="invoice-btn" onclick="openInvoice('${item.invoiceId}')">
                            <i class="fas fa-file-invoice"></i> View
                           </button>`
                        : '—'}
                </td>
            </tr>`;
        }

        if (currentHistoryType === 'points') {
            return `
            <tr class="type-points">
                <td>${formatDate(item.date)}</td>
                <td><span class="${item.points > 0 ? 'points-positive' : 'points-negative'}">${item.typeLabel}</span></td>
                <td>${item.description}</td>
                <td class="${item.points > 0 ? 'points-positive' : 'points-negative'}">
                    ${item.points > 0 ? '+' : ''}${item.points}
                </td>
                <td><span class="status-badge status-completed">Completed</span></td>
            </tr>`;
        }

        // All activities view
        return `
        <tr class="type-${item.category}">
            <td>${formatDate(item.date)}</td>
            <td><strong>${item.activity}</strong></td>
            <td>${item.details}</td>
            <td class="${item.points > 0 ? 'points-positive' : item.points < 0 ? 'points-negative' : ''}">
                ${item.points > 0 ? '+' : ''}${item.points}
            </td>
            <td><span class="status-badge status-completed">${item.status}</span></td>
        </tr>`;
    }).join('');

    // Load more button
    if (end < merged.length) {
        tableBody.innerHTML += `
            <tr>
                <td colspan="${headers.length}" style="text-align:center; padding:20px;">
                    <button class="load-more-btn" onclick="loadMore()">
                        Load More (${merged.length - end} remaining)
                    </button>
                </td>
            </tr>
        `;
    }

    // Update page title with record count
    if (pageTitle) {
        pageTitle.innerHTML = `
            <i class="fas fa-history"></i>
            ${getTitle()}
            <span class="record-count">${merged.length} records</span>
        `;
    }
}

// ------------------------------------------------
// LOAD MORE
// ------------------------------------------------
function loadMore() {
    currentPage++;
    renderHistory();
}

// ------------------------------------------------
// FORMATTERS
// ------------------------------------------------
function formatQuiz() {
    return allHistoryData.quiz.map(q => ({
        category: 'quiz',
        date: q.timestamp || q.created_at,
        week: q.week || '-',
        score: Number(q.score) || 0,
        activity: 'Quiz Attempt',
        details: `Week ${q.week} | Score: ${q.score}/40`,
        points: Number(q.score) || 0,
        status: 'completed'
    }));
}

function formatPurchase() {
    return (allHistoryData.purchases || []).map(p => ({
        category: 'purchase',
        invoiceId: p.invoice || p.invoiceNo || '',
        date: p.date || p.created_at,
        item: p.item || 'Item',
        amount: Number(p.amount) || 0,
        points: Number(p.points) || 0,
        stamp: p.stamp || 'No',
        activity: 'Purchase',
        details: `${p.item || 'Item'} - ₹${p.amount || 0}`,
        status: 'completed'
    }));
}

function formatPoints() {
    return allHistoryData.points.map(p => {
        const val = Number(p.points) || 0;
        return {
            category: 'points',
            date: p.created_at || p.date,
            typeLabel: p.type === 'earn' ? '✨ Earned' : '💸 Used',
            description: p.description || p.reason || 'Transaction',
            points: p.type === 'earn' ? Math.abs(val) : -Math.abs(val),
            activity: p.type === 'earn' ? 'Points Earned' : 'Points Used',
            details: p.description || p.reason || 'Transaction',
            status: 'completed'
        };
    });
}

// ------------------------------------------------
// INVOICE FUNCTIONS
// ------------------------------------------------
// Updated openInvoice function for multiple items
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

        // Generate items table HTML
        const itemsHTML = inv.items.map((item, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${item.item}</td>
                <td>₹${item.rate}</td>
                <td>${item.qty}</td>
                <td>₹${item.amount}</td>
            </tr>
        `).join('');

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
                    <p><strong>Date:</strong> ${new Date(inv.date).toLocaleDateString('en-IN')}</p>
                </div>
                
                <div class="customer-details">
                    <h3>Customer Details</h3>
                    <p><strong>User ID:</strong> ${user.user_id}</p>
                    <p><strong>Name:</strong> ${user.name || 'N/A'}</p>
                    <p><strong>Phone:</strong> ${user.phone || 'N/A'}</p>
                    <p><strong>Address:</strong> ${user.address || 'N/A'}</p>
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
                            ${itemsHTML}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="4" style="text-align:right;"><strong>Total Amount:</strong></td>
                                <td><strong>₹${inv.total_amount}</strong></td>
                            </tr>
                            <tr>
                                <td colspan="4" style="text-align:right;"><strong>Points Earned:</strong></td>
                                <td><strong>${inv.total_points} Points</strong></td>
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

        // 🔥 FIX PRINT - SINGLE PAGE
        const printStyles = `
            <style>
                @media print {
                    body * { visibility: hidden; }
                    .invoice-overlay, .invoice-overlay * { visibility: visible; }
                    .invoice-overlay { position: absolute; left: 0; top: 0; width: 100%; }
                    .close-btn, .loading-spinner, .error-message { display: none !important; }
                }
            </style>
        `;
        
        // Add print button
        content.innerHTML += `
            <div style="text-align:center; margin-top:20px;">
                <button onclick="window.print()" class="invoice-print-btn">
                    <i class="fas fa-print"></i> Print Invoice
                </button>
            </div>
        `;

    } catch (err) {
        console.error("Invoice error:", err);
        content.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                Error loading invoice
            </div>
        `;
    }
}

function closeInvoice() {
    const overlay = document.getElementById("invoiceOverlay");
    if (overlay) overlay.style.display = "none";
}

// ------------------------------------------------
// FORMAT DATE
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
// FILTER CHANGE
// ------------------------------------------------
function changeHistoryType(event) {
    currentHistoryType = event?.target?.value || 'all';
    currentPage = 1; // Reset to first page
    renderHistory();
}

// Make functions globally available
window.changeHistoryType = changeHistoryType;
window.openInvoice = openInvoice;
window.closeInvoice = closeInvoice;
window.loadMore = loadMore;
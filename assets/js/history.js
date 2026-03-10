// ========================================
// HISTORY PAGE - MAIN CONTROLLER
// ========================================

// State Management
let currentUser = null;
let historyData = {
    quiz: [],
    purchases: [],
    points: []
};
let currentFilter = 'all';
let currentPage = 1;
const pageSize = 20;
let isLoading = false;
let refreshInterval = null;

// Initialize on DOM Load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📊 History page initializing...');
    
    // Load header first
    await loadHeader();
    
    // Check authentication
    await checkAuth();
    
    // Initialize components
    initEventListeners();
    
    // Load history data
    await loadHistoryData();
    
    // Start auto-refresh
    startAutoRefresh();
});

// ========================================
// AUTHENTICATION
// ========================================

async function checkAuth() {
    try {
        const response = await fetch(`${CONFIG.WORKER_URL}/api/auth/status`, {
            credentials: 'include',
            headers: { 'X-Client-Host': window.location.host }
        });
        
        const data = await response.json();
        
        if (!data.authenticated) {
            window.location.href = 'https://agtechscript.in';
            return;
        }
        
        currentUser = {
            user_id: data.user_id,
            role: data.role,
            profile_image: data.profile_image
        };
        
        console.log('✅ User authenticated:', currentUser.user_id);
        
    } catch (error) {
        console.error('❌ Auth check failed:', error);
        window.location.href = 'https://agtechscript.in';
    }
}

// ========================================
// HEADER LOADING
// ========================================

async function loadHeader() {
    try {
        const response = await fetch('/partials/header.html');
        const html = await response.text();
        document.getElementById('header-container').innerHTML = html;
        
        // Initialize header if function exists
        if (window.initHeader) {
            window.initHeader();
        }
    } catch (error) {
        console.error('❌ Header load failed:', error);
    }
}

// ========================================
// EVENT LISTENERS
// ========================================

function initEventListeners() {
    // Filter change
    const filter = document.getElementById('historyFilter');
    if (filter) {
        filter.addEventListener('change', (e) => {
            currentFilter = e.target.value;
            currentPage = 1;
            renderHistory();
            updateActiveFilter();
        });
    }
    
    // Load more button
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', loadMore);
    }
}

// ========================================
// DATA FETCHING
// ========================================

async function loadHistoryData() {
    if (isLoading) return;
    
    isLoading = true;
    showSkeletonLoading();
    
    try {
        const response = await fetch(`${CONFIG.WORKER_URL}/api/user/full-history`, {
            credentials: 'include',
            headers: { 'X-Client-Host': window.location.host }
        });
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error('Failed to load history');
        }
        
        // Update data
        historyData = {
            quiz: data.quiz || [],
            purchases: data.purchases || [],
            points: data.points || []
        };
        
        console.log('✅ History loaded:', {
            quiz: historyData.quiz.length,
            purchases: historyData.purchases.length,
            points: historyData.points.length
        });
        
        // Update UI
        updateStats();
        renderHistory();
        
    } catch (error) {
        console.error('❌ History load failed:', error);
        showError();
    } finally {
        isLoading = false;
    }
}

// ========================================
// STATS CARDS
// ========================================

function updateStats() {
    const statsGrid = document.getElementById('statsGrid');
    if (!statsGrid) return;
    
    // Calculate stats
    const totalQuiz = historyData.quiz.length;
    const totalPurchases = historyData.purchases.length;
    
    // Calculate net points
    const totalEarned = historyData.points
        .filter(p => p.type === 'earn')
        .reduce((sum, p) => sum + (Number(p.points) || 0), 0);
    
    const totalSpent = historyData.points
        .filter(p => p.type !== 'earn')
        .reduce((sum, p) => sum + Math.abs(Number(p.points) || 0), 0);
    
    const netPoints = totalEarned - totalSpent;
    
    // Calculate total score from quizzes
    const totalScore = historyData.quiz.reduce((sum, q) => sum + (Number(q.score) || 0), 0);
    
    // Update HTML
    statsGrid.innerHTML = `
        <div class="stat-card">
            <div class="stat-icon">🧠</div>
            <div class="stat-info">
                <div class="stat-label">Quizzes Played</div>
                <div class="stat-value">${totalQuiz}</div>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">🛒</div>
            <div class="stat-info">
                <div class="stat-label">Purchases</div>
                <div class="stat-value">${totalPurchases}</div>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">💎</div>
            <div class="stat-info">
                <div class="stat-label">Net Points</div>
                <div class="stat-value ${netPoints >= 0 ? 'points-positive' : 'points-negative'}">
                    ${netPoints >= 0 ? '+' : ''}${netPoints}
                </div>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">🏆</div>
            <div class="stat-info">
                <div class="stat-label">Total Score</div>
                <div class="stat-value">${totalScore}</div>
            </div>
        </div>
    `;
    
    // Update record count
    const totalRecords = getFilteredData().length;
    document.getElementById('recordCount').textContent = `${totalRecords} records`;
}

// ========================================
// DATA FILTERING
// ========================================

function getFilteredData() {
    let allActivities = [];
    
    // Format quiz data
    const quizActivities = historyData.quiz.map(q => ({
        id: `quiz-${q.quiz_date}-${Math.random()}`,
        type: 'quiz',
        date: q.created_at || q.quiz_date,
        category: 'quiz',
        title: 'Quiz Attempt',
        description: `Score: ${q.score} points`,
        points: Number(q.score) || 0,
        details: {
            week: q.quiz_date || 'Week',
            score: q.score || 0
        },
        status: 'completed'
    }));
    
    // Format purchase data
    const purchaseActivities = historyData.purchases.map(p => ({
        id: `purchase-${p.invoice_id}`,
        type: 'purchase',
        date: p.created_at,
        category: 'purchase',
        title: p.item || 'Purchase',
        description: `₹${p.amount} • ${p.points} points`,
        points: Number(p.points) || 0,
        details: {
            invoiceId: p.invoice_id,
            item: p.item,
            amount: p.amount,
            stamp: p.stamp
        },
        status: 'completed'
    }));
    
    // Format points data
    const pointActivities = historyData.points.map(p => {
        const points = Number(p.points) || 0;
        return {
            id: `points-${p.created_at}-${Math.random()}`,
            type: 'points',
            date: p.created_at,
            category: 'points',
            title: p.type === 'earn' ? '✨ Points Earned' : '💸 Points Used',
            description: p.description || 'Transaction',
            points: p.type === 'earn' ? points : -points,
            details: {
                type: p.type,
                description: p.description
            },
            status: 'completed'
        };
    });
    
    // Combine all
    allActivities = [...quizActivities, ...purchaseActivities, ...pointActivities];
    
    // Filter by category
    if (currentFilter !== 'all') {
        allActivities = allActivities.filter(a => a.category === currentFilter);
    }
    
    // Sort by date (newest first)
    allActivities.sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
    });
    
    return allActivities;
}

// ========================================
// RENDERING
// ========================================

function renderHistory() {
    const tbody = document.getElementById('tableBody');
    const tableHeader = document.getElementById('tableHeader');
    const loadMoreContainer = document.getElementById('loadMoreContainer');
    
    if (!tbody || !tableHeader) return;
    
    const filteredData = getFilteredData();
    const headers = getHeaders();
    
    // Update headers
    updateHeaders(tableHeader, headers);
    
    if (filteredData.length === 0) {
        showEmptyState(tbody, headers.length);
        loadMoreContainer.style.display = 'none';
        return;
    }
    
    // Paginate
    const start = 0;
    const end = currentPage * pageSize;
    const paginatedData = filteredData.slice(0, end);
    
    // Generate rows
    tbody.innerHTML = paginatedData.map(item => generateRow(item)).join('');
    
    // Show/hide load more
    if (end < filteredData.length) {
        loadMoreContainer.style.display = 'block';
        document.getElementById('remainingCount').textContent = 
            `+${filteredData.length - end} more`;
    } else {
        loadMoreContainer.style.display = 'none';
    }
}

function getHeaders() {
    const headers = {
        all: ['Date & Time', 'Activity', 'Details', 'Points', 'Status'],
        quiz: ['Date & Time', 'Quiz', 'Week', 'Score', 'Status'],
        purchase: ['Date & Time', 'Item', 'Amount', 'Points', 'Stamp', 'Invoice'],
        points: ['Date & Time', 'Type', 'Description', 'Points', 'Status']
    };
    return headers[currentFilter] || headers.all;
}

function updateHeaders(headerElement, headers) {
    headerElement.innerHTML = `
        <tr>
            ${headers.map(h => `<th>${h}</th>`).join('')}
        </tr>
    `;
}

function generateRow(item) {
    const date = formatDate(item.date);
    
    switch (currentFilter) {
        case 'quiz':
            return `
                <tr class="type-quiz">
                    <td>${date}</td>
                    <td><strong>Quiz Attempt</strong></td>
                    <td>Week ${item.details.week}</td>
                    <td class="points-positive">+${item.points}</td>
                    <td><span class="status-badge status-completed">Completed</span></td>
                </tr>
            `;
            
        case 'purchase':
            return `
                <tr class="type-purchase">
                    <td>${date}</td>
                    <td><strong>${item.details.item}</strong></td>
                    <td>₹${item.details.amount}</td>
                    <td class="points-positive">+${item.points}</td>
                    <td>
                        <span class="status-badge ${item.details.stamp === 'Yes' ? 'status-completed' : 'status-pending'}">
                            ${item.details.stamp === 'Yes' ? '✅ Stamp' : '—'}
                        </span>
                    </td>
                    <td>
                        ${item.details.invoiceId ? `
                            <button class="invoice-btn" onclick="window.openInvoice('${item.details.invoiceId}')">
                                <i class="fas fa-file-invoice"></i> View
                            </button>
                        ` : '—'}
                    </td>
                </tr>
            `;
            
        case 'points':
            return `
                <tr class="type-points">
                    <td>${date}</td>
                    <td><span class="${item.points > 0 ? 'points-positive' : 'points-negative'}">${item.title}</span></td>
                    <td>${item.description}</td>
                    <td class="${item.points > 0 ? 'points-positive' : 'points-negative'}">
                        ${item.points > 0 ? '+' : ''}${item.points}
                    </td>
                    <td><span class="status-badge status-completed">Completed</span></td>
                </tr>
            `;
            
        default: // all activities
            return `
                <tr class="type-${item.category}">
                    <td>${date}</td>
                    <td><strong>${item.title}</strong></td>
                    <td>${item.description}</td>
                    <td class="${item.points > 0 ? 'points-positive' : item.points < 0 ? 'points-negative' : ''}">
                        ${item.points > 0 ? '+' : ''}${item.points}
                    </td>
                    <td><span class="status-badge status-completed">${item.status}</span></td>
                </tr>
            `;
    }
}

// ========================================
// LOAD MORE
// ========================================

function loadMore() {
    currentPage++;
    renderHistory();
}

// ========================================
// INVOICE HANDLING
// ========================================

async function openInvoice(invoiceId) {
    const modal = document.getElementById('invoiceModal');
    const content = document.getElementById('invoiceContent');
    
    if (!modal || !content) return;
    
    // Show modal with loading
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    content.innerHTML = `
        <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
            Loading invoice...
        </div>
    `;
    
    try {
        const response = await fetch(
            `${CONFIG.WORKER_URL}/api/user/invoice?invoice=${invoiceId}`,
            {
                credentials: 'include',
                headers: { 'X-Client-Host': window.location.host }
            }
        );
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error('Invoice not found');
        }
        
        // Render invoice
        content.innerHTML = generateInvoiceHTML(data.invoice);
        
    } catch (error) {
        console.error('❌ Invoice load failed:', error);
        content.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>Failed to load invoice. Please try again.</p>
            </div>
        `;
    }
}

function closeInvoice() {
    const modal = document.getElementById('invoiceModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function generateInvoiceHTML(invoice) {
    const items = invoice.items || [];
    const user = invoice.user || {};
    
    const itemsHTML = items.map((item, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${item.item || 'Item'}</td>
            <td>₹${item.rate || 0}</td>
            <td>${item.qty || 1}</td>
            <td>₹${item.amount || 0}</td>
        </tr>
    `).join('');
    
    return `
        <div class="invoice-header">
            <img src="/assets/images/AGTechScript.webp" alt="AG TechScript" class="invoice-logo">
            <h2>AG Electronics</h2>
            <p class="invoice-subtitle">A Unit of AG TechScript™</p>
            <p class="invoice-address">Baba Jaharveer Mandir, Kisrauli, Kasganj UP 207124</p>
            <p class="invoice-contact">📞 6397563847 | GSTIN: 09JYTPK4090Q1Z3</p>
        </div>
        
        <div class="invoice-body">
            <div class="invoice-details">
                <p><strong>Invoice No:</strong> ${invoice.invoice_id}</p>
                <p><strong>Date:</strong> ${formatDate(invoice.date)}</p>
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
                            <td><strong>₹${invoice.total_amount}</strong></td>
                        </tr>
                        <tr>
                            <td colspan="4" style="text-align:right;"><strong>Points Earned:</strong></td>
                            <td><strong>${invoice.total_points} Points</strong></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            <div class="invoice-footer">
                <p class="tax-note">Composition taxable person, not eligible to collect tax on supplies.</p>
                <p class="return-policy">*No return. 7 days replacement applicable only for manufacturing defects.</p>
                <p class="signature">Authorised Signatory</p>
            </div>
            
            <div class="invoice-actions">
                <button onclick="window.print()" class="invoice-print-btn">
                    <i class="fas fa-print"></i> Print Invoice
                </button>
            </div>
        </div>
    `;
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

function formatDate(dateString) {
    if (!dateString) return '-';
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        
        return date.toLocaleString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    } catch {
        return dateString;
    }
}

// ========================================
// UI STATES
// ========================================

function showSkeletonLoading() {
    const statsGrid = document.getElementById('statsGrid');
    const tbody = document.getElementById('tableBody');
    
    if (statsGrid) {
        statsGrid.innerHTML = `
            <div class="stat-card skeleton">
                <div class="stat-icon"></div>
                <div class="stat-info"></div>
            </div>
            <div class="stat-card skeleton">
                <div class="stat-icon"></div>
                <div class="stat-info"></div>
            </div>
            <div class="stat-card skeleton">
                <div class="stat-icon"></div>
                <div class="stat-info"></div>
            </div>
            <div class="stat-card skeleton">
                <div class="stat-icon"></div>
                <div class="stat-info"></div>
            </div>
        `;
    }
    
    if (tbody) {
        tbody.innerHTML = `
            <tr class="skeleton-row">
                <td colspan="5">
                    <div class="skeleton-line"></div>
                    <div class="skeleton-line"></div>
                    <div class="skeleton-line"></div>
                    <div class="skeleton-line"></div>
                </td>
            </tr>
        `;
    }
}

function showEmptyState(tbody, colspan) {
    tbody.innerHTML = `
        <tr>
            <td colspan="${colspan}" class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>No activities found</p>
                <small>Your history will appear here</small>
            </td>
        </tr>
    `;
}

function showError() {
    const tbody = document.getElementById('tableBody');
    const statsGrid = document.getElementById('statsGrid');
    
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to load history</p>
                    <button onclick="window.location.reload()" class="retry-btn">
                        <i class="fas fa-redo"></i> Retry
                    </button>
                </td>
            </tr>
        `;
    }
}

function updateActiveFilter() {
    const filter = document.getElementById('historyFilter');
    if (filter) {
        filter.value = currentFilter;
    }
}

// ========================================
// AUTO REFRESH
// ========================================

function startAutoRefresh() {
    // Clear existing interval
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    
    // Set new interval (60 seconds)
    refreshInterval = setInterval(async () => {
        console.log('🔄 Auto-refreshing history...');
        await loadHistoryData();
    }, 60000);
}

// ========================================
// CLEANUP
// ========================================

window.addEventListener('beforeunload', () => {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
});

// ========================================
// EXPORT TO GLOBAL SCOPE
// ========================================

window.openInvoice = openInvoice;
window.closeInvoice = closeInvoice;
window.loadMore = loadMore;
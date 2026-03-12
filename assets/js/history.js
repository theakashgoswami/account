// ========================================
// HISTORY PAGE - MAIN CONTROLLER (FIXED)
// ========================================

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📊 History page initializing...');
    
    try {
        // Load header first
        await loadHeader();
        
        // Check authentication
        const user = await checkAuth();
        if (!user) return;
        
        // Initialize components
        initEventListeners();
        
        // Load history data
        await loadHistoryData();
        
        // Start auto-refresh
        startAutoRefresh();
        
    } catch (error) {
        console.error('❌ Initialization failed:', error);
        showFatalError();
    }
});

// ========================================
// STATE MANAGEMENT
// ========================================

let historyState = {
    user: null,
    quizData: [],
    purchaseData: [],
    pointsData: [],
    currentFilter: 'all',
    currentPage: 1,
    pageSize: 20,
    isLoading: false,
    refreshInterval: null
};

// ========================================
// AUTHENTICATION
// ========================================

async function checkAuth() {
    try {
        console.log('🔐 Checking authentication...');
        
        const response = await fetch(`${CONFIG.WORKER_URL}/api/auth/status`, {
            credentials: 'include',
            headers: { 
                'X-Client-Host': window.location.host,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        console.log('📡 Auth response:', data);
        
        if (!data.authenticated) {
            console.log('❌ Not authenticated, redirecting...');
            window.location.href = 'https://agtechscript.in';
            return null;
        }
        
        // Store user in historyState
        historyState.user = {
            user_id: data.user_id,
            role: data.role,
            profile_image: data.profile_image
        };
        
        console.log('✅ User authenticated:', historyState.user.user_id);
        return historyState.user;
        
    } catch (error) {
        console.error('❌ Auth check failed:', error);
        showToast('Authentication failed', 'error');
        return null;
    }
}

// ========================================
// HEADER LOADING
// ========================================

async function loadHeader() {
    try {
        console.log('📋 Loading header...');
        
        // Try multiple possible paths for header
        const possiblePaths = [
            '/partials/header.html',
            '../partials/header.html',
            'partials/header.html',
            '/assets/partials/header.html'
        ];
        
        let headerHtml = null;
        let successPath = null;
        
        for (const path of possiblePaths) {
            try {
                const response = await fetch(path);
                if (response.ok) {
                    headerHtml = await response.text();
                    successPath = path;
                    break;
                }
            } catch (e) {
                // Continue to next path
            }
        }
        
        if (!headerHtml) {
            console.warn('⚠️ Header not found, using fallback');
            headerHtml = getFallbackHeader();
        } else {
            console.log(`✅ Header loaded from: ${successPath}`);
        }
        
        const headerContainer = document.getElementById('header-container');
        if (headerContainer) {
            headerContainer.innerHTML = headerHtml;
            
            // Initialize header components
            if (typeof window.initHeader === 'function') {
                setTimeout(() => window.initHeader(), 100);
            }
            
            // Load user profile icon if available
            if (historyState.user?.user_id && typeof window.loadUserProfileIcon === 'function') {
                setTimeout(() => window.loadUserProfileIcon(historyState.user.user_id), 200);
            }
        } else {
            console.error('❌ Header container not found');
        }
        
    } catch (error) {
        console.error('❌ Header load failed:', error);
        // Still continue, page might work without header
    }
}

// Fallback header if file not found
function getFallbackHeader() {
    return `
        <header class="main-header">
            <nav class="navbar">
                <div class="nav-brand">
                    <a href="/">
                        <img src="/assets/images/AGTechScript.webp" alt="AG TechScript" class="logo">
                    </a>
                </div>
                <div class="nav-menu">
                    <a href="/" class="nav-link">Home</a>
                    <a href="/quiz" class="nav-link">Quiz</a>
                    <a href="/rewards" class="nav-link">Rewards</a>
                    <a href="/history" class="nav-link active">History</a>
                </div>
                <div class="nav-user" id="userProfileIcon">
                    <div class="user-icon-placeholder">
                        <i class="fas fa-user-circle"></i>
                    </div>
                </div>
            </nav>
        </header>
    `;
}

// ========================================
// EVENT LISTENERS
// ========================================

function initEventListeners() {
    console.log('🔧 Initializing event listeners...');
    
    // Filter change
    const filter = document.getElementById('historyFilter');
    if (filter) {
        filter.addEventListener('change', (e) => {
            historyState.currentFilter = e.target.value;
            historyState.currentPage = 1;
            renderHistoryTable();
        });
        console.log('✅ Filter listener attached');
    } else {
        console.warn('⚠️ Filter element not found');
    }
    
    // Load more button (delegation)
    document.addEventListener('click', (e) => {
        if (e.target.closest('#loadMoreBtn')) {
            loadMoreHistory();
        }
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('invoiceModal');
        if (e.target === modal) {
            closeInvoice();
        }
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeInvoice();
        }
    });
}

// ========================================
// DATA FETCHING
// ========================================

async function loadHistoryData() {
    if (historyState.isLoading) {
        console.log('⏳ Already loading...');
        return;
    }
    
    historyState.isLoading = true;
    showSkeletonLoading();
    
    try {
        console.log('📡 Fetching history data...');
        
        const response = await fetch(`${CONFIG.WORKER_URL}/api/user/full-history`, {
            credentials: 'include',
            headers: { 
                'X-Client-Host': window.location.host,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📊 History data received:', data);
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to load history');
        }
        
        // Update state with proper data validation
        historyState.quizData = Array.isArray(data.quiz) ? data.quiz : [];
        historyState.purchaseData = Array.isArray(data.purchases) ? data.purchases : [];
        historyState.pointsData = Array.isArray(data.points) ? data.points : [];
        
        console.log('✅ History loaded:', {
            quiz: historyState.quizData.length,
            purchases: historyState.purchaseData.length,
            points: historyState.pointsData.length
        });
        
        // Log points data for debugging
        console.log('💰 Points data sample:', historyState.pointsData.slice(0, 3));
        
        // Update UI
        updateStatsCards();
        renderHistoryTable();
        
    } catch (error) {
        console.error('❌ History load failed:', error);
        showErrorState(error.message);
    } finally {
        historyState.isLoading = false;
    }
}

// ========================================
// STATS CARDS
// ========================================

function updateStatsCards() {
    const statsGrid = document.getElementById('statsGrid');
    if (!statsGrid) {
        console.warn('⚠️ Stats grid not found');
        return;
    }
    
    // Calculate stats
    const totalQuiz = historyState.quizData.length;
    const totalPurchases = historyState.purchaseData.length;
    
    // Calculate net points with proper type checking
    let totalEarned = 0;
    let totalSpent = 0;
    
    historyState.pointsData.forEach(p => {
        const points = Number(p.points) || 0;
        if (p.type === 'earn') {
            totalEarned += points;
        } else if (p.type === 'used' || p.type === 'spend') {
            totalSpent += points;
        }
    });
    
    const netPoints = totalEarned - totalSpent;
    
    // Calculate total score from quizzes
    const totalScore = historyState.quizData.reduce((sum, q) => sum + (Number(q.score) || 0), 0);
    
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
    const recordCount = document.getElementById('recordCount');
    if (recordCount) {
        recordCount.textContent = `${totalRecords} records`;
    }
}

// ========================================
// DATA FILTERING (FIXED POINTS HANDLING)
// ========================================

function getFilteredData() {
    const activities = [];
    
    // Add quiz activities
    historyState.quizData.forEach(q => {
        activities.push({
            id: `quiz-${q.quiz_date}-${Date.now()}-${Math.random()}`,
            type: 'quiz',
            category: 'quiz',
            date: q.created_at || q.quiz_date,
            title: '📝 Quiz Attempt',
            description: `Week ${q.quiz_date || '-'}`,
            points: Number(q.score) || 0,
            details: { week: q.quiz_date, score: q.score }
        });
    });
    
    // Add purchase activities
    historyState.purchaseData.forEach(p => {
        activities.push({
            id: `purchase-${p.invoice_id || Date.now()}-${Math.random()}`,
            type: 'purchase',
            category: 'purchase',
            date: p.created_at,
            title: '🛍️ ' + (p.item || 'Purchase'),
            description: `₹${p.amount || 0}`,
            points: Number(p.points) || 0,
            details: {
                invoiceId: p.invoice_id,
                item: p.item,
                amount: p.amount,
                stamp: p.stamp
            }
        });
    });
    
    // Add points activities - FIXED VERSION
    historyState.pointsData.forEach(p => {
        const points = Number(p.points) || 0;
        const pointsType = p.type ? p.type.toLowerCase() : '';
        
        // Determine points sign and title
        let displayPoints;
        let title;
        
        if (pointsType === 'earn') {
            displayPoints = points;  // Positive for earned
            title = '✨ Points Earned';
        } else if (pointsType === 'used' || pointsType === 'spend' || pointsType === 'spent') {
            displayPoints = -points;  // Negative for used/spent
            title = '💸 Points Used';
        } else {
            // Unknown type - check if points are negative in database
            if (points < 0) {
                displayPoints = points;  // Already negative
                title = '💸 Points Used';
            } else {
                displayPoints = points;  // Assume earned
                title = '🔄 Points Transaction';
            }
        }
        
        console.log(`Points activity: type=${p.type}, raw=${p.points}, display=${displayPoints}`);
        
        activities.push({
            id: `points-${p.created_at}-${Math.random()}`,
            type: 'points',
            category: 'points',
            date: p.created_at,
            title: title,
            description: p.description || 'Points transaction',
            points: displayPoints,
            details: { 
                type: p.type, 
                description: p.description,
                rawPoints: p.points 
            }
        });
    });
    
    // Filter by category
    let filtered = activities;
    if (historyState.currentFilter !== 'all') {
        filtered = activities.filter(a => a.category === historyState.currentFilter);
    }
    
    // Sort by date (newest first)
    filtered.sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
    });
    
    return filtered;
}

// ========================================
// TABLE RENDERING
// ========================================

function renderHistoryTable() {
    const tbody = document.getElementById('tableBody');
    const tableHeader = document.getElementById('tableHeader');
    const loadMoreContainer = document.getElementById('loadMoreContainer');
    
    if (!tbody || !tableHeader) {
        console.error('❌ Table elements not found');
        return;
    }
    
    const filteredData = getFilteredData();
    const headers = getTableHeaders();
    
    // Update headers
    updateTableHeaders(tableHeader, headers);
    
    if (filteredData.length === 0) {
        showEmptyState(tbody, headers.length);
        if (loadMoreContainer) loadMoreContainer.style.display = 'none';
        return;
    }
    
    // Paginate
    const end = historyState.currentPage * historyState.pageSize;
    const paginatedData = filteredData.slice(0, end);
    
    // Generate rows
    tbody.innerHTML = paginatedData.map(item => generateTableRow(item)).join('');
    
    // Show/hide load more
    if (loadMoreContainer) {
        if (end < filteredData.length) {
            loadMoreContainer.style.display = 'block';
            const remaining = document.getElementById('remainingCount');
            if (remaining) {
                remaining.textContent = `+${filteredData.length - end} more`;
            }
        } else {
            loadMoreContainer.style.display = 'none';
        }
    }
}

function getTableHeaders() {
    const headers = {
        all: ['Date & Time', 'Activity', 'Description', 'Points', 'Status'],
        quiz: ['Date & Time', 'Activity', 'Week', 'Score', 'Status'],
        purchase: ['Date & Time', 'Item', 'Amount', 'Points', 'Stamp', 'Invoice'],
        points: ['Date & Time', 'Type', 'Description', 'Points', 'Status']
    };
    return headers[historyState.currentFilter] || headers.all;
}

function updateTableHeaders(headerElement, headers) {
    headerElement.innerHTML = `
        <tr>
            ${headers.map(h => `<th>${h}</th>`).join('')}
        </tr>
    `;
}

function generateTableRow(item) {
    const date = formatDate(item.date);
    
    switch (historyState.currentFilter) {
        case 'quiz':
            return `
                <tr class="type-quiz">
                    <td>${date}</td>
                    <td><strong>${item.title}</strong></td>
                    <td>Week ${item.details.week || '-'}</td>
                    <td class="points-positive">+${item.points}</td>
                    <td><span class="status-badge status-completed">✓ Completed</span></td>
                </tr>
            `;
            
        case 'purchase':
            return `
                <tr class="type-purchase">
                    <td>${date}</td>
                    <td><strong>${item.details.item || 'Item'}</strong></td>
                    <td>₹${item.details.amount || 0}</td>
                    <td class="points-positive">+${item.points}</td>
                    <td>
                        <span class="status-badge ${item.details.stamp === 'Yes' ? 'status-completed' : 'status-pending'}">
                            ${item.details.stamp === 'Yes' ? '✅ Stamp' : '⏳ Pending'}
                        </span>
                    </td>
                    <td>
                        ${item.details.invoiceId ? `
                            <button class="invoice-btn" onclick="openInvoice('${item.details.invoiceId}')">
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
                    <td class="${item.points > 0 ? 'points-positive' : item.points < 0 ? 'points-negative' : ''}">
                        ${item.points > 0 ? '+' : ''}${item.points}
                    </td>
                    <td><span class="status-badge status-completed">✓ Completed</span></td>
                </tr>
            `;
            
        default: // 'all' view
            let pointsClass = '';
            let pointsDisplay = '';
            
            if (item.points > 0) {
                pointsClass = 'points-positive';
                pointsDisplay = `+${item.points}`;
            } else if (item.points < 0) {
                pointsClass = 'points-negative';
                pointsDisplay = item.points;
            } else {
                pointsDisplay = '0';
            }
            
            return `
                <tr class="type-${item.category}">
                    <td>${date}</td>
                    <td><strong>${item.title}</strong></td>
                    <td>${item.description}</td>
                    <td class="${pointsClass}">${pointsDisplay}</td>
                    <td><span class="status-badge status-completed">✓ Completed</span></td>
                </tr>
            `;
    }
}

// ========================================
// LOAD MORE
// ========================================

function loadMoreHistory() {
    historyState.currentPage++;
    renderHistoryTable();
}

// ========================================
// INVOICE HANDLING
// ========================================

async function openInvoice(invoiceId) {
    const modal = document.getElementById('invoiceModal');
    const content = document.getElementById('invoiceContent');
    
    if (!modal || !content) {
        console.error('❌ Modal elements not found');
        return;
    }
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    content.innerHTML = `
        <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading invoice...</p>
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
            throw new Error(data.error || 'Invoice not found');
        }
        
        content.innerHTML = generateInvoiceHTML(data.invoice);
        
    } catch (error) {
        console.error('❌ Invoice load failed:', error);
        content.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>Failed to load invoice</p>
                <p class="error-detail">${error.message}</p>
                <button onclick="closeInvoice()" class="close-error-btn">Close</button>
            </div>
        `;
    }
}

function closeInvoice() {
    const modal = document.getElementById('invoiceModal');
    if (modal) {
        modal.style.display = 'none';
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
        <div class="invoice-wrapper">
            <!-- WATERMARK -->
            <div class="invoice-watermark">AG</div>

            <!-- HEADER -->
            <div class="invoice-header">
                <div class="invoice-company">
                    <img src="/assets/images/AGTechScript.webp" class="invoice-logo" alt="AG TechScript">
                    <div>
                        <h2>AG Electronics</h2>
                        <p class="invoice-subtitle">A Unit of AG TechScript™</p>
                        <p>Baba Jaharveer Mandir, Kisrauli, Kasganj UP 207124</p>
                        <p>📞 6397563847 | GSTIN: 09JYTPK4090Q1Z3</p>
                    </div>
                </div>
                <div class="invoice-badge">INVOICE</div>
            </div>

            <!-- META INFO -->
            <div class="invoice-meta">
                <div class="meta-box">
                    <span>Invoice No</span>
                    <strong>${invoice.invoice_id}</strong>
                </div>
                <div class="meta-box">
                    <span>Date</span>
                    <strong>${formatDate(invoice.date)}</strong>
                </div>
                <div class="meta-box">
                    <span>Status</span>
                    <strong class="paid">PAID</strong>
                </div>
            </div>

            <!-- CUSTOMER -->
            <div class="customer-card">
                <h3>Customer Details</h3>
                <div class="customer-grid">
                    <div>
                        <span>User ID</span>
                        <strong>${user.user_id || 'N/A'}</strong>
                    </div>
                    <div>
                        <span>Name</span>
                        <strong>${user.name || 'N/A'}</strong>
                    </div>
                    <div>
                        <span>Phone</span>
                        <strong>${user.phone || 'N/A'}</strong>
                    </div>
                </div>
            </div>

            <!-- ITEMS TABLE -->
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
                    ${itemsHTML || '<tr><td colspan="5" class="text-center">No items found</td></tr>'}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="4" style="text-align:right;">Subtotal</td>
                        <td>₹${invoice.total_amount || 0}</td>
                    </tr>
                    <tr>
                        <td colspan="4" style="text-align:right;">Points Earned</td>
                        <td>${invoice.total_points || 0}</td>
                    </tr>
                    <tr class="total-row">
                        <td colspan="4" style="text-align:right;">Total</td>
                        <td>₹${invoice.total_amount || 0}</td>
                    </tr>
                </tfoot>
            </table>

            <!-- PAYMENT -->
            <div class="invoice-payment">
                <div class="payment-left">
                    <h4>Payment Information</h4>
                    <p>Mode: Cash / UPI</p>
                    <p>UPI ID: 7017094281-1@okbizaxis</p>
                </div>
                <div class="payment-right">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=upi://pay?pa=7017094281-1@okbizaxis&pn=AG%20Electronics" 
                         class="qr-code" alt="QR Code">
                    <p>Scan to Pay</p>
                </div>
            </div>

            <!-- FOOTER -->
            <div class="invoice-footer">
                <p>Composition taxable person, not eligible to collect tax on supplies.</p>
                <div class="signature">
                    <p>Authorized Signature</p>
                </div>
            </div>

            <!-- PRINT BUTTON -->
            <div class="invoice-actions">
                <button onclick="window.print()" class="print-btn">
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
        }).replace(/\//g, '-');
    } catch {
        return dateString;
    }
}

function showToast(message, type = 'info') {
    // Check if toast container exists, if not create it
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
        `;
        document.body.appendChild(toastContainer);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
        background: ${type === 'error' ? '#f44336' : type === 'success' ? '#4caf50' : '#2196f3'};
        color: white;
        padding: 12px 24px;
        border-radius: 4px;
        margin-bottom: 10px;
        animation: slideIn 0.3s ease;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    `;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
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
            <tr>
                <td colspan="5">
                    <div class="skeleton-line" style="height: 20px; margin: 10px 0;"></div>
                    <div class="skeleton-line" style="height: 20px; margin: 10px 0;"></div>
                    <div class="skeleton-line" style="height: 20px; margin: 10px 0;"></div>
                </td>
            </tr>
        `;
    }
}

function showEmptyState(tbody, colspan) {
    tbody.innerHTML = `
        <tr>
            <td colspan="${colspan}" class="empty-state">
                <i class="fas fa-inbox" style="font-size: 48px; color: #ccc; margin-bottom: 10px;"></i>
                <p>No activities found</p>
                <p style="color: #999; font-size: 14px;">Try changing the filter or check back later</p>
            </td>
        </tr>
    `;
}

function showErrorState(message) {
    const tbody = document.getElementById('tableBody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state error">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #f44336; margin-bottom: 10px;"></i>
                    <p style="color: #f44336;">${message || 'Failed to load history'}</p>
                    <button onclick="window.location.reload()" class="retry-btn" 
                            style="margin-top: 15px; padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        <i class="fas fa-redo"></i> Retry
                    </button>
                </td>
            </tr>
        `;
    }
}

function showFatalError() {
    const container = document.querySelector('.history-container');
    if (container) {
        container.innerHTML = `
            <div class="fatal-error" style="text-align: center; padding: 50px;">
                <i class="fas fa-exclamation-circle" style="font-size: 64px; color: #f44336; margin-bottom: 20px;"></i>
                <h2 style="color: #333; margin-bottom: 10px;">Something went wrong</h2>
                <p style="color: #666; margin-bottom: 20px;">Please refresh the page or try again later.</p>
                <button onclick="window.location.reload()" 
                        style="padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Refresh Page
                </button>
            </div>
        `;
    }
}

// ========================================
// AUTO REFRESH
// ========================================

function startAutoRefresh() {
    if (historyState.refreshInterval) {
        clearInterval(historyState.refreshInterval);
    }
    
    // Refresh every 15 minutes (900000 ms) instead of 1500000 (25 minutes)
    historyState.refreshInterval = setInterval(() => {
        console.log('🔄 Auto-refreshing...');
        loadHistoryData();
    }, 900000); // 15 minutes
}

// ========================================
// DEBUG FUNCTION
// ========================================

function debugPointsData() {
    console.log('=== POINTS DATA DEBUG ===');
    console.log('Raw points data:', historyState.pointsData);
    
    const activities = [];
    historyState.pointsData.forEach(p => {
        const points = Number(p.points) || 0;
        console.log(`Processing: type=${p.type}, points=${points}`);
        
        let displayPoints;
        if (p.type === 'earn') {
            displayPoints = points;
        } else if (p.type === 'used' || p.type === 'spend') {
            displayPoints = -points;
        } else {
            displayPoints = points;
        }
        
        activities.push({
            type: p.type,
            raw: points,
            display: displayPoints,
            correct: (p.type === 'earn' && displayPoints > 0) || 
                    ((p.type === 'used' || p.type === 'spend') && displayPoints < 0)
        });
    });
    
    console.log('Processed activities:', activities);
    console.log('========================');
}

// ========================================
// CLEANUP
// ========================================

window.addEventListener('beforeunload', () => {
    if (historyState.refreshInterval) {
        clearInterval(historyState.refreshInterval);
    }
});

// ========================================
// EXPORT TO GLOBAL SCOPE
// ========================================

window.openInvoice = openInvoice;
window.closeInvoice = closeInvoice;
window.loadMoreHistory = loadMoreHistory;
window.debugPointsData = debugPointsData; // For debugging

// Add CSS animations for toasts
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .skeleton {
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: loading 1.5s infinite;
    }
    
    @keyframes loading {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
    }
    
    .points-positive {
        color: #4CAF50;
        font-weight: bold;
    }
    
    .points-negative {
        color: #f44336;
        font-weight: bold;
    }
    
    .status-badge {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
    }
    
    .status-completed {
        background: #e8f5e8;
        color: #4CAF50;
    }
    
    .status-pending {
        background: #fff3e0;
        color: #ff9800;
    }
`;

document.head.appendChild(style);
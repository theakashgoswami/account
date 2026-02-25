// dashboard.js
class Dashboard {
    constructor(user) {
        this.user = user;
        this.notifications = [];
        this.stats = {
            points: user.points || 0,
            stamps: 0
        };
    }
    
    async init() {
        await this.loadUserData();
        this.renderHeader();
        this.renderMainContent();
        this.renderFooter();
        this.startAutoRefresh();
    }
    
    async loadUserData() {
        try {
            // Load notifications from sheets
            const notifications = await fetch(
                `${CONFIG.SHEETS_API}?action=getNotifications&user_id=${this.user.user_id}`
            );
            this.notifications = await notifications.json();
            
            // Load user stats
            const stats = await fetch(
                `${CONFIG.API_BASE}/user-stats?user_id=${this.user.user_id}`
            );
            this.stats = await stats.json();
            
        } catch (error) {
            console.error('Failed to load user data:', error);
        }
    }
    
    renderHeader() {
        const header = document.getElementById('mainHeader');
        header.innerHTML = `
            <div class="header-wrapper">
                <div class="logo-container">
                    <img src="logo.png" alt="AG TechScript Logo" class="logo">
                    <span class="logo-text">AG TechScript</span>
                </div>
                
                <nav class="main-nav">
                    <ul class="nav-menu">
                        <li><a href="/dashboard" class="${this.isActive('dashboard')}">Home</a></li>
                        <li><a href="/earn" class="${this.isActive('earn')}">Earn</a></li>
                        <li><a href="/use" class="${this.isActive('use')}">Use</a></li>
                        <li><a href="/history" class="${this.isActive('history')}">History</a></li>
                    </ul>
                </nav>
                
                <div class="user-profile">
                    <div class="profile-trigger" id="profileTrigger">
                        <img src="${this.user.profile_image || 'default-avatar.png'}" 
                             alt="Profile" class="profile-image">
                        <span class="profile-name">${this.user.name}</span>
                        <span class="dropdown-arrow">▼</span>
                    </div>
                    
                    <div class="profile-dropdown" id="profileDropdown">
                        <div class="dropdown-header">
                            <img src="${this.user.profile_image || 'default-avatar.png'}" 
                                 alt="Profile" class="dropdown-avatar">
                            <div class="user-info-mini">
                                <strong>${this.user.name}</strong>
                                <span>${this.user.role}</span>
                            </div>
                        </div>
                        
                        <div class="points-stamps">
                            <div class="points-badge">
                                <span class="badge-icon">⭐</span>
                                <span class="badge-value">${this.stats.points}</span>
                                <span class="badge-label">Points</span>
                            </div>
                            <div class="stamps-badge">
                                <span class="badge-icon">📬</span>
                                <span class="badge-value">${this.stats.stamps}</span>
                                <span class="badge-label">Stamps</span>
                            </div>
                        </div>
                        
                        <div class="dropdown-menu">
                            <a href="/edit-profile" class="dropdown-item">
                                <span class="item-icon">✏️</span>
                                Edit Profile
                            </a>
                            <button onclick="auth.logout()" class="dropdown-item logout-btn">
                                <span class="item-icon">🚪</span>
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
                
                <button class="mobile-menu-toggle" id="mobileMenuToggle">☰</button>
            </div>
        `;
        
        this.attachHeaderEvents();
    }
    
    attachHeaderEvents() {
        // Profile dropdown toggle
        const trigger = document.getElementById('profileTrigger');
        const dropdown = document.getElementById('profileDropdown');
        
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('active');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!trigger.contains(e.target)) {
                dropdown.classList.remove('active');
            }
        });
        
        // Mobile menu toggle
        const mobileToggle = document.getElementById('mobileMenuToggle');
        const navMenu = document.querySelector('.nav-menu');
        
        mobileToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }
    
    async renderMainContent() {
        const main = document.getElementById('mainContent');
        
        // Show loader
        main.innerHTML = '<div class="loader"><div class="spinner"></div></div>';
        
        // Load notifications
        const notificationsHtml = this.renderNotifications();
        
        main.innerHTML = `
            <div class="dashboard-container">
                <!-- Welcome Banner -->
                <div class="welcome-banner">
                    <h1>Welcome back, ${this.user.name}! 👋</h1>
                    <p>${new Date().toLocaleDateString('en-IN', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    })}</p>
                </div>
                
                <!-- Notifications Section -->
                <div class="notifications-section">
                    <div class="section-header">
                        <h2>Notifications</h2>
                        <span class="notification-count">${this.notifications.length}</span>
                    </div>
                    
                    <div class="notifications-list">
                        ${notificationsHtml}
                    </div>
                </div>
                
                <!-- Quick Stats -->
                <div class="quick-stats">
                    <div class="stat-card">
                        <div class="stat-icon">📊</div>
                        <div class="stat-content">
                            <span class="stat-value">${this.stats.total_orders || 0}</span>
                            <span class="stat-label">Total Orders</span>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">💰</div>
                        <div class="stat-content">
                            <span class="stat-value">₹${this.stats.total_spent || 0}</span>
                            <span class="stat-label">Total Spent</span>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">⭐</div>
                        <div class="stat-content">
                            <span class="stat-value">${this.stats.points}</span>
                            <span class="stat-label">Reward Points</span>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">📬</div>
                        <div class="stat-content">
                            <span class="stat-value">${this.stats.stamps}</span>
                            <span class="stat-label">Stamps</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderNotifications() {
        if (!this.notifications.length) {
            return `
                <div class="no-notifications">
                    <span class="no-notif-icon">🔔</span>
                    <p>No new notifications</p>
                </div>
            `;
        }
        
        return this.notifications.map(notif => `
            <div class="notification-item ${notif.read ? 'read' : 'unread'}" 
                 data-id="${notif.id}">
                <div class="notification-icon">${notif.icon || '📌'}</div>
                <div class="notification-content">
                    <div class="notification-title">${notif.title}</div>
                    <div class="notification-message">${notif.message}</div>
                    <div class="notification-time">${this.timeAgo(notif.timestamp)}</div>
                </div>
                ${!notif.read ? '<span class="unread-dot"></span>' : ''}
            </div>
        `).join('');
    }
    
    renderFooter() {
        const footer = document.getElementById('mainFooter');
        footer.innerHTML = `
            <div class="footer-wrapper">
                <div class="footer-content">
                    <div class="footer-section">
                        <h4>AG TechScript</h4>
                        <p>Empowering Digital Innovation</p>
                    </div>
                    
                    <div class="footer-section">
                        <h4>Quick Links</h4>
                        <ul>
                            <li><a href="/about">About Us</a></li>
                            <li><a href="/contact">Contact</a></li>
                            <li><a href="/privacy">Privacy Policy</a></li>
                            <li><a href="/terms">Terms & Conditions</a></li>
                        </ul>
                    </div>
                    
                    <div class="footer-section">
                        <h4>Connect With Us</h4>
                        <div class="social-links">
                            <a href="#" class="social-link">📘</a>
                            <a href="#" class="social-link">🐦</a>
                            <a href="#" class="social-link">📷</a>
                            <a href="#" class="social-link">💼</a>
                        </div>
                    </div>
                    
                    <div class="footer-section">
                        <h4>Contact Info</h4>
                        <p>📧 support@agtechscript.in</p>
                        <p>📞 +91 XXXXXXXXXX</p>
                        <p>🏢 India</p>
                    </div>
                </div>
                
                <div class="footer-bottom">
                    <p>&copy; ${new Date().getFullYear()} AG TechScript. All rights reserved.</p>
                    <p>Version ${CONFIG.VERSION}</p>
                </div>
            </div>
        `;
    }
    
    isActive(page) {
        return window.location.pathname.includes(page) ? 'active' : '';
    }
    
    timeAgo(timestamp) {
        const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
        
        const intervals = {
            year: 31536000,
            month: 2592000,
            week: 604800,
            day: 86400,
            hour: 3600,
            minute: 60,
            second: 1
        };
        
        for (let [unit, secondsInUnit] of Object.entries(intervals)) {
            const interval = Math.floor(seconds / secondsInUnit);
            if (interval >= 1) {
                return `${interval} ${unit}${interval === 1 ? '' : 's'} ago`;
            }
        }
        
        return 'just now';
    }
    
    startAutoRefresh() {
        // Refresh notifications every 30 seconds
        setInterval(async () => {
            await this.loadUserData();
            this.renderMainContent();
        }, 30000);
    }
}
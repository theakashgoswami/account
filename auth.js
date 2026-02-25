// auth.js - ULTRA SECURE 🔒
(function() {
    'use strict';
    
    // Prevent devtools and console tampering
    (function() {
        const devtools = {
            open: false,
            orientation: undefined
        };
        
        const threshold = 160;
        
        setInterval(() => {
            const widthThreshold = window.outerWidth - window.innerWidth > threshold;
            const heightThreshold = window.outerHeight - window.innerHeight > threshold;
            
            if (widthThreshold || heightThreshold) {
                if (!devtools.open) {
                    devtools.open = true;
                    document.body.innerHTML = '<h1>Developer tools detected. Access denied.</h1>';
                    window.location.href = 'about:blank';
                }
            } else {
                devtools.open = false;
            }
        }, 1000);
        
        // Override console methods
        if (!window.__IS_DEV) {
            console.log = console.warn = console.error = console.info = console.debug = function() {};
        }
        
        // Prevent context menu
        document.addEventListener('contextmenu', e => e.preventDefault());
        
        // Prevent key combinations
        document.addEventListener('keydown', e => {
            if (e.ctrlKey && (e.key === 'u' || e.key === 'U' || 
                e.key === 's' || e.key === 'S' || 
                e.key === 'i' || e.key === 'I' || 
                e.key === 'j' || e.key === 'J' ||
                e.key === 'c' || e.key === 'C')) {
                e.preventDefault();
                return false;
            }
            
            if (e.key === 'F12') {
                e.preventDefault();
                return false;
            }
        });
        
        // Prevent dragging
        document.addEventListener('dragstart', e => e.preventDefault());
    })();

    // Main Auth Class
    class AuthManager {
        constructor() {
            this.currentUser = null;
            this.redirectUrl = null;
            this.init();
        }
        
        async init() {
            try {
                // Get current subdomain
                const hostname = window.location.hostname;
                const subdomain = hostname.split('.')[0];
                
                // Get user from session
                this.currentUser = await this.getUserFromSession();
                
                if (!this.currentUser) {
                    throw new Error('No active session');
                }
                
                // Check authorization
                const authorized = await this.checkAuthorization(subdomain, this.currentUser.role);
                
                if (!authorized) {
                    this.showUnauthorized('Role not authorized for this subdomain');
                    return;
                }
                
                // Load dashboard
                this.loadDashboard();
                
            } catch (error) {
                console.error('Auth error:', error);
                this.showUnauthorized(error.message);
            }
        }
        
        async getUserFromSession() {
            // Get session token from secure cookie/localStorage
            const token = localStorage.getItem('auth_token') || 
                         this.getCookie('auth_token');
            
            if (!token) return null;
            
            try {
                // Verify with backend
                const response = await fetch(`${CONFIG.API_BASE}/verify-session`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Security-Token': this.generateSecurityToken()
                    },
                    body: JSON.stringify({ token })
                });
                
                const data = await response.json();
                return data.user;
            } catch {
                return null;
            }
        }
        
        async checkAuthorization(subdomain, userRole) {
            try {
                // Fetch redirect URL from database
                const response = await fetch(`${CONFIG.API_BASE}/get-redirect-url`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ role: userRole })
                });
                
                const data = await response.json();
                this.redirectUrl = data.redirect_url;
                
                // Extract expected subdomain from redirect URL
                const url = new URL(data.redirect_url);
                const expectedSubdomain = url.hostname.split('.')[0];
                
                // Match current subdomain with expected
                return subdomain === expectedSubdomain;
                
            } catch (error) {
                console.error('Authorization check failed:', error);
                return false;
            }
        }
        
        showUnauthorized(reason) {
            const template = document.getElementById('unauthorized-template');
            const content = template.content.cloneNode(true);
            
            content.querySelector('#errorDetail').textContent = 
                reason || 'Please contact administrator';
            
            document.getElementById('mainContent').innerHTML = '';
            document.getElementById('mainContent').appendChild(content);
            
            // Hide header and footer
            document.getElementById('mainHeader').style.display = 'none';
            document.getElementById('mainFooter').style.display = 'none';
        }
        
        generateSecurityToken() {
            return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
        }
        
        getCookie(name) {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop().split(';').shift();
            return null;
        }
        
        async loadDashboard() {
            // Initialize dashboard
            const dashboard = new Dashboard(this.currentUser);
            await dashboard.init();
        }
    }

    // Initialize Auth
    window.auth = new AuthManager();
})();
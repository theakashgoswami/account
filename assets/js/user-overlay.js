// Global variables
let currentUser = null;

// ====================================================================
// PROFILE ICON HANDLER (SINGLE FINAL VERSION)
// ====================================================================
function displayUserProfileIcon(url) {
    const iconDiv = document.getElementById("userIcon");
    if (!iconDiv) return;

    iconDiv.innerHTML = `
        <img src="${url}" class="user-avatar-img" alt="user" 
             onerror="this.onerror=null; this.src='/assets/images/default-avatar.png';" />
        <span class="user-status online"></span>
    `;
}

function displayDefaultUserIcon() {
    const iconDiv = document.getElementById("userIcon");
    if (!iconDiv) return;

    iconDiv.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
        </svg>
        <span class="user-status" id="userStatus"></span>
    `;
}

async function loadUserProfileIcon(userId) {
    try {
        const res = await fetch(`${CONFIG.WORKER_URL}/api/user/profile?user_id=${userId}`, {
            credentials: "include",
            headers: { 'X-Client-Host': window.location.host }
        });

        const data = await res.json();

        if (data.success && data.profile_image) {
            displayUserProfileIcon(data.profile_image);
        } else {
            displayDefaultUserIcon();
        }
    } catch (error) {
        console.error("Profile icon load failed:", error);
        displayDefaultUserIcon();
    }
}


// ====================================================================
// CLOSE NAV TOGGLE IF OPEN
// ====================================================================
function closeNavToggleIfOpen() {
    const mainNav = document.getElementById('mainNav');
    const navToggle = document.getElementById('navToggle');
    
    if (mainNav && mainNav.classList.contains('active')) {
        mainNav.classList.remove('active');
        if (navToggle) {
            navToggle.innerHTML = '☰'; // Reset to hamburger
        }
        console.log("✅ Nav toggle closed");
    }
}

// ====================================================================
// TOGGLE USER OVERLAY (WITH NAV CLOSE)
// ====================================================================
function toggleUserOverlay() {
    const overlay = document.getElementById('userOverlay');
    const backdrop = document.getElementById('overlayBackdrop');
    
    if (!overlay) return;
    
    if (overlay.classList.contains('active')) {
        // Close overlay
        overlay.classList.remove('active');
        if (backdrop) backdrop.classList.remove('active');
    } else {
        // 🔥 CLOSE NAV TOGGLE FIRST
        closeNavToggleIfOpen();
        
        // Then open overlay
        overlay.classList.add('active');
        if (backdrop) backdrop.classList.add('active');
        
        // Load user data and stats
        loadUserData();
        loadUserStats();
    }   
}
// ====================================================================
// LOAD USER DATA
// ====================================================================
async function loadUserData() {
    if (!window.currentUser?.user_id) return;

    try {
        const response = await fetch(
            `${CONFIG.WORKER_URL}/api/user/profile?user_id=${window.currentUser.user_id}`,
            {
                credentials: 'include',
                headers: { 'X-Client-Host': window.location.host }
            }
        );

        const data = await response.json();

        if (data.success) {
            currentUser = data;
            window.currentUser = data;
            updateOverlayUI();
        }
        
        // Load profile icon
        await loadUserProfileIcon(window.currentUser.user_id);
    } catch (error) {
        console.error("Profile load failed:", error);
    }
}
// ====================================================================
// UPDATE OVERLAY UI
// ====================================================================
function updateOverlayUI() {
    if (!currentUser) return;
    
    const userImage = document.getElementById('overlayUserImage');
    const userName = document.getElementById('overlayUserName');
    const userId = document.getElementById('overlayUserId');
    
    if (userImage) {
        userImage.src = currentUser.profile_image || '/assets/images/default-avatar.png';
    }
    
    if (userName) {
        userName.textContent = currentUser.name || 'User';
    }
    
    if (userId) {
        userId.textContent = `@${currentUser.user_id}`;
    }
    
    // Update status dot
    const statusDot = document.querySelector('.user-status');
    if (statusDot) {
        statusDot.style.background = '#4CAF50';
    }
}

// ====================================================================
// CLOSE ALL OVERLAYS
// ====================================================================
function closeAllOverlays() {
    const overlay = document.getElementById('userOverlay');
    const backdrop = document.getElementById('overlayBackdrop');
    
    if (overlay) overlay.classList.remove('active');
    if (backdrop) backdrop.classList.remove('active');
}

// ====================================================================
// LOGOUT FUNCTION
// ====================================================================
async function logout() {
    try {
        const response = await fetch(`${CONFIG.WORKER_URL}/api/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        
        if (response.ok) {
            // Clear user data
            window.currentUser = null;
            currentUser = null;
            
            // Close overlay
            closeAllOverlays();
            
            // Show default icon
            displayDefaultUserIcon();
            
            // Redirect
            window.location.href = 'https://agtechscript.in';
        }
    } catch (error) {
        console.error('Logout failed:', error);
    }
}

// ====================================================================
// CLICK OUTSIDE TO CLOSE
// ====================================================================
document.addEventListener('click', function(e) {
    const overlay = document.getElementById('userOverlay');
    const userIcon = document.getElementById('userIcon');
    
    if (overlay && userIcon && 
        !overlay.contains(e.target) && 
        !userIcon.contains(e.target) &&
        overlay.classList.contains('active')) {
        closeAllOverlays();
    }
});

// ====================================================================
// INITIALIZE ON PAGE LOAD
// ====================================================================
document.addEventListener('DOMContentLoaded', async function() {
    // Wait for currentUser
    let waitTime = 0;
    while (!window.currentUser && waitTime < 3000) {
        await new Promise(r => setTimeout(r, 100));
        waitTime += 100;
    }
    
    if (window.currentUser) {
        await loadUserData();
    } else {
        displayDefaultUserIcon();
    }
    
    // Expose functions globally
    window.toggleUserOverlay = toggleUserOverlay;
    window.logout = logout;
    window.closeAllOverlays = closeAllOverlays;
    
    console.log("✅ User overlay initialized");
});
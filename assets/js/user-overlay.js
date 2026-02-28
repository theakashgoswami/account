// user-overlay.js - FIXED VERSION with profile icon handler

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

// Toggle user overlay
function toggleUserOverlay() {
    const overlay = document.getElementById('userOverlay');
    const backdrop = document.getElementById('overlayBackdrop');
    
    if (overlay.classList.contains('active')) {
        closeAllOverlays();
    } else {
        loadUserData();
        overlay.classList.add('active');
        backdrop.classList.add('active');
    }
}

// Close all overlays
function closeAllOverlays() {
    document.getElementById('userOverlay').classList.remove('active');
    document.getElementById('overlayBackdrop').classList.remove('active');
}

// Load user data from D1 via API
async function loadUserData() {
    if (!window.currentUser?.user_id) {
        console.log("No user logged in");
        return;
    }
    
    try {
        // First load profile icon
        await loadUserProfileIcon(window.currentUser.user_id);
        
        // Fetch user profile with points and stamps
        const response = await fetch(`${CONFIG.WORKER_URL}/api/user/profile?user_id=${window.currentUser.user_id}`, {
            credentials: 'include',
            headers: { 'X-Client-Host': window.location.host }
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUser = data;
            updateOverlayUI();
        }
        
        // Fetch points and stamps separately
        const pointsResponse = await fetch(`${CONFIG.WORKER_URL}/api/user/points-log`, {
            credentials: 'include',
            headers: { 'X-Client-Host': window.location.host }
        });
        
        const pointsData = await pointsResponse.json();
        
        if (pointsData.success) {
            const totalPoints = pointsData.points_log?.reduce((sum, log) => {
                return log.type === 'earn' ? sum + log.points : sum - log.points;
            }, 0) || 0;
            
            const totalStamps = pointsData.points_log?.filter(log => log.type === 'stamp').length || 0;
            
            document.getElementById('userPoints').textContent = totalPoints;
            document.getElementById('userStamps').textContent = totalStamps;
        }
        
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Update overlay UI
function updateOverlayUI() {
    if (!currentUser) return;
    
    document.getElementById('overlayUserImage').src = currentUser.profile_image || '/assets/images/default-avatar.png';
    document.getElementById('overlayUserName').textContent = currentUser.name || 'User';
    document.getElementById('overlayUserId').textContent = `@${currentUser.user_id}`;
    
    // Update user status
    const statusDot = document.querySelector('.user-status');
    if (statusDot) {
        statusDot.style.background = '#4CAF50';
    }
}



// Logout function
async function logout() {
    try {
        await fetch(`${CONFIG.WORKER_URL}/api/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        
        window.location.href = 'https://agtechscript.in';
    } catch (error) {
        console.error('Logout failed:', error);
    }
}

// Close overlay when clicking outside
document.addEventListener('click', function(e) {
    const overlay = document.getElementById('userOverlay');
    const userIcon = document.getElementById('userIcon');
    const editOverlay = document.getElementById('editProfileOverlay');
    
    if (overlay && userIcon && !overlay.contains(e.target) && 
        !userIcon.contains(e.target) && 
        !editOverlay?.contains(e.target) &&
        overlay.classList.contains('active')) {
        closeAllOverlays();
    }
});

// Load user data on page load
document.addEventListener('DOMContentLoaded', function() {
    if (window.currentUser) {
        loadUserData();
    }
});
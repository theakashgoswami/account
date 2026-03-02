// ====================================================================
// GLOBAL VARIABLES
// ====================================================================
let currentUserData = null;
let currentUser = null;

// ====================================================================
// HEADER INITIALIZATION (header.js - FINAL FIXED VERSION)
// ====================================================================
(function() {
    // Guard to prevent multiple initializations
    if (window.headerInitialized) {
        return;
    }
    
    function initHeader() {
        const navToggle = document.getElementById("navToggle");
        const mainNav = document.getElementById("mainNav");
        const customHeader = document.getElementById("header");

        if (!navToggle || !mainNav || !customHeader) {
            setTimeout(initHeader, 300);
            return;
        }

        let lastScrollY = window.scrollY;
        let ticking = false;
        let touchStartY = 0;
        let touchEndY = 0;
        const swipeThreshold = 50;

        // Remove existing listeners by cloning and replacing
        const newNavToggle = navToggle.cloneNode(true);
        navToggle.parentNode.replaceChild(newNavToggle, navToggle);
        
        // Use the new reference
        const finalNavToggle = document.getElementById("navToggle");

        // Mobile Toggle with single listener
        finalNavToggle.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            mainNav.classList.toggle("active");
            
            if (mainNav.classList.contains("active")) {
                finalNavToggle.innerHTML = "✕";
                finalNavToggle.style.fontSize = "1.8rem";
            } else {
                finalNavToggle.innerHTML = "☰";
            }
        });

        // SCROLL HIDE/SHOW
        function updateHeader() {
            const sy = window.scrollY;

            if (sy > lastScrollY && sy > 100) {
                customHeader.style.transform = "translateY(-100%)";
            } else {
                customHeader.style.transform = "translateY(0)";
            }

            lastScrollY = sy;
            ticking = false;
        }

        window.addEventListener(
            "scroll",
            () => {
                if (!ticking) {
                    requestAnimationFrame(updateHeader);
                    ticking = true;
                }
            },
            { passive: true }
        );

        // SWIPE GESTURE
        document.addEventListener("touchstart", (e) => {
            touchStartY = e.changedTouches[0].screenY;
        });

        document.addEventListener("touchend", (e) => {
            touchEndY = e.changedTouches[0].screenY;
            const diff = touchEndY - touchStartY;

            if (diff > swipeThreshold)
                customHeader.style.transform = "translateY(0)";
            if (diff < -swipeThreshold)
                customHeader.style.transform = "translateY(-100%)";
        });

        // CLOSE ON OUTSIDE CLICK
        document.addEventListener("click", (e) => {
            if (!e.target.closest(".header-wrapper")) {
                mainNav.classList.remove("active");
                finalNavToggle.innerHTML = "☰";
            }
        });

        // CLOSE MENU ON NAV LINK CLICK (MOBILE)
        document.querySelectorAll(".nav-menu a").forEach((link) => {
            link.addEventListener("click", () => {
                if (window.innerWidth <= 768) {
                    mainNav.classList.remove("active");
                    finalNavToggle.innerHTML = "☰";
                }
            });
        });

        // Mark as initialized
        window.headerInitialized = true;
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHeader);
    } else {
        initHeader();
    }
})();

// ====================================================================
// HEADER LOADER FUNCTION
// ====================================================================
async function loadHeader() {
    try {
        const response = await fetch("/partials/header.html");
        const html = await response.text();
        
        document.getElementById("header-container").innerHTML = html;
        
        // Wait a tiny bit for DOM to update
        await new Promise(r => setTimeout(r, 50));
        
        // Initialize header after loading
        if (typeof initHeader === 'function') {
            initHeader();
        }
        
        // Load user profile icon
        if (window.currentUser?.user_id && typeof loadUserProfileIcon === 'function') {
            await loadUserProfileIcon(window.currentUser.user_id);
        }
        
    } catch (error) {
        console.error("Header load failed:", error);
    }
}

// ====================================================================
// FOOTER LOADER
// ====================================================================
async function loadFooter() {
    try {
        const response = await fetch("/partials/footer.html");
        const html = await response.text();
        document.getElementById("footer-container").innerHTML = html;
        const yearEl = document.getElementById("year");
        if (yearEl) yearEl.textContent = new Date().getFullYear();
    } catch (error) {
        console.error("Footer load failed:", error);
    }
}

// ====================================================================
// UPDATE ALL STATS FUNCTION
// ====================================================================
function updateAllStats(points, stamps) {
    // Overlay update
    const overlayPoints = document.getElementById('overlayPoints');
    const overlayStamps = document.getElementById('overlayStamps');

    if (overlayPoints) overlayPoints.textContent = points;
    if (overlayStamps) overlayStamps.textContent = stamps;

    // Use page update
    const usePoints = document.getElementById('usePagePoints');
    const useStamps = document.getElementById('usePageStamps');

    if (usePoints) usePoints.textContent = points;
    if (useStamps) useStamps.textContent = stamps;
}

// ====================================================================
// PROFILE ICON HANDLER
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
            navToggle.innerHTML = '☰';
        }
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
        overlay.classList.remove('active');
        if (backdrop) backdrop.classList.remove('active');
    } else {
        closeNavToggleIfOpen();
        overlay.classList.add('active');
        if (backdrop) backdrop.classList.add('active');
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
            window.currentUser = null;
            currentUser = null;
            closeAllOverlays();
            displayDefaultUserIcon();
            window.location.href = 'https://agtechscript.in';
        }
    } catch (error) {
        console.error('Logout failed:', error);
    }
}

// ====================================================================
// LOAD USER STATS
// ====================================================================
async function loadUserStats() {
    try {
        const response = await fetch(`${CONFIG.WORKER_URL}/api/user/stats`, {
            credentials: 'include',
            headers: { 'X-Client-Host': window.location.host }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const pointsEl = document.getElementById('userPoints');
            const stampsEl = document.getElementById('userStamps');
            
            if (pointsEl) pointsEl.textContent = data.points;
            if (stampsEl) stampsEl.textContent = data.stamps;
            
            updateAllStats(data.points, data.stamps);
        }
    } catch (error) {
        console.error('Error updating stats:', error);
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
// WAIT FOR USER FUNCTION
// ====================================================================
async function waitForUser() {
    let waitTime = 0;
    const maxWait = 3000;
    
    while (!window.currentUser && waitTime < maxWait) {
        await new Promise(r => setTimeout(r, 100));
        waitTime += 100;
    }
    
    if (!window.currentUser) {
        console.error("No user found - redirecting");
        window.location.href = "https://agtechscript.in";
        return false;
    }
    return true;
}

// ====================================================================
// LOAD PROFILE DATA
// ====================================================================
async function loadProfileData() {
    try {
        const response = await fetch(`${CONFIG.WORKER_URL}/api/user/profile?user_id=${window.currentUser.user_id}`, {
            credentials: 'include',
            headers: { 
                'X-Client-Host': window.location.host,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUserData = data;
            displayProfileData(data);
        } else {
            showNotification("Failed to load profile", "error");
        }
    } catch (error) {
        console.error("Error loading profile:", error);
        showNotification("Error loading profile", "error");
    }
}

// ====================================================================
// DISPLAY PROFILE DATA
// ====================================================================
function displayProfileData(data) {
    // Avatar
    const profileAvatar = document.getElementById('profileAvatar');
    if (profileAvatar && data.profile_image) {
        profileAvatar.src = data.profile_image;
    }
    
    const metaUserId = document.getElementById('metaUserId');
    if (metaUserId) {
        metaUserId.textContent = data.user_id || 'AG0001';
    }
    
    const metaMemberSince = document.getElementById('metaMemberSince');
    if (metaMemberSince && data.created_at) {
        const year = new Date(data.created_at).getFullYear();
        metaMemberSince.textContent = `Member since ${year}`;
    }
    
    const fullName = document.getElementById('fullName');
    if (fullName) fullName.value = data.name || '';
    
    const email = document.getElementById('email');
    if (email) email.value = data.email || '';
    
    const phone = document.getElementById('phone');
    if (phone) phone.value = data.phone || '';
    
    const address = document.getElementById('address');
    if (address) address.value = data.address || '';
}

// ====================================================================
// SETUP EVENT LISTENERS
// ====================================================================
function setupEventListeners() {
    const avatarInput = document.getElementById('avatarInput');
    if (avatarInput) {
        avatarInput.addEventListener('change', handleAvatarUpload);
    }
    
    const form = document.getElementById('editProfileForm');
    if (form) {
        form.addEventListener('submit', saveProfile);
    }
    
    const newPass = document.getElementById('newPassword');
    const confirmPass = document.getElementById('confirmPassword');
    
    if (newPass) {
        newPass.addEventListener('input', validatePasswords);
    }
    if (confirmPass) {
        confirmPass.addEventListener('input', validatePasswords);
    }
}

// ====================================================================
// TRIGGER FILE UPLOAD
// ====================================================================
function triggerFileUpload() {
    const avatarInput = document.getElementById('avatarInput');
    if (avatarInput) avatarInput.click();
}

// ====================================================================
// HANDLE AVATAR UPLOAD
// ====================================================================
async function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.match('image.*')) {
        showNotification('Please select an image file', 'error');
        return;
    }
    
    if (file.size > 2 * 1024 * 1024) {
        showNotification('Image must be less than 2MB', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const profileAvatar = document.getElementById('profileAvatar');
        if (profileAvatar) profileAvatar.src = e.target.result;
    };
    reader.readAsDataURL(file);
    
    await uploadAvatar(file);
}

// ====================================================================
// UPLOAD AVATAR TO SERVER
// ====================================================================
async function uploadAvatar(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        showNotification('Uploading image...', 'info');
        
        const response = await fetch(`${CONFIG.WORKER_URL}/api/user/upload-image`, {
            method: 'POST',
            credentials: 'include',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (currentUserData) currentUserData.profile_image = data.url;
            showNotification('Image uploaded successfully', 'success');
        } else {
            showNotification(data.error || 'Upload failed', 'error');
        }
    } catch (error) {
        console.error('Upload error:', error);
        showNotification('Upload failed', 'error');
    }
}

// ====================================================================
// VALIDATE PASSWORDS
// ====================================================================
function validatePasswords() {
    const newPass = document.getElementById('newPassword');
    const confirmPass = document.getElementById('confirmPassword');
    const errorDiv = document.getElementById('passwordError');
    
    if (!newPass || !confirmPass || !errorDiv) return true;
    
    const newVal = newPass.value;
    const confirmVal = confirmPass.value;
    
    if (newVal || confirmVal) {
        if (newVal.length < 6 && newVal.length > 0) {
            errorDiv.textContent = 'Password must be at least 6 characters';
            errorDiv.style.display = 'block';
            return false;
        }
        
        if (newVal !== confirmVal) {
            errorDiv.textContent = 'Passwords do not match';
            errorDiv.style.display = 'block';
            return false;
        }
    }
    
    errorDiv.style.display = 'none';
    return true;
}

// ====================================================================
// SAVE PROFILE
// ====================================================================
async function saveProfile(e) {
    e.preventDefault();
    
    if (!validatePasswords()) {
        return;
    }
    
    const saveBtn = document.getElementById('saveProfileBtn');
    if (!saveBtn) return;
    
    const originalText = saveBtn.innerHTML;
    
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    
    const updateData = {
        user_id: window.currentUser?.user_id,
        name: document.getElementById('fullName')?.value || '',
        phone: document.getElementById('phone')?.value || '',
        address: document.getElementById('address')?.value || ''
    };
    
    if (currentUserData?.profile_image) {
        updateData.profile_image = currentUserData.profile_image;
    }
    
    const newPassword = document.getElementById('newPassword')?.value;
    if (newPassword) {
        updateData.newPassword = newPassword;
    }
    
    try {
        const response = await fetch(`${CONFIG.WORKER_URL}/api/user/update`, {
            method: 'POST',
            credentials: 'include',
            headers: { 
                'Content-Type': 'application/json',
                'X-Client-Host': window.location.host
            },
            body: JSON.stringify(updateData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Profile updated successfully!', 'success');
            
            const newPass = document.getElementById('newPassword');
            const confirmPass = document.getElementById('confirmPassword');
            if (newPass) newPass.value = '';
            if (confirmPass) confirmPass.value = '';
            
            window.currentUser = { ...window.currentUser, ...updateData };
            await loadProfileData();
            await loadUserProfileIcon(window.currentUser?.user_id);
        } else {
            showNotification(data.error || 'Update failed', 'error');
        }
    } catch (error) {
        console.error('Update error:', error);
        showNotification('Update failed', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
    }
}

// ====================================================================
// CANCEL EDIT
// ====================================================================
function cancelEdit() {
    if (confirm('Discard changes?')) {
        window.location.href = 'index.html';
    }
}

// ====================================================================
// SHOW NOTIFICATION
// ====================================================================
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = message;
    
    const colors = {
        success: '#4CAF50',
        error: '#f44336',
        info: '#2196F3'
    };
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type]};
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease;
        font-weight: 500;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ====================================================================
// ADD ANIMATION STYLES
// ====================================================================
(function() {
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
})();

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
        await loadUserStats();
    } else {
        displayDefaultUserIcon();
    }
    
    // Check if we're on edit profile page
    if (window.location.pathname.includes('edit-profile')) {
        const userExists = await waitForUser();
        if (userExists) {
            await loadProfileData();
            setupEventListeners();
        }
    }
});

// ====================================================================
// EXPOSE FUNCTIONS GLOBALLY
// ====================================================================
window.loadHeader = loadHeader;
window.loadFooter = loadFooter;
window.initHeader = initHeader;
window.displayUserProfileIcon = displayUserProfileIcon;
window.displayDefaultUserIcon = displayDefaultUserIcon;
window.loadUserProfileIcon = loadUserProfileIcon;
window.toggleUserOverlay = toggleUserOverlay;
window.logout = logout;
window.closeAllOverlays = closeAllOverlays;
window.triggerFileUpload = triggerFileUpload;
window.cancelEdit = cancelEdit;
window.saveProfile = saveProfile;
window.showNotification = showNotification;
window.updateAllStats = updateAllStats;
window.loadUserStats = loadUserStats;
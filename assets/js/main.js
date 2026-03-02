// ====================================================================
// GLOBAL VARIABLES
// ====================================================================
let currentUserData = null;
let currentUser = null;

// ====================================================================
// HEADER INITIALIZATION
// ====================================================================
(function() {
    if (window.headerInitialized) return;
    
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

        const newNavToggle = navToggle.cloneNode(true);
        navToggle.parentNode.replaceChild(newNavToggle, navToggle);
        const finalNavToggle = document.getElementById("navToggle");

        finalNavToggle.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            mainNav.classList.toggle("active");
            finalNavToggle.innerHTML = mainNav.classList.contains("active") ? "✕" : "☰";
        });

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

        window.addEventListener("scroll", () => {
            if (!ticking) {
                requestAnimationFrame(updateHeader);
                ticking = true;
            }
        }, { passive: true });

        document.addEventListener("touchstart", (e) => {
            touchStartY = e.changedTouches[0].screenY;
        });

        document.addEventListener("touchend", (e) => {
            touchEndY = e.changedTouches[0].screenY;
            const diff = touchEndY - touchStartY;
            if (diff > swipeThreshold) customHeader.style.transform = "translateY(0)";
            if (diff < -swipeThreshold) customHeader.style.transform = "translateY(-100%)";
        });

        document.addEventListener("click", (e) => {
            if (!e.target.closest(".header-wrapper")) {
                mainNav.classList.remove("active");
                finalNavToggle.innerHTML = "☰";
            }
        });

        document.querySelectorAll(".nav-menu a").forEach((link) => {
            link.addEventListener("click", () => {
                if (window.innerWidth <= 768) {
                    mainNav.classList.remove("active");
                    finalNavToggle.innerHTML = "☰";
                }
            });
        });

        window.headerInitialized = true;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHeader);
    } else {
        initHeader();
    }
})();

// ====================================================================
// HEADER LOADER
// ====================================================================
async function loadHeader() {
    try {
        const response = await fetch("/partials/header.html");
        const html = await response.text();
        document.getElementById("header-container").innerHTML = html;
        await new Promise(r => setTimeout(r, 50));
        
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
        displayDefaultUserIcon();
    }
}

// ====================================================================
// NAV TOGGLE CLOSE
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
// USER OVERLAY TOGGLE
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
// LOGOUT
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
        }
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

// ====================================================================
// INITIALIZE ON PAGE LOAD
// ====================================================================
document.addEventListener('DOMContentLoaded', async function() {
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
    
    window.toggleUserOverlay = toggleUserOverlay;
    window.logout = logout;
    window.closeAllOverlays = closeAllOverlays;
});

// ====================================================================
// EDIT PROFILE FUNCTIONS
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
        showNotification("Error loading profile", "error");
    }
}

function displayProfileData(data) {
    if (data.profile_image) {
        document.getElementById('profileAvatar').src = data.profile_image;
    }
    
    document.getElementById('metaUserId').textContent = data.user_id || 'AG0001';
    
    if (data.created_at) {
        const year = new Date(data.created_at).getFullYear();
        document.getElementById('metaMemberSince').textContent = `Member since ${year}`;
    }
    
    document.getElementById('fullName').value = data.name || '';
    document.getElementById('email').value = data.email || '';
    document.getElementById('phone').value = data.phone || '';
    document.getElementById('address').value = data.address || '';
}

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

function triggerFileUpload() {
    document.getElementById('avatarInput').click();
}

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
        document.getElementById('profileAvatar').src = e.target.result;
    };
    reader.readAsDataURL(file);
    
    await uploadAvatar(file);
}

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
            currentUserData.profile_image = data.url;
            showNotification('Image uploaded successfully', 'success');
        } else {
            showNotification(data.error || 'Upload failed', 'error');
        }
    } catch (error) {
        showNotification('Upload failed', 'error');
    }
}

function validatePasswords() {
    const newPass = document.getElementById('newPassword').value;
    const confirmPass = document.getElementById('confirmPassword').value;
    const errorDiv = document.getElementById('passwordError');
    
    if (!errorDiv) return true;
    
    if (newPass || confirmPass) {
        if (newPass.length < 6 && newPass.length > 0) {
            errorDiv.textContent = 'Password must be at least 6 characters';
            errorDiv.style.display = 'block';
            return false;
        }
        
        if (newPass !== confirmPass) {
            errorDiv.textContent = 'Passwords do not match';
            errorDiv.style.display = 'block';
            return false;
        }
    }
    
    errorDiv.style.display = 'none';
    return true;
}

async function saveProfile(e) {
    e.preventDefault();
    
    if (!validatePasswords()) {
        return;
    }
    
    const saveBtn = document.getElementById('saveProfileBtn');
    const originalText = saveBtn.innerHTML;
    
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    
    const updateData = {
        user_id: window.currentUser.user_id,
        name: document.getElementById('fullName').value,
        phone: document.getElementById('phone').value,
        address: document.getElementById('address').value
    };
    
    if (currentUserData?.profile_image) {
        updateData.profile_image = currentUserData.profile_image;
    }
    
    const newPassword = document.getElementById('newPassword').value;
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
            
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
            
            window.currentUser = { ...window.currentUser, ...updateData };
            await loadProfileData();
        } else {
            showNotification(data.error || 'Update failed', 'error');
        }
    } catch (error) {
        showNotification('Update failed', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
    }
}

function cancelEdit() {
    if (confirm('Discard changes?')) {
        window.location.href = 'index.html';
    }
}

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

// Add animation styles
(function() {
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
    `;
    document.head.appendChild(style);
})();

// Make functions globally available
window.loadHeader = loadHeader;
window.loadFooter = loadFooter;
window.toggleUserOverlay = toggleUserOverlay;
window.logout = logout;
window.closeAllOverlays = closeAllOverlays;
window.triggerFileUpload = triggerFileUpload;
window.cancelEdit = cancelEdit;
window.saveProfile = saveProfile;
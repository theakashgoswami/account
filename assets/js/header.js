/* ========================================
   1️⃣ HEADER + MOBILE TOGGLE + SCROLL HIDE
======================================== */
function initHeader() {
    const navToggle = document.getElementById("navToggle");
    const mainNav = document.getElementById("mainNav");
    const customHeader = document.getElementById("header");

    if (!navToggle || !mainNav || !customHeader) {
        console.warn("⏳ Header not found. Retrying...");
        setTimeout(initHeader, 300);
        return;
    }

    console.log("✅ Header Ready");

    let lastScrollY = window.scrollY;
    let ticking = false;
    let touchStartY = 0;
    let touchEndY = 0;
    const swipeThreshold = 50;

    // MOBILE TOGGLE
    navToggle.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        mainNav.classList.toggle("active");
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
        }
    });

    // CLOSE MENU ON NAV LINK CLICK (MOBILE)
    document.querySelectorAll(".nav-menu a").forEach((link) => {
        link.addEventListener("click", () => {
            if (window.innerWidth <= 768) {
                mainNav.classList.remove("active");
            }
        });
    });

    // SPACEBAR SHORTCUT
    document.addEventListener("keydown", (e) => {
        if (
            e.code === "Space" &&
            !e.target.matches("input, textarea, button, a")
        ) {
            e.preventDefault();
            customHeader.style.transform =
                customHeader.style.transform === "translateY(-100%)"
                    ? "translateY(0)"
                    : "translateY(-100%)";
        }
    });
}
// assets/js/user-overlay.js

// Global variables
let currentUser = null;

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
    document.getElementById('editProfileOverlay').classList.remove('active');
    document.getElementById('overlayBackdrop').classList.remove('active');
}

// Load user data from D1 via API
async function loadUserData() {
    if (!window.currentUser?.user_id) return;
    
    try {
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
    document.querySelector('.user-status').style.background = '#4CAF50';
}

// Open edit profile overlay
function openEditProfile() {
    closeAllOverlays();
    
    if (!currentUser) {
        loadUserData().then(() => {
            populateEditForm();
            document.getElementById('editProfileOverlay').classList.add('active');
            document.getElementById('overlayBackdrop').classList.add('active');
        });
    } else {
        populateEditForm();
        document.getElementById('editProfileOverlay').classList.add('active');
        document.getElementById('overlayBackdrop').classList.add('active');
    }
}

// Populate edit form with user data
function populateEditForm() {
    if (!currentUser) return;
    
    document.getElementById('editProfileImage').src = currentUser.profile_image || '/assets/images/default-avatar.png';
    document.getElementById('editName').value = currentUser.name || '';
    document.getElementById('editEmail').value = currentUser.email || '';
    document.getElementById('editPhone').value = currentUser.phone || '';
    document.getElementById('editAddress').value = currentUser.address || '';
}

// Close edit profile
function closeEditProfile() {
    document.getElementById('editProfileOverlay').classList.remove('active');
    document.getElementById('overlayBackdrop').classList.remove('active');
}

// Trigger file upload
function triggerFileUpload() {
    document.getElementById('profileImageInput').click();
}

// Handle image upload
document.getElementById('profileImageInput')?.addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch(`${CONFIG.WORKER_URL}/api/auth/upload-image`, {
            method: 'POST',
            credentials: 'include',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.url) {
            document.getElementById('editProfileImage').src = data.url;
            document.getElementById('overlayUserImage').src = data.url;
            currentUser.profile_image = data.url;
        }
    } catch (error) {
        console.error('Upload failed:', error);
    }
});

// Handle edit profile form submit
document.getElementById('editProfileForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (!currentUser?.user_id) return;
    
    const updates = {
        name: document.getElementById('editName').value,
        phone: document.getElementById('editPhone').value,
        address: document.getElementById('editAddress').value,
        profile_image: currentUser.profile_image
    };
    
    try {
        const response = await fetch(`${CONFIG.WORKER_URL}/api/user/update`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: currentUser.user_id,
                ...updates
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Profile updated successfully!');
            currentUser = { ...currentUser, ...updates };
            updateOverlayUI();
            closeEditProfile();
        }
    } catch (error) {
        console.error('Update failed:', error);
        alert('Failed to update profile');
    }
});

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
    
    if (!overlay.contains(e.target) && 
        !userIcon.contains(e.target) && 
        !editOverlay.contains(e.target) &&
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
  // HEADER
    fetch("/partials/header.html")
        .then(r => r.text())
        .then(html => {
            document.getElementById("header-container").innerHTML = html;
            initHeader();
        });

// State Management
const AppState = {
    user: null,
    isHeaderLoaded: false
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================
const UI = {
    showNotification(message, type = 'info') {
        const colors = { success: '#4CAF50', error: '#f44336', info: '#2196F3' };
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = message;
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px; background: ${colors[type]};
            color: white; padding: 12px 24px; border-radius: 8px; z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-weight: 500;
            transition: all 0.3s ease; transform: translateX(120%);
        `;
        document.body.appendChild(notification);
        
        // Animate In
        setTimeout(() => notification.style.transform = 'translateX(0)', 10);
        
        // Remove
        setTimeout(() => {
            notification.style.transform = 'translateX(120%)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    },

    updateUserStats(points, stamps) {
        ['overlayPoints', 'usePagePoints'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = points;
        });
        ['overlayStamps', 'usePageStamps'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = stamps;
        });
    }
};

// ==========================================
// HEADER & NAVIGATION LOGIC
// ==========================================
function initHeaderLogic() {
    const navToggle = document.getElementById("navToggle");
    const mainNav = document.getElementById("mainNav");
    const header = document.getElementById("header");

    if (!navToggle || !mainNav) return;

    // Mobile Menu Toggle
    navToggle.onclick = (e) => {
        e.preventDefault();
        mainNav.classList.toggle("active");
        navToggle.innerHTML = mainNav.classList.contains("active") ? "✕" : "☰";
    };

    // Scroll Effect (Hide/Show Header)
    let lastScrollY = window.scrollY;
    window.addEventListener("scroll", () => {
        const currentScrollY = window.scrollY;
        if (currentScrollY > lastScrollY && currentScrollY > 100) {
            header.style.transform = "translateY(-100%)";
        } else {
            header.style.transform = "translateY(0)";
        }
        lastScrollY = currentScrollY;
    }, { passive: true });

    // Close menu on link click
    document.querySelectorAll(".nav-menu a").forEach(link => {
        link.onclick = () => {
            mainNav.classList.remove("active");
            navToggle.innerHTML = "☰";
        };
    });
}

// ==========================================
// USER & PROFILE LOGIC
// ==========================================
async function fetchUserProfile() {
    try {
        const res = await fetch(`${CONFIG.WORKER_URL}/api/user/profile`, {
            credentials: "include",
            headers: { 'X-Client-Host': window.location.host }
        });
        const data = await res.json();
        if (data.success) {
            AppState.user = data;
            window.currentUser = data; // Backward compatibility
            updateUIWithUserData(data);
            return data;
        }
    } catch (err) {
        console.error("Profile Fetch Error:", err);
    }
    displayDefaultUserIcon();
    return null;
}

function updateUIWithUserData(user) {
    // Update Icon
    const iconDiv = document.getElementById("userIcon");
    if (iconDiv) {
        const imgUrl = user.profile_image || '/assets/images/default-avatar.png';
        iconDiv.innerHTML = `
            <img src="${imgUrl}" class="user-avatar-img" alt="user" onerror="this.src='/assets/images/default-avatar.png'"/>
            <span class="user-status online" style="background:#4CAF50"></span>
        `;
    }

    // Update Overlay if exists
    const oImg = document.getElementById('overlayUserImage');
    const oName = document.getElementById('overlayUserName');
    const oId = document.getElementById('overlayUserId');
    
    if (oImg) oImg.src = user.profile_image || '/assets/images/default-avatar.png';
    if (oName) oName.textContent = user.name || 'User';
    if (oId) oId.textContent = `@${user.user_id}`;
// Trigger file input
window.triggerFileUpload = () => document.getElementById('avatarInput')?.click();

// Handle Avatar selection and upload
async function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = document.getElementById('profileAvatar');
        if(img) img.src = e.target.result;
    };
    reader.readAsDataURL(file);

    // Upload logic
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        UI.showNotification('Uploading image...', 'info');
        const res = await fetch(`${CONFIG.WORKER_URL}/api/user/upload-image`, {
            method: 'POST',
            credentials: 'include',
            body: formData
        });
        const data = await res.json();
        if (data.success) {
            window.currentUser.profile_image = data.url; // Update local state
            UI.showNotification('Image uploaded!', 'success');
        }
    } catch (err) {
        UI.showNotification('Upload failed', 'error');
    }
}

// In setupEventListeners, add this:
document.getElementById('avatarInput')?.addEventListener('change', handleAvatarUpload);
    // Update Profile Page Form (if on edit-profile page)
    const fullNameInput = document.getElementById('fullName');
    if (fullNameInput) {
        fullNameInput.value = user.name || '';
        if(document.getElementById('email')) document.getElementById('email').value = user.email || '';
        if(document.getElementById('phone')) document.getElementById('phone').value = user.phone || '';
        if(document.getElementById('address')) document.getElementById('address').value = user.address || '';
        if(document.getElementById('profileAvatar')) document.getElementById('profileAvatar').src = user.profile_image || '/assets/images/default-avatar.png';
        if(document.getElementById('metaUserId')) document.getElementById('metaUserId').textContent = user.user_id;
    }
}

function displayDefaultUserIcon() {
    const iconDiv = document.getElementById("userIcon");
    if (!iconDiv) return;
    iconDiv.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
}

// ==========================================
// ACTIONS & OVERLAYS
// ==========================================
window.toggleUserOverlay = function() {
    const overlay = document.getElementById('userOverlay');
    const backdrop = document.getElementById('overlayBackdrop');
    if (!overlay) return;

    if (!overlay.classList.contains('active')) {
        // Close nav first
        const mainNav = document.getElementById('mainNav');
        if (mainNav) mainNav.classList.remove('active');
        
        overlay.classList.add('active');
        if (backdrop) backdrop.classList.add('active');
        fetchUserProfile(); // Refresh data when opening
    } else {
        overlay.classList.remove('active');
        if (backdrop) backdrop.classList.remove('active');
    }
};

window.logout = async function() {
    try {
        const res = await fetch(`${CONFIG.WORKER_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' });
        if (res.ok) window.location.href = 'https://agtechscript.in';
    } catch (err) {
        UI.showNotification("Logout failed", "error");
    }
};

// ==========================================
// FORM SUBMISSION (EDIT PROFILE)
// ==========================================
async function handleProfileUpdate(e) {
    e.preventDefault();
    const saveBtn = e.target.querySelector('button[type="submit"]');
    const originalText = saveBtn.innerHTML;

    // Password validation
    const newPass = document.getElementById('newPassword')?.value;
    const confirmPass = document.getElementById('confirmPassword')?.value;
    if (newPass && newPass !== confirmPass) {
        UI.showNotification("Passwords do not match", "error");
        return;
    }

    try {
        saveBtn.disabled = true;
        saveBtn.innerHTML = "Saving...";

        const formData = {
            user_id: window.currentUser?.user_id,
            name: document.getElementById('fullName').value,
            phone: document.getElementById('phone').value,
            address: document.getElementById('address').value,
            newPassword: newPass || undefined
        };

        const res = await fetch(`${CONFIG.WORKER_URL}/api/user/update`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const data = await res.json();
        if (data.success) {
            UI.showNotification("Profile updated!", "success");
            fetchUserProfile();
        } else {
            UI.showNotification(data.error || "Update failed", "error");
        }
    } catch (err) {
        UI.showNotification("Server error", "error");
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
    }
}

// ==========================================
// INITIALIZATION ON LOAD
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
    
    // 1. Load Header Partial
    const headerContainer = document.getElementById("header-container");
    if (headerContainer) {
        try {
            const res = await fetch("/partials/header.html");
            headerContainer.innerHTML = await res.text();
            initHeaderLogic();
            AppState.isHeaderLoaded = true;
        } catch (err) {
            console.error("Header failed to load");
        }
    }

    // 2. Load Footer Partial
    const footerContainer = document.getElementById("footer-container");
    if (footerContainer) {
        fetch("/partials/footer.html")
            .then(r => r.text())
            .then(html => {
                footerContainer.innerHTML = html;
                const y = document.getElementById("year");
                if (y) y.textContent = new Date().getFullYear();
            });
    }

    // 3. Fetch User Data
    await fetchUserProfile();

    // 4. Setup Page Specific Listeners
    const profileForm = document.getElementById('editProfileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileUpdate);
    }

    // 5. Global click to close overlays
    document.addEventListener('click', (e) => {
        const overlay = document.getElementById('userOverlay');
        const userIcon = document.getElementById('userIcon');
        if (overlay?.classList.contains('active') && !overlay.contains(e.target) && !userIcon.contains(e.target)) {
            overlay.classList.remove('active');
            document.getElementById('overlayBackdrop')?.classList.remove('active');
        }
    });
});
let currentUser = null;
let selectedImageFile = null;
let imagePreviewUrl = null;

document.addEventListener("DOMContentLoaded", async () => {
    // Check authentication
    const userData = localStorage.getItem("ag_user");
    if (!userData) {
        window.location.href = "login.html";
        return;
    }
    
    try {
        currentUser = JSON.parse(userData);
    } catch (e) {
        console.error("Invalid user data:", e);
        localStorage.removeItem("ag_user");
        window.location.href = "login.html";
        return;
    }
    
    // Load fresh profile data
    await loadUserProfile();
    
    // Initialize form with user data
    populateForm();
    
    // Setup image upload preview
    setupImageUpload();
});

// Load latest profile from server
async function loadUserProfile() {
    try {
        // ✅ CHECK: apiGetProfile exists?
        if (typeof apiGetProfile !== 'function') {
            console.error("❌ apiGetProfile function not found!");
            showToast("⚠️ API Error: Reload page", "error");
            return;
        }
        
        const res = await apiGetProfile(currentUser.id);
        
        if (res?.status === "success") {
            // Merge new data with existing
            currentUser = { 
                ...currentUser, 
                ...res,
                // Preserve critical fields
                id: res.id || currentUser.id,
                points: res.points ?? currentUser.points ?? 0,
                stamps: res.stamps ?? currentUser.stamps ?? 0
            };
            localStorage.setItem("ag_user", JSON.stringify(currentUser));
        } else {
            console.warn("Profile load failed:", res?.message);
            showToast("⚠️ Using cached profile", "info");
        }
    } catch (e) {
        console.error("Error loading profile:", e);
        showToast("⚠️ Could not load latest profile", "error");
    }
}

// Populate form with user data
function populateForm() {
    // Safety check
    if (!currentUser) return;
    
    // Basic fields
    setValue("fullName", currentUser.name);
    setValue("email", currentUser.email);
    setValue("mobile", currentUser.mobile);
    setValue("address", currentUser.address);
    
    // ✅ FIXED: Date format for input type="date"
    if (currentUser.dob) {
        try {
            let formattedDate = currentUser.dob;
            
            if (currentUser.dob.includes('T')) {
                formattedDate = currentUser.dob.split('T')[0];
            } else if (currentUser.dob.includes('/')) {
                const parts = currentUser.dob.split('/');
                if (parts.length === 3) {
                    formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                }
            }
            
            setValue("dob", formattedDate);
        } catch (e) {
            console.warn("Date format error:", e);
            setValue("dob", "");
        }
    } else {
        setValue("dob", "");
    }
    
    // ✅ FIXED: Profile image with better fallback
    const profileImg = document.getElementById("profilePreview");
    if (profileImg) {
        if (currentUser.profile && currentUser.profile !== "null" && currentUser.profile !== "undefined") {
            profileImg.src = currentUser.profile;
        } else {
            // Generate avatar from name
            const name = encodeURIComponent(currentUser.name || "User");
            profileImg.src = `https://ui-avatars.com/api/?name=${name}&background=00c6ff&color=fff&size=150&bold=true`;
        }
    }
    
    // Update stats
    setHtml("memberId", `<i class="fas fa-id-card"></i> ${currentUser.id || 'AG1001'}`);
    setHtml("memberSince", `<i class="fas fa-calendar-alt"></i> Member since ${new Date().getFullYear()}`);
    setText("displayPoints", currentUser.points ?? 0);
    setText("displayStamps", currentUser.stamps ?? 0);
}

// Helper functions for DOM manipulation
function setValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value || "";
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value ?? 0;
}

function setHtml(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
}

// Setup image upload preview
function setupImageUpload() {
    const uploadBtn = document.getElementById("uploadBtn");
    const imageInput = document.getElementById("profileImage");
    const preview = document.getElementById("profilePreview");
    const removeBtn = document.getElementById("removeImageBtn");
    
    if (!uploadBtn || !imageInput || !preview) {
        console.warn("Image upload elements not found");
        return;
    }
    
    // Trigger file input
    uploadBtn.addEventListener("click", () => {
        imageInput.click();
    });
    
    // Handle file selection
    imageInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Validate file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            showToast("❌ Please select JPEG, PNG or GIF image", "error");
            imageInput.value = "";
            return;
        }
        
        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            showToast("❌ Image size should be less than 2MB", "error");
            imageInput.value = "";
            return;
        }
        
        selectedImageFile = file;
        
        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.src = e.target.result;
            imagePreviewUrl = e.target.result;
            if (removeBtn) removeBtn.style.display = "flex";
        };
        reader.readAsDataURL(file);
        
        showToast("✅ Image selected", "success");
    });
    
    // Remove image
    if (removeBtn) {
        removeBtn.addEventListener("click", () => {
            selectedImageFile = null;
            imagePreviewUrl = null;
            imageInput.value = "";
            
            // Reset to current profile or avatar
            if (currentUser.profile && currentUser.profile !== "null") {
                preview.src = currentUser.profile;
            } else {
                const name = encodeURIComponent(currentUser.name || "User");
                preview.src = `https://ui-avatars.com/api/?name=${name}&background=00c6ff&color=fff&size=150`;
            }
            
            removeBtn.style.display = "none";
            showToast("🖼️ Image removed", "info");
        });
    }
}

// Save profile changes
async function saveProfile() {
    const saveBtn = document.getElementById("saveProfileBtn");
    if (!saveBtn) return;
    
    const originalText = saveBtn.innerHTML;
    
    // Get form values
    const name = document.getElementById("fullName")?.value.trim() || "";
    const email = document.getElementById("email")?.value.trim() || "";
    const mobile = document.getElementById("mobile")?.value.trim() || "";
    const address = document.getElementById("address")?.value.trim() || "";
    const dob = document.getElementById("dob")?.value || "";
    const password = document.getElementById("newPassword")?.value || "";
    const confirmPass = document.getElementById("confirmPassword")?.value || "";
    
    // Validation
    if (!name) {
        showToast("❌ Name is required", "error");
        return;
    }
    
    if (email && !isValidEmail(email)) {
        showToast("❌ Please enter a valid email", "error");
        return;
    }
    
    if (mobile && !isValidMobile(mobile)) {
        showToast("❌ Please enter a valid 10-digit mobile number", "error");
        return;
    }
    
    if (password || confirmPass) {
        if (password !== confirmPass) {
            showToast("❌ Passwords do not match", "error");
            return;
        }
        if (password.length < 6) {
            showToast("❌ Password must be at least 6 characters", "error");
            return;
        }
    }
    
    // Show loading state
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    saveBtn.disabled = true;
    
    try {
        // ✅ CHECK: apiUpdateProfile exists?
        if (typeof apiUpdateProfile !== 'function') {
            throw new Error("API function not found");
        }
        
        // Prepare profile data - ONLY send changed fields
        const profileData = {};
        
        if (name !== currentUser.name) profileData.name = name;
        if (email !== currentUser.email) profileData.email = email;
        if (mobile !== currentUser.mobile) profileData.mobile = mobile;
        if (address !== currentUser.address) profileData.address = address;
        if (dob !== currentUser.dob) profileData.dob = dob;
        if (password) profileData.password = password;
        
        // Add profile image if changed
        if (selectedImageFile) {
            showToast("🖼️ Uploading image...", "info");
            profileData.profile = await fileToBase64(selectedImageFile);
        }
        
        // If nothing changed, show message and return
        if (Object.keys(profileData).length === 0) {
            showToast("ℹ️ No changes to save", "info");
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
            return;
        }
        
        console.log("Saving profile changes:", Object.keys(profileData));
        
        const res = await apiUpdateProfile(currentUser.id, profileData);
        
        if (res?.status === "success") {
            showToast("✅ Profile updated successfully!", "success");
            
            // Update local storage
            if (profileData.name) currentUser.name = name;
            if (profileData.email) currentUser.email = email;
            if (profileData.mobile) currentUser.mobile = mobile;
            if (profileData.address) currentUser.address = address;
            if (profileData.dob) currentUser.dob = dob;
            if (res.profile) currentUser.profile = res.profile;
            
            localStorage.setItem("ag_user", JSON.stringify(currentUser));
            
            // Update UI
            populateForm();
            
            // Clear password fields
            setValue("newPassword", "");
            setValue("confirmPassword", "");
            
            // Reset image selection
            selectedImageFile = null;
            imagePreviewUrl = null;
            setValue("profileImage", "");
            if (document.getElementById("removeImageBtn")) {
                document.getElementById("removeImageBtn").style.display = "none";
            }
            
            // Update navbar profile
            updateNavbarProfile();
            
        } else {
            showToast(`❌ ${res?.message || "Failed to update profile"}`, "error");
        }
        
    } catch (e) {
        console.error("Profile update error:", e);
        showToast("⚠️ Network error. Please try again.", "error");
    } finally {
        // Reset button
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

// Convert file to Base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
    });
}

// Validation helpers
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidMobile(mobile) {
    return /^[6-9]\d{9}$/.test(mobile);
}

// Cancel edit
function cancelEdit() {
    if (confirm("Discard all changes?")) {
        populateForm();
        selectedImageFile = null;
        imagePreviewUrl = null;
        setValue("profileImage", "");
        setValue("newPassword", "");
        setValue("confirmPassword", "");
        
        if (document.getElementById("removeImageBtn")) {
            document.getElementById("removeImageBtn").style.display = "none";
        }
        
        showToast("✖️ Changes discarded", "info");
    }
}

// Update navbar profile
function updateNavbarProfile() {
    const navbarProfile = document.getElementById("navbarProfile");
    if (navbarProfile && currentUser?.profile) {
        navbarProfile.src = currentUser.profile;
    }
}

// Toast notification
function showToast(message, type = 'info') {
    // Remove existing toasts if too many
    const existingToasts = document.querySelectorAll('.toast-container .toast');
    if (existingToasts.length > 3) {
        existingToasts[0]?.remove();
    }
    
    // Create container if not exists
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
        `;
        document.body.appendChild(toastContainer);
    }
    
    // Create toast
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.cssText = `
        background: ${type === 'success' ? 'rgba(0, 200, 100, 0.95)' : 
                    type === 'error' ? 'rgba(255, 80, 80, 0.95)' : 
                    'rgba(0, 200, 255, 0.95)'};
        backdrop-filter: blur(10px);
        color: white;
        padding: 14px 24px;
        border-radius: 50px;
        margin-bottom: 10px;
        border: 1px solid rgba(255,255,255,0.2);
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        animation: slideIn 0.3s ease;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 0.95rem;
        max-width: 350px;
        word-break: break-word;
    `;
    
    const icon = type === 'success' ? 'fa-check-circle' : 
                 type === 'error' ? 'fa-exclamation-circle' : 
                 'fa-info-circle';
    
    toast.innerHTML = `<i class="fas ${icon}" style="font-size: 1.1rem;"></i> ${message}`;
    toastContainer.appendChild(toast);
    
    // Auto remove
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Add animation styles if not present
if (!document.querySelector('#toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
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

// Make functions global
window.saveProfile = saveProfile;
window.cancelEdit = cancelEdit;
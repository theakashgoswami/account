// assets/js/edit-profile.js

let currentUserData = null;

// Initialize page
document.addEventListener("DOMContentLoaded", async function() {
        
    // Load header
    await loadHeader();
    
    // Wait for user authentication
    await waitForUser();
    
    // Load profile data
    await loadProfileData();
    
    // Setup event listeners
    setupEventListeners();
});

// Load header
async function loadHeader() {
    try {
        const response = await fetch("/partials/header.html");
        const html = await response.text();
        document.getElementById("header-container").innerHTML = html;
        
        if (typeof initHeader === 'function') {
            initHeader();
        }
    } catch (error) {
        console.error("Header load failed:", error);
    }
}

// Wait for user authentication
async function waitForUser() {
    let waitTime = 0;
    const maxWait = 3000;
    
    while (!window.currentUser && waitTime < maxWait) {
        await new Promise(r => setTimeout(r, 100));
        waitTime += 100;
    }
    
    if (!window.currentUser) {
        console.error("❌ No user found - redirecting");
        window.location.href = "https://agtechscript.in";
        return;
    }
}

// Load profile data from API
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
        console.error("❌ Error loading profile:", error);
        showNotification("Error loading profile", "error");
    }
}

// Display profile data in form
function displayProfileData(data) {
   
    
    // Avatar
    if (data.profile_image) {
        document.getElementById('profileAvatar').src = data.profile_image;
    }
    
    // User meta
    document.getElementById('metaUserId').textContent = data.user_id || 'AG0001';
    
    if (data.created_at) {
        const year = new Date(data.created_at).getFullYear();
        document.getElementById('metaMemberSince').textContent = `Member since ${year}`;
    }
    
    // Form fields
    document.getElementById('fullName').value = data.name || '';
    document.getElementById('email').value = data.email || '';
    document.getElementById('phone').value = data.phone || '';
    document.getElementById('address').value = data.address || '';
}

// Setup event listeners
function setupEventListeners() {
    // Avatar upload
    const avatarInput = document.getElementById('avatarInput');
    avatarInput.addEventListener('change', handleAvatarUpload);
    
    // Form submit
    const form = document.getElementById('editProfileForm');
    form.addEventListener('submit', saveProfile);
    
    // Password validation
    document.getElementById('newPassword').addEventListener('input', validatePasswords);
    document.getElementById('confirmPassword').addEventListener('input', validatePasswords);
}

// Trigger file upload
function triggerFileUpload() {
    document.getElementById('avatarInput').click();
}

// Handle avatar upload
async function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file
    if (!file.type.match('image.*')) {
        showNotification('Please select an image file', 'error');
        return;
    }
    
    if (file.size > 2 * 1024 * 1024) {
        showNotification('Image must be less than 2MB', 'error');
        return;
    }
    
    // Preview
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('profileAvatar').src = e.target.result;
    };
    reader.readAsDataURL(file);
    
    // Upload
    await uploadAvatar(file);
}

// Upload avatar to server
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
        console.error('Upload error:', error);
        showNotification('Upload failed', 'error');
    }
}

// Validate passwords
function validatePasswords() {
    const newPass = document.getElementById('newPassword').value;
    const confirmPass = document.getElementById('confirmPassword').value;
    const errorDiv = document.getElementById('passwordError');
    
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

// Save profile
async function saveProfile(e) {
    e.preventDefault();
    
    // Validate passwords
    if (!validatePasswords()) {
        return;
    }
    
    const saveBtn = document.getElementById('saveProfileBtn');
    const originalText = saveBtn.innerHTML;
    
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    
    // Prepare update data
    const updateData = {
        user_id: window.currentUser.user_id,
        name: document.getElementById('fullName').value,
        phone: document.getElementById('phone').value,
        address: document.getElementById('address').value
    };
    
    // Add image if changed
    if (currentUserData?.profile_image) {
        updateData.profile_image = currentUserData.profile_image;
    }
    
    // Add password if changing
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
            
            // Clear password fields
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
            
            // Update current user
            window.currentUser = { ...window.currentUser, ...updateData };
            
            // Reload profile data
            await loadProfileData();
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

// Cancel edit
function cancelEdit() {
    if (confirm('Discard changes?')) {
        window.location.href = 'index.html';
    }
}

// Show notification
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
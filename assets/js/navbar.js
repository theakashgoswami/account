// assets/js/navbar.js - REPLACE ENTIRE FILE
function renderNavbar(active = "home") {
    const NAV = `
        <nav class="navbar">
            <div class="nav-left">
                <img src="https://cdn.agtechscript.in/AGTechScript.webp" class="logo" alt="Logo">
                <span class="brand">AG TechScript</span>
            </div>

            <div class="nav-items">
                <a href="index.html" class="${active === 'home' ? 'active' : ''}">Home</a>
                <a href="earn.html" class="${active === 'earn' ? 'active' : ''}">Earn</a>
                <a href="use.html" class="${active === 'use' ? 'active' : ''}">Use</a>
                <a href="history.html" class="${active === 'history' ? 'active' : ''}">History</a>
                ${window.currentUser ? `
                    <span class="user-badge">${window.currentUser.role || 'user'}</span>
                    <button onclick="logout()" class="logout-btn">Logout</button>
                ` : ''}
            </div>
        </nav>
    `;

    document.getElementById("navbar").innerHTML = NAV;
}

// Add logout function
async function logout() {
    try {
        await fetch(`${CONFIG.WORKER_URL}/api/auth/logout`, {
            method: "POST",
            credentials: "include"
        });
        window.location.href = "https://agtechscript.in";
    } catch (error) {
        console.error("Logout failed:", error);
    }
}
// navbar.js

function renderNavbar(active = "home") {
    const NAV = `
        <nav class="navbar">
            <div class="nav-left">
                <img src="https://cdn.agtechscript.in/AGTechScript.webp" class="logo">
                <span class="brand">AG TechScript</span>
            </div>

            <div class="nav-items">
                <a href="index.html" class="${active === 'home' ? 'active' : ''}">Home</a>
                <a href="earn.html" class="${active === 'earn' ? 'active' : ''}">Earn</a>
                <a href="use.html" class="${active === 'use' ? 'active' : ''}">Use</a>
                <a href="history.html" class="${active === 'history' ? 'active' : ''}">History</a>
            </div>
        </nav>
    `;

    document.getElementById("navbar").innerHTML = NAV;
}
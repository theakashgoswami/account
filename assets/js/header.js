// ====================================================================
// HEADER INITIALIZATION
// ====================================================================
(function() {
    // Guard to prevent multiple initializations
    if (window.headerInitialized) {
        return;
    }
    
    window.initHeader = function() {
        const navToggle = document.getElementById("navToggle");
        const mainNav = document.getElementById("mainNav");
        const customHeader = document.getElementById("header");

        if (!navToggle || !mainNav || !customHeader) {
            setTimeout(window.initHeader, 300);
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
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', window.initHeader);
    } else {
        window.initHeader();
    }
})();

// ====================================================================
// HEADER LOADER FUNCTION (SINGLE VERSION)
// ====================================================================
window.loadHeader = async function() {
    try {
        const response = await fetch("/partials/header.html");
        const html = await response.text();
        
        const headerContainer = document.getElementById("header-container");
        if (!headerContainer) {
            console.error("Header container not found");
            return;
        }
        
        headerContainer.innerHTML = html;
        
        // Wait a tiny bit for DOM to update
        await new Promise(r => setTimeout(r, 100));
        
        // Initialize header
        if (typeof window.initHeader === 'function') {
            window.initHeader();
        }
        
        // Load user profile icon
        if (window.currentUser?.user_id && typeof window.loadUserProfileIcon === 'function') {
            await window.loadUserProfileIcon(window.currentUser.user_id);
        }
        
    } catch (error) {
        console.error("Header load failed:", error);
    }
};

// ====================================================================
// UPDATE ALL STATS FUNCTION
// ====================================================================
window.updateAllStats = function(points, stamps) {
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
};
// ✅ FIX: Add loadUserStats function
async function loadUserStats() {
    try {
        const res = await fetch(`${CONFIG.WORKER_URL}/api/user/stats`, {
            credentials: 'include',
            headers: { 'X-Client-Host': window.location.host }
        });
        const data = await res.json();
        if (data.success) {
           updateAllStats(data.points, data.stamps);
        }
    } catch (err) {
        console.error("Stats error:", err);
    }
}

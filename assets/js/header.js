// header.js - FINAL FIXED VERSION
(function() {
    // Guard to prevent multiple initializations
    if (window.headerInitialized) {
        console.log("Header already initialized, skipping...");
        return;
    }
    
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
                console.log("Nav opened"); // Single log
            } else {
                finalNavToggle.innerHTML = "☰";
                console.log("Nav closed"); // Single log
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
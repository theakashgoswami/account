// header.js - FIXED VERSION
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

    // 🔥 FIX: Mobile Toggle with proper class toggle
    navToggle.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Toggle active class
        mainNav.classList.toggle("active");
        
        // Change hamburger icon based on state
        if (mainNav.classList.contains("active")) {
            navToggle.innerHTML = "✕"; // Close icon
            navToggle.style.fontSize = "1.8rem";
        } else {
            navToggle.innerHTML = "☰"; // Hamburger icon
        }
        
        console.log("Nav toggled:", mainNav.classList.contains("active")); // Debug
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
            navToggle.innerHTML = "☰"; // Reset to hamburger
        }
    });

    // CLOSE MENU ON NAV LINK CLICK (MOBILE)
    document.querySelectorAll(".nav-menu a").forEach((link) => {
        link.addEventListener("click", () => {
            if (window.innerWidth <= 768) {
                mainNav.classList.remove("active");
                navToggle.innerHTML = "☰"; // Reset to hamburger
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

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeader);
} else {
    initHeader();
}
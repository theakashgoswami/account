// ========== SPIN WHEEL - COMPLETE FRONTEND SYSTEM ==========
// ✅ FUNCTION NAME: spinWheel (not spin)

let spinData = {
    dailySpin: 1,        // Har din 1 spin
    extraSpins: 0,       // Read & Earn se milne wale spins
    lastSpinDate: null,  // Last spin date (daily reset ke liye)
    totalSpinsToday: 0   // Kitni baar spin kiya aaj
};

// ========== INITIALIZE SPIN SYSTEM ==========
function initSpinSystem() {
    const user = JSON.parse(localStorage.getItem("ag_user"));
    if (!user) return;
    
    loadSpinData();
    checkDailyReset();
    updateSpinUI();
}

// ========== LOAD SPIN DATA FROM LOCALSTORAGE ==========
function loadSpinData() {
    const user = JSON.parse(localStorage.getItem("ag_user"));
    const saved = localStorage.getItem(`spin_data_${user.id}`);
    
    if (saved) {
        spinData = JSON.parse(saved);
    } else {
        // First time user
        spinData = {
            dailySpin: 1,
            extraSpins: 0,
            lastSpinDate: new Date().toDateString(),
            totalSpinsToday: 0
        };
        saveSpinData();
    }
}

// ========== SAVE SPIN DATA TO LOCALSTORAGE ==========
function saveSpinData() {
    const user = JSON.parse(localStorage.getItem("ag_user"));
    localStorage.setItem(`spin_data_${user.id}`, JSON.stringify(spinData));
}

// ========== CHECK DAILY RESET ==========
function checkDailyReset() {
    const today = new Date().toDateString();
    
    if (spinData.lastSpinDate !== today) {
        // New day - reset daily spin
        spinData.dailySpin = 1;
        spinData.lastSpinDate = today;
        spinData.totalSpinsToday = 0;
        saveSpinData();
        
        showToast("🌅 New day! Your daily spin is ready!", "info");
    }
}

// ========== GET TOTAL SPINS ==========
function getTotalSpins() {
    return spinData.dailySpin + spinData.extraSpins;
}

// ========== ADD EXTRA SPIN (Read & Earn se call) ==========
function addExtraSpin() {
    spinData.extraSpins += 1;
    saveSpinData();
    updateSpinUI();
    
    showToast(`✨ +1 Extra Spin! Total: ${getTotalSpins()} spins`, "success");
    confettiEffect();
}

// ========== USE ONE SPIN ==========
function useOneSpin() {
    if (spinData.extraSpins > 0) {
        spinData.extraSpins -= 1;
    } else if (spinData.dailySpin > 0) {
        spinData.dailySpin -= 1;
    } else {
        return false;
    }
    
    spinData.totalSpinsToday += 1;
    saveSpinData();
    updateSpinUI();
    return true;
}

// ========== 🎯 MAIN SPIN WHEEL FUNCTION ==========
// ✅ YEH FUNCTION CALL HOGA HTML SE
window.spinWheel = async function() {
    const user = JSON.parse(localStorage.getItem("ag_user"));
    if (!user) {
        window.location.href = "login.html";
        return;
    }
    
    // Check if spins available
    if (getTotalSpins() <= 0) {
        showToast("❌ No spins left! Come back tomorrow or read articles!", "error");
        return;
    }
    
    const spinBtn = document.querySelector('.spin-btn');
    const spinResult = document.getElementById("spinResult");
    
    if (!spinBtn || !spinResult) return;
    
    // Loading state
    const originalText = spinBtn.innerHTML;
    spinBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Spinning...';
    spinBtn.disabled = true;
    
    // Spin animation
    const wheel = document.querySelector('.spin-wheel-preview');
    if (wheel) {
        wheel.style.animation = 'spin 1s cubic-bezier(0.2, 0.8, 0.4, 1)';
    }

    try {
        // ✅ USE ONE SPIN (Frontend only)
        const spinUsed = useOneSpin();
        if (!spinUsed) {
            throw new Error("No spins available");
        }
        
        // ✅ CALL BACKEND SPIN WHEEL
        const res = await apiPost({
            action: "spinWheel",
            id: user.id,
            name: user.name,
            mobile: user.mobile
        });

        // Remove spin animation
        if (wheel) {
            setTimeout(() => {
                wheel.style.animation = 'wheelPulse 3s infinite alternate';
            }, 1000);
        }

        if (res.status === "success") {
            // ✅ UPDATE USER POINTS/STAMPS
            if (res.points) {
                user.points = (user.points || 0) + res.points;
            }
            if (res.stamps) {
                user.stamps = (user.stamps || 0) + res.stamps;
            }
            localStorage.setItem("ag_user", JSON.stringify(user));
            
            // ✅ SHOW RESULT
            spinResult.innerHTML = `
                <div class="spin-win">
                    <i class="fas fa-trophy"></i>
                    <span class="win-text">You won!</span>
                    <span class="win-reward">${res.reward}</span>
                </div>
            `;
            
            showToast(`🎉 ${res.reward}!`, "success");
            
            // Update dashboard
            updateDashboardPoints();
            
        } else {
            // If backend fails, return the spin
            refundSpin();
            spinResult.innerHTML = `<i class="fas fa-info-circle"></i> ${res.message || "Try again!"}`;
        }
        
    } catch (e) {
        console.error("Spin error:", e);
        spinResult.innerHTML = `<i class="fas fa-exclamation-circle"></i> Network error.`;
    } finally {
        spinBtn.innerHTML = originalText;
        spinBtn.disabled = false;
    }
};

// ========== REFUND SPIN ==========
function refundSpin() {
    spinData.extraSpins += 1;
    saveSpinData();
    updateSpinUI();
    showToast("🔄 Spin refunded!", "info");
}

// ========== UPDATE SPIN UI ==========
function updateSpinUI() {
    const totalSpins = getTotalSpins();
    
    // Update spin button
    const spinBtn = document.querySelector('.spin-btn');
    if (spinBtn) {
        if (totalSpins > 0) {
            spinBtn.disabled = false;
            spinBtn.innerHTML = `<i class="fas fa-play"></i> SPIN NOW (${totalSpins} left)`;
        } else {
            spinBtn.disabled = true;
            spinBtn.innerHTML = `<i class="fas fa-clock"></i> No spins left`;
        }
    }
    
    // Update spin counter
    const spinCounter = document.getElementById('spinCounter');
    if (spinCounter) {
        spinCounter.innerHTML = `
            <div class="spin-counter-card">
                <div class="spin-daily">
                    <i class="fas fa-sun"></i>
                    <span class="label">Daily</span>
                    <span class="count">${spinData.dailySpin}</span>
                </div>
                <div class="spin-extra">
                    <i class="fas fa-star"></i>
                    <span class="label">Extra</span>
                    <span class="count">${spinData.extraSpins}</span>
                </div>
                <div class="spin-total">
                    <i class="fas fa-dharmachakra"></i>
                    <span class="label">Total</span>
                    <span class="count">${totalSpins}</span>
                </div>
            </div>
        `;
    }
}

// ========== UPDATE DASHBOARD POINTS ==========
function updateDashboardPoints() {
    const pointsEl = document.getElementById("dashPoints");
    const stampsEl = document.getElementById("dashStamps");
    const user = JSON.parse(localStorage.getItem("ag_user"));
    
    if (pointsEl) pointsEl.innerText = user.points || 0;
    if (stampsEl) stampsEl.innerText = user.stamps || 0;
}

// ========== INITIALIZE ON PAGE LOAD ==========
document.addEventListener("DOMContentLoaded", () => {
    const user = localStorage.getItem("ag_user");
    if (user) {
        initSpinSystem();
    }
});

// ✅ EXPORT FUNCTIONS GLOBALLY
window.addExtraSpin = addExtraSpin;
window.getTotalSpins = getTotalSpins;
window.resetSpinData = function() {
    const user = JSON.parse(localStorage.getItem("ag_user"));
    spinData = {
        dailySpin: 1,
        extraSpins: 0,
        lastSpinDate: new Date().toDateString(),
        totalSpinsToday: 0
    };
    saveSpinData();
    updateSpinUI();
    showToast("🔄 Spin data reset!", "info");
};
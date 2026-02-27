// ========== DAILY LOGIN STREAK SYSTEM ==========
// ✅ Backend sync with Google Sheets

let streakData = {
    currentStreak: 0,
    maxStreak: 0,
    lastLoginDate: null,
    todayClaimed: false,
    totalPointsEarned: 0
};

// ========== INITIALIZE STREAK ==========
function initStreak() {
    const user = JSON.parse(localStorage.getItem("ag_user"));
    if (!user) return;
    
    loadStreakData();
    checkAndClaimStreak();
    updateStreakUI();
}

// ========== LOAD STREAK DATA ==========
function loadStreakData() {
    const user = JSON.parse(localStorage.getItem("ag_user"));
    const saved = localStorage.getItem(`streak_${user.id}`);
    
    if (saved) {
        streakData = JSON.parse(saved);
    } else {
        streakData = {
            currentStreak: 0,
            maxStreak: 0,
            lastLoginDate: null,
            todayClaimed: false,
            totalPointsEarned: 0
        };
        saveStreakData();
    }
}

// ========== SAVE STREAK DATA ==========
function saveStreakData() {
    const user = JSON.parse(localStorage.getItem("ag_user"));
    localStorage.setItem(`streak_${user.id}`, JSON.stringify(streakData));
}

// ========== CHECK AND CLAIM STREAK ==========
async function checkAndClaimStreak() {
    const user = JSON.parse(localStorage.getItem("ag_user"));
    if (!user) return;
    
    const today = new Date().toDateString();
    
    if (streakData.lastLoginDate === today && streakData.todayClaimed) {
        return;
    }
    
    if (!streakData.lastLoginDate) {
        // First time login
        streakData.currentStreak = 1;
        streakData.maxStreak = 1;
        streakData.lastLoginDate = today;
        streakData.todayClaimed = true;
        streakData.totalPointsEarned = 1;
        
        await addStreakPoints(1, "Daily Login Streak - Day 1");
        saveStreakData();
        showStreakNotification(1, 1);
        return;
    }
    
    const lastDate = new Date(streakData.lastLoginDate);
    const currentDate = new Date(today);
    const diffTime = currentDate - lastDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
        // Consecutive day
        streakData.currentStreak += 1;
        streakData.maxStreak = Math.max(streakData.maxStreak, streakData.currentStreak);
        
        let pointsEarned = 1;
        let reason = `Daily Login Streak - Day ${streakData.currentStreak}`;
        
        if (streakData.currentStreak === 7) {
            pointsEarned = 10;
            reason = `Daily Login Streak - Day 7 BONUS!`;
            
            // Add extra spin on day 7
            if (typeof window.addExtraSpin === 'function') {
                window.addExtraSpin();
            }
        }
        
        streakData.totalPointsEarned += pointsEarned;
        streakData.lastLoginDate = today;
        streakData.todayClaimed = true;
        
        await addStreakPoints(pointsEarned, reason);
        saveStreakData();
        showStreakNotification(streakData.currentStreak, pointsEarned);
        
    } else if (diffDays === 0) {
        streakData.todayClaimed = true;
        saveStreakData();
        
    } else {
        // Streak broken
        streakData.currentStreak = 1;
        streakData.lastLoginDate = today;
        streakData.todayClaimed = true;
        streakData.totalPointsEarned += 1;
        
        await addStreakPoints(1, "Daily Login Streak - New Streak Day 1");
        saveStreakData();
        showStreakNotification(1, 1, true);
    }
}

// ========== ADD STREAK POINTS TO USER ==========
async function addStreakPoints(points, reason) {
    const user = JSON.parse(localStorage.getItem("ag_user"));
    if (!user) return;
    
    // ===== 1. LOCALSTORAGE UPDATE =====
    user.points = (user.points || 0) + points;
    localStorage.setItem("ag_user", JSON.stringify(user));
    
    // ===== 2. BACKEND UPDATE (Google Sheets) =====
    try {
        const res = await apiPost({
            action: "addPoints",
            id: user.id,
            points: points,
            reason: reason,
            type: "Credit"
        });
        
        if (res.status === "success") {
            console.log(`✅ ${points} points added to backend: ${reason}`);
        } else {
            console.error("Backend update failed:", res.message);
        }
    } catch (e) {
        console.error("Error adding points to backend:", e);
    }
    
    // ===== 3. UPDATE DASHBOARD =====
    if (typeof window.updateDashboardPoints === 'function') {
        window.updateDashboardPoints();
    }
    
    // Update points display directly
    const pointsEl = document.getElementById("dashPoints");
    if (pointsEl) pointsEl.innerText = user.points;
    
    // ===== 4. REFRESH HISTORY IF VISIBLE =====
    if (typeof window.loadHistory === 'function') {
        setTimeout(() => {
            window.loadHistory();
        }, 500);
    }
}

// ========== SHOW STREAK NOTIFICATION ==========
function showStreakNotification(day, points, isBroken = false) {
    if (!window.showToast) {
        if (isBroken) alert(`⚠️ Streak broken! Starting new streak. Day 1: +1 point`);
        else if (day === 7) alert(`🔥🔥 7 DAY STREAK! +10 points + 1 Extra Spin! 🔥🔥`);
        else alert(`🔥 Day ${day}: +${points} point${points > 1 ? 's' : ''}`);
        return;
    }
    
    if (isBroken) {
        showToast(`⚠️ Streak broken! Starting new streak. Day 1: +1 point`, 'warning');
        return;
    }
    
    if (day === 7) {
        showToast(`🔥🔥 7 DAY STREAK! +10 points + 1 Extra Spin! 🔥🔥`, 'success');
        
        const notification = document.createElement('div');
        notification.className = 'streak-premium-notification';
        notification.innerHTML = `
            <div class="premium-content">
                <i class="fas fa-crown"></i>
                <h3>🔥 WEEKLY MILESTONE! 🔥</h3>
                <p>7 Day Streak Complete!</p>
                <div class="premium-rewards">
                    <span><i class="fas fa-star"></i> +10 Points</span>
                    <span><i class="fas fa-dharmachakra"></i> +1 Extra Spin</span>
                </div>
                <p style="font-size: 0.9rem; margin-top: 15px; color: #ffd700;">₹10 value earned!</p>
            </div>
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
        
        if (typeof confettiEffect === 'function') confettiEffect();
        
    } else {
        showToast(`🔥 Day ${day}: +${points} point${points > 1 ? 's' : ''} (₹${points})`, 'success');
    }
}

// ========== UPDATE STREAK UI ==========
function updateStreakUI() {
    const container = document.getElementById('streakContainer');
    if (!container) return;
    
    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date().getDay();
    const adjustedToday = today === 0 ? 6 : today - 1;
    
    let html = `
        <div class="streak-card">
            <div class="streak-header">
                <div class="streak-icon">
                    <i class="fas fa-fire"></i>
                    <span class="streak-count">${streakData.currentStreak}</span>
                </div>
                <div class="streak-stats">
                    <div class="streak-max">
                        <i class="fas fa-trophy"></i> Best: ${streakData.maxStreak} days
                    </div>
                    <div class="streak-earned">
                        <i class="fas fa-coins"></i> Total: ₹${streakData.totalPointsEarned}
                    </div>
                </div>
            </div>
            
            <div class="streak-calendar">
    `;
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toDateString();
        const dayName = weekDays[date.getDay() === 0 ? 6 : date.getDay() - 1];
        const dayNumber = date.getDate();
        
        const isActive = streakData.lastLoginDate === dateStr;
        const isToday = i === 0;
        const isClaimed = (isActive && isToday && streakData.todayClaimed) || (isActive && !isToday);
        
        html += `
            <div class="calendar-day ${isClaimed ? 'claimed' : ''} ${isToday ? 'today' : ''}">
                <span class="day-name">${dayName}</span>
                <span class="day-number">${dayNumber}</span>
                ${isClaimed ? '<i class="fas fa-check-circle"></i>' : ''}
                ${isToday && !streakData.todayClaimed ? '<span class="claim-today">Claim</span>' : ''}
            </div>
        `;
    }
    
    html += `</div>`;
    
    const daysInCycle = streakData.currentStreak % 7;
    const progress = (daysInCycle / 7) * 100;
    const daysToReward = 7 - daysInCycle;
    
    html += `
        <div class="streak-progress">
            <div class="progress-label">
                <span><i class="fas fa-gift"></i> Next 7-Day Reward</span>
                <span class="next-reward">10 points + 1 Spin</span>
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill" style="width: ${progress}%;"></div>
                </div>
                <div class="progress-text">${daysInCycle}/7 days</div>
            </div>
            <div class="progress-remain">
                ${daysToReward === 7 ? 'Start your streak today!' : `${daysToReward} more days for big reward`}
            </div>
        </div>
    `;
    
    if (streakData.todayClaimed) {
        html += `
            <div class="streak-claimed-today">
                <i class="fas fa-check-circle"></i>
                Today's 1 point claimed! Come back tomorrow.
            </div>
        `;
    } else {
        html += `
            <div class="streak-claim-pending">
                <i class="fas fa-clock"></i>
                Login to claim today's 1 point
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// ========== RESET STREAK (TESTING) ==========
function resetStreak() {
    const user = JSON.parse(localStorage.getItem("ag_user"));
    streakData = {
        currentStreak: 0,
        maxStreak: 0,
        lastLoginDate: null,
        todayClaimed: false,
        totalPointsEarned: 0
    };
    saveStreakData();
    updateStreakUI();
    showToast('🔄 Streak reset for testing', 'info');
}

// ========== MAKE FUNCTIONS GLOBAL ==========
window.initStreak = initStreak;
window.checkAndClaimStreak = checkAndClaimStreak;
window.updateStreakUI = updateStreakUI;
window.addStreakPoints = addStreakPoints;
window.resetStreak = resetStreak;

// ========== AUTO INIT ON PAGE LOAD ==========
document.addEventListener('DOMContentLoaded', function() {
    const user = localStorage.getItem('ag_user');
    if (user) {
        setTimeout(() => {
            initStreak();
        }, 100);
    }
});
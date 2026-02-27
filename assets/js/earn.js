document.addEventListener("DOMContentLoaded", () => {
    loadQuiz();
    
    // Check if user is logged in
    const user = JSON.parse(localStorage.getItem("ag_user"));
    if (!user) {
        window.location.href = "login.html";
    }
});

async function loadQuiz() {
    const container = document.getElementById("quizContainer");

    // Show skeleton loader
    container.innerHTML = `
        <div class="quiz-skeleton"></div>
        <div class="quiz-skeleton" style="height: 60px; margin-top: 15px;"></div>
        <div class="quiz-skeleton" style="height: 60px; margin-top: 15px;"></div>
    `;

    try {
        const res = await apiGet({ action: "getQuizQuestions" });

        if (res.status !== "success" || !res.questions?.length) {
            container.innerHTML = `
                <div class="no-quiz">
                    <i class="fas fa-calendar-times"></i>
                    <h3 style="margin: 15px 0 5px;">No Quiz This Week</h3>
                    <p style="opacity: 0.7;">Check back soon for new questions!</p>
                </div>
            `;
            return;
        }

        const q = res.questions[0];

        container.innerHTML = `
            <div class="quiz-card">
                <div class="quiz-question">
                    <i class="fas fa-question-circle" style="margin-right: 12px; color: #00ffe0;"></i>
                    ${q.question}
                </div>
                <div class="quiz-options">
                    <button onclick="submitAnswer('${q.qid}','A')" class="quiz-option">
                        <i class="fas fa-circle"></i>
                        <span>A.</span> ${q.A}
                    </button>
                    <button onclick="submitAnswer('${q.qid}','B')" class="quiz-option">
                        <i class="fas fa-circle"></i>
                        <span>B.</span> ${q.B}
                    </button>
                    <button onclick="submitAnswer('${q.qid}','C')" class="quiz-option">
                        <i class="fas fa-circle"></i>
                        <span>C.</span> ${q.C}
                    </button>
                    <button onclick="submitAnswer('${q.qid}','D')" class="quiz-option">
                        <i class="fas fa-circle"></i>
                        <span>D.</span> ${q.D}
                    </button>
                </div>
            </div>
        `;

    } catch (e) {
        console.error("Quiz error:", e);
        container.innerHTML = `
            <div class="no-quiz" style="color: #ff9999;">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error Loading Quiz</h3>
                <p>Please try again later</p>
            </div>
        `;
    }
}

async function submitAnswer(qid, answer) {
    const user = JSON.parse(localStorage.getItem("ag_user"));
    if (!user) {
        alert("Please login first");
        window.location.href = "login.html";
        return;
    }

    // Disable all buttons to prevent double submission
    const buttons = document.querySelectorAll('.quiz-option');
    buttons.forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.7';
    });

    // Show selected option
    const selectedBtn = event?.target?.closest?.('button') || event;
    if (selectedBtn) {
        selectedBtn.style.background = 'rgba(0, 255, 200, 0.2)';
        selectedBtn.style.borderColor = '#00ffe0';
    }

    try {
        const res = await apiPost({
            action: "submitQuiz",
            id: user.id,
            qid: qid,
            answer: answer
        });

        // Show toast notification
        showToast(res.message || "Answer submitted!", res.status === "success" ? "success" : "error");
        
        if (res.status === "success") {
            // Disable all buttons permanently
            buttons.forEach(btn => {
                btn.disabled = true;
                btn.style.cursor = 'not-allowed';
            });
            
            // Add checkmark to selected
            if (selectedBtn) {
                selectedBtn.innerHTML += ' <i class="fas fa-check" style="color: #00ff88; margin-left: 8px;"></i>';
            }
        } else {
            // Re-enable buttons
            buttons.forEach(btn => {
                btn.disabled = false;
                btn.style.opacity = '1';
            });
            selectedBtn.style.background = '';
        }

    } catch (e) {
        console.error("Submit error:", e);
        showToast("Network error. Try again.", "error");
        
        // Re-enable buttons
        buttons.forEach(btn => {
            btn.disabled = false;
            btn.style.opacity = '1';
        });
    }
}

// Updated spin function using new apiSpinWheel
async function spin() {
    const user = JSON.parse(localStorage.getItem("ag_user"));
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    const spinBtn = document.querySelector('.spin-btn');
    const spinResult = document.getElementById("spinResult");
    
    // Loading state
    spinBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Spinning...';
    spinBtn.disabled = true;
    
    try {
        // ✅ NEW: Use specialized API function
        const res = await apiSpinWheel(user);
        
        if (res.status === "success") {
            spinResult.innerHTML = `You won: ${res.reward}`;
            
            // Update local storage
            if (res.points) {
                user.points = (user.points || 0) + res.points;
            }
            if (res.stamps) {
                user.stamps = (user.stamps || 0) + res.stamps;
            }
            localStorage.setItem("ag_user", JSON.stringify(user));
            
        } else {
            spinResult.innerHTML = res.message || "Spin failed";
        }
        
    } catch (e) {
        spinResult.innerHTML = "Error spinning wheel";
    } finally {
        spinBtn.innerHTML = '<i class="fas fa-play"></i> SPIN NOW';
        spinBtn.disabled = false;
    }
}

// Toast notification function
function showToast(message, type = 'info') {
    // Create toast container if not exists
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
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
        background: ${type === 'success' ? 'rgba(0, 200, 100, 0.9)' : type === 'error' ? 'rgba(255, 80, 80, 0.9)' : 'rgba(0, 200, 255, 0.9)'};
        backdrop-filter: blur(10px);
        color: white;
        padding: 15px 25px;
        border-radius: 50px;
        margin-bottom: 10px;
        border: 1px solid rgba(255,255,255,0.2);
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        animation: slideIn 0.3s ease;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 10px;
    `;
    
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        ${message}
    `;
    
    toastContainer.appendChild(toast);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add keyframe animations for toast
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
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(720deg); }
    }
`;
document.head.appendChild(style);

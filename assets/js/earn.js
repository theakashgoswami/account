// assets/js/earn.js

let currentQuizData = [];
let selectedAnswers = {};

document.addEventListener("DOMContentLoaded", async function() {
    console.log("🎯 Quiz page loaded");
    
    // Load header first
    await loadHeader();
    
    // Load user stats
    await loadUserStats();
    
    // Load quiz questions
    await loadQuiz();
});

// Load header
async function loadHeader() {
    try {
        const response = await fetch("/partials/header.html");
        const html = await response.text();
        
        const headerContainer = document.getElementById("header-container");
        if (headerContainer) {
            headerContainer.innerHTML = html;
            await new Promise(r => setTimeout(r, 100));
            
            if (typeof window.initHeader === 'function') {
                window.initHeader();
            }
            
            // Load user profile icon
            if (window.currentUser?.user_id && typeof window.loadUserProfileIcon === 'function') {
                await window.loadUserProfileIcon(window.currentUser.user_id);
            }
        }
    } catch (error) {
        console.error("Header load failed:", error);
    }
}

// Load user stats
async function loadUserStats() {
    try {
        const response = await fetch(`${CONFIG.WORKER_URL}/api/user/stats`, {
            credentials: 'include',
            headers: { 'X-Client-Host': window.location.host }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const pointsEl = document.getElementById('userPoints');
            const stampsEl = document.getElementById('userStamps');
            
            if (pointsEl) pointsEl.textContent = data.points;
            if (stampsEl) stampsEl.textContent = data.stamps;
        }
    } catch (error) {
        console.error("Stats error:", error);
    }
}

// Load quiz questions
async function loadQuiz() {
    const container = document.getElementById("quizContainer");
    
    if (!container) {
        console.error("Quiz container not found");
        return;
    }

    try {
        const res = await fetch(`${CONFIG.WORKER_URL}/api/user/earn`, {
            credentials: 'include',
            headers: { 'X-Client-Host': window.location.host }
        });

        const data = await res.json();

        if (!data.success || !data.earn || !data.earn.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-hourglass"></i>
                    <p>No questions available right now. Check back later!</p>
                </div>
            `;
            return;
        }

        currentQuizData = data.earn;
        displayQuiz(data.earn, container);

    } catch (err) {
        console.error("Quiz error:", err);
        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to load quiz. Please try again.</p>
                </div>
            `;
        }
    }
}

// Display quiz questions
function displayQuiz(questions, container) {
    if (!container) return;
    
    container.innerHTML = questions.map((q, index) => {
        const qid = q.qid || q.id || `q${index}`;
        const selected = selectedAnswers[qid];
        
        return `
            <div class="quiz-card" data-qid="${qid}">
                <div class="question-header">
                    <span class="question-number">Question ${index + 1}/${questions.length}</span>
                    <span class="reward-badge">
                        <i class="fas fa-star"></i> 10 Points
                    </span>
                </div>
                
                <h3>${q.question || 'Question'}</h3>
                
                <div class="options-grid">
                    <button class="option-btn ${selected === 'A' ? 'selected' : ''}" 
                            onclick="selectAnswer('${qid}', 'A')" 
                            ${selected ? 'disabled' : ''}>
                        <span class="option-prefix">A</span>
                        ${q.optionA || 'Option A'}
                    </button>
                    
                    <button class="option-btn ${selected === 'B' ? 'selected' : ''}" 
                            onclick="selectAnswer('${qid}', 'B')"
                            ${selected ? 'disabled' : ''}>
                        <span class="option-prefix">B</span>
                        ${q.optionB || 'Option B'}
                    </button>
                    
                    <button class="option-btn ${selected === 'C' ? 'selected' : ''}" 
                            onclick="selectAnswer('${qid}', 'C')"
                            ${selected ? 'disabled' : ''}>
                        <span class="option-prefix">C</span>
                        ${q.optionC || 'Option C'}
                    </button>
                    
                    <button class="option-btn ${selected === 'D' ? 'selected' : ''}" 
                            onclick="selectAnswer('${qid}', 'D')"
                            ${selected ? 'disabled' : ''}>
                        <span class="option-prefix">D</span>
                        ${q.optionD || 'Option D'}
                    </button>
                </div>
                
                ${!selected ? `
                    <button class="submit-btn" onclick="submitAnswer('${qid}')">
                        <i class="fas fa-paper-plane"></i> Submit Answer
                    </button>
                ` : `
                    <div class="question-footer">
                        <span><i class="fas fa-check-circle" style="color:#4CAF50"></i> Answer submitted</span>
                        <span>Waiting for result...</span>
                    </div>
                `}
            </div>
        `;
    }).join('');
}

// Select answer
function selectAnswer(qid, option) {
    // Remove previous selection from same question
    const buttons = document.querySelectorAll(`[data-qid="${qid}"] .option-btn`);
    buttons.forEach(btn => btn.classList.remove('selected'));
    
    // Add selection to clicked button
    event.currentTarget.classList.add('selected');
    
    // Store selection
    selectedAnswers[qid] = option;
    
    console.log(`✅ Selected ${option} for ${qid}`);
}

// Submit answer
async function submitAnswer(qid) {
    const selected = selectedAnswers[qid];
    
    if (!selected) {
        alert("Please select an answer first!");
        return;
    }
    
    const question = currentQuizData.find(q => (q.qid || q.id) === qid);
    if (!question) return;
    
    const submitBtn = event?.currentTarget;
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';
    }
    
    // Simulate API call (replace with actual)
    setTimeout(() => {
        const isCorrect = selected === question.correct;
        
        if (isCorrect) {
            showResultModal(true, 10, 1);
            
            // Update card UI
            const card = document.querySelector(`[data-qid="${qid}"]`);
            if (card) {
                card.querySelector('.options-grid').innerHTML = `
                    <div style="text-align: center; padding: 20px; background: #4CAF50; color: white; border-radius: 10px;">
                        <i class="fas fa-check-circle" style="font-size: 40px;"></i>
                        <p style="margin-top: 10px;">Correct! +10 Points</p>
                    </div>
                `;
                card.querySelector('.submit-btn')?.remove();
            }
            
            // Update user stats
            loadUserStats();
        } else {
            showResultModal(false, 0, 0);
            
            // Update card UI
            const card = document.querySelector(`[data-qid="${qid}"]`);
            if (card) {
                card.querySelector('.options-grid').innerHTML = `
                    <div style="text-align: center; padding: 20px; background: #f44336; color: white; border-radius: 10px;">
                        <i class="fas fa-times-circle" style="font-size: 40px;"></i>
                        <p style="margin-top: 10px;">Wrong answer! Try next question.</p>
                    </div>
                `;
                card.querySelector('.submit-btn')?.remove();
            }
        }
        
        if (submitBtn) {
            submitBtn.remove();
        }
    }, 1500);
}

// Show result modal
function showResultModal(isCorrect, points, stamps) {
    const modal = document.getElementById('resultModal');
    const backdrop = document.getElementById('overlayBackdrop');
    
    if (!modal) return;
    
    document.getElementById('resultTitle').textContent = isCorrect ? '🎉 Congratulations!' : '😔 Better Luck Next Time';
    document.getElementById('resultMessage').textContent = isCorrect 
        ? `You earned ${points} points and ${stamps} stamp!` 
        : 'Keep trying! You\'ll get it next time.';
    
    document.getElementById('earnedPoints').textContent = points;
    document.getElementById('earnedStamps').textContent = stamps;
    
    modal.classList.add('active');
    if (backdrop) backdrop.classList.add('active');
}

// Close result modal
function closeResultModal() {
    const modal = document.getElementById('resultModal');
    const backdrop = document.getElementById('overlayBackdrop');
    
    if (modal) modal.classList.remove('active');
    if (backdrop) backdrop.classList.remove('active');
}

// Close all modals
function closeAllModals() {
    closeResultModal();
}

// Expose functions globally
window.selectAnswer = selectAnswer;
window.submitAnswer = submitAnswer;
window.closeResultModal = closeResultModal;
window.closeAllModals = closeAllModals;
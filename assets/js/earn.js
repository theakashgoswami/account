// assets/js/earn.js

let currentQuizData = [];
let selectedAnswers = {};

document.addEventListener("DOMContentLoaded", async function() {
    console.log("🎯 Quiz page loaded");
    
    await loadHeader();
    await loadUserScore();
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
            
            if (window.currentUser?.user_id && typeof window.loadUserProfileIcon === 'function') {
                await window.loadUserProfileIcon(window.currentUser.user_id);
            }
        }
    } catch (error) {
        console.error("Header load failed:", error);
    }
}

// Load user score (sirf score)
async function loadUserScore() {
    try {
        const response = await fetch(`${CONFIG.WORKER_URL}/api/user/stats`, {
            credentials: 'include',
            headers: { 'X-Client-Host': window.location.host }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const scoreEl = document.getElementById('userScore');
            if (scoreEl) scoreEl.textContent = data.points; // points = score
        }
    } catch (error) {
        console.error("Score error:", error);
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
            <div class="quiz-card" data-qid="${qid}" data-correct="${q.correct}" data-week="${q.week || 'Week 1'}">
                <div class="question-header">
                    <span class="question-number">Question ${index + 1}/${questions.length}</span>
                    <span class="reward-badge">
                        <i class="fas fa-star"></i> 10 Score
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
                ` : ''}
            </div>
        `;
    }).join('');
}

// Select answer
function selectAnswer(qid, option) {
    const buttons = document.querySelectorAll(`[data-qid="${qid}"] .option-btn`);
    buttons.forEach(btn => btn.classList.remove('selected'));
    
    event.currentTarget.classList.add('selected');
    selectedAnswers[qid] = option;
}

// Submit answer
async function submitAnswer(qid) {
    const selected = selectedAnswers[qid];
    
    if (!selected) {
        alert("Please select an answer first!");
        return;
    }
    
    const card = document.querySelector(`[data-qid="${qid}"]`);
    if (!card) return;
    
    const correctOption = card.dataset.correct;
    const week = card.dataset.week || "Week 1";
    
    const submitBtn = event?.currentTarget;
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    }
    
    try {
        console.log("📤 Submitting answer:", { qid, selected, correctOption, week });
        
        const response = await fetch(`${CONFIG.WORKER_URL}/api/user/submit-quiz`, {
            method: 'POST',
            credentials: 'include',
            headers: { 
                'Content-Type': 'application/json',
                'X-Client-Host': window.location.host
            },
            body: JSON.stringify({
                qid: qid,
                selectedOption: selected,
                correctOption: correctOption,
                week: week
            })
        });
        
        console.log("📥 Response status:", response.status);
        
        // Check if response is OK
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server error (${response.status}): ${errorText}`);
        }
        
        const data = await response.json();
        console.log("📥 Response data:", data);
        
        if (data.success) {
            const earnedScore = data.score || 0;
            
            if (data.is_correct) {
                card.querySelector('.options-grid').innerHTML = `
                    <div class="correct-answer-box">
                        <i class="fas fa-check-circle"></i>
                        <p>Correct! You earned <strong>${earnedScore} Score</strong></p>
                    </div>
                `;
            } else {
                card.querySelector('.options-grid').innerHTML = `
                    <div class="wrong-answer-box">
                        <i class="fas fa-times-circle"></i>
                        <p>Wrong answer! +0 Score</p>
                        <small>Correct answer was ${correctOption}</small>
                    </div>
                `;
            }
            
            submitBtn?.remove();
            await loadUserScore();
            showResultModal(data.is_correct, earnedScore);
        }
        
    } catch (error) {
        console.error("❌ Submit error:", error);
        alert(`Failed to submit: ${error.message}`);
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Answer';
        }
    }
}
// Show result modal (sirf score)
function showResultModal(isCorrect, score) {
    const modal = document.getElementById('resultModal');
    const backdrop = document.getElementById('overlayBackdrop');
    
    if (!modal) return;
    
    document.getElementById('resultTitle').textContent = isCorrect ? '🎉 Correct!' : '😔 Wrong Answer';
    document.getElementById('resultMessage').textContent = isCorrect 
        ? `You earned ${score} Score!` 
        : 'Better luck next time!';
    
    document.getElementById('earnedScore').textContent = score;
    
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
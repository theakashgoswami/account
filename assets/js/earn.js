// assets/js/earn.js

let currentQuizData = [];
let selectedAnswers = {};
let currentWeek = "Week 1";

document.addEventListener("DOMContentLoaded", async function() {
    console.log("🎯 Quiz page loaded");
    
    await loadHeader();
    await loadUserScore();
    await loadQuiz();
    await checkIfAlreadySubmitted();
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

// Load user score
async function loadUserScore() {
    try {
        const response = await fetch(`${CONFIG.WORKER_URL}/api/user/stats`, {
            credentials: 'include',
            headers: { 'X-Client-Host': window.location.host }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const scoreEl = document.getElementById('userScore');
            if (scoreEl) scoreEl.textContent = data.points;
        }
    } catch (error) {
        console.error("Score error:", error);
    }
}

// Check if already submitted
async function checkIfAlreadySubmitted() {
    try {
        const response = await fetch(`${CONFIG.WORKER_URL}/api/user/check-quiz-submission?week=${currentWeek}`, {
            credentials: 'include',
            headers: { 'X-Client-Host': window.location.host }
        });
        
        const data = await response.json();
        
        if (data.success && data.submitted) {
            document.querySelectorAll('.option-radio').forEach(radio => {
                radio.disabled = true;
            });
            
            const submitBtn = document.getElementById('submitAllBtn');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '✅ Already Submitted';
            }
        }
    } catch (error) {
        console.error("Check submission error:", error);
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
            container.innerHTML = `<div class="empty-state">No questions available</div>`;
            return;
        }

        currentQuizData = data.earn;
        currentWeek = data.earn[0]?.week || "Week 1";
        displayQuiz(data.earn, container);

    } catch (err) {
        console.error("Quiz error:", err);
        container.innerHTML = `<div class="error-state">Failed to load quiz</div>`;
    }
}

// Display quiz
function displayQuiz(questions, container) {
    if (!container) return;
    
    const questionsHTML = questions.map((q, index) => {
        const qid = q.qid || q.id || `q${index}`;
        
        return `
            <div class="quiz-card" data-qid="${qid}" data-correct="${q.correct}">
                <div class="question-header">
                    <span class="question-number">Q${index + 1}/${questions.length}</span>
                    <span class="reward-badge"><i class="fas fa-star"></i> 10</span>
                </div>
                <h3>${q.question}</h3>
                <div class="options-grid">
                    ${['A', 'B', 'C', 'D'].map(opt => `
                        <label class="option-label">
                            <input type="radio" name="q_${qid}" value="${opt}" class="option-radio" onchange="selectAnswer('${qid}', '${opt}')">
                            <span class="option-text">${opt}. ${q[`option${opt}`]}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = `
        ${questionsHTML}
        <div class="submit-section">
            <button id="submitAllBtn" class="submit-all-btn" onclick="submitQuiz()">
                <i class="fas fa-paper-plane"></i> Submit Quiz
            </button>
            <div id="progressMessage" class="progress-message"></div>
        </div>
    `;
}

// Select answer
function selectAnswer(qid, option) {
    selectedAnswers[qid] = option;
}

// Submit quiz
async function submitQuiz() {
    const submitBtn = document.getElementById('submitAllBtn');
    const progressMsg = document.getElementById('progressMessage');
    
    const totalQuestions = currentQuizData.length;
    const answeredCount = Object.keys(selectedAnswers).length;
    
    if (answeredCount < totalQuestions) {
        alert(`Answer all ${totalQuestions} questions!`);
        return;
    }
    
    if (!confirm(`Submit quiz for ${currentWeek}?`)) return;
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    progressMsg.innerHTML = 'Calculating score...';
    
    try {
        // Calculate score
        let totalScore = 0;
        currentQuizData.forEach(q => {
            const qid = q.qid || q.id;
            if (selectedAnswers[qid] === q.correct) totalScore += 10;
        });
        
        console.log("📤 Submitting:", { week: currentWeek, score: totalScore });
        
        // ✅ USER ID AUTOMATICALLY WORKER SE LEGA
        const response = await fetch(`${CONFIG.WORKER_URL}/api/user/submit-quiz`, {
            method: 'POST',
            credentials: 'include',
            headers: { 
                'Content-Type': 'application/json',
                'X-Client-Host': window.location.host
            },
            body: JSON.stringify({
                week: currentWeek,
                score: totalScore
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            progressMsg.innerHTML = '✅ Submitted!';
            alert(`🎉 Score: ${totalScore}`);
            
            document.querySelectorAll('.option-radio').forEach(r => r.disabled = true);
            submitBtn.innerHTML = '✅ Submitted';
        } else {
            throw new Error(data.error);
        }
        
    } catch (error) {
        console.error("❌ Error:", error);
        alert('Failed: ' + error.message);
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Quiz';
        progressMsg.innerHTML = '';
    }
}

// Expose functions
window.selectAnswer = selectAnswer;
window.submitQuiz = submitQuiz;
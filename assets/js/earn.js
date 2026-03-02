// assets/js/earn.js

let currentQuizData = [];
let selectedAnswers = {};
let currentWeek = "Week 1";

document.addEventListener("DOMContentLoaded", async function() {
    console.log("🎯 Quiz page loaded");
    
    await loadHeader();
    await loadUserScore();
    await loadQuiz();
    await checkIfAlreadySubmitted(); // ✅ Sirf ek baar call
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

// 🔥 Check if already submitted this week (SIRF EK BAAR)
async function checkIfAlreadySubmitted() {
    try {
        const response = await fetch(`${CONFIG.WORKER_URL}/api/user/check-quiz-submission?week=${currentWeek}`, {
            credentials: 'include',
            headers: { 'X-Client-Host': window.location.host }
        });
        
        const data = await response.json();
        
        if (data.success && data.submitted) {
            // Disable all inputs
            document.querySelectorAll('.option-radio').forEach(radio => {
                radio.disabled = true;
            });
            
            const submitBtn = document.getElementById('submitAllBtn');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '✅ Already Submitted';
            }
            
            // Show message with score
            const messageDiv = document.createElement('div');
            messageDiv.className = 'info-message';
            messageDiv.innerHTML = `
                <i class="fas fa-info-circle"></i>
                You have already submitted for ${currentWeek}. Your score: ${data.score}
            `;
            document.querySelector('.quiz-container')?.prepend(messageDiv);
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
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-hourglass"></i>
                    <p>No questions available right now. Check back later!</p>
                </div>
            `;
            return;
        }

        currentQuizData = data.earn;
        currentWeek = data.earn[0]?.week || "Week 1";
        displayQuiz(data.earn, container);

    } catch (err) {
        console.error("Quiz error:", err);
        container.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Failed to load quiz. Please try again.</p>
            </div>
        `;
    }
}

// Display quiz questions
function displayQuiz(questions, container) {
    if (!container) return;
    
    const questionsHTML = questions.map((q, index) => {
        const qid = q.qid || q.id || `q${index}`;
        
        return `
            <div class="quiz-card" data-qid="${qid}" data-correct="${q.correct}">
                <div class="question-header">
                    <span class="question-number">Question ${index + 1}/${questions.length}</span>
                    <span class="reward-badge">
                        <i class="fas fa-star"></i> 10 Score
                    </span>
                </div>
                
                <h3>${q.question || 'Question'}</h3>
                
                <div class="options-grid">
                    <label class="option-label">
                        <input type="radio" name="q_${qid}" value="A" class="option-radio" onchange="selectAnswer('${qid}', 'A')">
                        <span class="option-text">A. ${q.optionA || 'Option A'}</span>
                    </label>
                    
                    <label class="option-label">
                        <input type="radio" name="q_${qid}" value="B" class="option-radio" onchange="selectAnswer('${qid}', 'B')">
                        <span class="option-text">B. ${q.optionB || 'Option B'}</span>
                    </label>
                    
                    <label class="option-label">
                        <input type="radio" name="q_${qid}" value="C" class="option-radio" onchange="selectAnswer('${qid}', 'C')">
                        <span class="option-text">C. ${q.optionC || 'Option C'}</span>
                    </label>
                    
                    <label class="option-label">
                        <input type="radio" name="q_${qid}" value="D" class="option-radio" onchange="selectAnswer('${qid}', 'D')">
                        <span class="option-text">D. ${q.optionD || 'Option D'}</span>
                    </label>
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
    console.log(`✅ Selected ${option} for ${qid}`);
}

// 🔥 Submit quiz - FIXED VERSION
async function submitQuiz() {
    const submitBtn = document.getElementById('submitAllBtn');
    const progressMsg = document.getElementById('progressMessage');
    
    const totalQuestions = currentQuizData.length;
    const answeredCount = Object.keys(selectedAnswers).length;
    
    if (answeredCount < totalQuestions) {
        alert(`Please answer all ${totalQuestions} questions!`);
        return;
    }
    
    if (!confirm(`Submit your quiz for ${currentWeek}?`)) {
        return;
    }
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    progressMsg.innerHTML = 'Calculating your score...';
    
    try {
        // Calculate total score
        let totalScore = 0;
        
        currentQuizData.forEach(q => {
            const qid = q.qid || q.id;
            const selected = selectedAnswers[qid];
            const correct = q.correct;
            
            if (selected === correct) {
                totalScore += 10;
            }
        });
        
        console.log("📤 Submitting:", { week: currentWeek, score: totalScore });
        
        // Submit to worker
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
            progressMsg.innerHTML = '✅ Submitted successfully!';
            alert(`🎉 Quiz submitted! Your score: ${totalScore}`);
            
            // Disable all inputs
            document.querySelectorAll('.option-radio').forEach(radio => {
                radio.disabled = true;
            });
            
            submitBtn.innerHTML = '✅ Submitted';
        } else {
            throw new Error(data.error || 'Submission failed');
        }
        
    } catch (error) {
        console.error("❌ Submit error:", error);
        alert('Failed: ' + error.message);
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Quiz';
        progressMsg.innerHTML = '';
    }
}

// Expose functions globally
window.selectAnswer = selectAnswer;
window.submitQuiz = submitQuiz;
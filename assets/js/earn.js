// assets/js/earn.js

let quizData = [];
let selected = {};
let currentWeek = "2026-W06"; // Default week
let submitted = false;
let userSelections = {};

/* ===========================================
   INIT
=========================================== */
document.addEventListener("DOMContentLoaded", async () => {
    await loadHeaderPartial();
    await loadUserScore();
    await loadQuiz();
});

/* ===========================================
   LOAD HEADER
=========================================== */
async function loadHeaderPartial() {
    const res = await fetch("/partials/header.html");
    document.getElementById("header-container").innerHTML = await res.text();
    if (typeof window.initHeader === 'function') window.initHeader();
}

/* ===========================================
   LOAD USER SCORE
=========================================== */
async function loadUserScore() {
    try {
        const res = await fetch(`${CONFIG.WORKER_URL}/api/user/stats`, {
            credentials: "include",
            headers: { "X-Client-Host": window.location.host }
        });
        const data = await res.json();
        if (data.success) {
            document.getElementById("userScore").textContent = data.points;
        }
    } catch (error) {
        console.error("Score error:", error);
    }
}

/* ===========================================
   LOAD QUIZ
=========================================== */
async function loadQuiz() {
    const container = document.getElementById("quizContainer");
    if (!container) return;

    try {
        // Fetch quiz questions
        const res = await fetch(`${CONFIG.WORKER_URL}/api/user/earn`, {
            credentials: "include",
            headers: { "X-Client-Host": window.location.host }
        });

        const data = await res.json();
        
        if (!data.success || !data.earn || !data.earn.length) {
            container.innerHTML = "<p>No questions available</p>";
            return;
        }

        quizData = data.earn;
        currentWeek = quizData[0]?.week || "2026-W06";
        document.getElementById("quizWeek").textContent = currentWeek;

        // Check if user already submitted
        await checkSubmissionAndRender();

    } catch (error) {
        console.error("Quiz load error:", error);
        container.innerHTML = "<p>Error loading quiz</p>";
    }
}

/* ===========================================
   CHECK SUBMISSION AND RENDER
=========================================== */
async function checkSubmissionAndRender() {
    const container = document.getElementById("quizContainer");
    
    try {
        const checkRes = await fetch(
            `${CONFIG.WORKER_URL}/api/user/check-quiz-submission?week=${currentWeek}`,
            {
                credentials: "include",
                headers: { "X-Client-Host": window.location.host }
            }
        );

        const checkData = await checkRes.json();

        if (checkData.success && checkData.submitted) {
            submitted = true;
            
            // If selections are available, parse them
            if (checkData.selections) {
                try {
                    userSelections = JSON.parse(checkData.selections);
                } catch (e) {
                    console.error("Error parsing selections:", e);
                }
            }
            
            // Show already submitted message
            container.innerHTML = `
                <div class="already-submitted-card">
                    <div class="submitted-icon">✅</div>
                    <h2>You have already participated!</h2>
                    <p class="submitted-week">Week: ${currentWeek}</p>
                    <p class="submitted-score">Your Score: ${checkData.score} / 40</p>
                    <p class="submitted-message">
                        🎉 Congratulations on completing the quiz!<br>
                        Stay tuned for the results announcement this Sunday on 
                        <a href="https://instagram.com/agtechscript" target="_blank">Instagram</a>.
                    </p>
                    <div class="submitted-footer">
                        <button class="btn-view-answers" onclick="viewMyAnswers()">
                            👁️ View My Answers
                        </button>
                        <button class="btn-leaderboard" onclick="openLeaderboard()">
                            🏆 View Leaderboard
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        // Not submitted - render quiz
        renderQuiz();
        
        // Update progress bar
        updateProgress();

    } catch (error) {
        console.error("Check submission error:", error);
        renderQuiz();
    }
}

/* ===========================================
   VIEW MY ANSWERS
=========================================== */
function viewMyAnswers() {
    const container = document.getElementById("quizContainer");
    
    if (!quizData.length || Object.keys(userSelections).length === 0) {
        alert("No answers found");
        return;
    }
    
    // Render quiz with selections but disabled
    container.innerHTML = quizData.map((q, index) => {
        const qid = q.qid;
        const selectedOpt = userSelections[qid];
        
        return `
        <div class="quiz-card view-mode" data-id="${qid}">
            <div class="question-number">Question ${index + 1}/4</div>
            <h3>${q.question}</h3>
            ${["A","B","C","D"].map(opt => {
                const isSelected = selectedOpt === opt;
                const isCorrect = q.correct === opt;
                return `
                <div class="option ${isSelected ? 'selected' : ''} ${isCorrect ? 'correct-answer' : ''}" 
                     style="${isSelected && !isCorrect ? 'background: #ff6b6b; color: white;' : ''}">
                    ${opt}. ${q["option"+opt]}
                    ${isSelected && isCorrect ? ' ✓' : ''}
                    ${isSelected && !isCorrect ? ' ✗' : ''}
                </div>
            `}).join("")}
            <div class="answer-feedback">
                ${selectedOpt === q.correct 
                    ? '<span class="correct-badge">✓ Correct Answer</span>' 
                    : `<span class="wrong-badge">✗ Your answer: ${selectedOpt} | Correct: ${q.correct}</span>`}
            </div>
        </div>
        `;
    }).join("") + `
        <div class="back-to-submitted">
            <button class="btn-back" onclick="checkSubmissionAndRender()">← Back</button>
        </div>
    `;
}

/* ===========================================
   RENDER QUIZ
=========================================== */
function renderQuiz() {
    const container = document.getElementById("quizContainer");

    container.innerHTML = quizData.map((q, index) => {
        const qid = q.qid;

        return `
        <div class="quiz-card" data-id="${qid}">
            <div class="question-number">Question ${index + 1}/4</div>
            <h3>${q.question}</h3>
            ${["A","B","C","D"].map(opt => `
                <div class="option ${selected[qid] === opt ? 'selected' : ''}" 
                     onclick="selectAnswer('${qid}','${opt}',this)">
                    ${opt}. ${q["option"+opt]}
                </div>
            `).join("")}
        </div>
        `;
    }).join("") + `
        <button class="submit-btn" onclick="submitQuiz()">📤 Submit Quiz</button>
    `;
}

/* ===========================================
   SELECT ANSWER
=========================================== */
function selectAnswer(qid, opt, el) {
    if (submitted) return;

    selected[qid] = opt;

    const card = el.closest(".quiz-card");
    card.querySelectorAll(".option").forEach(o => o.classList.remove("selected"));
    el.classList.add("selected");

    updateProgress();
}
window.selectAnswer = selectAnswer;

/* ===========================================
   PROGRESS BAR
=========================================== */
function updateProgress() {
    const total = quizData.length;
    const done = Object.keys(selected).length;
    const percent = (done / total) * 100;
    const progressBar = document.getElementById("progressBar");
    if (progressBar) progressBar.style.width = percent + "%";
}

/* ===========================================
   SUBMIT QUIZ
=========================================== */
async function submitQuiz() {
    if (submitted) return;

    if (Object.keys(selected).length !== quizData.length) {
        alert("Please answer all questions first!");
        return;
    }

    // Disable submit button
    const submitBtn = document.querySelector('.submit-btn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Submitting...';
    }

    // Calculate score and prepare selections
    let score = 0;
    const selections = {};
    
    quizData.forEach(q => {
        const qid = q.qid;
        selections[qid] = selected[qid];
        if (selected[qid] === q.correct) score += 10;
    });

    try {
        const res = await fetch(`${CONFIG.WORKER_URL}/api/user/submit-quiz`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                "X-Client-Host": window.location.host
            },
            body: JSON.stringify({
                week: currentWeek,
                score: score,
                selections: JSON.stringify(selections) // Save selections
            })
        });

        const data = await res.json();

        if (!data.success) {
            alert(data.error || "Submission failed");
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = '📤 Submit Quiz';
            }
            return;
        }

        // Submission successful
        submitted = true;
        userSelections = selections;
        showResult(score);

    } catch (error) {
        console.error("Submit error:", error);
        alert("Network error. Please try again.");
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '📤 Submit Quiz';
        }
    }
}
window.submitQuiz = submitQuiz;

/* ===========================================
   RESULT MODAL
=========================================== */
function showResult(score) {
    let message = "";
    if (score === 40) message = "🔥 Perfect Score!";
    else if (score >= 30) message = "👏 Great Job!";
    else if (score >= 20) message = "👍 Good Attempt!";
    else message = "Keep Practicing!";

    document.getElementById("resultTitle").textContent = message;
    document.getElementById("resultText").innerHTML = `
        You scored <strong>${score} points</strong> in ${currentWeek}<br><br>
        <small>Results will be announced this Sunday on Instagram!</small>
    `;

    document.getElementById("resultModal").style.display = "flex";
}

function closeResult() {
    document.getElementById("resultModal").style.display = "none";
    checkSubmissionAndRender(); // Reload to show submitted view
}
window.closeResult = closeResult;

/* ===========================================
   LEADERBOARD FUNCTIONS
=========================================== */
async function openLeaderboard() {
    const modal = document.getElementById("leaderboardModal");
    const list = document.getElementById("leaderboardList");
    if (!modal || !list) return;

    modal.style.display = "flex";
    list.innerHTML = "<div class='loading'>Loading leaderboard...</div>";

    try {
        const res = await fetch(
            `${CONFIG.WORKER_URL}/api/user/leaderboard?week=${currentWeek}`,
            {
                credentials: "include",
                headers: { 'X-Client-Host': window.location.host }
            }
        );

        const data = await res.json();

        if (!data.success || !data.leaderboard || !data.leaderboard.length) {
            list.innerHTML = "<div class='empty'>No leaderboard data yet</div>";
            return;
        }

        list.innerHTML = data.leaderboard
            .slice(0, 10)
            .map((u, index) => {
                let badge = "";
                if (index === 0) badge = "🥇";
                else if (index === 1) badge = "🥈";
                else if (index === 2) badge = "🥉";
                else badge = `${index + 1}`;

                return `
                    <div class="leaderboard-row ${index < 3 ? 'top-rank' : ''}">
                        <span class="rank">${badge}</span>
                        <span class="user">${u.user_id}</span>
                        <span class="score">${u.total_score} pts</span>
                    </div>
                `;
            })
            .join("");
    } catch (err) {
        console.error("Leaderboard error:", err);
        list.innerHTML = "<div class='error'>Failed to load leaderboard</div>";
    }
}

function closeLeaderboard() {
    document.getElementById("leaderboardModal").style.display = "none";
}

// Make functions global
window.openLeaderboard = openLeaderboard;
window.closeLeaderboard = closeLeaderboard;
window.viewMyAnswers = viewMyAnswers;
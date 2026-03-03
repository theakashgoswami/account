// assets/js/earn.js

let quizData = [];
let selected = {};
let currentWeek = null;
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
    if (window.initHeader) window.initHeader();
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
    } catch (err) {
        console.error("Score load error:", err);
    }
}

/* ===========================================
   LOAD QUIZ
=========================================== */
async function loadQuiz() {

    const container = document.getElementById("quizContainer");

    try {

        const weekParam = getWeekFromURL();
        currentWeek = weekParam;

        const res = await fetch(
            `${CONFIG.WORKER_URL}/api/user/earn?week=${currentWeek}`,
            {
                credentials: "include",
                headers: { "X-Client-Host": window.location.host }
            }
        );

        const data = await res.json();

        if (!data.success || !data.earn?.length) {
            container.innerHTML = "<p>No questions available</p>";
            return;
        }

        quizData = data.earn;
        document.getElementById("quizWeek").textContent = currentWeek;

        await checkSubmissionAndRender();

    } catch (err) {
        console.error("Quiz load error:", err);
        container.innerHTML = "<p>Error loading quiz</p>";
    }
}

/* ===========================================
   GET WEEK FROM URL OR DEFAULT
=========================================== */
function getWeekFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get("week") || getCurrentISOWeek();
}

/* ===========================================
   AUTO ISO WEEK
=========================================== */
function getCurrentISOWeek() {
    const now = new Date();
    const year = now.getFullYear();
    const oneJan = new Date(now.getFullYear(), 0, 1);
    const week = Math.ceil((((now - oneJan) / 86400000) + oneJan.getDay() + 1) / 7);
    return `${year}-W${String(week).padStart(2, "0")}`;
}

/* ===========================================
   CHECK SUBMISSION
=========================================== */
async function checkSubmissionAndRender() {

    const container = document.getElementById("quizContainer");

    const res = await fetch(
        `${CONFIG.WORKER_URL}/api/user/check-quiz-submission?week=${currentWeek}`,
        {
            credentials: "include",
            headers: { "X-Client-Host": window.location.host }
        }
    );

    const data = await res.json();

    if (data.success && data.submitted) {

        submitted = true;

        if (data.selections) {
            userSelections = JSON.parse(data.selections);
        }

        container.innerHTML = `
            <div class="already-submitted-card">
                <h2>✅ You have already participated!</h2>
                <p>Week: ${currentWeek}</p>
                <p>Your Score: ${data.score} / 40</p>
                <button onclick="viewMyAnswers()">👁️ View My Answers</button>
                <button onclick="openLeaderboard()">🏆 Leaderboard</button>
            </div>
        `;

        return;
    }

    renderQuiz();
}

/* ===========================================
   RENDER QUIZ
=========================================== */
function renderQuiz() {

    const container = document.getElementById("quizContainer");

    container.innerHTML = quizData.map((q, index) => {

        return `
        <div class="quiz-card" data-id="${q.qid}">
            <div class="question-number">Question ${index + 1}/4</div>
            <h3>${q.question}</h3>

            <a href="${q.url}" target="_blank" class="prepare-link">
                📘 Prepare for this question
            </a>

            ${["A","B","C","D"].map(opt => `
                <div class="option ${selected[q.qid] === opt ? 'selected' : ''}"
                     onclick="selectAnswer('${q.qid}','${opt}',this)">
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
}

window.selectAnswer = selectAnswer;

/* ===========================================
   SUBMIT QUIZ
=========================================== */
async function submitQuiz() {

    if (submitted) return;

    if (Object.keys(selected).length !== quizData.length) {
        alert("Answer all questions first!");
        return;
    }

    const btn = document.querySelector(".submit-btn");
    btn.disabled = true;
    btn.textContent = "Submitting...";

    try {

        const res = await fetch(
            `${CONFIG.WORKER_URL}/api/user/submit-quiz`,
            {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    "X-Client-Host": window.location.host
                },
                body: JSON.stringify({
                    week: currentWeek,
                    selections: selected
                })
            }
        );

        const data = await res.json();

        if (!data.success) {
            alert(data.error);
            btn.disabled = false;
            btn.textContent = "Submit Quiz";
            return;
        }

        submitted = true;
        userSelections = selected;

        showResult(data.score);

    } catch (err) {
        console.error("Submit error:", err);
    }
}

window.submitQuiz = submitQuiz;

/* ===========================================
   RESULT MODAL
=========================================== */
function showResult(score) {

    document.getElementById("resultTitle").textContent = "Quiz Completed!";
    document.getElementById("resultText").innerHTML =
        `You scored <strong>${score}</strong> points in ${currentWeek}`;

    document.getElementById("resultModal").style.display = "flex";
}

function closeResult() {
    document.getElementById("resultModal").style.display = "none";
    location.reload();
}

window.closeResult = closeResult;

/* ===========================================
   VIEW ANSWERS
=========================================== */
/* ===========================================
   VIEW ANSWERS - FIXED VERSION
=========================================== */
function viewMyAnswers() {
    const container = document.getElementById("quizContainer");

    // Check if quiz data exists
    if (!quizData || quizData.length === 0) {
        alert("Quiz data not found. Please refresh the page.");
        return;
    }

    // Check if we have selections
    console.log("📋 userSelections:", userSelections);
    console.log("📋 quizData:", quizData);

    // If userSelections is empty, try to get from localStorage or show error
    if (!userSelections || Object.keys(userSelections).length === 0) {
        container.innerHTML = `
            <div class="error-card">
                <h3>❌ No answers found</h3>
                <p>You haven't submitted any answers yet.</p>
                <button class="btn-back" onclick="checkSubmissionAndRender()">← Back</button>
            </div>
        `;
        return;
    }

    // Render answers
    container.innerHTML = quizData.map((q, index) => {
        const qid = q.qid;
        const selectedOpt = userSelections[qid];
        const correctOpt = q.correct;

        // If no selection for this question, skip
        if (!selectedOpt) {
            return `
            <div class="quiz-card view-mode" data-id="${qid}">
                <div class="question-number">Question ${index + 1}/4</div>
                <h3>${q.question}</h3>
                <div class="option no-answer">No answer selected</div>
            </div>
            `;
        }

        const isCorrect = selectedOpt === correctOpt;

        return `
        <div class="quiz-card view-mode" data-id="${qid}">
            <div class="question-number">Question ${index + 1}/4</div>
            <h3>${q.question}</h3>

            ${["A","B","C","D"].map(opt => {
                let className = "option";
                let indicator = "";

                // Mark correct answer
                if (opt === correctOpt) {
                    className += " correct-answer";
                }

                // Mark user's selected answer
                if (opt === selectedOpt) {
                    className += " selected";
                    
                    // Add indicator based on correctness
                    if (opt === correctOpt) {
                        indicator = " ✓";
                    } else {
                        indicator = " ✗";
                        className += " wrong-answer";
                    }
                }

                return `
                    <div class="${className}">
                        ${opt}. ${q["option"+opt] || `Option ${opt}`} ${indicator}
                    </div>
                `;
            }).join("")}

            <div class="answer-feedback" style="margin-top: 15px; padding: 10px; border-radius: 8px; ${isCorrect ? 'background: #d4edda; color: #155724;' : 'background: #f8d7da; color: #721c24;'}">
                ${isCorrect 
                    ? '✅ Correct! You chose the right answer.' 
                    : `❌ Your answer: ${selectedOpt} | Correct answer: ${correctOpt}`}
            </div>
        </div>
        `;
    }).join("") + `
        <div class="back-to-submitted" style="text-align: center; margin: 20px 0;">
            <button class="btn-back" onclick="checkSubmissionAndRender()" style="padding: 10px 30px; background: #667eea; color: white; border: none; border-radius: 50px; cursor: pointer;">
                ← Back to Message
            </button>
        </div>
    `;
}

window.viewMyAnswers = viewMyAnswers;
let quizData = [];
let selected = {};
let currentWeek = "Week 1";
let submitted = false;

/* ===========================================
   INIT
=========================================== */
document.addEventListener("DOMContentLoaded", async () => {

    await loadHeaderPartial();
    await loadUserScore();
    await loadQuiz();
    await checkSubmission();
});


/* ===========================================
   LOAD HEADER
=========================================== */
async function loadHeaderPartial() {
    const res = await fetch("/partials/header.html");
    document.getElementById("header-container").innerHTML = await res.text();
}


/* ===========================================
   LOAD USER SCORE
=========================================== */
async function loadUserScore() {
    const res = await fetch(`${CONFIG.WORKER_URL}/api/user/stats`, {
        credentials: "include",
        headers: { "X-Client-Host": window.location.host }
    });

    const data = await res.json();
    if (data.success) {
        document.getElementById("userScore").textContent = data.points;
    }
}


/* ===========================================
   LOAD QUIZ
=========================================== */
async function loadQuiz() {

    const container = document.getElementById("quizContainer");

    const res = await fetch(`${CONFIG.WORKER_URL}/api/user/earn`, {
        credentials: "include",
        headers: { "X-Client-Host": window.location.host }
    });

    const data = await res.json();

    if (!data.success || !data.earn.length) {
        container.innerHTML = "<p>No questions available</p>";
        return;
    }

    quizData = data.earn;
    currentWeek = quizData[0].week || "Week 1";

    document.getElementById("quizWeek").textContent = currentWeek;

    renderQuiz();
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
                <div class="option" onclick="selectAnswer('${qid}','${opt}',this)">
                    ${opt}. ${q["option"+opt]}
                </div>
            `).join("")}
        </div>
        `;
    }).join("") + `
        <button class="submit-btn" onclick="submitQuiz()">Submit Quiz</button>
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
    document.getElementById("progressBar").style.width = percent + "%";
}


/* ===========================================
   CHECK SUBMISSION
=========================================== */
async function checkSubmission() {

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
        document.getElementById("quizContainer").innerHTML =
            `<div class="already-submitted">
                You already submitted this week's quiz.
                <br>Score: ${data.score}
            </div>`;
    }
}


/* ===========================================
   SUBMIT QUIZ
=========================================== */
async function submitQuiz() {

    if (submitted) return;

    if (Object.keys(selected).length !== quizData.length) {
        alert("Answer all questions first!");
        return;
    }

    submitted = true;

    let score = 0;

    quizData.forEach(q => {
        if (selected[q.qid] === q.correct) score += 10;
    });

    const res = await fetch(`${CONFIG.WORKER_URL}/api/user/submit-quiz`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            "X-Client-Host": window.location.host
        },
        body: JSON.stringify({
            week: currentWeek,
            score: score
        })
    });

    const data = await res.json();

    if (!data.success) {
        alert(data.error);
        submitted = false;
        return;
    }

    showResult(score);
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
    document.getElementById("resultText").textContent =
        `You scored ${score} points in ${currentWeek}`;

    document.getElementById("resultModal").style.display = "flex";
}

function closeResult() {
    document.getElementById("resultModal").style.display = "none";
    location.reload();
}

window.closeResult = closeResult;
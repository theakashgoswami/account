let quizData = [];
let selected = {};
let submitted = false;
let submitting = false;
let userSelections = {};

/* ===========================================
INIT
=========================================== */

document.addEventListener("DOMContentLoaded", async () => {
    showLoading();
    Promise.all([
loadHeader(),
loadQuiz()
])
    
    // No need to call hideLoading() as render functions replace content
});

/* ===========================================
LOADING STATES
=========================================== */

function showLoading() {
    const container = document.getElementById("quizContainer");
    if (container) {
        container.innerHTML = `
            <div class="loading-container">
                <div class="spinner"></div>
                <p>Loading today's quiz...</p>
            </div>
        `;
    }
}

/* ===========================================
LOAD QUIZ
=========================================== */

async function loadQuiz() {
    const container = document.getElementById("quizContainer");
    try {
        const res = await fetch(
            `${CONFIG.WORKER_URL}/api/user/earn`,
            {
                credentials: "include",
                headers: { "X-Client-Host": window.location.host }
            }
        );

        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();

        if (!data.success) {
            container.innerHTML = `<p class="error-message">Error loading quiz: ${data.error || 'Unknown error'}</p>`;
            return;
        }
        quizData = Array.isArray(data.earn) ? data.earn : [];
        /* ===============================
           ALREADY SUBMITTED
        =============================== */

        if (data.submitted) {
            submitted = true;
            const userScore = data.score || 0;
            
            if (data.selections) {
                if (typeof data.selections === "string") {
                    try {
                        userSelections = JSON.parse(data.selections);
                    } catch {
                        userSelections = {};
                    }
                } else {
                    userSelections = data.selections;
                }
            }

            if (data.earn) {
                quizData = Array.isArray(data.earn) ? data.earn : [];
            }

            container.innerHTML = `
                <div class="already-submitted-card">
                    <div class="submitted-icon">✅</div>
                    <h2>You have already participated today!</h2>
                    <p class="submitted-score">
                        Your Score: ${userScore} / ${quizData.length * 10}
                    </p>
                    <div class="submitted-footer">
                        <button class="btn-view-answers" onclick="viewMyAnswers()">👁️ View My Answers</button>
                        <button class="btn-leaderboard" onclick="openLeaderboard()">🏆 Leaderboard</button>
                    </div>
                </div>
            `;
            return;
        }

        quizData = Array.isArray(data.earn) ? data.earn : [];
        renderQuiz();

    } catch (err) {
        console.error("Quiz load error:", err);
        container.innerHTML = `<p class="error-message">Error loading quiz: ${err.message}</p>`;
    }
}

function renderQuiz() {
    const container = document.getElementById("quizContainer");

    if (!quizData || quizData.length === 0) {
        container.innerHTML = '<p class="error-message">No quiz data available</p>';
        return;
    }

    selected = {};

    requestAnimationFrame(() => {
        container.innerHTML = `
            ${quizData.map((q, index) => {

                const optA = q.option_a || 'Option A';
                const optB = q.option_b || 'Option B';
                const optC = q.option_c || 'Option C';
                const optD = q.option_d || 'Option D';

                return `
                    <div class="quiz-card" data-id="${q.qid}">

                        <div class="prepare-wrapper">
                            <a href="${q.prepare_link || '#'}" target="_blank" class="prepare-link">
                                📘 Prepare this question
                            </a>
                        </div>

                        <div class="question-number">
                            Question ${index + 1}/${quizData.length}
                        </div>

                        <h3>${q.question}</h3>

                        <div class="option ${selected[q.qid] === 'A' ? 'selected' : ''}"
                             onclick="selectAnswer('${q.qid}', 'A', this)">
                            A. ${optA}
                        </div>

                        <div class="option ${selected[q.qid] === 'B' ? 'selected' : ''}"
                             onclick="selectAnswer('${q.qid}', 'B', this)">
                            B. ${optB}
                        </div>

                        <div class="option ${selected[q.qid] === 'C' ? 'selected' : ''}"
                             onclick="selectAnswer('${q.qid}', 'C', this)">
                            C. ${optC}
                        </div>

                        <div class="option ${selected[q.qid] === 'D' ? 'selected' : ''}"
                             onclick="selectAnswer('${q.qid}', 'D', this)">
                            D. ${optD}
                        </div>

                    </div>
                `;
            }).join("")}

            <button id="submitQuizBtn" class="submit-btn" onclick="submitQuiz()">
                📤 Submit Quiz
            </button>
        `;
    });
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
    el.scrollIntoView({block:"nearest"});
    // Optional: Add haptic feedback for mobile
    if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(10);
    }
}

window.selectAnswer = selectAnswer;

/* ===========================================
SUBMIT QUIZ
=========================================== */

async function submitQuiz() {
    if (submitting) return;
    
    if (Object.keys(selected).length !== quizData.length) {
        alert(`Please answer all ${quizData.length} questions`);
        return;
    }

    submitting = true;
   const btn = document.getElementById("submitQuizBtn")
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-small"></span> Submitting...';

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
                body: JSON.stringify({ selections: selected })
            }
        );

        const data = await res.json();

        if (!data.success) {
            throw new Error(data.error || 'Submission failed');
        }

        submitted = true;
        userSelections = { ...selected };
        showResult(data.score);

    } catch (err) {
        console.error("Submit error:", err);
        alert(`Error: ${err.message}`);
        btn.disabled = false;
        btn.innerHTML = "📤 Submit Quiz";
    } finally {
        submitting = false;
    }
}

window.submitQuiz = submitQuiz;

/* ===========================================
RESULT MODAL
=========================================== */

function showResult(score) {
    const maxScore = quizData.length * 10;
    let message = "";
    let emoji = "";

    if (score === maxScore) {
        message = "Perfect Score!";
        emoji = "🔥";
    } else if (score >= maxScore * 0.75) {
        message = "Great Job!";
        emoji = "👏";
    } else if (score >= maxScore * 0.5) {
        message = "Good Attempt!";
        emoji = "👍";
    } else {
        message = "Keep Practicing!";
        emoji = "💪";
    }

    document.getElementById("resultTitle").innerHTML = `${emoji} ${message}`;
    document.getElementById("resultText").innerHTML = `
        You scored <strong>${score}</strong> out of ${maxScore} points
        <br><br>
        <small>Check the leaderboard to see your ranking.</small>
    `;

    document.getElementById("resultModal").style.display = "flex";
    
    // Auto-close after 5 seconds - but don't reload
    setTimeout(() => {
        if (document.getElementById("resultModal").style.display === "flex") {
            closeResult(false); // Pass false to prevent reload
        }
    }, 5000);
}

function closeResult(reload = true) {
    document.getElementById("resultModal").style.display = "none";
    if (reload) {
        location.reload();
    }
}

window.closeResult = closeResult;

/* ===========================================
VIEW ANSWERS
=========================================== */

function viewMyAnswers() {
    const container = document.getElementById("quizContainer");

    if (!quizData || !quizData.length) {
        alert("Quiz data missing");
        return;
    }

    container.innerHTML = '<div class="loading-container"><div class="spinner"></div><p>Loading answers...</p></div>';

    setTimeout(() => {
        const fragment = document.createDocumentFragment();

        quizData.forEach((q, index) => {
            const qid = q.qid;
const selectedOpt = userSelections[String(qid)] || '';
const correctOpt = (q.correct_option || 'A').toUpperCase();

            const card = document.createElement("div");
            card.className = "quiz-card view-mode";

            // Ensure option properties exist
            const optA = q.option_a || 'Option A';
            const optB = q.option_b || 'Option B';
            const optC = q.option_c || 'Option C';
            const optD = q.option_d || 'Option D';

            let optionsHTML = "";
            
            // Option A
            let classA = "option";
            let indicatorA = "";
            if ('A' === correctOpt) classA += " correct-answer";
            if ('A' === selectedOpt) {
                classA += " selected";
                if ('A' === correctOpt) {
                    indicatorA = " ✓";
                    classA += " correct-selected";
                } else {
                    indicatorA = " ✗";
                    classA += " wrong-answer";
                }
            }
            optionsHTML += `<div class="${classA}">A. ${optA} ${indicatorA}</div>`;
            
            // Option B
            let classB = "option";
            let indicatorB = "";
            if ('B' === correctOpt) classB += " correct-answer";
            if ('B' === selectedOpt) {
                classB += " selected";
                if ('B' === correctOpt) {
                    indicatorB = " ✓";
                    classB += " correct-selected";
                } else {
                    indicatorB = " ✗";
                    classB += " wrong-answer";
                }
            }
            optionsHTML += `<div class="${classB}">B. ${optB} ${indicatorB}</div>`;
            
            // Option C
            let classC = "option";
            let indicatorC = "";
            if ('C' === correctOpt) classC += " correct-answer";
            if ('C' === selectedOpt) {
                classC += " selected";
                if ('C' === correctOpt) {
                    indicatorC = " ✓";
                    classC += " correct-selected";
                } else {
                    indicatorC = " ✗";
                    classC += " wrong-answer";
                }
            }
            optionsHTML += `<div class="${classC}">C. ${optC} ${indicatorC}</div>`;
            
            // Option D
            let classD = "option";
            let indicatorD = "";
            if ('D' === correctOpt) classD += " correct-answer";
            if ('D' === selectedOpt) {
                classD += " selected";
                if ('D' === correctOpt) {
                    indicatorD = " ✓";
                    classD += " correct-selected";
                } else {
                    indicatorD = " ✗";
                    classD += " wrong-answer";
                }
            }
            optionsHTML += `<div class="${classD}">D. ${optD} ${indicatorD}</div>`;

            const isCorrect = selectedOpt === correctOpt;

            card.innerHTML = `
                <div class="question-number">Question ${index + 1}/${quizData.length}</div>
                <h3>${q.question}</h3>
                ${optionsHTML}
                <div class="answer-feedback" style="margin-top:15px;padding:12px;border-radius:8px; 
                    ${isCorrect 
                        ? "background:#d4edda;color:#155724;border-left:4px solid #28a745;" 
                        : "background:#f8d7da;color:#721c24;border-left:4px solid #dc3545;"}">
                    ${isCorrect 
                        ? "✅ Correct answer! Well done." 
                        : `❌ Your answer: ${selectedOpt || 'Not answered'} | Correct answer: ${correctOpt}`}
                </div>
            `;

            fragment.appendChild(card);
        });

        // Add back button
        const backBtn = document.createElement("button");
        backBtn.className = "back-to-quiz-btn";
        backBtn.innerHTML = "← Back to Quiz";
        backBtn.onclick = () => location.reload();
        fragment.appendChild(backBtn);

        container.innerHTML = "";
        container.appendChild(fragment);
    }, 300);
}

/* ===========================================
LEADERBOARD
=========================================== */

async function openLeaderboard() {
    const modal = document.getElementById("leaderboardModal");
    const list = document.getElementById("leaderboardList");

    if (!modal || !list) return;

    modal.style.display = "flex";
    list.innerHTML = '<div class="loading-container"><div class="spinner"></div><p>Loading leaderboard...</p></div>';

    try {
        const res = await fetch(
            `${CONFIG.WORKER_URL}/api/user/leaderboard`,
            {
                credentials: "include",
                headers: { "X-Client-Host": window.location.host }
            }
        );

        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();

        if (!data.success) {
            list.innerHTML = `<p class="error-message">${data.error || 'Leaderboard not available'}</p>`;
            return;
        }

        const leaderboard = data.leaderboard.slice(0, 10);

        if (leaderboard.length === 0) {
            list.innerHTML = '<p class="empty-message">No scores yet. Be the first to play!</p>';
            return;
        }

        list.innerHTML = leaderboard.map((user, index) => {
            let rankBadge = index + 1;
            let rankClass = '';

            if (index === 0) {
                rankBadge = "🥇";
                rankClass = 'gold';
            } else if (index === 1) {
                rankBadge = "🥈";
                rankClass = 'silver';
            } else if (index === 2) {
                rankBadge = "🥉";
                rankClass = 'bronze';
            }

            // Truncate user ID for privacy
            const displayName = user.user_id.length > 8 
                ? user.user_id.substring(0, 6) + '...' 
                : user.user_id;

            return `
                <div class="leaderboard-row ${rankClass}">
                    <span class="rank">${rankBadge}</span>
                    <span class="user">${displayName}</span>
                    <span class="score">${user.score}</span>
                </div>
            `;
        }).join("");

    } catch (err) {
        console.error("Leaderboard error:", err);
        list.innerHTML = `<p class="error-message">Failed to load leaderboard: ${err.message}</p>`;
    }
}

function closeLeaderboard() {
    const modal = document.getElementById("leaderboardModal");
    if (modal) {
        modal.style.display = "none";
    }
}

// Make functions globally available
window.openLeaderboard = openLeaderboard;
window.closeLeaderboard = closeLeaderboard;
window.viewMyAnswers = viewMyAnswers;
window.selectAnswer = selectAnswer;
window.submitQuiz = submitQuiz;
window.closeResult = closeResult;
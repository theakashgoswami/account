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
    await loadHeader();
    await loadQuiz();
});


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

    if (!data.success) {
      container.innerHTML = "<p>Error loading quiz</p>";
      return;
    }

    // 🧠 FIXED: Added the missing quizData assignment
    if (data.submitted) {
      submitted = true;

      if (data.selections) {
        userSelections = JSON.parse(data.selections);
      }
      
      // ✅ IMPORTANT: Load the quiz questions even if already submitted
      if (data.earn && Array.isArray(data.earn)) {
        quizData = data.earn;
      }

      container.innerHTML = `
        <div class="already-submitted-card">
          <div class="submitted-icon">✅</div>
          <h2>You have already participated!</h2>
          <p class="submitted-week">Week: ${currentWeek}</p>
          <p class="submitted-score">Your Score: ${data.score || 0} / 40</p>
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
              🏆 Leaderboard
            </button>
          </div>
        </div>
      `;

      return;
    }

    quizData = data.earn;
    document.getElementById("quizWeek").textContent = currentWeek;
    renderQuiz();

  } catch (err) {
    console.error("Quiz load error:", err);
    container.innerHTML = "<p>Error loading quiz</p>";
  }
}
function checkSubmissionAndRender(){
    location.reload();
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
   RENDER QUIZ
=========================================== */
function renderQuiz() {

    const container = document.getElementById("quizContainer");
requestAnimationFrame(()=>{
    container.innerHTML = `

        <div class="prepare-wrapper">
            <a href="${quizData[0]?.url || '#'}" target="_blank" class="prepare-link">
                📘 Prepare for these questions
            </a>
        </div>

        ${quizData.map((q, index) => `

        <div class="quiz-card" data-id="${q.qid}">
            <div class="question-number">Question ${index + 1}/4</div>
            <h3>${q.question}</h3>

            ${["A","B","C","D"].map(opt => `
                <div class="option ${selected[q.qid] === opt ? 'selected' : ''}"
                     onclick="selectAnswer('${q.qid}','${opt}',this)">
                    ${opt}. ${q["option"+opt]}
                </div>
            `).join("")}

        </div>

        `).join("")}

        <button class="submit-btn" onclick="submitQuiz()">📤 Submit Quiz</button>
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
function showResult(score) { let message = ""; if (score === 40) message = "🔥 Perfect Score!"; 
    else if (score >= 30) message = "👏 Great Job!"; 
    else if (score >= 20) message = "👍 Good Attempt!"; 
    else message = "Keep Practicing!"; document.getElementById("resultTitle").textContent = message; 
    document.getElementById("resultText").innerHTML = `You scored <strong>${score} points</strong> in ${currentWeek}<br>
    <br> <small>Results will be announced this Sunday on Instagram!</small>` ;

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
function viewMyAnswers(){

const container=document.getElementById("quizContainer");

if(!quizData || !quizData.length){
 alert("Quiz data not found. Please refresh the page.");
 return;
}

if(!userSelections || Object.keys(userSelections).length===0){

 container.innerHTML=`
 <div class="error-card">
 <h3>❌ No answers found</h3>
 <p>You haven't submitted any answers yet.</p>
 <button class="btn-back" onclick="location.reload()">← Back</button>
 </div>`;
 return;
}

const fragment=document.createDocumentFragment();

quizData.forEach((q,index)=>{

 const qid=q.qid;
 const selectedOpt=userSelections[qid];
 const correctOpt=q.correct;

 const card=document.createElement("div");
 card.className="quiz-card view-mode";

 let optionsHTML="";

 ["A","B","C","D"].forEach(opt=>{

  let className="option";
  let indicator="";

  if(opt===correctOpt){
   className+=" correct-answer";
  }

  if(opt===selectedOpt){
   className+=" selected";

   if(opt===correctOpt){
    indicator=" ✓";
   }else{
    indicator=" ✗";
    className+=" wrong-answer";
   }
  }

  optionsHTML+=`
  <div class="${className}">
  ${opt}. ${q["option"+opt] || "Option "+opt} ${indicator}
  </div>`;
 });

 const isCorrect=selectedOpt===correctOpt;

 card.innerHTML=`
 <div class="question-number">Question ${index+1}/4</div>
 <h3>${q.question}</h3>
 ${optionsHTML}
 <div class="answer-feedback" style="
 margin-top:15px;
 padding:10px;
 border-radius:8px;
 ${isCorrect ? "background:#d4edda;color:#155724;" : "background:#f8d7da;color:#721c24;"}
 ">
 ${isCorrect
 ? "✅ Correct! You chose the right answer."
 : `❌ Your answer: ${selectedOpt} | Correct answer: ${correctOpt}`}
 </div>
 `;

 fragment.appendChild(card);

});

container.innerHTML="";
container.appendChild(fragment);

const back=document.createElement("div");
back.style.textAlign="center";
back.style.margin="20px 0";

back.innerHTML=`
<button class="btn-back"
onclick="location.reload()"
style="
padding:10px 30px;
background:#667eea;
color:white;
border:none;
border-radius:50px;
cursor:pointer">
← Back to Message
</button>
`;

container.appendChild(back);

}
/* ===========================================
   LEADERBOARD SYSTEM
=========================================== */

async function openLeaderboard() {

    const modal = document.getElementById("leaderboardModal");
    const list = document.getElementById("leaderboardList");

    if (!modal || !list) {
        alert("Leaderboard UI not found");
        return;
    }

    modal.style.display = "flex";
    list.innerHTML = "<div class='loading'>Loading leaderboard...</div>";

    try {

        const res = await fetch(
            `${CONFIG.WORKER_URL}/api/user/leaderboard?week=${currentWeek}`,
            {
                credentials: "include",
                headers: { "X-Client-Host": window.location.host }
            }
        );

        const data = await res.json();

        if (!data.success || !data.leaderboard?.length) {
            list.innerHTML = "<div class='empty'>No leaderboard data yet</div>";
            return;
        }

        const leaderboard = data.leaderboard.slice(0, 10);

        list.innerHTML = leaderboard.map((user, index) => {

            let badge = "";
            if (index === 0) badge = "🥇";
            else if (index === 1) badge = "🥈";
            else if (index === 2) badge = "🥉";
            else badge = index + 1;

            return `
                <div class="leaderboard-row ${index < 3 ? 'top-rank' : ''}">
                    <span class="rank">${badge}</span>
                    <span class="user">${user.user_id}</span>
                    <span class="score">${user.total_score} score</span>
                </div>
            `;
        }).join("");

    } catch (err) {
        console.error("Leaderboard error:", err);
        list.innerHTML = "<div class='error'>Failed to load leaderboard</div>";
    }
}

function closeLeaderboard() {
    const modal = document.getElementById("leaderboardModal");
    if (modal) modal.style.display = "none";
}

window.openLeaderboard = openLeaderboard;
window.closeLeaderboard = closeLeaderboard;

window.viewMyAnswers = viewMyAnswers;
/* ============================================================
   EARN.JS — AG TechScript
   Sections: Free Spin | Quiz Spin | Super Spin | Streak
   Weekly Score resets every Sunday midnight

   NEW WORKER ENDPOINTS NEEDED (add to your worker.js):
   ──────────────────────────────────────────────────────
   GET  /api/user/spin-status        → daily/weekly state
   POST /api/user/free-spin          → record free spin
   POST /api/user/record-spin        → record quiz/super spin
   POST /api/user/claim-streak       → daily streak reward
   GET  /api/user/super-questions    → super quiz questions
   POST /api/user/submit-super-quiz  → submit super quiz

   See bottom of file for worker code snippets.
============================================================ */

"use strict";

// ============================================================
// GLOBAL STATE
// ============================================================
const E = {
  // streak
  streak: 0,
  streakClaimed: false,

  // free spin
  freeSpinDone: false,
  freeSpinPoints: 0,

  // quiz
  quizData: [],
  quizDone: false,
  quizSpinDone: false,
  quizSpinPoints: 0,
  quizCorrect: 0,
  quizSelections: {},
  quizAnswers: {},

  // super
  superAvailable: false,
  superData: [],
  superDone: false,
  superSpinDone: false,
  superSpinPoints: 0,
  superCorrect: 0,
  superSelections: {},
  superAnswers: {},

  // weekly
  weeklyQuizScore: 0,
  weeklySuperScore: 0,
};

// ---- Streak rewards (Day 1–7) ----
const STREAK_REWARDS = [50, 75, 100, 150, 200, 250, 500];

// ---- Spin segment definitions ----
const FREE_SEGS = [
  { label: "100",  value: 100,  color: "#6366f1" },
  { label: "200",  value: 200,  color: "#8b5cf6" },
  { label: "500",  value: 500,  color: "#f59e0b" },
  { label: "100",  value: 100,  color: "#3b82f6" },
  { label: "300",  value: 300,  color: "#10b981" },
  { label: "200",  value: 200,  color: "#ec4899" },
  { label: "150",  value: 150,  color: "#14b8a6" },
  { label: "250",  value: 250,  color: "#f97316" },
];

// Quiz: 5 point blocks + 1 sorry (index 5 = sorry)
const QUIZ_SEGS = [
  { label: "100",   value: 100,  color: "#6366f1" },
  { label: "200",   value: 200,  color: "#8b5cf6" },
  { label: "300",   value: 300,  color: "#10b981" },
  { label: "400",   value: 400,  color: "#f59e0b" },
  { label: "500",   value: 500,  color: "#ef4444" },
  { label: "Sorry", value: 0,    color: "#94a3b8" },
];

// Super: 5 point blocks + 1 sorry (index 5 = sorry)
const SUPER_SEGS = [
  { label: "300",   value: 300,  color: "#f59e0b" },
  { label: "500",   value: 500,  color: "#ef4444" },
  { label: "700",   value: 700,  color: "#8b5cf6" },
  { label: "400",   value: 400,  color: "#3b82f6" },
  { label: "1000",  value: 1000, color: "#10b981" },
  { label: "Sorry", value: 0,    color: "#94a3b8" },
];

// ============================================================
// SPIN WHEEL CLASS (Canvas-based)
// ============================================================
class SpinWheel {
  constructor(canvasEl, segments) {
    this.canvas = canvasEl;
    this.ctx    = canvasEl.getContext("2d");
    this.segs   = segments; // [{label, value, color, active?}]
    this.rot    = Math.random() * Math.PI * 2;
    this.spinning = false;
    this.draw();
  }

  draw(rot = this.rot) {
    const ctx = this.ctx;
    const W   = this.canvas.width;
    const cx  = W / 2, cy = W / 2;
    const r   = cx - 6;
    const n   = this.segs.length;
    const arc = (2 * Math.PI) / n;

    ctx.clearRect(0, 0, W, W);

    this.segs.forEach((seg, i) => {
      const sa = rot + i * arc - Math.PI / 2;
      const ea = sa + arc;

      // Segment fill
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, sa, ea);
      ctx.closePath();
      const inactive = seg.active === false;
      ctx.fillStyle = inactive ? "#dde1ea" : seg.color;
      ctx.fill();

      // Separator
      ctx.strokeStyle = "rgba(255,255,255,0.75)";
      ctx.lineWidth   = 2.5;
      ctx.stroke();

      // Label
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(sa + arc / 2);
      const labelR = r * 0.65;

      if (seg.label === "Sorry") {
        ctx.font      = `${W > 280 ? 18 : 15}px serif`;
        ctx.textAlign = "center";
        ctx.fillText("😅", labelR, 6);
      } else {
        ctx.fillStyle = inactive ? "#aab0bc" : "#fff";
        ctx.font      = `bold ${W > 280 ? 13 : 11}px Arial`;
        ctx.textAlign = "center";
        ctx.fillText(seg.label, labelR, 4);
        ctx.font      = `${W > 280 ? 10 : 8}px Arial`;
        ctx.fillStyle = inactive ? "#bcc2cc" : "rgba(255,255,255,.8)";
        ctx.fillText("pts", labelR, 15);
      }
      ctx.restore();
    });

    // Outer ring
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth   = 4;
    ctx.stroke();

    // Center circle
    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, 2 * Math.PI);
    const grad = ctx.createRadialGradient(cx, cy - 4, 2, cx, cy, 20);
    grad.addColorStop(0, "#fff");
    grad.addColorStop(1, "#e2e8f0");
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,.08)";
    ctx.lineWidth   = 1;
    ctx.stroke();

    ctx.fillStyle = "#667eea";
    ctx.font      = "bold 9px Arial";
    ctx.textAlign = "center";
    ctx.fillText("AG", cx, cy + 3);
  }

  /**
   * spinTo(targetIndex, onDone)
   * Smoothly rotates wheel so segment at targetIndex is under the pointer.
   */
  spinTo(targetIndex, onDone) {
    if (this.spinning) return;
    this.spinning = true;

    const n   = this.segs.length;
    const arc = (2 * Math.PI) / n;

    // Pointer is at top (angle = -π/2 in canvas coords)
    // Center of segment i is at: rot + (i + 0.5)*arc - π/2
    // We want that = -π/2, so: rot = -(i + 0.5)*arc
    const targetRot  = -((targetIndex + 0.5) * arc);
    const targetNorm = ((targetRot % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const currentNorm= ((this.rot  % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

    let delta = targetNorm - currentNorm;
    if (delta <= 0) delta += 2 * Math.PI;

    const fullSpins    = (5 + Math.floor(Math.random() * 4)) * 2 * Math.PI;
    const totalRotation= fullSpins + delta;
    const duration     = 4200 + Math.random() * 800;
    const startRot     = this.rot;
    const startTime    = performance.now();

    const animate = (now) => {
      const elapsed  = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Quartic ease-out
      const eased    = 1 - Math.pow(1 - progress, 4);

      this.rot = startRot + totalRotation * eased;
      this.draw(this.rot);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.spinning = false;
        if (onDone) onDone(targetIndex);
      }
    };

    requestAnimationFrame(animate);
  }
}

// ============================================================
// HELPERS
// ============================================================
function toast(msg, color = "#1e293b") {
  const el = document.getElementById("earnToast");
  if (!el) return;
  el.textContent = msg;
  el.style.background = color;
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 3200);
}

async function api(path, method = "GET", body = null) {
  const opts = {
    method,
    credentials: "include",
    headers: { "X-Client-Host": window.location.host },
  };
  if (body) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${CONFIG.WORKER_URL}${path}`, opts);
  return res.json();
}

function qs(id) { return document.getElementById(id); }

// ============================================================
// INIT
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {
  if (typeof loadHeader === "function") loadHeader();
  try {
    const [spinStatus, quizData] = await Promise.all([
      api("/api/user/spin-status"),
      api("/api/user/earn"),
    ]);

    // --- apply spin-status ---
    if (spinStatus.success) {
      E.streak         = spinStatus.streak          || 0;
      E.streakClaimed  = spinStatus.streak_claimed  || false;
      E.freeSpinDone   = spinStatus.free_spin_done  || false;
      E.freeSpinPoints = spinStatus.free_spin_points|| 0;
      E.quizSpinDone   = spinStatus.quiz_spin_done  || false;
      E.quizSpinPoints = spinStatus.quiz_spin_points|| 0;
      E.superSpinDone  = spinStatus.super_spin_done || false;
      E.superSpinPoints= spinStatus.super_spin_points||0;
      E.weeklyQuizScore = spinStatus.weekly_quiz_score ||0;
      E.weeklySuperScore= spinStatus.weekly_super_score||0;
    }

    // --- FIX: Apply quiz data with saved answers ---
    if (quizData.success) {
      E.quizData = quizData.earn || [];
      E.quizDone = quizData.submitted || false;
      
      // 🔥 CRITICAL FIX: Agar already submitted hai toh answers load karo
      if (quizData.submitted) {
        // Parse selections agar string mein aaye toh
        E.quizSelections = typeof quizData.selections === "string"
          ? JSON.parse(quizData.selections)
          : (quizData.selections || {});
        
        // Store correct answers for reference
        E.quizData.forEach(q => {
          if (q.correct_option) {
            E.quizAnswers[String(q.qid)] = q.correct_option;
          }
        });
        
        // Calculate correct count
        E.quizCorrect = Object.keys(E.quizSelections).filter(
          qid => E.quizSelections[qid] === E.quizAnswers[qid]
        ).length;
      }
    }


    // --- try super questions ---
    try {
      const sup = await api("/api/user/super-questions");
      if (sup.success && sup.questions?.length) {
        E.superAvailable = true;
        E.superData      = sup.questions;
        if (sup.submitted) {
          E.superDone       = true;
          E.superSelections = sup.selections || {};
          E.superCorrect    = sup.correct_count || 0;
          (sup.correctAnswers || []).forEach(q => {
            E.superAnswers[String(q.qid)] = q.correct_option;
          });
        }
      }
    } catch { /* super not available yet */ }

    // --- render ---
    renderWeeklyBar();
    renderStreak();
    renderFreeSpin();
    renderQuizSection();
    renderSuperSpin();
    startCountdown();

  } catch (err) {
    console.error("Earn init error:", err);
    toast("Failed to load — please refresh", "#ef4444");
  }
});

// ============================================================
// WEEKLY SCORE BAR
// ============================================================
function renderWeeklyBar() {
  const total = E.weeklyQuizScore + E.weeklySuperScore;
  qs("weeklyTotal").textContent  = `${total} pts`;
  qs("quizSpinScore").textContent  = E.quizSpinDone  ? `${E.quizSpinPoints} pts`  : "—";
  qs("superSpinScore").textContent = E.superSpinDone ? `${E.superSpinPoints} pts` : "—";
}

function startCountdown() {
  const el = qs("resetCountdown");
  if (!el) return;
  const tick = () => {
    const now        = new Date();
    const sunday     = new Date();
    const daysUntil  = (7 - now.getDay()) % 7 || 7;
    sunday.setDate(now.getDate() + daysUntil);
    sunday.setHours(0, 0, 0, 0);

    const ms   = sunday - now;
    const h    = Math.floor(ms / 3600000);
    const m    = Math.floor((ms % 3600000) / 60000);
    const days = Math.floor(h / 24);

    if (h < 48) {
      el.textContent = `⏰ ${h}h ${m}m left`;
      el.style.color = h < 12 ? "#ef4444" : "#fbbf24";
    } else {
      el.textContent = `Resets in ${days}d`;
      el.style.color = "#94a3b8";
    }
  };
  tick();
  setInterval(tick, 60000);
}

// ============================================================
// STREAK
// ============================================================
function renderStreak() {
  const row = qs("streakRow");
  const msg = qs("streakMsg");
  if (!row) return;

  row.innerHTML = STREAK_REWARDS.map((pts, i) => {
    const day     = i + 1;
    const done    = i < E.streak;
    const isToday = i === E.streak && !E.streakClaimed;
    const isMega  = day === 7;

    let cls = "streak-day";
    if (done)    cls += " done";
    if (isToday) cls += " today";
    if (isMega)  cls += " mega";

    const icon = done ? "✅" : isMega ? "🎁" : isToday ? "🎯" : "⬜";

    return `
      <div class="${cls}" title="Day ${day}: ${pts} pts">
        <div class="s-icon">${icon}</div>
        <div class="s-num">D${day}</div>
        <div class="s-pts">${isMega ? "BIG!" : `+${pts}`}</div>
      </div>`;
  }).join("");

  if (E.streakClaimed) {
    const claimed = STREAK_REWARDS[Math.min(E.streak - 1, 6)];
    msg.innerHTML = `✅ Day ${E.streak} claimed! <strong>+${claimed} pts</strong>`;
    msg.style.color = "#065f46";
  } else if (E.streak < 7) {
    const dayPts = STREAK_REWARDS[E.streak];
    msg.innerHTML = `
      <button class="streak-claim-btn" id="streakBtn" onclick="claimStreak()">
        🎯 Claim Day ${E.streak + 1} (+${dayPts} pts)
      </button>`;
  } else {
    msg.innerHTML = `🏆 Full week complete! Well done!`;
    msg.style.color = "#f59e0b";
  }
}

async function claimStreak() {
  const btn = qs("streakBtn");
  if (btn) { btn.disabled = true; btn.textContent = "Claiming…"; }
  try {
    const data = await api("/api/user/claim-streak", "POST");
    if (data.success) {
      E.streak        = data.streak;
      E.streakClaimed = true;
      renderStreak();
      toast(`🔥 Day ${data.streak} streak! +${data.points_earned} pts`, "#10b981");
    } else {
      toast(data.error || "Already claimed today", "#f59e0b");
      if (btn) { btn.disabled = false; btn.textContent = "🎯 Claim"; }
    }
  } catch {
    toast("Error — try again", "#ef4444");
    if (btn) btn.disabled = false;
  }
}
window.claimStreak = claimStreak;

// ============================================================
// FREE SPIN
// ============================================================
function renderFreeSpin() {
  const el    = qs("freeSpinSection");
  const badge = qs("freeSpinBadge");
  if (!el) return;

  if (E.freeSpinDone) {
    badge.textContent = "Done ✓";
    badge.className   = "card-badge badge-done";
    el.innerHTML = `
      <div class="done-overlay">
        <div class="d-icon">🎉</div>
        <div class="d-score">+${E.freeSpinPoints} pts</div>
        <p class="d-sub">Come back tomorrow for another free spin!</p>
      </div>`;
    return;
  }

  badge.textContent = "Daily";
  badge.className   = "card-badge badge-free";
  el.innerHTML = `
    <div class="spin-container">
      <div class="wheel-wrap">
        <div class="wheel-ptr"></div>
        <canvas id="freeCanvas" class="wheel" width="300" height="300"></canvas>
      </div>
      <button class="spin-btn free-col" id="freeSpinBtn" onclick="doFreeSpin()">
        🎯 Spin Now!
      </button>
      <p style="font-size:12px;color:#94a3b8;margin:0;text-align:center">
        Win 100–500 pts daily — completely free!
      </p>
    </div>`;

  window._freeWheel = new SpinWheel(qs("freeCanvas"), FREE_SEGS.map(s => ({...s})));
}

async function doFreeSpin() {
  if (E.freeSpinDone) return;
  const btn = qs("freeSpinBtn");
  if (!btn || btn.disabled) return;
  btn.disabled = true;
  btn.textContent = "Spinning…";

  // Weighted random: 500 is rarer
  const weights = [3, 3, 1, 3, 2, 3, 2, 2]; // matches FREE_SEGS order
  const total   = weights.reduce((a, b) => a + b, 0);
  let rand      = Math.random() * total;
  let result    = 0;
  for (let i = 0; i < weights.length; i++) {
    rand -= weights[i];
    if (rand <= 0) { result = i; break; }
  }

  const pts = FREE_SEGS[result].value;

  window._freeWheel.spinTo(result, async () => {
    try {
      const data = await api("/api/user/free-spin", "POST", { points: pts });
      if (data.success) {
        E.freeSpinDone   = true;
        E.freeSpinPoints = pts;
        toast(`🎉 Free Spin: +${pts} pts!`, "#10b981");
        setTimeout(() => renderFreeSpin(), 1400);
      } else {
        toast(data.error || "Error", "#ef4444");
        btn.disabled = false;
        btn.textContent = "🎯 Spin Now!";
      }
    } catch {
      toast("Network error", "#ef4444");
      btn.disabled = false;
      btn.textContent = "🎯 Spin Now!";
    }
  });
}
window.doFreeSpin = doFreeSpin;

// ============================================================
// QUIZ SPIN
// ============================================================

// Local quiz state (for question selection UI)
let _quizSelected  = {};
let _quizSubmitting= false;

function renderQuizSection() {
  const el    = qs("quizSection");
  const badge = qs("quizSpinBadge");
  if (!el) return;

  // All done
  if (E.quizDone && E.quizSpinDone) {
    badge.textContent = "Done ✓";
    badge.className   = "card-badge badge-done";
    el.innerHTML = `
      <div class="done-overlay">
        <div class="d-icon">🏆</div>
        <div class="d-score">+${E.quizSpinPoints} pts</div>
        <p class="d-sub">${E.quizCorrect}/${E.quizData.length} correct answers</p>
        <button class="ghost-btn" style="margin-top:12px" onclick="viewQuizAnswers()">
          👁️ View My Answers
        </button>
        &nbsp;
        <button class="ghost-btn" style="margin-top:12px" onclick="openLeaderboard()">
          🏆 Leaderboard
        </button>
      </div>`;
    return;
  }

  // Quiz done, spin not yet
  if (E.quizDone && !E.quizSpinDone) {
    badge.textContent = "Spin!";
    badge.className   = "card-badge badge-quiz";
    _renderQuizSpinWheel();
    return;
  }

  // Quiz not done — show questions
  badge.textContent = "+10 pts/Q";
  badge.className   = "card-badge badge-quiz";
  _renderQuizQuestions();
}

function _renderQuizQuestions() {
  const el = qs("quizSection");
  _quizSelected = {};

  if (!E.quizData.length) {
    el.innerHTML = `
      <p style="text-align:center;color:#94a3b8;padding:20px;margin:0">
        No quiz questions today — check back tomorrow!
      </p>`;
    return;
  }

  el.innerHTML = `
    <div class="quiz-cards-wrap" id="quizQWrap">
      ${E.quizData.map((q, idx) => `
        <div class="quiz-card" data-qid="${q.qid}">
          ${q.prepare_link
            ? `<div class="prepare-wrapper">
                 <a href="${q.prepare_link}" target="_blank" class="prepare-link">📘 help</a>
               </div>`
            : ''}
          <div class="question-number">Question ${idx + 1}/${E.quizData.length}</div>
          <h3>${q.question}</h3>
          ${['A','B','C','D'].map(opt => `
            <div class="option"
                 onclick="selectQ('${q.qid}','${opt}',this)">
              ${opt}. ${q['option_' + opt.toLowerCase()] || 'Option ' + opt}
            </div>`).join('')}
        </div>`).join('')}
      <button id="submitQuizBtn" class="submit-btn" onclick="doSubmitQuiz()" style="width:100%">
        📤 Submit Quiz
      </button>
    </div>`;
}

function selectQ(qid, opt, el) {
  _quizSelected[qid] = opt;
  el.closest(".quiz-card")
    .querySelectorAll(".option")
    .forEach(o => o.classList.remove("selected"));
  el.classList.add("selected");
  if (navigator.vibrate) navigator.vibrate(10);

  // Update progress bar
  const filled = Object.keys(_quizSelected).length;
  const total  = E.quizData.length;
  const bar    = qs("progressBar");
  if (bar) bar.style.width = `${(filled / total) * 100}%`;
}
window.selectQ = selectQ;

async function doSubmitQuiz() {
  if (_quizSubmitting) return;
  const answered = Object.keys(_quizSelected).length;
  if (answered < E.quizData.length) {
    toast(`Please answer all ${E.quizData.length} questions`, "#f59e0b");
    return;
  }

  _quizSubmitting = true;
  const btn = qs("submitQuizBtn");
  if (btn) { btn.disabled = true; btn.textContent = "Submitting…"; }

  try {
    const data = await api("/api/user/submit-quiz", "POST", { selections: _quizSelected });
    if (!data.success) throw new Error(data.error || "Submit failed");

    E.quizDone       = true;
    E.quizSelections = { ..._quizSelected };

    if (data.correctAnswers) {
      data.correctAnswers.forEach(q => {
        E.quizAnswers[String(q.qid)] = q.correct_option;
      });
    }

    E.quizCorrect = Object.keys(E.quizSelections).filter(
      qid => E.quizSelections[qid] === E.quizAnswers[qid]
    ).length;

    toast(`✅ ${E.quizCorrect}/${E.quizData.length} correct — now spin!`, "#667eea");
    setTimeout(() => _renderQuizSpinWheel(), 500);

  } catch (err) {
    toast(err.message, "#ef4444");
    if (btn) { btn.disabled = false; btn.textContent = "📤 Submit Quiz"; }
  } finally {
    _quizSubmitting = false;
  }
}
window.doSubmitQuiz = doSubmitQuiz;

function _renderQuizSpinWheel() {
  const el = qs("quizSection");
  if (!el) return;

  const correct = E.quizCorrect;
  const total   = E.quizData.length;

  // Build segments: first `correct` point blocks = active, rest = inactive, sorry always inactive
  const segs = QUIZ_SEGS.map((seg, i) => ({
    ...seg,
    active: seg.value === 0 ? false : i < correct,
  }));

  // Hint dots
  const dotsHtml = QUIZ_SEGS.filter(s => s.value > 0).map((_, i) => `
    <span class="seg-dot ${i < correct ? 'on' : 'off'}"></span>`).join('');

  el.innerHTML = `
    <div style="text-align:center;margin-bottom:14px">
      <p style="margin:0;font-size:14px;color:#475569;font-weight:600">
        🎯 ${correct}/${total} correct answers
      </p>
      <div class="seg-hint" style="margin-top:8px">
        ${dotsHtml}
        <span style="color:#64748b">${correct} active block${correct!==1?'s':''}</span>
      </div>
      ${correct === 0
        ? `<p style="font-size:12px;color:#ef4444;margin:6px 0 0">
             No active blocks — no spin reward today 😢
           </p>`
        : `<p style="font-size:12px;color:#10b981;margin:6px 0 0">
             Spin will land on one of your ${correct} active block${correct!==1?'s':''}!
           </p>`}
    </div>

    <div class="spin-container">
      <div class="wheel-wrap">
        <div class="wheel-ptr"></div>
        <canvas id="quizCanvas" class="wheel" width="300" height="300"></canvas>
      </div>
      ${correct > 0
        ? `<button class="spin-btn" id="quizSpinBtn" onclick="doQuizSpin()">
             🎰 Spin & Win!
           </button>`
        : `<button class="ghost-btn" onclick="viewQuizAnswers()">
             👁️ View My Answers
           </button>`}
    </div>`;

  window._quizWheel     = new SpinWheel(qs("quizCanvas"), segs);
  window._quizSpinSegs  = segs;
}

async function doQuizSpin() {
  if (E.quizSpinDone || E.quizCorrect === 0) return;

  // Pick random from active (non-sorry, active=true) segments
  const active = (window._quizSpinSegs || QUIZ_SEGS)
    .map((seg, i) => ({ seg, i }))
    .filter(({ seg }) => seg.active && seg.value > 0);

  if (!active.length) return;

  const pick   = active[Math.floor(Math.random() * active.length)];
  const target = pick.i;
  const pts    = pick.seg.value;

  const btn = qs("quizSpinBtn");
  btn.disabled = true;
  btn.textContent = "Spinning…";

  window._quizWheel.spinTo(target, async () => {
    try {
      const data = await api("/api/user/record-spin", "POST", {
        type:   "quiz",
        points: pts,
      });
      if (data.success) {
        E.quizSpinDone   = true;
        E.quizSpinPoints = pts;
        E.weeklyQuizScore += pts;
        renderWeeklyBar();
        toast(`🎰 Quiz Spin: +${pts} pts!`, "#667eea");
        setTimeout(() => renderQuizSection(), 1400);
      } else {
        toast(data.error || "Error", "#ef4444");
        btn.disabled = false;
        btn.textContent = "🎰 Spin & Win!";
      }
    } catch {
      toast("Network error", "#ef4444");
      btn.disabled = false;
      btn.textContent = "🎰 Spin & Win!";
    }
  });
}
window.doQuizSpin = doQuizSpin;

// View quiz answers
function viewQuizAnswers() {
  const el = qs("quizSection");
  if (!el || !E.quizData.length) return;

  const frag = document.createDocumentFragment();

  E.quizData.forEach((q, idx) => {
    const qid   = String(q.qid);
    const sel   = E.quizSelections[qid] || '';
    const corr  = (E.quizAnswers[qid] || '').toUpperCase();
    const opts  = {
      A: q.option_a || 'Option A',
      B: q.option_b || 'Option B',
      C: q.option_c || 'Option C',
      D: q.option_d || 'Option D',
    };

    const card = document.createElement("div");
    card.className = "quiz-card view-mode";
    card.style.marginBottom = "12px";

    let optsHtml = '';
    Object.entries(opts).forEach(([k, txt]) => {
      let cls  = "option";
      let ind  = "";
      if (k === corr)  cls += " correct-answer";
      if (k === sel) {
        cls += " selected";
        if (k === corr) { cls += " correct-selected"; ind = " ✓"; }
        else            { cls += " wrong-answer";      ind = " ✗"; }
      }
      optsHtml += `<div class="${cls}">${k}. ${txt}${ind}</div>`;
    });

    const ok = sel === corr;
    card.innerHTML = `
      <div class="question-number">Q${idx + 1}/${E.quizData.length}</div>
      <h3>${q.question}</h3>
      ${optsHtml}
      <div style="margin-top:10px;padding:10px 12px;border-radius:8px;font-size:13px;
           ${ok
             ? 'background:#d1fae5;color:#065f46;border-left:4px solid #10b981'
             : 'background:#fee2e2;color:#991b1b;border-left:4px solid #ef4444'}">
        ${ok
          ? '✅ Correct! Well done.'
          : `❌ Your answer: ${sel||'—'} &nbsp;|&nbsp; Correct: ${corr}`}
      </div>`;
    frag.appendChild(card);
  });

  const backBtn = document.createElement("button");
  backBtn.className   = "ghost-btn";
  backBtn.style.width = "100%";
  backBtn.style.marginTop = "4px";
  backBtn.textContent = "← Back";
  backBtn.onclick     = () => renderQuizSection();
  frag.appendChild(backBtn);

  el.innerHTML = "";
  el.appendChild(frag);
}
window.viewQuizAnswers = viewQuizAnswers;

// ============================================================
// SUPER SPIN
// ============================================================

let _superSelected  = {};
let _superSubmitting= false;

function renderSuperSpin() {
  const el    = qs("superSpinSection");
  const badge = qs("superSpinBadge");
  if (!el) return;

  if (!E.superAvailable) {
    badge.textContent = "Locked";
    badge.className   = "card-badge badge-lock";
    el.innerHTML = `
      <div class="locked-overlay">
        <div class="l-icon">🔒</div>
        <p style="font-weight:600;color:#64748b">Super Spin is not active.</p>
        <p>It unlocks when special questions are available. Check Regularly!</p>
      </div>`;
    return;
  }

  // All done
  if (E.superDone && E.superSpinDone) {
    badge.textContent = "Done ✓";
    badge.className   = "card-badge badge-done";
    el.innerHTML = `
      <div class="done-overlay">
        <div class="d-icon">⚡</div>
        <div class="d-score">+${E.superSpinPoints} pts</div>
        <p class="d-sub">Super Spin complete! Resets with weekly score on Sunday.</p>
      </div>`;
    return;
  }

  // Super done, spin pending
  if (E.superDone && !E.superSpinDone) {
    badge.textContent = "Spin!";
    badge.className   = "card-badge badge-super";
    _renderSuperSpinWheel();
    return;
  }

  // Show super questions
  badge.textContent = "Weekly";
  badge.className   = "card-badge badge-super";
  _renderSuperQuestions();
}

function _renderSuperQuestions() {
  const el = qs("superSpinSection");
  _superSelected = {};

  el.innerHTML = `
    <p style="font-size:13px;color:#f59e0b;font-weight:700;text-align:center;margin:0 0 14px">
      ⚡ Weekly Super Quiz — Higher rewards await!
    </p>
    <div class="quiz-cards-wrap">
      ${E.superData.map((q, idx) => `
        <div class="quiz-card" data-qid="${q.qid}">
          ${q.prepare_link
            ? `<div class="prepare-wrapper">
                 <a href="${q.prepare_link}" target="_blank" class="prepare-link">📘 help</a>
               </div>`
            : ''}
          <div class="question-number">Question ${idx + 1}/${E.superData.length}</div>
          <h3>${q.question}</h3>
          ${['A','B','C','D'].map(opt => `
            <div class="option"
                 onclick="selectSQ('${q.qid}','${opt}',this)">
              ${opt}. ${q['option_' + opt.toLowerCase()] || 'Option ' + opt}
            </div>`).join('')}
        </div>`).join('')}
      <button id="submitSuperBtn" class="submit-btn" onclick="doSubmitSuper()"
              style="width:100%;background:linear-gradient(135deg,#f59e0b,#ef4444)">
        ⚡ Submit Super Quiz
      </button>
    </div>`;
}

function selectSQ(qid, opt, el) {
  _superSelected[qid] = opt;
  el.closest(".quiz-card")
    .querySelectorAll(".option")
    .forEach(o => o.classList.remove("selected"));
  el.classList.add("selected");
  if (navigator.vibrate) navigator.vibrate(10);
}
window.selectSQ = selectSQ;

async function doSubmitSuper() {
  if (_superSubmitting) return;
  if (Object.keys(_superSelected).length < E.superData.length) {
    toast(`Answer all ${E.superData.length} questions`, "#f59e0b");
    return;
  }

  _superSubmitting = true;
  const btn = qs("submitSuperBtn");
  if (btn) { btn.disabled = true; btn.textContent = "Submitting…"; }

  try {
    const data = await api("/api/user/submit-super-quiz", "POST", {
      selections: _superSelected,
    });
    if (!data.success) throw new Error(data.error || "Submit failed");

    E.superDone       = true;
    E.superSelections = { ..._superSelected };
    E.superCorrect    = data.correct_count || 0;
    (data.correctAnswers || []).forEach(q => {
      E.superAnswers[String(q.qid)] = q.correct_option;
    });

    toast(`⚡ ${E.superCorrect}/${E.superData.length} correct — now spin!`, "#f59e0b");
    setTimeout(() => _renderSuperSpinWheel(), 500);

  } catch (err) {
    toast(err.message, "#ef4444");
    if (btn) { btn.disabled = false; btn.textContent = "⚡ Submit Super Quiz"; }
  } finally {
    _superSubmitting = false;
  }
}
window.doSubmitSuper = doSubmitSuper;

function _renderSuperSpinWheel() {
  const el = qs("superSpinSection");
  if (!el) return;

  const correct = E.superCorrect;
  const total   = E.superData.length;

  // First 5 SUPER_SEGS are point blocks, last is sorry
  const segs = SUPER_SEGS.map((seg, i) => ({
    ...seg,
    active: seg.value === 0 ? false : i < correct,
  }));

  const dotsHtml = SUPER_SEGS.filter(s => s.value > 0).map((_, i) => `
    <span class="seg-dot ${i < correct ? 'on' : 'off'}"></span>`).join('');

  el.innerHTML = `
    <div style="text-align:center;margin-bottom:14px">
      <p style="margin:0;font-size:14px;color:#475569;font-weight:600">
        ⚡ ${correct}/${total} correct answers
      </p>
      <div class="seg-hint" style="margin-top:8px">
        ${dotsHtml}
        <span style="color:#64748b">${correct} active block${correct!==1?'s':''}</span>
      </div>
      ${correct === 0
        ? `<p style="font-size:12px;color:#ef4444;margin:6px 0 0">
             No active blocks — keep studying for next week!
           </p>`
        : `<p style="font-size:12px;color:#f59e0b;font-weight:700;margin:6px 0 0">
             Up to 1000 pts! Spin now!
           </p>`}
    </div>

    <div class="spin-container">
      <div class="wheel-wrap">
        <div class="wheel-ptr"></div>
        <canvas id="superCanvas" class="wheel" width="300" height="300"></canvas>
      </div>
      ${correct > 0
        ? `<button class="spin-btn super-col" id="superSpinBtn" onclick="doSuperSpin()">
             ⚡ Super Spin!
           </button>`
        : `<p style="color:#94a3b8;font-size:13px;text-align:center;margin:0">
             Better luck next week!
           </p>`}
    </div>`;

  window._superWheel     = new SpinWheel(qs("superCanvas"), segs);
  window._superSpinSegs  = segs;
}

async function doSuperSpin() {
  if (E.superSpinDone || E.superCorrect === 0) return;

  const active = (window._superSpinSegs || SUPER_SEGS)
    .map((seg, i) => ({ seg, i }))
    .filter(({ seg }) => seg.active && seg.value > 0);

  if (!active.length) return;

  const pick   = active[Math.floor(Math.random() * active.length)];
  const target = pick.i;
  const pts    = pick.seg.value;

  const btn = qs("superSpinBtn");
  btn.disabled = true;
  btn.textContent = "Spinning…";

  window._superWheel.spinTo(target, async () => {
    try {
      const data = await api("/api/user/record-spin", "POST", {
        type:   "super",
        points: pts,
      });
      if (data.success) {
        E.superSpinDone    = true;
        E.superSpinPoints  = pts;
        E.weeklySuperScore += pts;
        renderWeeklyBar();
        toast(`⚡ Super Spin: +${pts} pts!`, "#f59e0b");
        setTimeout(() => renderSuperSpin(), 1400);
      } else {
        toast(data.error || "Error", "#ef4444");
        btn.disabled = false;
        btn.textContent = "⚡ Super Spin!";
      }
    } catch {
      toast("Network error", "#ef4444");
      btn.disabled = false;
      btn.textContent = "⚡ Super Spin!";
    }
  });
}
window.doSuperSpin = doSuperSpin;

// ============================================================
// MODALS (compat)
// ============================================================
function closeResult() {
  const m = qs("resultModal");
  if (m) m.style.display = "none";
}
window.closeResult = closeResult;

async function openLeaderboard() {
  const modal = qs("leaderboardModal");
  const list  = qs("leaderboardList");
  if (!modal || !list) return;
  modal.classList.add("open");
  list.innerHTML = `<div style="padding:20px;text-align:center">
    <div class="spinner"></div><p style="color:#94a3b8">Loading…</p>
  </div>`;

  try {
    const data = await api("/api/user/leaderboard");
    if (!data.success) { list.innerHTML = `<p style="padding:16px;color:#94a3b8">${data.error}</p>`; return; }

    const lb = (data.leaderboard || []).slice(0, 10);
    if (!lb.length) {
      list.innerHTML = '<p style="padding:16px;text-align:center;color:#94a3b8">No scores yet — be the first!</p>';
      return;
    }

    const medals = ["🥇","🥈","🥉"];
    list.innerHTML = lb.map((u, i) => `
      <div class="leaderboard-row ${['gold','silver','bronze'][i]||''}">
        <span class="rank">${medals[i] || i+1}</span>
        <span class="user">${u.user_id.substring(0,6)}…</span>
        <span class="score">${u.score} pts</span>
      </div>`).join('');
  } catch (err) {
    list.innerHTML = `<p style="padding:16px;color:#ef4444">Error: ${err.message}</p>`;
  }
}

function closeLeaderboard() {
  const m = qs("leaderboardModal");
  if (m) m.classList.remove("open");
}
window.openLeaderboard  = openLeaderboard;
window.closeLeaderboard = closeLeaderboard;

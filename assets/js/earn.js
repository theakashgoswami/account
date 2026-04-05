/* ============================================================
   EARN.JS — AG TechScript (OPTIMIZED VERSION)
   - READ operations: Direct Supabase (FAST)
   - WRITE operations: Worker API (SECURE)
   ============================================================ */

"use strict";

// ============================================================
// GLOBAL STATE
// ============================================================
const E = {
  streak: 0,
  streakClaimed: false,
  freeSpinDone: false,
  freeSpinPoints: 0,
  quizData: [],
  quizDone: false,
  quizSpinDone: false,
  quizSpinPoints: 0,
  quizCorrect: 0,
  quizSelections: {},
  quizAnswers: {},
  superAvailable: false,
  superData: [],
  superDone: false,
  superSpinDone: false,
  superSpinPoints: 0,
  superCorrect: 0,
  superSelections: {},
  superAnswers: {},
  weeklyQuizScore: 0,
  weeklySuperScore: 0,
};

const STREAK_REWARDS = [50, 75, 100, 150, 200, 250, 500];

const FREE_SEGS = [
  { label: "100", value: 100, color: "#6366f1" },
  { label: "200", value: 200, color: "#8b5cf6" },
  { label: "500", value: 500, color: "#f59e0b" },
  { label: "100", value: 100, color: "#3b82f6" },
  { label: "300", value: 300, color: "#10b981" },
  { label: "200", value: 200, color: "#ec4899" },
  { label: "150", value: 150, color: "#14b8a6" },
  { label: "250", value: 250, color: "#f97316" },
];

const QUIZ_SEGS = [
  { label: "100", value: 100, color: "#6366f1" },
  { label: "200", value: 200, color: "#8b5cf6" },
  { label: "300", value: 300, color: "#10b981" },
  { label: "400", value: 400, color: "#f59e0b" },
  { label: "500", value: 500, color: "#ef4444" },
  { label: "Sorry", value: 0, color: "#94a3b8" },
];

const SUPER_SEGS = [
  { label: "300", value: 300, color: "#f59e0b" },
  { label: "500", value: 500, color: "#ef4444" },
  { label: "700", value: 700, color: "#8b5cf6" },
  { label: "400", value: 400, color: "#3b82f6" },
  { label: "1000", value: 1000, color: "#10b981" },
  { label: "Sorry", value: 0, color: "#94a3b8" },
];

// ============================================================
// SPIN WHEEL CLASS
// ============================================================
class SpinWheel {
  constructor(canvasEl, segments) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext("2d");
    this.segs = segments;
    this.rot = Math.random() * Math.PI * 2;
    this.spinning = false;
    this.draw();
  }

  draw(rot = this.rot) {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const cx = W / 2, cy = W / 2;
    const r = cx - 6;
    const n = this.segs.length;
    const arc = (2 * Math.PI) / n;

    ctx.clearRect(0, 0, W, W);

    this.segs.forEach((seg, i) => {
      const sa = rot + i * arc - Math.PI / 2;
      const ea = sa + arc;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, sa, ea);
      ctx.closePath();
      const inactive = seg.active === false;
      ctx.fillStyle = inactive ? "#dde1ea" : seg.color;
      ctx.fill();

      ctx.strokeStyle = "rgba(255,255,255,0.75)";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(sa + arc / 2);
      const labelR = r * 0.65;

      if (seg.label === "Sorry") {
        ctx.font = `${W > 280 ? 18 : 15}px serif`;
        ctx.textAlign = "center";
        ctx.fillText("😅", labelR, 6);
      } else {
        ctx.fillStyle = inactive ? "#aab0bc" : "#fff";
        ctx.font = `bold ${W > 280 ? 13 : 11}px Arial`;
        ctx.textAlign = "center";
        ctx.fillText(seg.label, labelR, 4);
        ctx.font = `${W > 280 ? 10 : 8}px Arial`;
        ctx.fillStyle = inactive ? "#bcc2cc" : "rgba(255,255,255,.8)";
        ctx.fillText("pts", labelR, 15);
      }
      ctx.restore();
    });

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, 2 * Math.PI);
    const grad = ctx.createRadialGradient(cx, cy - 4, 2, cx, cy, 20);
    grad.addColorStop(0, "#fff");
    grad.addColorStop(1, "#e2e8f0");
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,.08)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "#667eea";
    ctx.font = "bold 9px Arial";
    ctx.textAlign = "center";
    ctx.fillText("AG", cx, cy + 3);
  }

  spinTo(targetIndex, onDone) {
    if (this.spinning) return;
    this.spinning = true;

    const n = this.segs.length;
    const arc = (2 * Math.PI) / n;

    const targetRot = -((targetIndex + 0.5) * arc);
    const targetNorm = ((targetRot % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const currentNorm = ((this.rot % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

    let delta = targetNorm - currentNorm;
    if (delta <= 0) delta += 2 * Math.PI;

    const fullSpins = (5 + Math.floor(Math.random() * 4)) * 2 * Math.PI;
    const totalRotation = fullSpins + delta;
    const duration = 4200 + Math.random() * 800;
    const startRot = this.rot;
    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);

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
   async function loadHeader() {
    try {
        console.log('📋 Loading header...');
        
        // Try multiple possible paths for header
        const possiblePaths = [
            '/partials/header.html',
            '../partials/header.html',
            'partials/header.html',
            '/assets/partials/header.html'
        ];
        
        let headerHtml = null;
        let successPath = null;
        
        for (const path of possiblePaths) {
            try {
                const response = await fetch(path);
                if (response.ok) {
                    headerHtml = await response.text();
                    successPath = path;
                    break;
                }
            } catch (e) {
                // Continue to next path
            }
        }
        
        if (!headerHtml) {
            console.warn('⚠️ Header not found, using fallback');
            headerHtml = getFallbackHeader();
        } else {
            console.log(`✅ Header loaded from: ${successPath}`);
        }
        
        const headerContainer = document.getElementById('header-container');
        if (headerContainer) {
            headerContainer.innerHTML = headerHtml;
            
            // Initialize header components
            if (typeof window.initHeader === 'function') {
                setTimeout(() => window.initHeader(), 100);
            }
            
            // Load user profile icon if available
            if (historyState.user?.user_id && typeof window.loadUserProfileIcon === 'function') {
                setTimeout(() => window.loadUserProfileIcon(historyState.user.user_id), 200);
            }
        } else {
            console.error('❌ Header container not found');
        }
        
    } catch (error) {
        console.error('❌ Header load failed:', error);
        // Still continue, page might work without header
    }
    await loadHeader();
}

// WRITE OPERATIONS ONLY - Worker API
async function apiWrite(path, body) {
  const opts = {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Client-Host": window.location.host
    },
    body: JSON.stringify(body)
  };
  const res = await fetch(`${CONFIG.WORKER_URL}${path}`, opts);
  return res.json();
}

// READ OPERATIONS - Direct Supabase
async function getSpinStatus() {
  try {
    // Try Supabase direct first
    if (window.supabase && window.currentUser?.user_id) {
      const today = new Date().toISOString().slice(0, 10);
      
      // Get streak
      const { data: streakData } = await window.supabase
        .from('streak_records')
        .select('streak, last_date')
        .eq('user_id', window.currentUser.user_id)
        .single();
      
      // Get spin records
      const { data: spinData } = await window.supabase
        .from('spin_records')
        .select('type, points')
        .eq('user_id', window.currentUser.user_id)
        .eq('spin_date', today);
      
      const freeSpin = spinData?.find(s => s.type === 'free');
      const quizSpin = spinData?.find(s => s.type === 'quiz');
      
      return {
        success: true,
        streak: streakData?.streak || 0,
        streak_claimed: streakData?.last_date === today,
        free_spin_done: !!freeSpin,
        free_spin_points: freeSpin?.points || 0,
        quiz_spin_done: !!quizSpin,
        quiz_spin_points: quizSpin?.points || 0,
        super_spin_done: false,
        super_spin_points: 0,
        weekly_quiz_score: 0,
        weekly_super_score: 0
      };
    }
    
    // Fallback to worker
    const res = await fetch(`${CONFIG.WORKER_URL}/api/user/spin-status`, {
      credentials: "include",
      headers: { "X-Client-Host": window.location.host }
    });
    return res.json();
  } catch (err) {
    console.error("Spin status error:", err);
    return { success: false };
  }
}

async function getQuizQuestions() {
  try {
    // Try Supabase direct first (if not submitted today)
    if (window.supabase && window.currentUser?.user_id) {
      const today = new Date().toISOString().slice(0, 10);
      
      // Check if already submitted today
      const { data: existing } = await window.supabase
        .from('quiz_submissions')
        .select('score, answers, questions')
        .eq('user_id', window.currentUser.user_id)
        .eq('quiz_date', today)
        .single();
      
      if (existing) {
        // Already submitted, return with answers
        return {
          success: true,
          submitted: true,
          score: existing.score,
          selections: existing.answers,
          earn: []
        };
      }
      
      // Get random questions from Supabase
      const { data: allQuestions } = await window.supabase
        .from('quiz_questions')
        .select('qid, question, option_a, option_b, option_c, option_d, prepare_link')
        .eq('active', true);
      
      if (allQuestions && allQuestions.length >= 5) {
        // Shuffle and pick 5
        const shuffled = [...allQuestions];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        const questions = shuffled.slice(0, 5);
        
        return {
          success: true,
          submitted: false,
          earn: questions,
          score: 0
        };
      }
    }
    
    // Fallback to worker
    const res = await fetch(`${CONFIG.WORKER_URL}/api/user/earn`, {
      credentials: "include",
      headers: { "X-Client-Host": window.location.host }
    });
    return res.json();
  } catch (err) {
    console.error("Quiz questions error:", err);
    return { success: false, earn: [] };
  }
}

async function getSuperQuestions() {
  try {
    if (window.supabase && window.currentUser?.user_id) {
      const week = getCurrentWeek();
      
      const { data: existing } = await window.supabase
        .from('super_submissions')
        .select('correct_count, answers')
        .eq('user_id', window.currentUser.user_id)
        .eq('week', week)
        .single();
      
      if (existing) {
        return {
          success: true,
          submitted: true,
          correct_count: existing.correct_count,
          selections: existing.answers
        };
      }
      
      const { data: questions } = await window.supabase
        .from('super_questions')
        .select('qid, question, option_a, option_b, option_c, option_d, prepare_link')
        .eq('week', week)
        .eq('active', true);
      
      return {
        success: true,
        submitted: false,
        questions: questions || []
      };
    }
    
    const res = await fetch(`${CONFIG.WORKER_URL}/api/user/super-questions`, {
      credentials: "include",
      headers: { "X-Client-Host": window.location.host }
    });
    return res.json();
  } catch (err) {
    return { success: false, questions: [] };
  }
}

function getCurrentWeek() {
  const date = new Date();
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const diff = target - firstThursday;
  const week = 1 + Math.round(diff / 604800000);
  return target.getFullYear() + "-W" + String(week).padStart(2, "0");
}

function qs(id) { return document.getElementById(id); }

// ============================================================
// INIT - READ from Supabase Direct
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const [spinStatus, quizData, superData] = await Promise.all([
      getSpinStatus(),
      getQuizQuestions(),
      getSuperQuestions()
    ]);

    if (spinStatus.success) {
      E.streak = spinStatus.streak || 0;
      E.streakClaimed = spinStatus.streak_claimed || false;
      E.freeSpinDone = spinStatus.free_spin_done || false;
      E.freeSpinPoints = spinStatus.free_spin_points || 0;
      E.quizSpinDone = spinStatus.quiz_spin_done || false;
      E.quizSpinPoints = spinStatus.quiz_spin_points || 0;
    }

    if (quizData.success) {
      E.quizData = quizData.earn || [];
      E.quizDone = quizData.submitted || false;
      
      if (quizData.submitted && quizData.selections) {
        E.quizSelections = typeof quizData.selections === "string"
          ? JSON.parse(quizData.selections)
          : (quizData.selections || {});
      }
    }

    if (superData.success && superData.questions?.length) {
      E.superAvailable = true;
      E.superData = superData.questions;
      if (superData.submitted) {
        E.superDone = true;
        E.superSelections = superData.selections || {};
        E.superCorrect = superData.correct_count || 0;
      }
    }

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
  if (qs("weeklyTotal")) qs("weeklyTotal").textContent = `${total} pts`;
  if (qs("quizSpinScore")) qs("quizSpinScore").textContent = E.quizSpinDone ? `${E.quizSpinPoints} pts` : "—";
  if (qs("superSpinScore")) qs("superSpinScore").textContent = E.superSpinDone ? `${E.superSpinPoints} pts` : "—";
}

function startCountdown() {
  const el = qs("resetCountdown");
  if (!el) return;
  const tick = () => {
    const now = new Date();
    const sunday = new Date();
    const daysUntil = (7 - now.getDay()) % 7 || 7;
    sunday.setDate(now.getDate() + daysUntil);
    sunday.setHours(0, 0, 0, 0);

    const ms = sunday - now;
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
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
    const day = i + 1;
    const done = i < E.streak;
    const isToday = i === E.streak && !E.streakClaimed;
    const isMega = day === 7;

    let cls = "streak-day";
    if (done) cls += " done";
    if (isToday) cls += " today";
    if (isMega) cls += " mega";

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
    if (msg) msg.innerHTML = `✅ Day ${E.streak} claimed! <strong>+${claimed} pts</strong>`;
  } else if (E.streak < 7) {
    const dayPts = STREAK_REWARDS[E.streak];
    if (msg) msg.innerHTML = `<button class="streak-claim-btn" id="streakBtn" onclick="claimStreak()">🎯 Claim Day ${E.streak + 1} (+${dayPts} pts)</button>`;
  } else if (msg) {
    msg.innerHTML = `🏆 Full week complete! Well done!`;
  }
}

// WRITE: Claim streak via Worker
async function claimStreak() {
  const btn = qs("streakBtn");
  if (btn) { btn.disabled = true; btn.textContent = "Claiming…"; }
  try {
    const data = await apiWrite("/api/user/claim-streak", {});
    if (data.success) {
      E.streak = data.streak;
      E.streakClaimed = true;
      renderStreak();
      toast(`🔥 Day ${data.streak} streak! +${data.points_earned} pts`, "#10b981");
    } else {
      toast(data.error || "Already claimed today", "#f59e0b");
      if (btn) btn.disabled = false;
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
  const el = qs("freeSpinSection");
  const badge = qs("freeSpinBadge");
  if (!el) return;

  if (E.freeSpinDone) {
    if (badge) { badge.textContent = "Done ✓"; badge.className = "card-badge badge-done"; }
    el.innerHTML = `<div class="done-overlay"><div class="d-icon">🎉</div><div class="d-score">+${E.freeSpinPoints} pts</div><p class="d-sub">Come back tomorrow for another free spin!</p></div>`;
    return;
  }

  if (badge) { badge.textContent = "Daily"; badge.className = "card-badge badge-free"; }
  el.innerHTML = `<div class="spin-container"><div class="wheel-wrap"><div class="wheel-ptr"></div><canvas id="freeCanvas" class="wheel" width="300" height="300"></canvas></div><button class="spin-btn free-col" id="freeSpinBtn" onclick="doFreeSpin()">🎯 Spin Now!</button><p style="font-size:12px;color:#94a3b8;margin:0;text-align:center">Win 100–500 pts daily — completely free!</p></div>`;
  window._freeWheel = new SpinWheel(qs("freeCanvas"), FREE_SEGS.map(s => ({...s})));
}

// WRITE: Free spin via Worker
async function doFreeSpin() {
  if (E.freeSpinDone) return;
  const btn = qs("freeSpinBtn");
  if (!btn || btn.disabled) return;
  btn.disabled = true;
  btn.textContent = "Spinning…";

  const weights = [3, 3, 1, 3, 2, 3, 2, 2];
  const total = weights.reduce((a, b) => a + b, 0);
  let rand = Math.random() * total;
  let result = 0;
  for (let i = 0; i < weights.length; i++) {
    rand -= weights[i];
    if (rand <= 0) { result = i; break; }
  }
  const pts = FREE_SEGS[result].value;

  window._freeWheel.spinTo(result, async () => {
    try {
      const data = await apiWrite("/api/user/free-spin", { points: pts });
      if (data.success) {
        E.freeSpinDone = true;
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
// QUIZ SPIN (READ from Supabase, WRITE via Worker)
// ============================================================
let _quizSelected = {};
let _quizSubmitting = false;

function renderQuizSection() {
  const el = qs("quizSection");
  const badge = qs("quizSpinBadge");
  if (!el) return;

  if (E.quizDone && E.quizSpinDone) {
    if (badge) { badge.textContent = "Done ✓"; badge.className = "card-badge badge-done"; }
    el.innerHTML = `<div class="done-overlay"><div class="d-icon">🏆</div><div class="d-score">+${E.quizSpinPoints} pts</div><p class="d-sub">${E.quizCorrect}/${E.quizData.length} correct answers</p><button class="ghost-btn" style="margin-top:12px" onclick="viewQuizAnswers()">👁️ View My Answers</button>&nbsp;<button class="ghost-btn" style="margin-top:12px" onclick="openLeaderboard()">🏆 Leaderboard</button></div>`;
    return;
  }

  if (E.quizDone && !E.quizSpinDone) {
    if (badge) { badge.textContent = "Spin!"; badge.className = "card-badge badge-quiz"; }
    _renderQuizSpinWheel();
    return;
  }

  if (badge) { badge.textContent = "+10 pts/Q"; badge.className = "card-badge badge-quiz"; }
  _renderQuizQuestions();
}

function _renderQuizQuestions() {
  const el = qs("quizSection");
  _quizSelected = {};

  if (!E.quizData.length) {
    el.innerHTML = `<p style="text-align:center;color:#94a3b8;padding:20px;margin:0">No quiz questions today — check back tomorrow!</p>`;
    return;
  }

  el.innerHTML = `<div class="quiz-cards-wrap" id="quizQWrap">${E.quizData.map((q, idx) => `<div class="quiz-card" data-qid="${q.qid}">${q.prepare_link ? `<div class="prepare-wrapper"><a href="${q.prepare_link}" target="_blank" class="prepare-link">📘 help</a></div>` : ''}<div class="question-number">Question ${idx + 1}/${E.quizData.length}</div><h3>${q.question}</h3>${['A','B','C','D'].map(opt => `<div class="option" onclick="selectQ('${q.qid}','${opt}',this)">${opt}. ${q['option_' + opt.toLowerCase()] || 'Option ' + opt}</div>`).join('')}</div>`).join('')}<button id="submitQuizBtn" class="submit-btn" onclick="doSubmitQuiz()" style="width:100%">📤 Submit Quiz</button></div>`;
}

function selectQ(qid, opt, el) {
  _quizSelected[qid] = opt;
  el.closest(".quiz-card").querySelectorAll(".option").forEach(o => o.classList.remove("selected"));
  el.classList.add("selected");
  if (navigator.vibrate) navigator.vibrate(10);
  const filled = Object.keys(_quizSelected).length;
  const total = E.quizData.length;
  const bar = qs("progressBar");
  if (bar) bar.style.width = `${(filled / total) * 100}%`;
}
window.selectQ = selectQ;

// WRITE: Submit quiz via Worker
async function doSubmitQuiz() {
  if (_quizSubmitting) return;
  if (Object.keys(_quizSelected).length < E.quizData.length) {
    toast(`Please answer all ${E.quizData.length} questions`, "#f59e0b");
    return;
  }

  _quizSubmitting = true;
  const btn = qs("submitQuizBtn");
  if (btn) { btn.disabled = true; btn.textContent = "Submitting…"; }

  try {
    const data = await apiWrite("/api/user/submit-quiz", { selections: _quizSelected });
    if (!data.success) throw new Error(data.error || "Submit failed");

    E.quizDone = true;
    E.quizSelections = { ..._quizSelected };
    if (data.correctAnswers) {
      data.correctAnswers.forEach(q => { E.quizAnswers[String(q.qid)] = q.correct_option; });
    }
    E.quizCorrect = Object.keys(E.quizSelections).filter(qid => E.quizSelections[qid] === E.quizAnswers[qid]).length;
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
  const total = E.quizData.length;
  const segs = QUIZ_SEGS.map((seg, i) => ({ ...seg, active: seg.value === 0 ? false : i < correct }));
  const dotsHtml = QUIZ_SEGS.filter(s => s.value > 0).map((_, i) => `<span class="seg-dot ${i < correct ? 'on' : 'off'}"></span>`).join('');

  el.innerHTML = `<div style="text-align:center;margin-bottom:14px"><p style="margin:0;font-size:14px;color:#475569;font-weight:600">🎯 ${correct}/${total} correct answers</p><div class="seg-hint" style="margin-top:8px">${dotsHtml}<span style="color:#64748b">${correct} active block${correct !== 1 ? 's' : ''}</span></div>${correct === 0 ? `<p style="font-size:12px;color:#ef4444;margin:6px 0 0">No active blocks — no spin reward today 😢</p>` : `<p style="font-size:12px;color:#10b981;margin:6px 0 0">Spin will land on one of your ${correct} active block${correct !== 1 ? 's' : ''}!</p>`}</div><div class="spin-container"><div class="wheel-wrap"><div class="wheel-ptr"></div><canvas id="quizCanvas" class="wheel" width="300" height="300"></canvas></div>${correct > 0 ? `<button class="spin-btn" id="quizSpinBtn" onclick="doQuizSpin()">🎰 Spin & Win!</button>` : `<button class="ghost-btn" onclick="viewQuizAnswers()">👁️ View My Answers</button>`}</div>`;
  window._quizWheel = new SpinWheel(qs("quizCanvas"), segs);
  window._quizSpinSegs = segs;
}

// WRITE: Quiz spin via Worker
async function doQuizSpin() {
  if (E.quizSpinDone || E.quizCorrect === 0) return;
  const active = (window._quizSpinSegs || QUIZ_SEGS).map((seg, i) => ({ seg, i })).filter(({ seg }) => seg.active && seg.value > 0);
  if (!active.length) return;
  const pick = active[Math.floor(Math.random() * active.length)];
  const target = pick.i;
  const pts = pick.seg.value;

  const btn = qs("quizSpinBtn");
  btn.disabled = true;
  btn.textContent = "Spinning…";

  window._quizWheel.spinTo(target, async () => {
    try {
      const data = await apiWrite("/api/user/record-spin", { type: "quiz", points: pts });
      if (data.success) {
        E.quizSpinDone = true;
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

function viewQuizAnswers() {
  const el = qs("quizSection");
  if (!el || !E.quizData.length) return;
  const frag = document.createDocumentFragment();
  E.quizData.forEach((q, idx) => {
    const qid = String(q.qid);
    const sel = E.quizSelections[qid] || '';
    const corr = (E.quizAnswers[qid] || '').toUpperCase();
    const opts = { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d };
    const card = document.createElement("div");
    card.className = "quiz-card view-mode";
    card.style.marginBottom = "12px";
    let optsHtml = '';
    Object.entries(opts).forEach(([k, txt]) => {
      let cls = "option";
      let ind = "";
      if (k === corr) cls += " correct-answer";
      if (k === sel) {
        cls += " selected";
        if (k === corr) { cls += " correct-selected"; ind = " ✓"; }
        else { cls += " wrong-answer"; ind = " ✗"; }
      }
      optsHtml += `<div class="${cls}">${k}. ${txt || 'Option ' + k}${ind}</div>`;
    });
    const ok = sel === corr;
    card.innerHTML = `<div class="question-number">Q${idx + 1}/${E.quizData.length}</div><h3>${q.question}</h3>${optsHtml}<div style="margin-top:10px;padding:10px 12px;border-radius:8px;font-size:13px;${ok ? 'background:#d1fae5;color:#065f46;border-left:4px solid #10b981' : 'background:#fee2e2;color:#991b1b;border-left:4px solid #ef4444'}">${ok ? '✅ Correct! Well done.' : `❌ Your answer: ${sel || '—'} &nbsp;|&nbsp; Correct: ${corr}`}</div>`;
    frag.appendChild(card);
  });
  const backBtn = document.createElement("button");
  backBtn.className = "ghost-btn";
  backBtn.style.width = "100%";
  backBtn.style.marginTop = "4px";
  backBtn.textContent = "← Back";
  backBtn.onclick = () => renderQuizSection();
  frag.appendChild(backBtn);
  el.innerHTML = "";
  el.appendChild(frag);
}
window.viewQuizAnswers = viewQuizAnswers;

// ============================================================
// SUPER SPIN (READ from Supabase, WRITE via Worker)
// ============================================================
let _superSelected = {};
let _superSubmitting = false;

function renderSuperSpin() {
  const el = qs("superSpinSection");
  const badge = qs("superSpinBadge");
  if (!el) return;

  if (!E.superAvailable) {
    if (badge) { badge.textContent = "Locked"; badge.className = "card-badge badge-lock"; }
    el.innerHTML = `<div class="locked-overlay"><div class="l-icon">🔒</div><p style="font-weight:600;color:#64748b">Super Spin is not active.</p><p>It unlocks when special questions are available. Check Regularly!</p></div>`;
    return;
  }

  if (E.superDone && E.superSpinDone) {
    if (badge) { badge.textContent = "Done ✓"; badge.className = "card-badge badge-done"; }
    el.innerHTML = `<div class="done-overlay"><div class="d-icon">⚡</div><div class="d-score">+${E.superSpinPoints} pts</div><p class="d-sub">Super Spin complete! Resets with weekly score on Sunday.</p></div>`;
    return;
  }

  if (E.superDone && !E.superSpinDone) {
    if (badge) { badge.textContent = "Spin!"; badge.className = "card-badge badge-super"; }
    _renderSuperSpinWheel();
    return;
  }

  if (badge) { badge.textContent = "Weekly"; badge.className = "card-badge badge-super"; }
  _renderSuperQuestions();
}

function _renderSuperQuestions() {
  const el = qs("superSpinSection");
  _superSelected = {};
  el.innerHTML = `<p style="font-size:13px;color:#f59e0b;font-weight:700;text-align:center;margin:0 0 14px">⚡ Weekly Super Quiz — Higher rewards await!</p><div class="quiz-cards-wrap">${E.superData.map((q, idx) => `<div class="quiz-card" data-qid="${q.qid}">${q.prepare_link ? `<div class="prepare-wrapper"><a href="${q.prepare_link}" target="_blank" class="prepare-link">📘 help</a></div>` : ''}<div class="question-number">Question ${idx + 1}/${E.superData.length}</div><h3>${q.question}</h3>${['A','B','C','D'].map(opt => `<div class="option" onclick="selectSQ('${q.qid}','${opt}',this)">${opt}. ${q['option_' + opt.toLowerCase()] || 'Option ' + opt}</div>`).join('')}</div>`).join('')}<button id="submitSuperBtn" class="submit-btn" onclick="doSubmitSuper()" style="width:100%;background:linear-gradient(135deg,#f59e0b,#ef4444)">⚡ Submit Super Quiz</button></div>`;
}

function selectSQ(qid, opt, el) {
  _superSelected[qid] = opt;
  el.closest(".quiz-card").querySelectorAll(".option").forEach(o => o.classList.remove("selected"));
  el.classList.add("selected");
  if (navigator.vibrate) navigator.vibrate(10);
}
window.selectSQ = selectSQ;

// WRITE: Submit super quiz via Worker
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
    const data = await apiWrite("/api/user/submit-super-quiz", { selections: _superSelected });
    if (!data.success) throw new Error(data.error || "Submit failed");
    E.superDone = true;
    E.superSelections = { ..._superSelected };
    E.superCorrect = data.correct_count || 0;
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
  const total = E.superData.length;
  const segs = SUPER_SEGS.map((seg, i) => ({ ...seg, active: seg.value === 0 ? false : i < correct }));
  const dotsHtml = SUPER_SEGS.filter(s => s.value > 0).map((_, i) => `<span class="seg-dot ${i < correct ? 'on' : 'off'}"></span>`).join('');

  el.innerHTML = `<div style="text-align:center;margin-bottom:14px"><p style="margin:0;font-size:14px;color:#475569;font-weight:600">⚡ ${correct}/${total} correct answers</p><div class="seg-hint" style="margin-top:8px">${dotsHtml}<span style="color:#64748b">${correct} active block${correct !== 1 ? 's' : ''}</span></div>${correct === 0 ? `<p style="font-size:12px;color:#ef4444;margin:6px 0 0">No active blocks — keep studying for next week!</p>` : `<p style="font-size:12px;color:#f59e0b;font-weight:700;margin:6px 0 0">Up to 1000 pts! Spin now!</p>`}</div><div class="spin-container"><div class="wheel-wrap"><div class="wheel-ptr"></div><canvas id="superCanvas" class="wheel" width="300" height="300"></canvas></div>${correct > 0 ? `<button class="spin-btn super-col" id="superSpinBtn" onclick="doSuperSpin()">⚡ Super Spin!</button>` : `<p style="color:#94a3b8;font-size:13px;text-align:center;margin:0">Better luck next week!</p>`}</div>`;
  window._superWheel = new SpinWheel(qs("superCanvas"), segs);
  window._superSpinSegs = segs;
}

// WRITE: Super spin via Worker
async function doSuperSpin() {
  if (E.superSpinDone || E.superCorrect === 0) return;
  const active = (window._superSpinSegs || SUPER_SEGS).map((seg, i) => ({ seg, i })).filter(({ seg }) => seg.active && seg.value > 0);
  if (!active.length) return;
  const pick = active[Math.floor(Math.random() * active.length)];
  const target = pick.i;
  const pts = pick.seg.value;

  const btn = qs("superSpinBtn");
  btn.disabled = true;
  btn.textContent = "Spinning…";

  window._superWheel.spinTo(target, async () => {
    try {
      const data = await apiWrite("/api/user/record-spin", { type: "super", points: pts });
      if (data.success) {
        E.superSpinDone = true;
        E.superSpinPoints = pts;
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
// LEADERBOARD (READ from Supabase Direct)
// ============================================================
async function openLeaderboard() {
  const modal = qs("leaderboardModal");
  const list = qs("leaderboardList");
  if (!modal || !list) return;
  modal.classList.add("open");
  list.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Loading...</p></div>`;

  try {
    if (window.supabase) {
      const { data, error } = await window.supabase
        .from('leaderboard')
        .select('user_id, score, user_profiles(name)')
        .order('score', { ascending: false })
        .limit(10);
      
      if (!error && data && data.length) {
        const medals = ["🥇", "🥈", "🥉"];
        list.innerHTML = data.map((u, i) => `<div class="leaderboard-row ${['gold', 'silver', 'bronze'][i] || ''}"><span class="rank">${medals[i] || i + 1}</span><span class="user">${u.user_id?.substring(0, 6) || 'User'}…</span><span class="score">${u.score || 0} pts</span></div>`).join('');
        return;
      }
    }
    list.innerHTML = '<p class="empty">No scores yet — be the first!</p>';
  } catch (err) {
    list.innerHTML = `<p class="error">Failed to load leaderboard</p>`;
  }
}

function closeLeaderboard() {
  const m = qs("leaderboardModal");
  if (m) m.classList.remove("open");
}
window.openLeaderboard = openLeaderboard;
window.closeLeaderboard = closeLeaderboard;
document.addEventListener("DOMContentLoaded", loadQuiz);
  await loadHeader();
async function loadQuiz() {
    const container = document.getElementById("quizContainer");

    try {
        const res = await fetch(`${CONFIG.WORKER_URL}/api/user/earn`, {
            credentials: 'include',
            headers: { 'X-Client-Host': window.location.host }
        });

        const data = await res.json();

        if (!data.success || !data.earn.length) {
            container.innerHTML = "<p>No questions available.</p>";
            return;
        }

        container.innerHTML = data.earn.map((q, index) => `
            <div class="quiz-card">
                <h3>Q${index + 1}: ${q.question}</h3>
                <button onclick="selectAnswer('${q.qid}', 'A')">${q.optionA}</button>
                <button onclick="selectAnswer('${q.qid}', 'B')">${q.optionB}</button>
                <button onclick="selectAnswer('${q.qid}', 'C')">${q.optionC}</button>
                <button onclick="selectAnswer('${q.qid}', 'D')">${q.optionD}</button>
            </div>
        `).join("");

    } catch (err) {
        container.innerHTML = "Error loading quiz.";
    }
}

function selectAnswer(qid, option) {
    alert(`Selected ${option} for ${qid}`);
}
async function requireAuth() {
    const clientHost = window.location.host;

    const res = await fetch(`${CONFIG.WORKER_URL}/api/auth/status`, {
        credentials: "include",
        headers: { "X-Client-Host": clientHost }
    });

    const data = await res.json();

    console.log("AUTH RESULT =>", data);

    // ⭐⭐⭐ MAIN FIX ⭐⭐⭐
    if (data.authenticated) {
        window.currentUser = data;   // <-- यहीं problem थी
    }

    return data.authenticated;
}
function showUnauthorized() {
    document.body.innerHTML = `
    <div style="padding:40px;color:white;text-align:center">
        <h1>❌ Unauthorized Access</h1>
        <p>Please login to continue.</p>
        <a href="https://agtechscript.in" 
           style="padding:10px 20px;background:#00d1ff;color:black;border-radius:8px;">
           Go to Login
        </a>
    </div>`;
}

// 🔥 Run immediately
requireAuth();
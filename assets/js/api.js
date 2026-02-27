/* ===============================
   USER NOTIFICATIONS
=============================== */
async function getNotifications() {
    const res = await fetch(`${CONFIG.WORKER_URL}/api/user/notifications`, {
        credentials: "include",
        headers: {
            "X-Client-Host": window.location.host
        }
    });

    return await res.json();
}
/* ===============================
   USER PURCHASES
=============================== */
async function getPurchases() {
    const res = await fetch(`${CONFIG.WORKER_URL}/api/user/purchases`, {
        credentials: "include"
    });
    return await res.json();
}

/* ===============================
   USER EARN HISTORY
=============================== */
async function getEarn() {
    const res = await fetch(`${CONFIG.WORKER_URL}/api/user/earn`, {
        credentials: "include"
    });
    return await res.json();
}

/* ===============================
   USER USE (REDEEM)
=============================== */
async function getUse() {
    const res = await fetch(`${CONFIG.WORKER_URL}/api/user/use`, {
        credentials: "include"
    });
    return await res.json();
}

/* ===============================
   USER POINTS LOG
=============================== */
async function getPointsLog() {
    const res = await fetch(`${CONFIG.WORKER_URL}/api/user/points-log`, {
        credentials: "include"
    });
    return await res.json();
}
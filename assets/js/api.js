async function getNotifications() {
    const res = await fetch(`${CONFIG.WORKER_URL}/api/user/notifications`, {
        credentials: "include",
        headers: { "X-Client-Host": window.location.host }
    });

    return await res.json();
}
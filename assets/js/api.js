const API = "https://api.agtechscript.in";

async function getNotifications() {
    const res = await fetch(`${API}/api/user/notifications`, {
        credentials: "include"
    });
    return await res.json();
}
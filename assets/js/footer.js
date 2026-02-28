  // FOOTER
    fetch("/partials/footer.html")
        .then(r => r.text())
        .then(html => {
            document.getElementById("footer-container").innerHTML = html;
            const Y = document.getElementById("year");
            if (Y) Y.textContent = new Date().getFullYear();
        });
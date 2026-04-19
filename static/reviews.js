function resolveApiBase() {
    const override = window.RESUME_API_BASE_URL || localStorage.getItem("resume_api_base_url");
    if (override) {
        return override.replace(/\/+$/, "");
    }

    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        return "http://localhost:8080";
    }

    return window.location.origin.replace(/\/+$/, "");
}

const API = resolveApiBase();
document.addEventListener("DOMContentLoaded", () => {

    const stars = document.querySelectorAll(".star");
    const ratingInput = document.getElementById("reviewRating");
    const submitBtn = document.getElementById("submitReviewBtn");

    let isSubmitting = false;

    /* ================= STAR SYSTEM ================= */

    stars.forEach(star => {

        star.addEventListener("mouseover", () => {
            highlightStars(star.dataset.value);
        });

        star.addEventListener("mouseout", () => {
            highlightStars(ratingInput.value);
        });

        star.addEventListener("click", () => {
            ratingInput.value = star.dataset.value;
            highlightStars(star.dataset.value);
        });

    });

    function highlightStars(value) {
        stars.forEach(star => {
            if (star.dataset.value <= value) {
                star.classList.add("selected");
            } else {
                star.classList.remove("selected");
            }
        });
    }

    /* ================= SUBMIT REVIEW ================= */

    submitBtn.addEventListener("click", submitReview);

    function submitReview() {

        if (isSubmitting) return;
        isSubmitting = true;

        const name = document.getElementById("reviewName").value.trim();
        const comment = document.getElementById("reviewComment").value.trim();
        const rating = ratingInput.value;

        if (!name || !comment || rating == 0) {
            alert("Please select rating and fill all fields");
            isSubmitting = false;
            return;
        }

        fetch(API + "/addReview", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: `name=${encodeURIComponent(name)}&rating=${rating}&comment=${encodeURIComponent(comment)}`
        })
            .then(res => res.text())
            .then(() => {

                document.getElementById("reviewName").value = "";
                document.getElementById("reviewComment").value = "";
                ratingInput.value = 0;
                highlightStars(0);

                loadReviews();
                isSubmitting = false;

            })
            .catch(() => {
                alert("Error submitting review");
                isSubmitting = false;
            });
    }

    /* ================= LOAD REVIEWS ================= */

    function loadReviews() {

        fetch(API + "/getReviews")
            .then(res => res.json())
            .then(reviews => {

                const container = document.getElementById("reviewList");
                container.innerHTML = "";

                let ratingCount = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
                let totalStars = 0;

                reviews.forEach(r => {
                    ratingCount[r.rating]++;
                    totalStars += parseInt(r.rating);
                });

                const avg = reviews.length
                    ? (totalStars / reviews.length).toFixed(1)
                    : 0;

                document.getElementById("averageRating").innerText = avg;

                for (let i = 1; i <= 5; i++) {

                    let percent = reviews.length
                        ? (ratingCount[i] / reviews.length) * 100
                        : 0;

                    const bar = document.getElementById("bar" + i);
                    const count = document.getElementById("count" + i);

                    if (bar) bar.style.width = percent + "%";
                    if (count) count.innerText = ratingCount[i];
                }

                reviews.forEach(r => {
                    container.innerHTML += `
                    <div class="review-card">
                        <h4>${r.name}</h4>
                        <p>${"\u2B50".repeat(r.rating)}</p>
                        <p>${r.comment}</p>
                    </div>
                `;
                });

            });
    }

    loadReviews();

});
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("sidebarOverlay");
const toggle = document.getElementById("mobileToggle");

function setSidebarState(isOpen) {
    if (!sidebar || !overlay) return;
    sidebar.classList.toggle("active", isOpen);
    overlay.classList.toggle("active", isOpen);
    document.body.style.overflow = isOpen ? "hidden" : "";
}

if (toggle && sidebar && overlay) {
    toggle.addEventListener("click", () => {
        setSidebarState(!sidebar.classList.contains("active"));
    });
}

if (overlay) {
    overlay.addEventListener("click", () => {
        setSidebarState(false);
    });
}

document.querySelectorAll(".sidebar a").forEach(link => {
    link.addEventListener("click", () => {
        setSidebarState(false);
    });
});

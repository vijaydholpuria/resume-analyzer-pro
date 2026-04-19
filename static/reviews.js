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

    async function submitReview() {

        if (isSubmitting) return;
        isSubmitting = true;
        submitBtn.disabled = true;

        const name = document.getElementById("reviewName").value.trim();
        const comment = document.getElementById("reviewComment").value.trim();
        const rating = ratingInput.value;

        if (!name || !comment || rating == 0) {
            alert("Please select rating and fill all fields");
            isSubmitting = false;
            submitBtn.disabled = false;
            return;
        }

        try {
            const response = await fetch(API + "/addReview", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: `name=${encodeURIComponent(name)}&rating=${rating}&comment=${encodeURIComponent(comment)}`
            });

            const message = (await response.text()).trim();
            if (!response.ok) {
                throw new Error(message || "Error submitting review");
            }

            document.getElementById("reviewName").value = "";
            document.getElementById("reviewComment").value = "";
            ratingInput.value = 0;
            highlightStars(0);

            await loadReviews();
        } catch (error) {
            alert(error.message || "Error submitting review");
        } finally {
            isSubmitting = false;
            submitBtn.disabled = false;
        }
    }

    /* ================= LOAD REVIEWS ================= */

    async function loadReviews() {
        const container = document.getElementById("reviewList");

        try {
            const response = await fetch(API + "/getReviews", { cache: "no-store" });
            if (!response.ok) {
                const errorText = (await response.text()).trim();
                throw new Error(errorText || "Failed to load reviews");
            }

            const reviews = await response.json();
            if (!Array.isArray(reviews)) {
                throw new Error("Unexpected review response");
            }

            container.innerHTML = "";

            const ratingCount = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
            let totalStars = 0;

            reviews.forEach(review => {
                const rating = Number(review.rating);
                if (rating >= 1 && rating <= 5) {
                    ratingCount[rating]++;
                    totalStars += rating;
                }
            });

            const avg = reviews.length
                ? (totalStars / reviews.length).toFixed(1)
                : 0;

            document.getElementById("averageRating").innerText = avg;

            for (let i = 1; i <= 5; i++) {

                const percent = reviews.length
                    ? (ratingCount[i] / reviews.length) * 100
                    : 0;

                const bar = document.getElementById("bar" + i);
                const count = document.getElementById("count" + i);

                if (bar) bar.style.width = percent + "%";
                if (count) count.innerText = ratingCount[i];
            }

            if (reviews.length === 0) {
                container.innerHTML = `
                    <div class="review-card">
                        <h4>No reviews yet</h4>
                        <p>Be the first to share your feedback.</p>
                    </div>
                `;
                return;
            }

            reviews.forEach(review => {
                const safeRating = Math.max(1, Math.min(5, Number(review.rating || 0)));
                container.innerHTML += `
                    <div class="review-card">
                        <h4>${review.name}</h4>
                        <p>${"\u2B50".repeat(safeRating)}</p>
                        <p>${review.comment}</p>
                    </div>
                `;
            });
        } catch (error) {
            container.innerHTML = `
                <div class="review-card">
                    <h4>Unable to load reviews</h4>
                    <p>${error.message || "Please try again shortly."}</p>
                </div>
            `;

            document.getElementById("averageRating").innerText = "0";
            for (let i = 1; i <= 5; i++) {
                const bar = document.getElementById("bar" + i);
                const count = document.getElementById("count" + i);
                if (bar) bar.style.width = "0%";
                if (count) count.innerText = "0";
            }
        }
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

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
let chart;
let selectedResumeFile = null;
let isAnalyzing = false;

const HIRING_TRENDS_2026 = [
    "AI Agents",
    "Prompt Engineering",
    "Cloud + DevOps",
    "Data Storytelling",
    "API Design",
    "Automation"
];

document.addEventListener("DOMContentLoaded", () => {

    const dropArea = document.getElementById("dropArea");
    const fileInput = document.getElementById("resume");
    const fileNameText = document.getElementById("fileName");
    const overlay = document.getElementById("loadingOverlay");
    const progress = document.getElementById("progress");
    const loadingText = document.getElementById("loadingText");
    const successCheck = document.getElementById("successCheck");
    const analyzeBtn = document.getElementById("analyzeBtn");
    const chooseFileBtn = document.getElementById("chooseFileBtn");
    const sidebar = document.getElementById("sidebar");
    const mobileToggle = document.getElementById("mobileToggle");
    const sidebarOverlay = document.getElementById("sidebarOverlay");

    function setSelectedResumeFile(file) {
        if (!file) return;
        selectedResumeFile = file;
        if (fileNameText) {
            fileNameText.innerText = file.name;
        }
    }

    renderTrendTags([]);

    if (dropArea) {
        dropArea.addEventListener("click", (event) => {
            if (event.target.closest("button") || event.target.closest("input")) {
                return;
            }
            fileInput.click();
        });

        fileInput.addEventListener("change", () => {
            if (fileInput.files.length > 0) {
                setSelectedResumeFile(fileInput.files[0]);
            }
        });

        dropArea.addEventListener("dragover", (e) => {
            e.preventDefault();
            dropArea.classList.add("dragover");
        });

        dropArea.addEventListener("dragleave", () => {
            dropArea.classList.remove("dragover");
        });

        dropArea.addEventListener("drop", (e) => {
            e.preventDefault();
            dropArea.classList.remove("dragover");

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                setSelectedResumeFile(files[0]);
                try {
                    const dt = new DataTransfer();
                    dt.items.add(files[0]);
                    fileInput.files = dt.files;
                } catch (_error) {
                    // Some browsers restrict assigning file input files; state fallback still works.
                }
            }
        });
    }

    if (chooseFileBtn) {
        chooseFileBtn.addEventListener("click", () => fileInput.click());
    }

    window.analyze = function () {

        if (isAnalyzing) {
            return;
        }

        const file = selectedResumeFile || (fileInput && fileInput.files.length > 0 ? fileInput.files[0] : null);
        const jobDesc = document.getElementById("jobdesc").value;

        if (!file) {
            alert("Please upload a resume first!");
            return;
        }

        isAnalyzing = true;
        if (analyzeBtn) {
            analyzeBtn.disabled = true;
        }

        overlay.style.display = "flex";
        progress.style.width = "0%";
        successCheck.style.display = "none";
        loadingText.innerText = "Uploading Resume...";

        const finishAnalyze = () => {
            isAnalyzing = false;
            if (analyzeBtn) {
                analyzeBtn.disabled = false;
            }
        };

        const xhr = new XMLHttpRequest();
        xhr.open("POST", API + "/analyze");

        xhr.setRequestHeader("Username", "vijay");
        xhr.setRequestHeader("JobDesc", jobDesc);
        xhr.setRequestHeader("FileName", file.name);

        xhr.upload.onprogress = function (e) {
            if (e.lengthComputable) {
                const percent = (e.loaded / e.total) * 100;
                progress.style.width = percent + "%";
            }
        };

        xhr.onload = function () {

            if (xhr.status !== 200) {
                overlay.style.display = "none";
                let errorMessage = "Server Error!";
                try {
                    const errorPayload = JSON.parse(xhr.responseText || "{}");
                    if (errorPayload.error) {
                        errorMessage = errorPayload.error;
                    }
                } catch (_error) {
                    // Ignore parse errors and show fallback message.
                }
                alert(errorMessage);
                finishAnalyze();
                return;
            }

            loadingText.innerText = "Parsing Resume...";

            setTimeout(() => {

                let data;
                try {
                    data = JSON.parse(xhr.responseText);
                } catch (_error) {
                    overlay.style.display = "none";
                    alert("Invalid server response. Please try again.");
                    finishAnalyze();
                    return;
                }

                document.getElementById("finalScore").innerText = data.finalScore;
                document.getElementById("similarityScore").innerText = data.similarityScore;
                document.getElementById("skillScore").innerText = data.skillScore;
                document.getElementById("missing").innerText = data.missing;

                updateCareerCopilot(data, jobDesc);

                progress.style.width = "100%";
                successCheck.style.display = "block";
                loadingText.innerText = "Analysis Complete!";

                setTimeout(() => {
                    overlay.style.display = "none";
                    drawChart(data.finalScore);
                    loadRank();
                    loadStats();
                    finishAnalyze();
                }, 900);

            }, 650);
        };

        xhr.onerror = function () {
            overlay.style.display = "none";
            alert("Network error. Please try again.");
            finishAnalyze();
        };

        xhr.send(file);
    };

    const darkBtn = document.getElementById("darkToggle");
    if (darkBtn) {
        darkBtn.addEventListener("click", () => {
            document.body.classList.toggle("dark");
            darkBtn.textContent = document.body.classList.contains("dark")
                ? "Switch to Classic Light"
                : "Classic Night Mode";
        });
    }

    const typingEl = document.getElementById("typing");
    if (typingEl) {
        const text = "Resume Intelligence Studio";
        let index = 0;

        function typeEffect() {
            if (index < text.length) {
                typingEl.innerHTML += text.charAt(index);
                index++;
                setTimeout(typeEffect, 52);
            }
        }

        typeEffect();
    }

    const typingE2 = document.getElementById("typing2");
    if (typingE2) {
        const text = "Compare Two Resumes";
        let index = 0;

        function typeEffect2() {
            if (index < text.length) {
                typingE2.innerHTML += text.charAt(index);
                index++;
                setTimeout(typeEffect2, 56);
            }
        }

        typeEffect2();
    }

    function setSidebarState(isOpen) {
        if (!sidebar || !sidebarOverlay) return;
        sidebar.classList.toggle("active", isOpen);
        sidebarOverlay.classList.toggle("active", isOpen);
        document.body.style.overflow = isOpen ? "hidden" : "";
    }

    if (mobileToggle && sidebar && sidebarOverlay) {
        mobileToggle.addEventListener("click", () => {
            setSidebarState(!sidebar.classList.contains("active"));
        });
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener("click", () => {
            setSidebarState(false);
        });
    }

    document.querySelectorAll(".faq-item").forEach((item) => {
        item.addEventListener("click", () => {
            item.classList.toggle("active");
        });
    });

    loadReviewCount();
    loadMainRatingSummary();
});

function drawChart(score) {

    const ctx = document.getElementById("scoreChart");
    if (!ctx) return;

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: ["Score", "Remaining"],
            datasets: [{
                data: [score, 100 - score],
                backgroundColor: ["#0e7c66", "#d8cfbf"],
                borderWidth: 0,
                cutout: "72%"
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: getComputedStyle(document.body).getPropertyValue("--text-soft") || "#1d2632"
                    }
                }
            }
        }
    });
}

function loadRank() {
    fetch(API + "/rank")
        .then((res) => res.json())
        .then((data) => {
            const list = document.getElementById("rankList");
            if (!list) return;
            list.innerHTML = "";
            data.forEach((r) => {
                list.innerHTML += `<li><span>${r.username}</span><strong>${r.score}</strong></li>`;
            });
        })
        .catch(() => {
            const list = document.getElementById("rankList");
            if (list) list.innerHTML = "<li><span>Unable to load ranking right now.</span><strong>--</strong></li>";
        });
}

function loadStats() {
    fetch(API + "/stats")
        .then((res) => res.json())
        .then((data) => {
            if (document.getElementById("total")) {
                document.getElementById("total").innerText = data.total;
            }

            if (document.getElementById("avg")) {
                document.getElementById("avg").innerText = data.avg;
            }
        });
}

function parseMissingSkills(missingValue) {
    if (!missingValue || missingValue === "None") return [];
    return missingValue
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 6);
}

function scoreBand(score) {
    if (score >= 85) return { label: "Elite Fit", tone: "strong" };
    if (score >= 70) return { label: "Interview Ready", tone: "good" };
    if (score >= 55) return { label: "Needs Polish", tone: "warn" };
    return { label: "Rework Required", tone: "risk" };
}

function estimateShortlistChance(finalScore, similarityScore) {
    const weighted = Math.round((finalScore * 0.65) + (similarityScore * 0.35));
    return Math.max(8, Math.min(96, weighted));
}

function renderTrendTags(missingSkills) {
    const trendWrap = document.getElementById("trendTags");
    if (!trendWrap) return;

    const missing = new Set((missingSkills || []).map((skill) => skill.toLowerCase()));
    trendWrap.innerHTML = "";

    HIRING_TRENDS_2026.forEach((trend) => {
        const isMatch = [...missing].some((item) => trend.toLowerCase().includes(item) || item.includes(trend.toLowerCase().split(" ")[0]));
        const el = document.createElement("span");
        el.className = `trend-tag${isMatch ? " highlight" : ""}`;
        el.textContent = trend;
        trendWrap.appendChild(el);
    });
}

function updateCareerCopilot(data, jobDesc) {
    const score = Number(data.finalScore || 0);
    const similarity = Number(data.similarityScore || 0);
    const missingSkills = parseMissingSkills(data.missing);
    const band = scoreBand(score);
    const chance = estimateShortlistChance(score, similarity);

    const badge = document.getElementById("scoreBadge");
    const chanceEl = document.getElementById("shortlistChance");
    const prioritySkills = document.getElementById("prioritySkills");
    const actionPlan = document.getElementById("actionPlan");

    if (badge) {
        badge.className = `insight-chip tone-${band.tone}`;
        badge.textContent = `${band.label} (${score}/100)`;
    }

    if (chanceEl) {
        chanceEl.textContent = `Shortlist chance: ${chance}%`;
    }

    const priorities = missingSkills.length
        ? missingSkills
        : ["Impact Statements", "Role-Specific Keywords", "Project Metrics"];

    if (prioritySkills) {
        prioritySkills.innerHTML = priorities
            .map((skill) => `<li>${skill}</li>`)
            .join("");
    }

    const hasJD = (jobDesc || "").trim().length > 0;
    const planItems = [
        hasJD
            ? "Day 1-2: Align resume headline and summary with top JD outcomes."
            : "Day 1-2: Add a target role headline and 3-line value summary.",
        priorities.length
            ? `Day 3-4: Add evidence for ${priorities.slice(0, 2).join(" and ")} in projects/experience.`
            : "Day 3-4: Convert responsibilities into measurable achievements.",
        "Day 5: Optimize keywords naturally in skills, projects, and tools section.",
        "Day 6: Tighten formatting for ATS readability (single-column, clear headings).",
        "Day 7: Re-run scan and push final score above your previous benchmark."
    ];

    if (actionPlan) {
        actionPlan.innerHTML = planItems.map((item) => `<li>${item}</li>`).join("");
    }

    renderTrendTags(missingSkills);
}

function loadReviewCount() {
    fetch(API + "/getReviews", { cache: "no-store" })
        .then((response) => {
            if (!response.ok) {
                throw new Error("Unable to fetch reviews.");
            }
            return response.json();
        })
        .then((reviews) => {
            const countElement = document.getElementById("reviewCount");
            if (countElement && Array.isArray(reviews)) {
                countElement.innerText = reviews.length;
            }
        })
        .catch(() => {
            const countElement = document.getElementById("reviewCount");
            if (countElement) {
                countElement.innerText = "0";
            }
        });
}

function loadMainRatingSummary() {
    fetch(API + "/getReviews", { cache: "no-store" })
        .then((response) => {
            if (!response.ok) {
                throw new Error("Unable to fetch reviews.");
            }
            return response.json();
        })
        .then((reviews) => {
            if (!Array.isArray(reviews)) {
                throw new Error("Unexpected reviews payload.");
            }

            const ratingCount = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
            let totalStars = 0;

            reviews.forEach((review) => {
                const rating = Number(review.rating);
                if (rating >= 1 && rating <= 5) {
                    ratingCount[rating]++;
                    totalStars += rating;
                }
            });

            const avg = reviews.length ? (totalStars / reviews.length).toFixed(1) : 0;

            if (document.getElementById("mainAverageRating")) {
                document.getElementById("mainAverageRating").innerText = avg;
            }

            if (document.getElementById("mainReviewCount")) {
                document.getElementById("mainReviewCount").innerText = reviews.length;
            }

            for (let i = 1; i <= 5; i++) {
                const percent = reviews.length ? (ratingCount[i] / reviews.length) * 100 : 0;

                if (document.getElementById("mainBar" + i)) {
                    document.getElementById("mainBar" + i).style.width = percent + "%";
                }

                if (document.getElementById("mainCount" + i)) {
                    document.getElementById("mainCount" + i).innerText = ratingCount[i];
                }
            }
        })
        .catch(() => {
            if (document.getElementById("mainAverageRating")) {
                document.getElementById("mainAverageRating").innerText = "0";
            }
            if (document.getElementById("mainReviewCount")) {
                document.getElementById("mainReviewCount").innerText = "0";
            }
            for (let i = 1; i <= 5; i++) {
                if (document.getElementById("mainBar" + i)) {
                    document.getElementById("mainBar" + i).style.width = "0%";
                }
                if (document.getElementById("mainCount" + i)) {
                    document.getElementById("mainCount" + i).innerText = "0";
                }
            }
        });
}

window.addEventListener("load", function () {

    const scoreBox = document.querySelector(".score-pop");
    const scoreText = document.getElementById("scanScore");
    const line = document.querySelector(".scan-line");

    if (!scoreBox || !scoreText || !line) return;

    function startScanCycle() {

        scoreBox.classList.remove("show");
        scoreText.innerText = "0%";

        line.style.animation = "none";
        void line.offsetWidth;
        line.style.animation = "scanMove 3s linear infinite";

        setTimeout(() => {

            line.style.animation = "none";
            scoreBox.classList.add("show");

            let count = 0;
            const target = 88;

            const counter = setInterval(() => {
                count++;
                scoreText.innerText = count + "%";
                if (count >= target) {
                    clearInterval(counter);
                }
            }, 20);

            setTimeout(() => {
                scoreBox.classList.remove("show");
                startScanCycle();
            }, 2600);

        }, 3500);
    }

    startScanCycle();
});

function goToCompare() {
    window.location.href = "/compare";
}

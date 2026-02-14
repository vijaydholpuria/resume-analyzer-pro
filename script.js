const API = "http://localhost:8080";
let chart;

document.addEventListener("DOMContentLoaded", () => {

    const dropArea = document.getElementById("dropArea");
    const fileInput = document.getElementById("resume");
    const fileNameText = document.getElementById("fileName");
    const overlay = document.getElementById("loadingOverlay");
    const progress = document.getElementById("progress");
    const loadingText = document.getElementById("loadingText");
    const successCheck = document.getElementById("successCheck");
    const sidebar = document.getElementById("sidebar");
    const mobileToggle = document.getElementById("mobileToggle");
    const sidebarOverlay = document.getElementById("sidebarOverlay");

    /* ================= FILE INPUT ================= */

    if(dropArea){
        dropArea.addEventListener("click", () => fileInput.click());

        fileInput.addEventListener("change", () => {
            if (fileInput.files.length > 0) {
                fileNameText.innerText = fileInput.files[0].name;
            }
        });

        /* ================= DRAG & DROP ================= */

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
                fileInput.files = files;
                fileNameText.innerText = files[0].name;
            }
        });
    }

    /* ================= ANALYZE ================= */

    window.analyze = function () {

        const file = fileInput.files[0];
        const jobDesc = document.getElementById("jobdesc").value;

        if (!file) {
            alert("Please upload a resume first!");
            return;
        }

        overlay.style.display = "flex";
        progress.style.width = "0%";
        successCheck.style.display = "none";
        loadingText.innerText = "Uploading Resume...";

        const xhr = new XMLHttpRequest();
        xhr.open("POST", API + "/analyze");

        xhr.setRequestHeader("Username", "vijay");
        xhr.setRequestHeader("JobDesc", jobDesc);
        xhr.setRequestHeader("FileName", file.name);

        xhr.upload.onprogress = function (e) {
            if (e.lengthComputable) {
                let percent = (e.loaded / e.total) * 100;
                progress.style.width = percent + "%";
            }
        };

        xhr.onload = function () {

            if (xhr.status !== 200) {
                overlay.style.display = "none";
                alert("Server Error!");
                return;
            }

            loadingText.innerText = "Parsing Resume...";

            setTimeout(() => {

                const data = JSON.parse(xhr.responseText);

                document.getElementById("finalScore").innerText = data.finalScore;
                document.getElementById("similarityScore").innerText = data.similarityScore;
                document.getElementById("skillScore").innerText = data.skillScore;
                document.getElementById("missing").innerText = data.missing;

                progress.style.width = "100%";
                successCheck.style.display = "block";
                loadingText.innerText = "Analysis Complete!";

                setTimeout(() => {
                    overlay.style.display = "none";
                    drawChart(data.finalScore);
                    loadRank();
                    loadStats();
                }, 1200);

            }, 800);
        };

        xhr.send(file);
    };

    /* ================= DARK MODE ================= */

    const darkBtn = document.getElementById("darkToggle");
    if(darkBtn){
        darkBtn.addEventListener("click", () => {
            document.body.classList.toggle("dark");
        });
    }

    /* ================= TYPING EFFECT ================= */

    
    const typingEl = document.getElementById("typing");
    if(typingEl){
        const text = "AI Powered Resume Analyzer";
        let index = 0;

        function typeEffect() {
            if (index < text.length) {
                typingEl.innerHTML += text.charAt(index);
                index++;
                setTimeout(typeEffect, 60);
            }
        }

        typeEffect();
    }
    const typingE2 = document.getElementById("typing2");
    if(typingE2){
        const text = "Compare Two Resumes";
        let index = 0;

        function typeEffect() {
            if (index < text.length) {
                typingE2.innerHTML += text.charAt(index);
                index++;
                setTimeout(typeEffect, 60);
            }
        }

        typeEffect();
    }
    /* ================= SIDEBAR MOBILE ================= */

    if(mobileToggle && sidebar){
        mobileToggle.addEventListener("click", () => {
            sidebar.classList.toggle("active");
            if(sidebarOverlay){
                sidebarOverlay.classList.toggle("active");
            }
        });
    }

    if(sidebarOverlay){
        sidebarOverlay.addEventListener("click", () => {
            sidebar.classList.remove("active");
            sidebarOverlay.classList.remove("active");
        });
    }

    /* ================= FAQ ACCORDION ================= */

    document.querySelectorAll(".faq-item").forEach(item=>{
        item.addEventListener("click",()=>{
            item.classList.toggle("active");
        });
    });

    loadReviewCount();
    loadMainRatingSummary();
});

/* ================= CHART ================= */

function drawChart(score) {

    const ctx = document.getElementById('scoreChart');
    if (!ctx) return;

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Score', 'Remaining'],
            datasets: [{
                data: [score, 100 - score],
                backgroundColor: ['#28a745', '#e0e0e0']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

/* ================= LOAD RANK ================= */

function loadRank() {
    fetch(API + "/rank")
        .then(res => res.json())
        .then(data => {
            const list = document.getElementById("rankList");
            if(!list) return;
            list.innerHTML = "";
            data.forEach(r => {
                list.innerHTML += `<li>${r.username} - ${r.score}</li>`;
            });
        });
}

/* ================= LOAD STATS ================= */

function loadStats() {
    fetch(API + "/stats")
        .then(res => res.json())
        .then(data => {
            if(document.getElementById("total"))
                document.getElementById("total").innerText = data.total;

            if(document.getElementById("avg"))
                document.getElementById("avg").innerText = data.avg;
        });
}

/* ================= REVIEW SUMMARY ================= */

function loadReviewCount(){
    let reviews = JSON.parse(localStorage.getItem("reviews")) || [];
    const countElement = document.getElementById("reviewCount");
    if(countElement){
        countElement.innerText = reviews.length;
    }
}

function loadMainRatingSummary(){

    const reviews = JSON.parse(localStorage.getItem("reviews")) || [];
    let ratingCount = {1:0,2:0,3:0,4:0,5:0};
    let totalStars = 0;

    reviews.forEach(r=>{
        ratingCount[r.rating]++;
        totalStars += parseInt(r.rating);
    });

    const avg = reviews.length ? (totalStars / reviews.length).toFixed(1) : 0;

    if(document.getElementById("mainAverageRating"))
        document.getElementById("mainAverageRating").innerText = avg;

    if(document.getElementById("mainReviewCount"))
        document.getElementById("mainReviewCount").innerText = reviews.length;

    for(let i=1;i<=5;i++){
        let percent = reviews.length ? (ratingCount[i] / reviews.length) * 100 : 0;

        if(document.getElementById("mainBar"+i))
            document.getElementById("mainBar"+i).style.width = percent + "%";

        if(document.getElementById("mainCount"+i))
            document.getElementById("mainCount"+i).innerText = ratingCount[i];
    }
}

window.addEventListener("storage", loadMainRatingSummary);

/* ================= SCAN LOOP ANIMATION ================= */

window.addEventListener("load", function(){

    const scoreBox = document.querySelector(".score-pop");
    const scoreText = document.getElementById("scanScore");
    const line = document.querySelector(".scan-line");

    if(!scoreBox || !scoreText || !line) return;

    function startScanCycle(){

        scoreBox.classList.remove("show");
        scoreText.innerText = "0%";

        line.style.animation = "none";
        void line.offsetWidth;
        line.style.animation = "scanMove 3s linear infinite";

        setTimeout(() => {

            line.style.animation = "none";
            scoreBox.classList.add("show");

            let count = 0;
            const target = 85;

            const counter = setInterval(()=>{
                count++;
                scoreText.innerText = count + "%";
                if(count >= target){
                    clearInterval(counter);
                }
            }, 20);

            setTimeout(()=>{
                scoreBox.classList.remove("show");
                startScanCycle();
            }, 3000);

        }, 4000);
    }

    startScanCycle();
});
function goToCompare(){
    window.location.href = "compare.html";
}

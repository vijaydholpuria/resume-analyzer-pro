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

let lastComparisonData = null;

function compareResumes(){

    const file1 = document.getElementById("resume1").files[0];
    const file2 = document.getElementById("resume2").files[0];

    if(!file1 || !file2){
        alert("Upload both resumes");
        return;
    }

    const formData = new FormData();
    formData.append("resume1", file1);
    formData.append("resume2", file2);

    fetch(API + "/compare", {
        method:"POST",
        body:formData
    })
    .then(res=>res.json())
    .then(data=>{

        lastComparisonData = data;

        document.getElementById("comparisonResult").style.display="block";

        document.getElementById("name1").innerText=data.resume1Name;
        document.getElementById("name2").innerText=data.resume2Name;

        document.getElementById("wc1").innerText=data.resume1.wordCount;
        document.getElementById("wc2").innerText=data.resume2.wordCount;

        document.getElementById("skill1").innerText=data.resume1.skillCount;
        document.getElementById("skill2").innerText=data.resume2.skillCount;

        document.getElementById("score1").innerText=data.resume1.score;
        document.getElementById("score2").innerText=data.resume2.score;

    })
    .catch(err=>{
        alert("Server Error");
        console.error(err);
    });
}

function downloadReport(){

    if(!lastComparisonData){
        alert("Compare first");
        return;
    }

    fetch(API + "/download-compare",{
        method:"POST",
        headers:{
            "Content-Type":"application/json"
        },
        body: JSON.stringify(lastComparisonData)
    })
    .then(res=>res.blob())
    .then(blob=>{
        const link = document.createElement("a");
        link.href = window.URL.createObjectURL(blob);
        link.download="Comparison_Report.pdf";
        link.click();
    });

}
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


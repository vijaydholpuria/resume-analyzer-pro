from __future__ import annotations

import io
import os
import re
from datetime import datetime
from pathlib import Path

from docx import Document
from dotenv import load_dotenv
from flask import Flask, jsonify, make_response, render_template, request, send_from_directory
from flask_cors import CORS
from pypdf import PdfReader
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from sqlalchemy import DateTime, Float, Integer, String, Text, create_engine, desc, func, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, scoped_session, sessionmaker

load_dotenv(Path(__file__).resolve().parent / '.env')

SKILL_KEYWORDS = [
    "python",
    "java",
    "javascript",
    "typescript",
    "c",
    "c++",
    "c#",
    "go",
    "rust",
    "sql",
    "postgresql",
    "mysql",
    "mongodb",
    "redis",
    "html",
    "css",
    "react",
    "next.js",
    "node.js",
    "express",
    "flask",
    "django",
    "fastapi",
    "rest",
    "graphql",
    "aws",
    "azure",
    "gcp",
    "docker",
    "kubernetes",
    "git",
    "linux",
    "pandas",
    "numpy",
    "scikit-learn",
    "tensorflow",
    "pytorch",
    "machine learning",
    "data analysis",
    "power bi",
    "tableau",
    "excel",
    "problem solving",
    "communication",
    "leadership",
    "ci/cd",
    "unit testing",
    "pytest",
    "api",
]

DEFAULT_REQUIRED_SKILLS = [
    "python",
    "sql",
    "postgresql",
    "flask",
    "api",
    "git",
    "problem solving",
    "communication",
]

TOKEN_RE = re.compile(r"[a-zA-Z][a-zA-Z0-9\+#\.-]{1,}")


def normalize_database_url(raw_url: str) -> str:
    normalized = raw_url.strip()
    if normalized.startswith("postgres://"):
        normalized = "postgresql+psycopg2://" + normalized[len("postgres://") :]
    elif normalized.startswith("postgresql://") and "+psycopg2" not in normalized:
        normalized = "postgresql+psycopg2://" + normalized[len("postgresql://") :]

    # Supabase Postgres connections require SSL.
    if "supabase.co" in normalized and "sslmode=" not in normalized:
        normalized = f"{normalized}{'&' if '?' in normalized else '?'}sslmode=require"

    return normalized


DATABASE_URL = normalize_database_url(
    os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://postgres:postgres@localhost:5432/resume_analyzer",
    )
)
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "10"))

cors_origins_env = os.getenv("CORS_ORIGINS", "*").strip()
if cors_origins_env == "*":
    CORS_ORIGINS: str | list[str] = "*"
else:
    CORS_ORIGINS = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]


class Base(DeclarativeBase):
    pass


class Analysis(Base):
    __tablename__ = "analyses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(120), index=True, nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    final_score: Mapped[float] = mapped_column(Float, nullable=False)
    similarity_score: Mapped[float] = mapped_column(Float, nullable=False)
    skill_score: Mapped[float] = mapped_column(Float, nullable=False)
    missing_skills: Mapped[str] = mapped_column(Text, default="", nullable=False)
    word_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    skill_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=datetime.utcnow, nullable=False)


class Review(Base):
    __tablename__ = "reviews"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    comment: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=datetime.utcnow, nullable=False)


engine = create_engine(DATABASE_URL, pool_pre_ping=True, future=True)
SessionLocal = scoped_session(
    sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
)

DB_INIT_ERROR: str | None = None
try:
    Base.metadata.create_all(bind=engine)
except SQLAlchemyError as exc:
    DB_INIT_ERROR = str(exc)

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_MB * 1024 * 1024
CORS(app, resources={r"/*": {"origins": CORS_ORIGINS}})


def sanitize_username(raw_username: str) -> str:
    cleaned = re.sub(r"\s+", " ", (raw_username or "").strip())
    return (cleaned or "anonymous")[:120]


def sanitize_filename(raw_filename: str) -> str:
    candidate = os.path.basename((raw_filename or "").strip())
    return (candidate or "resume.txt")[:255]


def decode_text_blob(blob: bytes) -> str:
    for encoding in ("utf-8", "utf-16", "latin-1"):
        try:
            return blob.decode(encoding)
        except UnicodeDecodeError:
            continue
    return ""


def extract_text_from_bytes(blob: bytes, filename: str) -> str:
    extension = os.path.splitext(filename.lower())[1]

    if extension == ".pdf":
        reader = PdfReader(io.BytesIO(blob))
        pages = [page.extract_text() or "" for page in reader.pages]
        text_data = "\n".join(pages).strip()
        return text_data or decode_text_blob(blob)

    if extension == ".docx":
        document = Document(io.BytesIO(blob))
        text_data = "\n".join(paragraph.text for paragraph in document.paragraphs).strip()
        return text_data or decode_text_blob(blob)

    return decode_text_blob(blob)


def tokenize(text_blob: str) -> list[str]:
    return [token.lower() for token in TOKEN_RE.findall(text_blob or "")]


def extract_skills(text_blob: str) -> list[str]:
    lowered = (text_blob or "").lower()
    found: list[str] = []

    for skill in SKILL_KEYWORDS:
        needle = skill.lower()
        if re.fullmatch(r"[a-z0-9]+", needle):
            if re.search(rf"\b{re.escape(needle)}\b", lowered):
                found.append(skill)
        elif needle in lowered:
            found.append(skill)

    return sorted(set(found), key=lambda item: item.lower())


def select_required_skills(job_description: str) -> list[str]:
    extracted = extract_skills(job_description)
    return extracted if extracted else DEFAULT_REQUIRED_SKILLS


def compute_similarity_score(resume_text: str, job_description: str) -> float:
    if not (job_description or "").strip():
        return 0.0

    resume_tokens = set(tokenize(resume_text))
    job_tokens = set(tokenize(job_description))
    if not job_tokens:
        return 0.0

    overlap = len(resume_tokens & job_tokens)
    return min(100.0, (overlap / len(job_tokens)) * 100.0)


def compute_word_score(word_count: int) -> float:
    if word_count < 120:
        return min(100.0, 35.0 + (word_count / 120.0) * 35.0)
    if word_count <= 900:
        return 100.0
    if word_count <= 1400:
        return max(60.0, 100.0 - ((word_count - 900) / 500.0) * 40.0)
    return 45.0


def clamp_score(score: float) -> float:
    return max(0.0, min(100.0, score))


def analyze_resume_text(resume_text: str, job_description: str) -> dict:
    words = re.findall(r"\b[\w\+#\.-]+\b", resume_text or "")
    word_count = len(words)

    found_skills = extract_skills(resume_text)
    required_skills = select_required_skills(job_description)

    found_lower = {skill.lower() for skill in found_skills}
    matched_skills = [skill for skill in required_skills if skill.lower() in found_lower]
    missing_skills = [skill for skill in required_skills if skill.lower() not in found_lower]

    skill_score = (len(matched_skills) / len(required_skills) * 100.0) if required_skills else 0.0
    similarity_score = compute_similarity_score(resume_text, job_description)
    word_score = compute_word_score(word_count)

    if (job_description or "").strip():
        final_score = (0.60 * similarity_score) + (0.30 * skill_score) + (0.10 * word_score)
    else:
        # For compare mode without JD, favor skill coverage and resume quality.
        final_score = (0.65 * skill_score) + (0.35 * word_score)

    final_score = clamp_score(final_score)

    return {
        "finalScore": round(final_score),
        "similarityScore": round(similarity_score),
        "skillScore": round(skill_score),
        "missing": ", ".join(missing_skills[:12]) if missing_skills else "None",
        "wordCount": word_count,
        "skillCount": len(found_skills),
    }


def ensure_db_ready():
    if DB_INIT_ERROR:
        return (
            jsonify(
                {
                    "error": "Database not ready. Check DATABASE_URL and PostgreSQL connection.",
                    "details": DB_INIT_ERROR,
                }
            ),
            503,
        )
    return None


@app.get("/health")
def health():
    if DB_INIT_ERROR:
        return (
            jsonify(
                {
                    "ok": False,
                    "service": "resume-analyzer-api",
                    "error": "Database bootstrap failed. Check DATABASE_URL.",
                }
            ),
            503,
        )

    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except SQLAlchemyError:
        return jsonify({"ok": False, "service": "resume-analyzer-api"}), 503

    return jsonify({"ok": True, "service": "resume-analyzer-api"})



@app.get("/")
def home_page():
    return render_template("index.html")


@app.get("/index.html")
def index_page():
    return render_template("index.html")


@app.get("/compare")
def compare_page():
    return render_template("compare.html")


@app.get("/compare.html")
def compare_html_page():
    return render_template("compare.html")


@app.get("/reviews")
def reviews_page():
    return render_template("reviews.html")


@app.get("/reviews.html")
def reviews_html_page():
    return render_template("reviews.html")


@app.get("/images/<path:filename>")
def image_assets(filename: str):
    static_dir = Path(app.static_folder or "")
    images_dir = static_dir / "images"
    return send_from_directory(images_dir, filename)

@app.post("/analyze")
def analyze_resume_endpoint():
    db_error = ensure_db_ready()
    if db_error:
        return db_error

    file_blob = request.get_data(cache=False)
    if not file_blob:
        return jsonify({"error": "Resume file is required."}), 400

    username = sanitize_username(request.headers.get("Username", "anonymous"))
    job_description = request.headers.get("JobDesc", "")
    filename = sanitize_filename(request.headers.get("FileName", "resume.txt"))

    try:
        resume_text = extract_text_from_bytes(file_blob, filename)
    except Exception as exc:
        return jsonify({"error": f"Unable to parse uploaded file: {exc}"}), 400

    if not resume_text.strip():
        return jsonify({"error": "Could not read text from the uploaded resume."}), 400

    metrics = analyze_resume_text(resume_text, job_description)

    session = SessionLocal()
    try:
        session.add(
            Analysis(
                username=username,
                filename=filename,
                final_score=float(metrics["finalScore"]),
                similarity_score=float(metrics["similarityScore"]),
                skill_score=float(metrics["skillScore"]),
                missing_skills=metrics["missing"],
                word_count=int(metrics["wordCount"]),
                skill_count=int(metrics["skillCount"]),
            )
        )
        session.commit()
    except SQLAlchemyError:
        session.rollback()
        return jsonify({"error": "Database write failed."}), 500
    finally:
        session.close()

    return jsonify(
        {
            "finalScore": metrics["finalScore"],
            "similarityScore": metrics["similarityScore"],
            "skillScore": metrics["skillScore"],
            "missing": metrics["missing"],
        }
    )


@app.get("/rank")
def rank():
    db_error = ensure_db_ready()
    if db_error:
        return db_error

    session = SessionLocal()
    try:
        leaderboard_subquery = (
            session.query(
                Analysis.username.label("username"),
                func.max(Analysis.final_score).label("score"),
            )
            .group_by(Analysis.username)
            .subquery()
        )

        rows = (
            session.query(leaderboard_subquery.c.username, leaderboard_subquery.c.score)
            .order_by(desc(leaderboard_subquery.c.score), leaderboard_subquery.c.username.asc())
            .limit(10)
            .all()
        )
    finally:
        session.close()

    return jsonify(
        [
            {"username": row.username, "score": round(float(row.score), 2)}
            for row in rows
        ]
    )


@app.get("/stats")
def stats():
    db_error = ensure_db_ready()
    if db_error:
        return db_error

    session = SessionLocal()
    try:
        total, avg = session.query(func.count(Analysis.id), func.avg(Analysis.final_score)).one()
    finally:
        session.close()

    return jsonify(
        {
            "total": int(total or 0),
            "avg": round(float(avg or 0.0), 1),
        }
    )


@app.post("/compare")
def compare_resumes():
    file_1 = request.files.get("resume1")
    file_2 = request.files.get("resume2")

    if not file_1 or not file_2:
        return jsonify({"error": "Both resume files are required."}), 400

    name_1 = sanitize_filename(file_1.filename or "resume1")
    name_2 = sanitize_filename(file_2.filename or "resume2")

    try:
        text_1 = extract_text_from_bytes(file_1.read(), name_1)
        text_2 = extract_text_from_bytes(file_2.read(), name_2)
    except Exception as exc:
        return jsonify({"error": f"Failed to parse resume files: {exc}"}), 400

    metrics_1 = analyze_resume_text(text_1, "")
    metrics_2 = analyze_resume_text(text_2, "")

    return jsonify(
        {
            "resume1Name": name_1,
            "resume2Name": name_2,
            "resume1": {
                "wordCount": metrics_1["wordCount"],
                "skillCount": metrics_1["skillCount"],
                "score": metrics_1["finalScore"],
            },
            "resume2": {
                "wordCount": metrics_2["wordCount"],
                "skillCount": metrics_2["skillCount"],
                "score": metrics_2["finalScore"],
            },
        }
    )


def build_comparison_pdf(payload: dict) -> bytes:
    resume_1_name = payload.get("resume1Name", "Resume 1")
    resume_2_name = payload.get("resume2Name", "Resume 2")
    resume_1 = payload.get("resume1", {}) if isinstance(payload.get("resume1"), dict) else {}
    resume_2 = payload.get("resume2", {}) if isinstance(payload.get("resume2"), dict) else {}

    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    y_pos = height - 56

    pdf.setFont("Helvetica-Bold", 18)
    pdf.drawString(44, y_pos, "Resume Comparison Report")

    y_pos -= 26
    pdf.setFont("Helvetica", 10)
    pdf.drawString(44, y_pos, f"Generated At: {datetime.utcnow().isoformat()}Z")

    y_pos -= 36
    pdf.setFont("Helvetica-Bold", 13)
    pdf.drawString(44, y_pos, f"1) {resume_1_name}")

    y_pos -= 22
    pdf.setFont("Helvetica", 11)
    pdf.drawString(60, y_pos, f"Word Count: {resume_1.get('wordCount', '-')}")
    y_pos -= 18
    pdf.drawString(60, y_pos, f"Skill Count: {resume_1.get('skillCount', '-')}")
    y_pos -= 18
    pdf.drawString(60, y_pos, f"Overall Score: {resume_1.get('score', '-')}")

    y_pos -= 30
    pdf.setFont("Helvetica-Bold", 13)
    pdf.drawString(44, y_pos, f"2) {resume_2_name}")

    y_pos -= 22
    pdf.setFont("Helvetica", 11)
    pdf.drawString(60, y_pos, f"Word Count: {resume_2.get('wordCount', '-')}")
    y_pos -= 18
    pdf.drawString(60, y_pos, f"Skill Count: {resume_2.get('skillCount', '-')}")
    y_pos -= 18
    pdf.drawString(60, y_pos, f"Overall Score: {resume_2.get('score', '-')}")

    y_pos -= 34
    score_1 = float(resume_1.get("score", 0) or 0)
    score_2 = float(resume_2.get("score", 0) or 0)

    pdf.setFont("Helvetica-Bold", 12)
    if score_1 > score_2:
        summary = f"Recommended: {resume_1_name}"
    elif score_2 > score_1:
        summary = f"Recommended: {resume_2_name}"
    else:
        summary = "Both resumes are equally scored."

    pdf.drawString(44, y_pos, summary)

    pdf.setFont("Helvetica-Oblique", 9)
    pdf.drawString(44, 36, "Generated by Resume Analyzer Pro backend")

    pdf.showPage()
    pdf.save()

    buffer.seek(0)
    return buffer.read()


@app.post("/download-compare")
def download_compare_report():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"error": "Comparison data is required."}), 400

    pdf_bytes = build_comparison_pdf(payload)
    response = make_response(pdf_bytes)
    response.headers["Content-Type"] = "application/pdf"
    response.headers["Content-Disposition"] = "attachment; filename=Comparison_Report.pdf"
    return response


@app.post("/addReview")
def add_review():
    db_error = ensure_db_ready()
    if db_error:
        return db_error

    name = (request.form.get("name") or "").strip()
    comment = (request.form.get("comment") or "").strip()

    try:
        rating = int(request.form.get("rating", "0"))
    except ValueError:
        rating = 0

    if not name or not comment or rating < 1 or rating > 5:
        return "Invalid review payload", 400

    session = SessionLocal()
    try:
        session.add(Review(name=name[:120], rating=rating, comment=comment))
        session.commit()
    except SQLAlchemyError:
        session.rollback()
        return "Database write failed", 500
    finally:
        session.close()

    return "ok", 201


@app.get("/getReviews")
def get_reviews():
    db_error = ensure_db_ready()
    if db_error:
        return db_error

    session = SessionLocal()
    try:
        rows = (
            session.query(Review)
            .order_by(desc(Review.created_at), desc(Review.id))
            .limit(200)
            .all()
        )
    finally:
        session.close()

    return jsonify(
        [
            {
                "name": row.name,
                "rating": row.rating,
                "comment": row.comment,
                "created_at": row.created_at.isoformat() + "Z",
            }
            for row in rows
        ]
    )


@app.errorhandler(413)
def handle_large_upload(_error):
    return jsonify({"error": f"File too large. Max allowed: {MAX_UPLOAD_MB} MB"}), 413


if __name__ == "__main__":
    app_port = int(os.getenv("PORT", "8080"))
    app.run(host="0.0.0.0", port=app_port, debug=os.getenv("FLASK_DEBUG", "0") == "1")

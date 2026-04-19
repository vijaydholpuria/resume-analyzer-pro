# Resume Analyzer Backend (Python + PostgreSQL)

This backend matches your current frontend API contract.

## Tech
- Flask
- PostgreSQL (SQLAlchemy + psycopg2)
- Resume parsing: PDF, DOCX, TXT
- PDF export for compare report

## Endpoints
- `GET /health`
- `POST /analyze`
- `GET /rank`
- `GET /stats`
- `POST /compare`
- `POST /download-compare`
- `POST /addReview`
- `GET /getReviews`

## Local Setup
1. Create PostgreSQL DB (example: `resume_analyzer`).
2. Copy `.env.example` to `.env` and set `DATABASE_URL` (auto-loaded by backend).
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run backend:
   ```bash
   python app.py
   ```
   Backend starts on `http://localhost:8080` by default.


## Frontend Serving (Flask)
Frontend is wired inside Flask using:
- `backend/templates`: `index.html`, `compare.html`, `reviews.html`
- `backend/static`: `style.css`, `script.js`, `compare.js`, `reviews.js`, `images/`

Routes:
- `GET /` (main page)
- `GET /compare` and `GET /compare.html`
- `GET /reviews` and `GET /reviews.html`

## Deployment
Use:
```bash
gunicorn wsgi:app
```

Set env vars:
- `DATABASE_URL`
- `CORS_ORIGINS`
- `PORT`

## Frontend Connection
Frontend JS now resolves API base like this:
- If `window.RESUME_API_BASE_URL` or `localStorage.resume_api_base_url` exists, it uses that.
- On localhost, defaults to `http://localhost:8080`.
- On deployed domain, defaults to same origin.

If frontend and backend are on different domains, set once in browser console:
```js
localStorage.setItem("resume_api_base_url", "https://your-backend-domain.com")
```

## Supabase Setup
1. In Supabase dashboard, open `Project Settings -> Database -> Connection string`.
2. Copy `.env.example` to `.env` and set `DATABASE_URL` with your Supabase Postgres URI.
3. In Supabase `SQL Editor`, run this file:
   - `backend/temp/supabase_tables.sql`
4. Start backend:
   ```bash
   python app.py
   ```
5. Verify:
   - `GET /health` returns `{"ok": true, ...}`

Notes:
- Keep `sslmode=require` in Supabase connection string.
- For deployed frontend, set `CORS_ORIGINS` to your frontend domain instead of `*`.
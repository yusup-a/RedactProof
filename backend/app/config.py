import os
from pathlib import Path

from dotenv import load_dotenv

REPO_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(REPO_ROOT / ".env")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "").strip() or "gemini-3.6-flash"
# Tried in order when the primary model is overloaded or rate-limited.
GEMINI_FALLBACK_MODELS = [
    m.strip()
    for m in os.getenv("GEMINI_FALLBACK_MODELS", "gemini-3.5-flash,gemini-3-flash-preview,gemini-3.5-flash-lite").split(",")
    if m.strip()
]
GEMINI_MODELS = list(dict.fromkeys([GEMINI_MODEL, *GEMINI_FALLBACK_MODELS]))
GEMINI_TIMEOUT_SECONDS = float(os.getenv("GEMINI_TIMEOUT_SECONDS", "25"))  # per model attempt
GEMINI_TOTAL_BUDGET_SECONDS = float(os.getenv("GEMINI_TOTAL_BUDGET_SECONDS", "50"))
GEMINI_CACHE_TTL_SECONDS = 2 * 60 * 60

FRONTEND_ORIGINS = [
    origin.strip()
    for origin in os.getenv("FRONTEND_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if origin.strip()
]

MAX_FILE_BYTES = 5 * 1024 * 1024
MAX_PAGES = 3
SESSION_TTL_SECONDS = 30 * 60
MAX_SESSIONS = 50
PREVIEW_ZOOM = 2

import sys
import warnings
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "demo"))

with warnings.catch_warnings():
    warnings.simplefilter("ignore")
    from fastapi.testclient import TestClient

from app import config, gemini_service  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture(autouse=True)
def no_gemini_by_default(monkeypatch, request):
    """Unit tests never call the real Gemini API unless marked live."""
    gemini_service._cache.clear()
    if "live" not in request.keywords:
        monkeypatch.setattr(config, "GEMINI_API_KEY", "")
        monkeypatch.setattr(config, "GEMINI_MODELS", ["model-a", "model-b"])

"""Short-lived, in-memory sessions. Nothing is written to disk or a database."""

import threading
import time
from dataclasses import dataclass, field

from . import config
from .models import AnalysisResponse, Finding, RedactionResult


@dataclass
class DocumentSession:
    id: str
    filename: str
    pdf_bytes: bytes
    previews: list[bytes]
    analysis: AnalysisResponse
    created_at: float = field(default_factory=time.monotonic)

    @property
    def findings(self) -> dict[str, Finding]:
        return {f.id: f for f in self.analysis.findings}


@dataclass
class ResultSession:
    id: str
    filename: str
    pdf_bytes: bytes
    previews: list[bytes]
    result: RedactionResult
    created_at: float = field(default_factory=time.monotonic)


class SessionStore:
    def __init__(self):
        self._items: dict[str, DocumentSession | ResultSession] = {}
        self._lock = threading.Lock()

    def _purge(self):
        now = time.monotonic()
        for key in [k for k, v in self._items.items() if now - v.created_at > config.SESSION_TTL_SECONDS]:
            del self._items[key]
        while len(self._items) > config.MAX_SESSIONS:
            oldest = min(self._items, key=lambda k: self._items[k].created_at)
            del self._items[oldest]

    def put(self, item: DocumentSession | ResultSession):
        with self._lock:
            self._items[item.id] = item
            self._purge()

    def get(self, item_id: str, kind: type):
        with self._lock:
            self._purge()
            item = self._items.get(item_id)
        return item if isinstance(item, kind) else None


store = SessionStore()

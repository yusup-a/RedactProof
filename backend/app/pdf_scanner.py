"""PDF validation, previews, text extraction, regex detection, and deterministic location of values."""

import re
from dataclasses import dataclass, field

import pymupdf

from . import config
from .errors import APIError
from .models import RISK_BY_TYPE, BBox, Confidence, Finding, FindingType, Location, Source

MIN_VALUE_LENGTH = 4
MAX_VALUE_LENGTH = 120
HIDDEN_OVERLAP_RATIO = 0.5

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
PHONE_RE = re.compile(r"(?<![\d-])(?:\+?1[\s.-]?)?(?:\(\d{3}\)\s?|\d{3}[\s.-])\d{3}[\s.-]\d{4}(?![\d-])")
SSN_RE = re.compile(r"(?<![\d-])\d{3}-\d{2}-\d{4}(?![\d-])")
# Account numbers are only flagged when an account label precedes them on the same line.
ACCOUNT_RE = re.compile(
    r"\b(?:account|acct)\.?(?:[ \t]+(?:number|no\.?|#))?[ \t]*[:#]?[ \t]*(\d(?:[ -]?\d){7,16})(?![\d])",
    re.IGNORECASE,
)


@dataclass
class Candidate:
    value: str
    type: FindingType
    reason: str
    sources: list[Source]
    confidence: Confidence | None = None
    locations: list[Location] = field(default_factory=list)


def open_validated(data: bytes) -> pymupdf.Document:
    if len(data) > config.MAX_FILE_BYTES:
        raise APIError(413, "FILE_TOO_LARGE", "PDF must be 5 MB or smaller.")
    if b"%PDF-" not in data[:1024]:
        raise APIError(400, "INVALID_PDF", "The file is not a PDF.")
    try:
        doc = pymupdf.open(stream=data, filetype="pdf")
    except Exception:
        raise APIError(400, "INVALID_PDF", "The PDF could not be read. It may be corrupted.")
    if doc.needs_pass or doc.is_encrypted:
        doc.close()
        raise APIError(400, "ENCRYPTED_PDF", "Password-protected PDFs are not supported.")
    if doc.page_count == 0:
        doc.close()
        raise APIError(400, "EMPTY_PDF", "The PDF has no pages.")
    if doc.page_count > config.MAX_PAGES:
        doc.close()
        raise APIError(422, "TOO_MANY_PAGES", f"PDF must have at most {config.MAX_PAGES} pages.")
    # Normalize rotated pages so preview pixels, text coordinates, and redaction rectangles all agree.
    for page in doc:
        if page.rotation:
            page.remove_rotation()
    return doc


def render_preview(page: pymupdf.Page) -> bytes:
    return page.get_pixmap(matrix=pymupdf.Matrix(config.PREVIEW_ZOOM, config.PREVIEW_ZOOM)).tobytes("png")


def page_texts(doc: pymupdf.Document) -> list[str]:
    return [page.get_text("text") for page in doc]


def detect_regex(texts: list[str]) -> list[Candidate]:
    found: dict[str, Candidate] = {}

    def add(value: str, type_: FindingType, reason: str):
        value = value.strip()
        if len(value) >= MIN_VALUE_LENGTH and value not in found:
            found[value] = Candidate(value, type_, reason, ["regex"])

    for text in texts:
        for m in EMAIL_RE.finditer(text):
            add(m.group(), "EMAIL", "Email address")
        for m in SSN_RE.finditer(text):
            add(m.group(), "SSN", "Social Security number format")
        for m in PHONE_RE.finditer(text):
            add(m.group(), "PHONE", "US phone number")
        for m in ACCOUNT_RE.finditer(text):
            add(m.group(1), "ACCOUNT_NUMBER", "Number labeled as an account number")
    return list(found.values())


def _value_pattern(value: str) -> re.Pattern:
    """Whole-value match: any whitespace between tokens, never part of a longer word or number."""
    body = r"\s+".join(re.escape(token) for token in value.split())
    return re.compile(rf"(?<![A-Za-z0-9]){body}(?![A-Za-z0-9])", re.IGNORECASE)


def value_in_text(value: str, texts: list[str]) -> bool:
    pattern = _value_pattern(value)
    return any(pattern.search(t) for t in texts)


def _is_partial_word(rect: pymupdf.Rect, chars: list[dict]) -> bool:
    """True if a search hit is glued to a letter or digit on either side (e.g. inside a longer number)."""
    for c in chars:
        x0, y0, x1, y1 = c["bbox"]
        if not c["c"].isalnum() or not (y0 < (rect.y0 + rect.y1) / 2 < y1):
            continue
        if rect.x0 - 1 <= x1 <= rect.x0 + 0.5 or rect.x1 - 0.5 <= x0 <= rect.x1 + 1:
            return True
    return False


def _page_chars(page: pymupdf.Page) -> list[dict]:
    return [
        char
        for block in page.get_text("rawdict")["blocks"]
        for line in block.get("lines", [])
        for span in line["spans"]
        for char in span["chars"]
    ]


def find_rects(page: pymupdf.Page, value: str) -> list[pymupdf.Rect]:
    hits = page.search_for(value)
    if not hits:
        return []
    chars = _page_chars(page)
    return [rect for rect in hits if not _is_partial_word(rect, chars)]


def _dark_fill_rects(page: pymupdf.Page) -> list[pymupdf.Rect]:
    """Opaque dark shapes that could visually cover text (drawn rectangles and filled annotations)."""
    def is_dark(fill) -> bool:
        return bool(fill) and len(fill) == 3 and sum(fill) / 3 <= 0.2

    rects = []
    for d in page.get_drawings():
        opacity = d.get("fill_opacity")
        if is_dark(d.get("fill")) and (opacity is None or opacity >= 0.8):
            rects.append(pymupdf.Rect(d["rect"]))
    for annot in page.annots() or []:
        # PyMuPDF reports opacity -1 when the annotation does not set one (fully opaque).
        if is_dark((annot.colors or {}).get("fill")) and (annot.opacity < 0 or annot.opacity >= 0.8):
            rects.append(annot.rect)
    return rects


def _is_hidden(rect: pymupdf.Rect, covers: list[pymupdf.Rect]) -> bool:
    area = rect.get_area()
    if area <= 0:
        return False
    return any((rect & cover).get_area() / area >= HIDDEN_OVERLAP_RATIO for cover in covers)


def locate(doc: pymupdf.Document, value: str) -> list[Location]:
    locations = []
    for index, page in enumerate(doc):
        covers = _dark_fill_rects(page)
        for rect in find_rects(page, value):
            bbox: BBox = tuple(round(v, 2) for v in (rect.x0, rect.y0, rect.x1, rect.y1))
            locations.append(Location(page=index + 1, bbox=bbox, visually_hidden=_is_hidden(rect, covers)))
    return locations


def mask(value: str) -> str:
    visible = 4 if len(value) > 6 else 1
    head, tail = value[:-visible], value[-visible:]
    return "".join(c if c.isspace() else "*" for c in head) + tail


def build_findings(doc: pymupdf.Document, candidates: list[Candidate]) -> list[Finding]:
    """Locate every candidate in the PDF; candidates that cannot be located are dropped."""
    located = []
    for c in candidates:
        c.locations = locate(doc, c.value)
        if c.locations:
            located.append(c)

    located.sort(key=lambda c: (c.locations[0].page, c.locations[0].bbox[1], c.locations[0].bbox[0]))
    findings = []
    for i, c in enumerate(located, start=1):
        first = c.locations[0]
        findings.append(Finding(
            id=f"finding-{i}",
            type=c.type,
            source=sorted(c.sources, key=["regex", "gemini"].index),
            text=c.value,
            display=mask(c.value),
            risk=RISK_BY_TYPE[c.type],
            reason=c.reason,
            confidence=c.confidence,
            visually_hidden=any(loc.visually_hidden for loc in c.locations),
            page=first.page,
            bbox=first.bbox,
            locations=c.locations,
        ))
    return findings

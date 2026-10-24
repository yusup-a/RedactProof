"""Reopen the saved output and check that every selected value is gone from the extractable text."""

import pymupdf

from .models import Finding, RemainingValue, VerificationReport
from .pdf_scanner import find_rects, value_in_text

METHOD = "Reopened the saved output PDF and searched all extracted page text for each selected literal value."
LIMITATIONS = [
    "Checks only the exact text values you selected, not every possible sensitive value.",
    "Does not check text inside images (no OCR).",
    "Does not inspect metadata, attachments, or form fields.",
]


def verify(output_bytes: bytes, findings: list[Finding], locations_redacted: int) -> VerificationReport:
    with pymupdf.open(stream=output_bytes, filetype="pdf") as doc:
        page_texts = [page.get_text("text") for page in doc]
        remaining = []
        for f in findings:
            pages = [
                i for i, page in enumerate(doc, start=1)
                if value_in_text(f.text, [page_texts[i - 1]]) or find_rects(page, f.text)
            ]
            if pages:
                remaining.append(RemainingValue(finding_id=f.id, pages=pages))
        pages_checked = doc.page_count

    passed = not remaining and len(findings) > 0
    return VerificationReport(
        status="passed" if passed else "failed",
        selected_findings=len(findings),
        values_tested=len(findings),
        locations_redacted=locations_redacted,
        values_still_detected=len(remaining),
        remaining=remaining,
        pages_checked=pages_checked,
        method=METHOD,
        limitations=LIMITATIONS,
    )

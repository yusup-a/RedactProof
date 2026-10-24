"""Apply real, content-removing redactions. Only server-validated locations are used."""

import pymupdf

from .models import Finding

# Search hits end exactly where the next character begins; without a small inset the
# redaction also removes touching neighbors such as a trailing comma.
INSET = 0.5


def redact(pdf_bytes: bytes, findings: list[Finding]) -> tuple[bytes, int]:
    """Return (redacted PDF bytes, number of locations redacted)."""
    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    try:
        count = 0
        for finding in findings:
            for loc in finding.locations:
                rect = pymupdf.Rect(loc.bbox) + (INSET, INSET, -INSET, -INSET)
                doc[loc.page - 1].add_redact_annot(rect, fill=(0, 0, 0))
                count += 1
        for page in doc:
            page.apply_redactions(
                images=pymupdf.PDF_REDACT_IMAGE_PIXELS,
                graphics=pymupdf.PDF_REDACT_LINE_ART_NONE,
                text=pymupdf.PDF_REDACT_TEXT_REMOVE,
            )
        # A full, non-incremental rewrite so removed content does not survive in old revisions.
        return doc.tobytes(garbage=4, deflate=True, clean=True), count
    finally:
        doc.close()

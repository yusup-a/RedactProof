"""Optional smoke test against the real Gemini API. Run with: RUN_LIVE_GEMINI=1 pytest tests/test_gemini_live.py -s"""

import os

import pymupdf
import pytest
import sample_pdfs as s

from app import config, gemini_service, pdf_scanner

pytestmark = [
    pytest.mark.live,
    pytest.mark.skipif(os.getenv("RUN_LIVE_GEMINI") != "1" or not config.GEMINI_API_KEY, reason="live Gemini test disabled"),
]


def test_gemini_finds_contextual_identifier():
    pdf = s.build_insecure_statement()
    with pymupdf.open(stream=pdf, filetype="pdf") as doc:
        texts = pdf_scanner.page_texts(doc)

    outcome = gemini_service.analyze(pdf, texts)
    values = {c.value for c in outcome.candidates}
    print(f"\nstatus={outcome.status} message={outcome.message} suggested={outcome.suggested} rejected={outcome.rejected}")
    for c in outcome.candidates:
        print(f"  {c.type:15} {c.confidence:6} {c.value}  — {c.reason}")

    assert outcome.status == "ok", outcome.message
    assert s.EMPLOYEE_ID in values or s.MEMBER_ID in values

import pymupdf
import sample_pdfs as s

from app import pdf_scanner, redactor, verifier
from app.pdf_scanner import Candidate


def text_of(pdf: bytes) -> str:
    with pymupdf.open(stream=pdf, filetype="pdf") as doc:
        return "".join(page.get_text() for page in doc)


def findings_for(pdf: bytes, candidates: list[Candidate]):
    with pymupdf.open(stream=pdf, filetype="pdf") as doc:
        return pdf_scanner.build_findings(doc, candidates)


def test_black_box_leaves_account_number_extractable():
    assert s.ACCOUNT_NUMBER in text_of(s.build_insecure_statement())


def test_scanner_flags_account_number_as_visually_hidden():
    pdf = s.build_insecure_statement()
    with pymupdf.open(stream=pdf, filetype="pdf") as doc:
        findings = pdf_scanner.build_findings(doc, pdf_scanner.detect_regex(pdf_scanner.page_texts(doc)))
    by_text = {f.text: f for f in findings}
    assert by_text[s.ACCOUNT_NUMBER].visually_hidden is True
    assert by_text[s.ACCOUNT_NUMBER].type == "ACCOUNT_NUMBER"
    assert by_text[s.EMAIL].visually_hidden is False
    assert s.PHONE in by_text


def test_regex_does_not_detect_contextual_identifiers():
    texts = [text_of(s.build_insecure_statement())]
    values = {c.value for c in pdf_scanner.detect_regex(texts)}
    assert s.MEMBER_ID not in values
    assert s.EMPLOYEE_ID not in values


def test_redaction_removes_selected_and_preserves_the_rest():
    pdf = s.build_insecure_statement()
    findings = findings_for(pdf, [Candidate(s.ACCOUNT_NUMBER, "ACCOUNT_NUMBER", "", ["regex"])])

    output, count = redactor.redact(pdf, findings)
    text = text_of(output)

    assert count == 1
    assert s.ACCOUNT_NUMBER not in text
    for kept in ("Account Number:", s.EMAIL, s.PHONE, s.MEMBER_ID, "Statement period: 09/01/2026 - 09/30/2026"):
        assert kept in text
    assert verifier.verify(output, findings, count).status == "passed"


def test_repeated_values_are_redacted_on_every_page():
    pdf = s.build_hr_record()
    findings = findings_for(pdf, [Candidate(s.HR_EMPLOYEE_ID, "EMPLOYEE_ID", "", ["gemini"], "high")])
    assert [loc.page for loc in findings[0].locations] == [1, 2]

    output, count = redactor.redact(pdf, findings)

    assert count == 2
    assert s.HR_EMPLOYEE_ID not in text_of(output)
    assert s.HR_BADGE in text_of(output)


def test_verification_fails_when_value_is_still_present():
    pdf = s.build_insecure_statement()
    findings = findings_for(pdf, [Candidate(s.ACCOUNT_NUMBER, "ACCOUNT_NUMBER", "", ["regex"])])

    report = verifier.verify(pdf, findings, 0)  # the unredacted original

    assert report.status == "failed"
    assert report.values_still_detected == 1
    assert report.remaining[0].pages == [1]


def test_mask_keeps_last_four():
    assert pdf_scanner.mask("987654321012") == "********1012"
    assert pdf_scanner.mask("(512) 555-0147") == "***** ****0147"

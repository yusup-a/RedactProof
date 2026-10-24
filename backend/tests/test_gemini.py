import json

import sample_pdfs as s
from google.genai import errors as genai_errors

from app import config, gemini_service

TEXTS = [f"Member reference: {s.MEMBER_ID}\nAccount officer: Priya Natarajan, staff ID {s.EMPLOYEE_ID}\nEmail: {s.EMAIL}"]


def gemini_json(*items) -> str:
    return json.dumps({"findings": list(items)})


def item(value, category="EMPLOYEE_ID", confidence="high"):
    return {"value": value, "category": category, "reason": "Internal identifier", "confidence": confidence, "page": 1}


def test_accepts_values_present_in_document():
    candidates, suggested, rejected = gemini_service.parse_and_validate(
        gemini_json(item(s.EMPLOYEE_ID), item(s.MEMBER_ID, "CUSTOMER_ID")), TEXTS
    )
    assert {c.value for c in candidates} == {s.EMPLOYEE_ID, s.MEMBER_ID}
    assert all(c.sources == ["gemini"] for c in candidates)
    assert (suggested, rejected) == (2, 0)


def test_rejects_hallucinated_invalid_and_too_short_values():
    raw = gemini_json(
        item("NW-9999-Z"),                      # not in the document
        item(s.EMPLOYEE_ID, category="MADE_UP"),  # category outside the schema
        item("ID"),                             # too short to redact safely
        {"value": s.EMAIL},                     # missing required fields
        item(s.EMPLOYEE_ID),                    # the only valid one
    )
    candidates, suggested, rejected = gemini_service.parse_and_validate(raw, TEXTS)
    assert [c.value for c in candidates] == [s.EMPLOYEE_ID]
    assert (suggested, rejected) == (5, 4)


def test_unavailable_without_key():
    outcome = gemini_service.analyze(b"%PDF-", TEXTS)
    assert outcome.status == "unavailable"
    assert outcome.candidates == []


def test_quota_error_falls_back(monkeypatch):
    monkeypatch.setattr(config, "GEMINI_API_KEY", "test-key")

    def raise_quota(*_):
        raise genai_errors.ClientError(429, {"error": {"code": 429, "message": "quota", "status": "RESOURCE_EXHAUSTED"}})

    monkeypatch.setattr(gemini_service, "_request", raise_quota)
    outcome = gemini_service.analyze(b"%PDF-", TEXTS)
    assert outcome.status == "error"
    assert "quota" in outcome.message
    assert outcome.candidates == []


def test_overloaded_model_falls_back_to_next(monkeypatch):
    monkeypatch.setattr(config, "GEMINI_API_KEY", "test-key")
    calls = []

    def fake_request(_pdf, _texts, model):
        calls.append(model)
        if model == "model-a":
            raise genai_errors.ServerError(503, {"error": {"code": 503, "message": "high demand", "status": "UNAVAILABLE"}})
        return gemini_json(item(s.EMPLOYEE_ID))

    monkeypatch.setattr(gemini_service, "_request", fake_request)
    outcome = gemini_service.analyze(b"%PDF-1", TEXTS)
    assert outcome.status == "ok"
    assert outcome.model == "model-b"
    assert calls == ["model-a", "model-b"]

    # Same PDF again: served from cache, no new Gemini call.
    again = gemini_service.analyze(b"%PDF-1", TEXTS)
    assert again.model == "model-b" and [c.value for c in again.candidates] == [s.EMPLOYEE_ID]
    assert calls == ["model-a", "model-b"]


def test_bad_api_key_does_not_retry(monkeypatch):
    monkeypatch.setattr(config, "GEMINI_API_KEY", "test-key")
    calls = []

    def bad_key(_pdf, _texts, model):
        calls.append(model)
        raise genai_errors.ClientError(400, {"error": {"code": 400, "message": "API key not valid.", "status": "INVALID_ARGUMENT"}})

    monkeypatch.setattr(gemini_service, "_request", bad_key)
    outcome = gemini_service.analyze(b"%PDF-", TEXTS)
    assert outcome.status == "error" and "API key" in outcome.message
    assert calls == ["model-a"]


def test_garbage_output_falls_back(monkeypatch):
    monkeypatch.setattr(config, "GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(gemini_service, "_request", lambda *_: "not json")
    assert gemini_service.analyze(b"%PDF-", TEXTS).status == "error"


def test_analyze_endpoint_merges_gemini_and_regex(client, monkeypatch):
    monkeypatch.setattr(config, "GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(gemini_service, "_request", lambda *_: gemini_json(
        item(s.EMPLOYEE_ID),
        item(s.ACCOUNT_NUMBER, "ACCOUNT_NUMBER"),
        item("000-HALLUCINATED-000"),
    ))

    body = client.post("/api/analyze", files={"file": ("s.pdf", s.build_insecure_statement(), "application/pdf")}).json()
    by_text = {f["text"]: f for f in body["findings"]}

    assert body["gemini_status"] == "ok"
    assert body["gemini_model"] == "model-a"
    assert by_text[s.EMPLOYEE_ID]["source"] == ["gemini"]
    assert by_text[s.ACCOUNT_NUMBER]["source"] == ["regex", "gemini"]
    assert by_text[s.EMAIL]["source"] == ["regex"]
    assert "000-HALLUCINATED-000" not in by_text
    assert body["gemini_stats"] == {"suggested": 3, "accepted": 2, "rejected": 1}

    # Gemini-only findings can be redacted like any other validated finding.
    result = client.post("/api/redact", json={
        "document_id": body["document_id"],
        "finding_ids": [by_text[s.EMPLOYEE_ID]["id"]],
    }).json()
    assert result["verification"]["status"] == "passed"
    assert s.EMPLOYEE_ID not in result["pages"][0]["extracted_text"]

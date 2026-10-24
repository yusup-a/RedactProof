import pymupdf
import sample_pdfs as s

from app import config


def upload(client, data: bytes, name="doc.pdf"):
    return client.post("/api/analyze", files={"file": (name, data, "application/pdf")})


def make_pdf(pages=1, text="Hello world", **save_kwargs) -> bytes:
    doc = pymupdf.open()
    for _ in range(pages):
        doc.new_page().insert_text((72, 72), text)
    return doc.tobytes(**save_kwargs)


def test_health(client):
    assert client.get("/api/health").json()["status"] == "ok"


def test_full_flow(client):
    analysis = upload(client, s.build_insecure_statement(), "statement.pdf").json()
    assert analysis["page_count"] == 1
    assert analysis["gemini_status"] == "unavailable"
    assert s.ACCOUNT_NUMBER in analysis["pages"][0]["extracted_text"]
    page = analysis["pages"][0]
    assert (page["width"], page["height"]) == (612, 792)

    preview = client.get(page["preview_url"])
    assert preview.headers["content-type"] == "image/png"

    ids = [f["id"] for f in analysis["findings"]]
    result = client.post("/api/redact", json={"document_id": analysis["document_id"], "finding_ids": ids}).json()
    assert result["verification"]["status"] == "passed"
    assert result["verification"]["values_tested"] == len(ids)

    assert client.get(f"/api/results/{result['result_id']}").json()["result_id"] == result["result_id"]
    assert client.get(result["pages"][0]["preview_url"]).status_code == 200

    download = client.get(result["download_url"])
    assert download.headers["content-type"] == "application/pdf"
    assert 'filename="statement-redacted.pdf"' in download.headers["content-disposition"]
    with pymupdf.open(stream=download.content, filetype="pdf") as doc:
        assert s.ACCOUNT_NUMBER not in doc[0].get_text()


def test_rejects_non_pdf(client):
    r = upload(client, b"just some text pretending to be a pdf")
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "INVALID_PDF"


def test_rejects_corrupted_pdf(client):
    r = upload(client, b"%PDF-1.7\n" + b"\x00garbage" * 50)
    assert r.status_code == 400


def test_rejects_large_file(client):
    r = upload(client, b"%PDF-1.7\n" + b"0" * (config.MAX_FILE_BYTES + 1))
    assert r.status_code == 413
    assert r.json()["error"]["code"] == "FILE_TOO_LARGE"


def test_rejects_too_many_pages(client):
    r = upload(client, make_pdf(pages=4))
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "TOO_MANY_PAGES"


def test_rejects_encrypted_pdf(client):
    pdf = make_pdf(encryption=pymupdf.PDF_ENCRYPT_AES_256, owner_pw="owner", user_pw="user")
    r = upload(client, pdf)
    assert r.json()["error"]["code"] == "ENCRYPTED_PDF"


def test_rejects_pdf_without_text(client):
    doc = pymupdf.open()
    doc.new_page()
    r = upload(client, doc.tobytes())
    assert r.json()["error"]["code"] == "NO_TEXT"


def test_missing_file(client):
    r = client.post("/api/analyze")
    assert r.json()["error"]["code"] == "NO_FILE"


def test_redact_rejects_unknown_and_empty_ids(client):
    doc_id = upload(client, s.build_insecure_statement()).json()["document_id"]

    r = client.post("/api/redact", json={"document_id": doc_id, "finding_ids": ["finding-999"]})
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "UNKNOWN_FINDING"

    r = client.post("/api/redact", json={"document_id": doc_id, "finding_ids": []})
    assert r.json()["error"]["code"] == "INVALID_REQUEST"


def test_unknown_session_and_page(client):
    r = client.post("/api/redact", json={"document_id": "nope", "finding_ids": ["finding-1"]})
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "SESSION_EXPIRED_OR_NOT_FOUND"

    doc_id = upload(client, s.build_insecure_statement()).json()["document_id"]
    assert client.get(f"/api/documents/{doc_id}/pages/5/preview").json()["error"]["code"] == "PAGE_NOT_FOUND"

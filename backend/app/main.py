import logging
import re
import uuid
from urllib.parse import quote

from fastapi import FastAPI, File, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse, Response
from starlette.exceptions import HTTPException as StarletteHTTPException

from . import config, gemini_service, pdf_scanner, redactor, verifier
from .errors import APIError
from .models import AnalysisResponse, GeminiStats, PageInfo, RedactionRequest, RedactionResult
from .storage import DocumentSession, ResultSession, store

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("redactproof")

app = FastAPI(title="RedactProof API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.FRONTEND_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
    expose_headers=["Content-Disposition"],
)


def _error(status: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": {"code": code, "message": message}})


@app.exception_handler(APIError)
async def api_error_handler(_: Request, exc: APIError):
    return _error(exc.status, exc.code, exc.message)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_: Request, exc: RequestValidationError):
    return _error(422, "INVALID_REQUEST", "The request body is invalid.")


@app.exception_handler(StarletteHTTPException)
async def http_error_handler(_: Request, exc: StarletteHTTPException):
    if exc.status_code == 404:
        return _error(404, "NOT_FOUND", "Not found.")
    return _error(exc.status_code, "HTTP_ERROR", str(exc.detail))


@app.exception_handler(Exception)
async def unexpected_error_handler(_: Request, exc: Exception):
    log.error("Unexpected error: %s", type(exc).__name__)
    return _error(500, "INTERNAL_ERROR", "Something went wrong while processing the request.")


def _expired() -> APIError:
    return APIError(404, "SESSION_EXPIRED_OR_NOT_FOUND", "This session has expired or does not exist. Please upload the PDF again.")


def _png(previews: list[bytes], page: int) -> Response:
    if not 1 <= page <= len(previews):
        raise APIError(404, "PAGE_NOT_FOUND", "That page does not exist.")
    return Response(previews[page - 1], media_type="image/png", headers={"Cache-Control": "private, max-age=1800"})


def _merge(regex: list[pdf_scanner.Candidate], gemini: list[pdf_scanner.Candidate]) -> list[pdf_scanner.Candidate]:
    merged = {c.value: c for c in regex}
    for g in gemini:
        existing = merged.get(g.value)
        if existing:
            # Keep the deterministic type; take Gemini's contextual explanation.
            existing.sources.append("gemini")
            existing.reason = g.reason or existing.reason
            existing.confidence = g.confidence
        else:
            merged[g.value] = g
    return list(merged.values())


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse("/docs")


@app.get("/api/health")
def health():
    return {"status": "ok", "gemini_configured": bool(config.GEMINI_API_KEY), "gemini_model": config.GEMINI_MODEL}


@app.post("/api/analyze", response_model=AnalysisResponse)
def analyze(file: UploadFile | None = File(None)):
    if file is None:
        raise APIError(400, "NO_FILE", "Upload a PDF in the 'file' field.")
    data = file.file.read(config.MAX_FILE_BYTES + 1)
    doc = pdf_scanner.open_validated(data)
    try:
        texts = pdf_scanner.page_texts(doc)
        if not any(t.strip() for t in texts):
            raise APIError(400, "NO_TEXT", "No extractable text was found. Scanned or image-only PDFs are not supported.")
        pdf_bytes = doc.tobytes()  # normalized (rotation removed) copy; all coordinates refer to it
        previews = [pdf_scanner.render_preview(page) for page in doc]

        gemini = gemini_service.analyze(pdf_bytes, texts)
        candidates = _merge(pdf_scanner.detect_regex(texts), gemini.candidates)
        findings = pdf_scanner.build_findings(doc, candidates)

        stats = None
        if gemini.status == "ok":
            gemini_values = {c.value for c in gemini.candidates}
            located = sum(1 for f in findings if f.text in gemini_values)
            stats = GeminiStats(
                suggested=gemini.suggested,
                accepted=located,
                rejected=gemini.rejected + len(gemini_values) - located,
            )

        document_id = str(uuid.uuid4())
        analysis = AnalysisResponse(
            document_id=document_id,
            filename=file.filename or "document.pdf",
            page_count=doc.page_count,
            gemini_status=gemini.status,
            gemini_message=gemini.message,
            gemini_model=gemini.model,
            gemini_stats=stats,
            pages=[
                PageInfo(
                    page=i,
                    width=round(page.rect.width, 2),
                    height=round(page.rect.height, 2),
                    preview_url=f"/api/documents/{document_id}/pages/{i}/preview",
                    extracted_text=texts[i - 1],
                )
                for i, page in enumerate(doc, start=1)
            ],
            findings=findings,
        )
    finally:
        doc.close()

    store.put(DocumentSession(document_id, analysis.filename, pdf_bytes, previews, analysis))
    log.info("Analyzed document %s: %d pages, %d findings, gemini=%s", document_id, analysis.page_count, len(findings), gemini.status)
    return analysis


@app.get("/api/documents/{document_id}/pages/{page}/preview")
def document_preview(document_id: str, page: int):
    session = store.get(document_id, DocumentSession)
    if not session:
        raise _expired()
    return _png(session.previews, page)


@app.post("/api/redact", response_model=RedactionResult)
def redact(body: RedactionRequest):
    session = store.get(body.document_id, DocumentSession)
    if not session:
        raise _expired()
    by_id = session.findings
    ids = list(dict.fromkeys(body.finding_ids))
    unknown = [i for i in ids if i not in by_id]
    if unknown:
        raise APIError(422, "UNKNOWN_FINDING", "One or more findings do not belong to this document.")
    selected = [by_id[i] for i in ids]

    output, locations_redacted = redactor.redact(session.pdf_bytes, selected)
    report = verifier.verify(output, selected, locations_redacted)

    result_id = str(uuid.uuid4())
    out_doc = pdf_scanner.pymupdf.open(stream=output, filetype="pdf")
    try:
        previews = [pdf_scanner.render_preview(page) for page in out_doc]
        pages = [
            PageInfo(
                page=i,
                width=round(page.rect.width, 2),
                height=round(page.rect.height, 2),
                preview_url=f"/api/results/{result_id}/pages/{i}/preview",
                extracted_text=page.get_text("text"),
            )
            for i, page in enumerate(out_doc, start=1)
        ]
    finally:
        out_doc.close()

    result = RedactionResult(
        result_id=result_id,
        document_id=body.document_id,
        redacted_finding_ids=ids,
        page_count=len(pages),
        pages=pages,
        download_url=f"/api/results/{result_id}/download",
        verification=report,
    )
    store.put(ResultSession(result_id, session.filename, output, previews, result))
    log.info("Redacted document %s -> result %s: verification=%s", body.document_id, result_id, report.status)
    return result


@app.get("/api/results/{result_id}", response_model=RedactionResult)
def get_result(result_id: str):
    session = store.get(result_id, ResultSession)
    if not session:
        raise _expired()
    return session.result


@app.get("/api/results/{result_id}/download")
def download(result_id: str):
    session = store.get(result_id, ResultSession)
    if not session:
        raise _expired()
    original = session.filename.rsplit(".", 1)[0][:80] or "document"
    ascii_stem = re.sub(r"[^A-Za-z0-9._-]+", "_", original).strip("_") or "document"
    # ASCII fallback for old clients, RFC 5987 UTF-8 name for browsers.
    disposition = f"attachment; filename=\"{ascii_stem}-redacted.pdf\"; filename*=UTF-8''{quote(original)}-redacted.pdf"
    return Response(session.pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": disposition})


@app.get("/api/results/{result_id}/pages/{page}/preview")
def result_preview(result_id: str, page: int):
    session = store.get(result_id, ResultSession)
    if not session:
        raise _expired()
    return _png(session.previews, page)

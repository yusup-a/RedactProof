# RedactProof API Contract

Owner: backend. The frontend builds against this document. Any change to it is announced to the frontend developer before it is merged.

- Base URL (local): `http://localhost:8000` — frontend sets `VITE_API_BASE_URL=http://localhost:8000`
- All URLs returned by the API (`preview_url`, `download_url`) are **relative paths**; prefix them with the base URL.
- JSON uses `snake_case`.
- CORS allows `http://localhost:5173` (Vite default) by default.

## Session model

- Uploaded documents and redaction results live **in server memory only**, for **30 minutes**. Nothing is stored in a database.
- After expiry (or a server restart), IDs return `404` with code `SESSION_EXPIRED_OR_NOT_FOUND`. The frontend should offer "upload again".

## Coordinate convention

- `bbox` is `[x0, y0, x1, y1]` in **PDF points**, origin at the **top-left** of the page, y grows **downward**.
- Coordinates are relative to the page's `width` and `height` from the same response.
- To draw on a preview image displayed at `displayWidth` pixels wide: `scale = displayWidth / page.width`, then multiply every bbox value by `scale`.
- Preview PNGs keep the page aspect ratio exactly (rendered at 2x: a 612×792 page becomes a 1224×1584 image).

---

## GET /api/health

```json
{ "status": "ok", "gemini_configured": true, "gemini_model": "gemini-3.6-flash" }
```

---

## POST /api/analyze

Upload one PDF as `multipart/form-data`, field name **`file`**.

Limits: max **5 MB**, max **3 pages**, must be a real, unencrypted PDF.

### 200 response — `AnalysisResponse`

```json
{
  "document_id": "3f1c2a9e-1b7d-4a55-9f0e-2c8d1e6b7a10",
  "filename": "statement.pdf",
  "page_count": 1,
  "gemini_status": "ok",
  "gemini_message": null,
  "gemini_model": "gemini-3.6-flash",
  "gemini_stats": { "suggested": 6, "accepted": 5, "rejected": 1 },
  "pages": [
    {
      "page": 1,
      "width": 612,
      "height": 792,
      "preview_url": "/api/documents/3f1c2a9e-1b7d-4a55-9f0e-2c8d1e6b7a10/pages/1/preview",
      "extracted_text": "Northwind Credit Union\nAccount Statement\nAccount Number: 987654321012\n..."
    }
  ],
  "findings": [
    {
      "id": "finding-1",
      "type": "ACCOUNT_NUMBER",
      "source": ["regex", "gemini"],
      "text": "987654321012",
      "display": "********1012",
      "risk": "HIGH",
      "reason": "Customer bank account number",
      "confidence": "high",
      "visually_hidden": true,
      "page": 1,
      "bbox": [150.2, 141.8, 228.6, 155.1],
      "locations": [
        { "page": 1, "bbox": [150.2, 141.8, 228.6, 155.1], "visually_hidden": true }
      ]
    },
    {
      "id": "finding-2",
      "type": "EMPLOYEE_ID",
      "source": ["gemini"],
      "text": "NW-4471-Q",
      "display": "*****71-Q",
      "risk": "MEDIUM",
      "reason": "Internal employee identifier of the account officer",
      "confidence": "medium",
      "visually_hidden": false,
      "page": 1,
      "bbox": [180.0, 300.4, 236.9, 313.7],
      "locations": [
        { "page": 1, "bbox": [180.0, 300.4, 236.9, 313.7], "visually_hidden": false }
      ]
    }
  ]
}
```

Values above are illustrative only.

### Field reference

| Field | Type | Notes |
|---|---|---|
| `gemini_status` | `"ok" \| "unavailable" \| "error"` | `ok`: Gemini ran and its results are included. `unavailable`: no API key configured. `error`: Gemini failed (timeout, quota, invalid output); results are regex-only. |
| `gemini_message` | `string \| null` | Human-readable reason when status is not `ok`. Safe to display. |
| `gemini_stats` | `object \| null` | Only when `gemini_status` is `ok`. `suggested`: values Gemini returned. `accepted`: values verified to exist in the PDF and located. `rejected`: values thrown out (not in the document, malformed, or too short). Good for the Gemini insights panel. |
| `pages[].extracted_text` | `string` | All text a machine can extract from the page, **including text hidden under black boxes**. Use it for the Attacker View. Contains sensitive demo data — never log it. |
| `findings[].id` | `string` | Server-generated. The only thing sent back to `/api/redact`. |
| `findings[].type` | enum | `EMAIL`, `PHONE`, `ACCOUNT_NUMBER`, `ROUTING_NUMBER`, `CARD_NUMBER`, `SSN`, `EMPLOYEE_ID`, `CUSTOMER_ID`, `PERSON_NAME`, `ADDRESS`, `DATE_OF_BIRTH`, `OTHER` |
| `findings[].source` | `("regex" \| "gemini")[]` | Who detected it. `["regex","gemini"]` = both. Only non-empty. |
| `findings[].text` | `string` | Exact literal value. Mask by default in the UI; use `display`. |
| `findings[].display` | `string` | Masked version, last 4 characters visible. |
| `findings[].risk` | `"HIGH" \| "MEDIUM" \| "LOW"` | |
| `findings[].reason` | `string` | Short explanation of why it is sensitive. |
| `findings[].confidence` | `"high" \| "medium" \| "low" \| null` | Gemini's confidence. `null` for regex-only findings. |
| `findings[].visually_hidden` | `boolean` | `true` if **any** location is covered by a dark filled shape but the text is still extractable. Drives the Attacker View warning. |
| `findings[].page`, `bbox` | | First location, for convenience. |
| `findings[].locations` | array | **Every** place the value appears. One finding = one unique value. Redacting a finding removes **all** of its locations. |

Findings are ordered by page, then top-to-bottom.

---

## GET /api/documents/{document_id}/pages/{page}/preview

Returns `image/png` of the original page (`page` is 1-based).

---

## POST /api/redact

Request (`application/json`):

```json
{ "document_id": "3f1c2a9e-1b7d-4a55-9f0e-2c8d1e6b7a10", "finding_ids": ["finding-1", "finding-2"] }
```

`finding_ids` must be non-empty and every ID must belong to that document.

### 200 response — `RedactionResult`

Returned even when verification fails. **Check `verification.status`**; never show success unless it is `"passed"`.

```json
{
  "result_id": "a8d4b6c1-0f3e-4d7a-9b21-5e6f7a8b9c0d",
  "document_id": "3f1c2a9e-1b7d-4a55-9f0e-2c8d1e6b7a10",
  "redacted_finding_ids": ["finding-1", "finding-2"],
  "page_count": 1,
  "pages": [
    {
      "page": 1,
      "width": 612,
      "height": 792,
      "preview_url": "/api/results/a8d4b6c1-0f3e-4d7a-9b21-5e6f7a8b9c0d/pages/1/preview",
      "extracted_text": "Northwind Credit Union\nAccount Statement\nAccount Number:\n..."
    }
  ],
  "download_url": "/api/results/a8d4b6c1-0f3e-4d7a-9b21-5e6f7a8b9c0d/download",
  "verification": {
    "status": "passed",
    "selected_findings": 2,
    "values_tested": 2,
    "locations_redacted": 2,
    "values_still_detected": 0,
    "remaining": [],
    "pages_checked": 1,
    "method": "Reopened the saved output PDF and searched all extracted page text for each selected literal value.",
    "limitations": [
      "Checks only the exact text values you selected, not every possible sensitive value.",
      "Does not check text inside images (no OCR).",
      "Does not inspect metadata, attachments, or form fields."
    ]
  }
}
```

| Field | Notes |
|---|---|
| `verification.status` | `"passed"` only when every selected value is absent from the output's extracted text. Otherwise `"failed"`. |
| `verification.remaining` | When failed: `[{ "finding_id": "finding-1", "pages": [1] }]` — values still extractable. |
| `pages[].extracted_text` | Text extractable from the **redacted** output — use for the "after" Attacker View. |

## GET /api/results/{result_id}

Returns the same `RedactionResult` object.

## GET /api/results/{result_id}/download

Returns `application/pdf` with `Content-Disposition: attachment; filename="<original>-redacted.pdf"`.

## GET /api/results/{result_id}/pages/{page}/preview

Returns `image/png` of the redacted page.

---

## Errors

Every error has the same shape:

```json
{ "error": { "code": "FILE_TOO_LARGE", "message": "PDF must be 5 MB or smaller." } }
```

`message` is safe to show to users.

| HTTP | `code` | When |
|---|---|---|
| 400 | `NO_FILE` | No `file` field in the upload |
| 400 | `INVALID_PDF` | Not a PDF, or corrupted |
| 400 | `ENCRYPTED_PDF` | Password-protected PDF |
| 400 | `EMPTY_PDF` | PDF has no pages |
| 400 | `NO_TEXT` | PDF has no extractable text (e.g. scanned image — OCR not supported) |
| 413 | `FILE_TOO_LARGE` | Over 5 MB |
| 422 | `TOO_MANY_PAGES` | More than 3 pages |
| 422 | `INVALID_REQUEST` | Malformed JSON body, empty `finding_ids` |
| 422 | `UNKNOWN_FINDING` | A finding ID does not belong to this document |
| 404 | `SESSION_EXPIRED_OR_NOT_FOUND` | Unknown or expired `document_id` / `result_id` |
| 404 | `PAGE_NOT_FOUND` | Page number out of range |
| 500 | `INTERNAL_ERROR` | Unexpected failure |

## Gemini and privacy

- Uploaded PDFs are sent to the Google Gemini API for analysis when a key is configured (third-party processing). Use **synthetic demo documents only**.
- The frontend never calls Gemini and never sees the API key.

# RedactProof AI

Traditional PDF "redaction" just draws a black box over text. However, the text still exists in the file, and anyone can copy and paste it somewhere else, revealing the hidden information. RedactProof uses Google Gemini to understand what in a document is sensitive, then allows for real, content-removing redaction with PyMuPDF and double-checks that the selected text can no longer be extracted.

## How it works

1. Upload a PDF
2. Scanning — regex finds emails, phone numbers, SSNs, and labeled account numbers, with exact page coordinates. Text hidden under black boxes is flagged as `visually_hidden`.
3. Analysis — the PDF is sent to Gemini, which analyzes the document.
4. Redaction — the user can pick the information that needs to be redacted; PyMuPDF removes the information and creates a new, properly redacted file.
5. Verification — the new document is double-checked to make sure it is properly redacted. If so, then there is nothing else required from the user's end. 

## Backend setup (macOS)

Requires Python 3.11+

```bash
python3.13 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt
cp .env.example .env        # then put your key in GEMINI_API_KEY
```

Get a Gemini API key at [Google AI Studio](https://aistudio.google.com/apikey). Don't commit `.env`.

Run the API:

```bash
cd backend
../.venv/bin/uvicorn app.main:app --reload --port 8000
```

Check it: `curl localhost:8000/api/health`. Interactive docs: http://localhost:8000/docs

### Configuration (`.env`)

| Variable | Default | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | — | Required for Gemini. Without it the app runs in regex-only mode and says so. |
| `GEMINI_MODEL` | `gemini-3.6-flash` | Primary model. |
| `GEMINI_FALLBACK_MODELS` | `gemini-3.5-flash,gemini-3-flash-preview,gemini-3.5-flash-lite` | Tried in order when a model is overloaded or rate-limited. |
| `FRONTEND_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Allowed CORS origins. |

## Demo documents

```bash
.venv/bin/python demo/generate_samples.py
```

Creates synthetic PDFs in `demo/samples/`:

- `insecure_statement.pdf` — bank statement whose account number is covered by a black box but still extractable.
- `hr_record.pdf` — two-page HR record; the employee number appears on both pages.

All data in the documents is made-up.

## Tests

```bash
cd backend
../.venv/bin/python -m pytest                                    # unit + API tests, Gemini mocked
RUN_LIVE_GEMINI=1 ../.venv/bin/python -m pytest tests/test_gemini_live.py -s   # optional real Gemini call
```

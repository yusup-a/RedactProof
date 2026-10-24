from typing import Literal

from pydantic import BaseModel, Field

FindingType = Literal[
    "EMAIL", "PHONE", "ACCOUNT_NUMBER", "ROUTING_NUMBER", "CARD_NUMBER", "SSN",
    "EMPLOYEE_ID", "CUSTOMER_ID", "PERSON_NAME", "ADDRESS", "DATE_OF_BIRTH", "OTHER",
]
Source = Literal["regex", "gemini"]
Risk = Literal["HIGH", "MEDIUM", "LOW"]
Confidence = Literal["high", "medium", "low"]
BBox = tuple[float, float, float, float]

RISK_BY_TYPE: dict[str, Risk] = {
    "ACCOUNT_NUMBER": "HIGH", "ROUTING_NUMBER": "HIGH", "CARD_NUMBER": "HIGH", "SSN": "HIGH",
    "EMPLOYEE_ID": "MEDIUM", "CUSTOMER_ID": "MEDIUM", "DATE_OF_BIRTH": "MEDIUM",
    "ADDRESS": "MEDIUM", "PHONE": "MEDIUM", "EMAIL": "MEDIUM",
    "PERSON_NAME": "LOW", "OTHER": "LOW",
}


class Location(BaseModel):
    page: int
    bbox: BBox
    visually_hidden: bool


class Finding(BaseModel):
    id: str
    type: FindingType
    source: list[Source]
    text: str
    display: str
    risk: Risk
    reason: str
    confidence: Confidence | None
    visually_hidden: bool
    page: int
    bbox: BBox
    locations: list[Location]


class PageInfo(BaseModel):
    page: int
    width: float
    height: float
    preview_url: str
    extracted_text: str


class GeminiStats(BaseModel):
    suggested: int
    accepted: int
    rejected: int


class AnalysisResponse(BaseModel):
    document_id: str
    filename: str
    page_count: int
    gemini_status: Literal["ok", "unavailable", "error"]
    gemini_message: str | None
    gemini_model: str | None
    gemini_stats: GeminiStats | None
    pages: list[PageInfo]
    findings: list[Finding]


class RedactionRequest(BaseModel):
    document_id: str
    finding_ids: list[str] = Field(min_length=1)


class RemainingValue(BaseModel):
    finding_id: str
    pages: list[int]


class VerificationReport(BaseModel):
    status: Literal["passed", "failed"]
    selected_findings: int
    values_tested: int
    locations_redacted: int
    values_still_detected: int
    remaining: list[RemainingValue]
    pages_checked: int
    method: str
    limitations: list[str]


class RedactionResult(BaseModel):
    result_id: str
    document_id: str
    redacted_finding_ids: list[str]
    page_count: int
    pages: list[PageInfo]
    download_url: str
    verification: VerificationReport


# Structured output schema requested from Gemini. Its output is untrusted until validated.
class GeminiFinding(BaseModel):
    value: str = Field(description="The exact sensitive text, copied character-for-character from the document, without its label.")
    category: FindingType
    reason: str = Field(description="One short sentence on why this is sensitive.")
    confidence: Confidence
    page: int | None = Field(default=None, description="1-based page number where the value appears.")


class GeminiResult(BaseModel):
    findings: list[GeminiFinding]

from __future__ import annotations

import re
from dataclasses import dataclass

from .schemas import (
    ActiveInsightInput,
    ExtractedDocument,
    FeedbackRecordInput,
    InsightGenerationRequest,
    ReviewRequest,
    SourceReference,
)

PRIVACY_REDACTION_WARNING = (
    "개인정보로 보이는 주민등록번호·연락처·이메일을 자동으로 가렸어요."
)

_SENSITIVE_PATTERNS = (
    (
        "resident_registration_number",
        re.compile(r"(?<!\d)\d{6}\s*[- ]?\s*[1-4]\d{6}(?!\d)"),
        "[주민등록번호 숨김]",
    ),
    (
        "email",
        re.compile(
            r"(?<![A-Za-z0-9._%+-])"
            r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"
            r"(?![A-Za-z0-9.-])"
        ),
        "[이메일 숨김]",
    ),
    (
        "mobile_phone_number",
        re.compile(
            r"(?<!\d)(?:\+82[-.\s]?(?:10|1[16789])|01[016789])"
            r"[-.\s]?\d{3,4}[-.\s]?\d{4}(?!\d)"
        ),
        "[연락처 숨김]",
    ),
    (
        "landline_phone_number",
        re.compile(r"(?<!\d)0(?:2|[3-6][1-5])[-.\s]\d{3,4}[-.\s]\d{4}(?!\d)"),
        "[연락처 숨김]",
    ),
)


@dataclass(frozen=True)
class RedactionResult:
    text: str
    categories: frozenset[str]

    @property
    def changed(self) -> bool:
        return bool(self.categories)


def redact_sensitive_text(value: str) -> RedactionResult:
    redacted = value
    categories: set[str] = set()
    for category, pattern, replacement in _SENSITIVE_PATTERNS:
        redacted, count = pattern.subn(replacement, redacted)
        if count:
            categories.add(category)
    return RedactionResult(redacted, frozenset(categories))


def _redact_value(value: str, categories: set[str]) -> str:
    result = redact_sensitive_text(value)
    categories.update(result.categories)
    return result.text


def _redact_reference(
    reference: SourceReference, categories: set[str]
) -> SourceReference:
    safe_reference = reference.model_copy(deep=True)
    if safe_reference.quote:
        safe_reference.quote = _redact_value(safe_reference.quote, categories)
    return safe_reference


def redact_extracted_document(
    document: ExtractedDocument,
    *,
    add_warning: bool = False,
) -> tuple[ExtractedDocument, frozenset[str]]:
    safe_document = document.model_copy(deep=True)
    categories: set[str] = set()
    safe_document.file_name = _redact_value(safe_document.file_name, categories)
    for block in safe_document.blocks:
        block.text = _redact_value(block.text, categories)
    safe_document.character_count = sum(
        len(block.text) for block in safe_document.blocks
    )
    if add_warning and categories:
        safe_document.warnings.append(PRIVACY_REDACTION_WARNING)
    return safe_document, frozenset(categories)


def _redact_feedback_record(
    record: FeedbackRecordInput, categories: set[str]
) -> FeedbackRecordInput:
    safe_record = record.model_copy(deep=True)
    safe_record.original_text = _redact_value(safe_record.original_text, categories)
    safe_record.interpretation = _redact_value(
        safe_record.interpretation, categories
    )
    safe_record.evidence_refs = [
        _redact_reference(reference, categories)
        for reference in safe_record.evidence_refs
    ]
    return safe_record


def _redact_active_insight(
    insight: ActiveInsightInput, categories: set[str]
) -> ActiveInsightInput:
    safe_insight = insight.model_copy(deep=True)
    safe_insight.text = _redact_value(safe_insight.text, categories)
    safe_insight.evidence_refs = [
        _redact_reference(reference, categories)
        for reference in safe_insight.evidence_refs
    ]
    return safe_insight


def redact_review_request(
    request: ReviewRequest,
) -> tuple[ReviewRequest, frozenset[str]]:
    safe_request = request.model_copy(deep=True)
    categories: set[str] = set()
    safe_request.assignment.title = _redact_value(
        safe_request.assignment.title, categories
    )
    safe_request.assignment.course_name = _redact_value(
        safe_request.assignment.course_name, categories
    )
    safe_request.assignment.description = _redact_value(
        safe_request.assignment.description, categories
    )
    safe_context_documents: list[ExtractedDocument] = []
    for document in safe_request.context_documents:
        safe_document, document_categories = redact_extracted_document(document)
        safe_context_documents.append(safe_document)
        categories.update(document_categories)
    safe_request.context_documents = safe_context_documents
    safe_request.draft, draft_categories = redact_extracted_document(
        safe_request.draft
    )
    categories.update(draft_categories)
    safe_request.feedback_records = [
        _redact_feedback_record(record, categories)
        for record in safe_request.feedback_records
    ]
    safe_request.active_insights = [
        _redact_active_insight(insight, categories)
        for insight in safe_request.active_insights
    ]
    return safe_request, frozenset(categories)


def redact_insight_request(
    request: InsightGenerationRequest,
) -> tuple[InsightGenerationRequest, frozenset[str]]:
    safe_request = request.model_copy(deep=True)
    categories: set[str] = set()
    safe_request.feedback_records = [
        _redact_feedback_record(record, categories)
        for record in safe_request.feedback_records
    ]
    return safe_request, frozenset(categories)

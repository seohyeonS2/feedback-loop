from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

DocumentType = Literal[
    "syllabus",
    "assignment_notice",
    "team_notice",
    "rubric",
    "feedback",
    "draft",
]
ReviewCategory = Literal["requirement", "rubric", "feedback", "format"]
CheckStatus = Literal["pass", "attention", "not_found"]
Readiness = Literal["ready", "needs_attention", "cannot_review"]
FeedbackStatus = Literal[
    "new", "confirmed", "applied", "improved", "needs_review"
]
InsightKind = Literal["strength", "improvement", "repeat_caution"]
InsightState = Literal["candidate", "approved", "edited", "hidden"]
Confidence = Literal["tentative", "supported"]


class CamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")


class SourceBlock(CamelModel):
    block_id: str = Field(alias="blockId")
    text: str
    page_number: int | None = Field(default=None, alias="pageNumber")
    paragraph_number: int | None = Field(default=None, alias="paragraphNumber")


class SourceReference(CamelModel):
    document_id: str = Field(alias="documentId")
    block_id: str = Field(alias="blockId")
    page_number: int | None = Field(default=None, alias="pageNumber")
    paragraph_number: int | None = Field(default=None, alias="paragraphNumber")
    quote: str | None = None


class ExtractedDocument(CamelModel):
    document_id: str = Field(alias="documentId")
    file_name: str = Field(alias="fileName")
    document_type: DocumentType = Field(alias="documentType")
    mime_type: str | None = Field(default=None, alias="mimeType")
    blocks: list[SourceBlock] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    character_count: int = Field(default=0, alias="characterCount")


class AssignmentContext(CamelModel):
    assignment_id: str = Field(alias="assignmentId")
    title: str
    course_name: str = Field(alias="courseName")
    description: str = ""


class FeedbackRecordInput(CamelModel):
    feedback_id: str = Field(alias="feedbackId")
    assignment_id: str = Field(alias="assignmentId")
    original_text: str = Field(alias="originalText")
    interpretation: str = ""
    status: FeedbackStatus = "new"
    evidence_refs: list[SourceReference] = Field(
        default_factory=list, alias="evidenceRefs"
    )


class ActiveInsightInput(CamelModel):
    insight_id: str = Field(alias="insightId")
    kind: InsightKind
    text: str
    evidence_refs: list[SourceReference] = Field(
        default_factory=list, alias="evidenceRefs"
    )


class ReviewRequest(CamelModel):
    assignment: AssignmentContext
    context_documents: list[ExtractedDocument] = Field(
        default_factory=list, alias="contextDocuments"
    )
    feedback_records: list[FeedbackRecordInput] = Field(
        default_factory=list, alias="feedbackRecords"
    )
    draft: ExtractedDocument
    active_insights: list[ActiveInsightInput] = Field(
        default_factory=list, alias="activeInsights"
    )


class CheckItem(CamelModel):
    check_id: str = Field(alias="checkId")
    category: ReviewCategory
    status: CheckStatus
    title: str
    detail: str
    evidence_refs: list[SourceReference] = Field(
        default_factory=list, alias="evidenceRefs"
    )


class InsightCandidate(CamelModel):
    candidate_id: str = Field(alias="candidateId")
    kind: InsightKind
    statement: str
    feedback_record_ids: list[str] = Field(
        default_factory=list, alias="feedbackRecordIds"
    )
    evidence_refs: list[SourceReference] = Field(
        default_factory=list, alias="evidenceRefs"
    )
    confidence: Confidence = "tentative"


class ReviewResult(CamelModel):
    review_id: str = Field(alias="reviewId")
    readiness: Readiness
    summary: str
    checks: list[CheckItem] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    insight_candidates: list[InsightCandidate] = Field(
        default_factory=list, alias="insightCandidates"
    )


class InsightGenerationRequest(CamelModel):
    feedback_records: list[FeedbackRecordInput] = Field(
        default_factory=list, alias="feedbackRecords"
    )


class InsightGenerationResponse(CamelModel):
    candidates: list[InsightCandidate] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class HealthResponse(CamelModel):
    status: str
    ai_configured: bool = Field(alias="aiConfigured")
    model: str

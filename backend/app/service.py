from __future__ import annotations

from uuid import uuid4

from .config import Settings
from .llm import LLMProvider
from .schemas import (
    InsightGenerationRequest,
    InsightGenerationResponse,
    ReviewRequest,
    ReviewResult,
    SourceReference,
)


def _allowed_references(request: ReviewRequest) -> set[tuple[str, str]]:
    documents = [*request.context_documents, request.draft]
    return {
        (document.document_id, block.block_id)
        for document in documents
        for block in document.blocks
    }


def _valid_reference(
    reference: SourceReference, allowed: set[tuple[str, str]]
) -> bool:
    return (reference.document_id, reference.block_id) in allowed


class ReviewService:
    def __init__(self, provider: LLMProvider, settings: Settings):
        self.provider = provider
        self.settings = settings

    async def review(self, request: ReviewRequest) -> ReviewResult:
        if not request.draft.blocks:
            return ReviewResult(
                reviewId=str(uuid4()),
                readiness="cannot_review",
                summary="초안에서 텍스트를 찾지 못해 검토를 시작할 수 없어요.",
                warnings=["텍스트가 추출된 PDF 또는 DOCX 초안을 업로드해 주세요."],
            )
        total_chars = sum(
            len(block.text)
            for document in [*request.context_documents, request.draft]
            for block in document.blocks
        )
        if total_chars > self.settings.max_review_characters:
            return ReviewResult(
                reviewId=str(uuid4()),
                readiness="cannot_review",
                summary="자료가 너무 길어 한 번에 검토하기 어려워요.",
                warnings=[
                    "자료를 나누어 업로드해 주세요. "
                    f"현재 한도는 {self.settings.max_review_characters:,}자예요."
                ],
            )

        result = await self.provider.review(request)
        allowed = _allowed_references(request)
        for check in result.checks:
            check.evidence_refs = [
                reference
                for reference in check.evidence_refs
                if _valid_reference(reference, allowed)
            ]
        valid_feedback_ids = {record.feedback_id for record in request.feedback_records}
        for candidate in result.insight_candidates:
            candidate.feedback_record_ids = [
                feedback_id
                for feedback_id in candidate.feedback_record_ids
                if feedback_id in valid_feedback_ids
            ]
            candidate.evidence_refs = [
                reference
                for reference in candidate.evidence_refs
                if _valid_reference(reference, allowed)
            ]
        return result

    async def generate_insights(
        self, request: InsightGenerationRequest
    ) -> InsightGenerationResponse:
        if len(request.feedback_records) < 2:
            return InsightGenerationResponse(
                warnings=[
                    "서로 다른 피드백 기록이 2개 이상 쌓이면 반복 인사이트를 "
                    "만들 수 있어요."
                ]
            )
        result = await self.provider.generate_insights(request)
        valid_ids = {record.feedback_id for record in request.feedback_records}
        allowed_references = {
            (reference.document_id, reference.block_id)
            for record in request.feedback_records
            for reference in record.evidence_refs
        }
        for candidate in result.candidates:
            candidate.feedback_record_ids = [
                feedback_id
                for feedback_id in candidate.feedback_record_ids
                if feedback_id in valid_ids
            ]
            candidate.evidence_refs = [
                reference
                for reference in candidate.evidence_refs
                if (reference.document_id, reference.block_id) in allowed_references
            ]
        result.candidates = [
            candidate
            for candidate in result.candidates
            if len(set(candidate.feedback_record_ids)) >= 2
        ]
        return result

from fastapi.testclient import TestClient

from app.config import Settings
from app.llm import LLMProvider
from app.main import create_app
from app.schemas import (
    InsightGenerationRequest,
    InsightGenerationResponse,
    ReviewRequest,
    ReviewResult,
)


class FakeProvider(LLMProvider):
    async def review(self, request: ReviewRequest) -> ReviewResult:
        reference = request.draft.blocks[0]
        return ReviewResult(
            reviewId="review-1",
            readiness="needs_attention",
            summary="한 가지를 확인해 주세요.",
            checks=[
                {
                    "checkId": "check-1",
                    "category": "requirement",
                    "status": "attention",
                    "title": "근거 연결 확인",
                    "detail": "본문의 주장을 자료와 연결해 주세요.",
                    "evidenceRefs": [
                        {
                            "documentId": request.draft.document_id,
                            "blockId": reference.block_id,
                        }
                    ],
                }
            ],
        )

    async def generate_insights(
        self, request: InsightGenerationRequest
    ) -> InsightGenerationResponse:
        return InsightGenerationResponse(
            candidates=[
                {
                    "candidateId": "candidate-1",
                    "kind": "improvement",
                    "statement": "주장과 근거의 연결을 먼저 확인해 보세요.",
                    "feedbackRecordIds": [
                        request.feedback_records[0].feedback_id,
                        request.feedback_records[1].feedback_id,
                    ],
                    "evidenceRefs": request.feedback_records[0].evidence_refs,
                    "confidence": "supported",
                }
            ]
        )


def make_client() -> TestClient:
    settings = Settings(
        gemini_api_key="test-key",
        frontend_origin="http://testserver",
        requests_per_hour=100,
    )
    return TestClient(create_app(settings=settings, provider=FakeProvider()))


def review_payload() -> dict:
    return {
        "assignment": {
            "assignmentId": "assignment-1",
            "title": "분석 보고서",
            "courseName": "마케팅원론",
            "description": "자료를 근거로 분석합니다.",
        },
        "contextDocuments": [
            {
                "documentId": "context-1",
                "fileName": "notice.docx",
                "documentType": "assignment_notice",
                "blocks": [
                    {
                        "blockId": "context-1-b1",
                        "text": "자료를 근거로 분석할 것",
                        "paragraphNumber": 1,
                    }
                ],
                "warnings": [],
                "characterCount": 12,
            }
        ],
        "feedbackRecords": [],
        "draft": {
            "documentId": "draft-1",
            "fileName": "draft.docx",
            "documentType": "draft",
            "blocks": [
                {
                    "blockId": "draft-1-b1",
                    "text": "시장 분석 결과입니다.",
                    "paragraphNumber": 1,
                }
            ],
            "warnings": [],
            "characterCount": 12,
        },
        "activeInsights": [],
    }


def test_health_reports_configuration():
    response = make_client().get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["aiConfigured"] is True


def test_review_filters_unknown_evidence_reference():
    payload = review_payload()
    payload["draft"]["blocks"][0]["blockId"] = "draft-1-b1"
    response = make_client().post("/api/v1/reviews", json=payload)

    assert response.status_code == 200
    assert response.json()["readiness"] == "needs_attention"
    evidence = response.json()["checks"][0]["evidenceRefs"]
    assert evidence == [
        {
            "documentId": "draft-1",
            "blockId": "draft-1-b1",
            "pageNumber": None,
            "paragraphNumber": None,
            "quote": None,
        }
    ]


def test_insights_need_two_feedback_records():
    client = make_client()
    payload = {
        "feedbackRecords": [
            {
                "feedbackId": "feedback-1",
                "assignmentId": "assignment-1",
                "originalText": "근거를 더 명확히 적어 주세요.",
                "evidenceRefs": [],
            }
        ]
    }

    response = client.post("/api/v1/insights/candidates", json=payload)

    assert response.status_code == 200
    assert response.json()["candidates"] == []
    assert response.json()["warnings"]

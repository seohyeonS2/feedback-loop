from __future__ import annotations

import json

from .schemas import InsightGenerationRequest, ReviewRequest

SOURCE_REFERENCE_SCHEMA = {
    "type": "object",
    "properties": {
        "documentId": {"type": "string"},
        "blockId": {"type": "string"},
        "pageNumber": {"type": "integer"},
        "paragraphNumber": {"type": "integer"},
        "quote": {"type": "string"},
    },
    "required": ["documentId", "blockId"],
}


REVIEW_SCHEMA = {
    "type": "object",
    "properties": {
        "reviewId": {"type": "string"},
        "readiness": {
            "type": "string",
            "enum": ["ready", "needs_attention", "cannot_review"],
        },
        "summary": {"type": "string"},
        "checks": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "checkId": {"type": "string"},
                    "category": {
                        "type": "string",
                        "enum": ["requirement", "rubric", "feedback", "format"],
                    },
                    "status": {
                        "type": "string",
                        "enum": ["pass", "attention", "not_found"],
                    },
                    "title": {"type": "string"},
                    "detail": {"type": "string"},
                    "evidenceRefs": {
                        "type": "array",
                        "items": SOURCE_REFERENCE_SCHEMA,
                    },
                },
                "required": [
                    "checkId",
                    "category",
                    "status",
                    "title",
                    "detail",
                    "evidenceRefs",
                ],
            },
        },
        "warnings": {"type": "array", "items": {"type": "string"}},
        "insightCandidates": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "candidateId": {"type": "string"},
                    "kind": {
                        "type": "string",
                        "enum": ["strength", "improvement", "repeat_caution"],
                    },
                    "statement": {"type": "string"},
                    "feedbackRecordIds": {
                        "type": "array",
                        "items": {"type": "string"},
                    },
                    "evidenceRefs": {
                        "type": "array",
                        "items": SOURCE_REFERENCE_SCHEMA,
                    },
                    "confidence": {
                        "type": "string",
                        "enum": ["tentative", "supported"],
                    },
                },
                "required": [
                    "candidateId",
                    "kind",
                    "statement",
                    "feedbackRecordIds",
                    "evidenceRefs",
                    "confidence",
                ],
            },
        },
    },
    "required": [
        "reviewId",
        "readiness",
        "summary",
        "checks",
        "warnings",
        "insightCandidates",
    ],
}


INSIGHT_SCHEMA = {
    "type": "object",
    "properties": {
        "candidates": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "candidateId": {"type": "string"},
                    "kind": {
                        "type": "string",
                        "enum": ["strength", "improvement", "repeat_caution"],
                    },
                    "statement": {"type": "string"},
                    "feedbackRecordIds": {
                        "type": "array",
                        "items": {"type": "string"},
                    },
                    "evidenceRefs": {
                        "type": "array",
                        "items": SOURCE_REFERENCE_SCHEMA,
                    },
                    "confidence": {
                        "type": "string",
                        "enum": ["tentative", "supported"],
                    },
                },
                "required": [
                    "candidateId",
                    "kind",
                    "statement",
                    "feedbackRecordIds",
                    "evidenceRefs",
                    "confidence",
                ],
            },
        },
        "warnings": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["candidates", "warnings"],
}


SYSTEM_INSTRUCTION = """
너는 대학생의 과제 제출 전 점검을 돕는 조심스러운 검토 도우미다.
사용자가 제공한 자료만 근거로 판단하고, 자료에 없는 사실을 만들지 않는다.
성적이나 등급을 예측하지 말고, 교수의 의도나 학생의 성격을 단정하지 않는다.
팀플 공지는 과제 조건을 설명하는 자료일 뿐이며 팀원의 성실도를 평가하지 않는다.
모든 검토 항목은 제공된 documentId와 blockId를 근거로 연결한다.
근거가 없으면 not_found로 표시하고 추측하지 않는다.
개인 인사이트는 최소 두 개의 서로 다른 피드백 기록에서 반복될 때만 후보로 만든다.
문구는 비난 대신 확인·개선 중심의 중립적인 한국어로 작성한다.
대괄호로 표시된 개인정보 숨김 값은 복원하거나 추측하지 않는다.
반드시 요청된 JSON 구조만 반환한다.
""".strip()


def _document_text(document: object) -> str:
    data = document.model_dump(by_alias=True)
    lines = [
        f"[{data['documentId']} / {data['documentType']} / {data['fileName']}]"
    ]
    for block in data.get("blocks", []):
        location = []
        if block.get("pageNumber") is not None:
            location.append(f"page={block['pageNumber']}")
        if block.get("paragraphNumber") is not None:
            location.append(f"paragraph={block['paragraphNumber']}")
        location_text = ", ".join(location)
        lines.append(f"- {block['blockId']} ({location_text}): {block['text']}")
    return "\n".join(lines)


def build_review_prompt(request: ReviewRequest) -> str:
    context = "\n\n".join(
        _document_text(document) for document in request.context_documents
    )
    draft = _document_text(request.draft)
    feedback = json.dumps(
        [record.model_dump(by_alias=True) for record in request.feedback_records],
        ensure_ascii=False,
        indent=2,
    )
    insights = json.dumps(
        [insight.model_dump(by_alias=True) for insight in request.active_insights],
        ensure_ascii=False,
        indent=2,
    )
    assignment = json.dumps(
        request.assignment.model_dump(by_alias=True), ensure_ascii=False, indent=2
    )
    return f"""
다음 자료로 제출물 검토를 수행해라.

과제:
{assignment}

수업 자료와 과제 기준:
{context or '(제공된 수업 자료 없음)'}

누적 교수 피드백:
{feedback}

사용자가 승인한 개인 점검 포인트:
{insights}

현재 초안:
{draft}

checks에는 필수 조건, 채점 기준, 반복 피드백, 형식 조건을 각각 확인할 수 있는
항목을 넣어라.
status가 pass 또는 attention이면 반드시 하나 이상의 근거 문단을 연결하라.
초안에서 확인하지 못한 조건은 not_found로 표시하라.
""".strip()


def build_insight_prompt(request: InsightGenerationRequest) -> str:
    feedback = json.dumps(
        [record.model_dump(by_alias=True) for record in request.feedback_records],
        ensure_ascii=False,
        indent=2,
    )
    return f"""
아래 교수 피드백 기록을 비교해 반복되는 학습 패턴 후보를 찾아라.

피드백 기록:
{feedback}

서로 다른 feedbackId가 최소 2개 연결된 경우에만 후보를 생성하라.
한 번만 등장한 지적은 후보에서 제외하라.
후보는 '강점', '개선 중인 점', '반복해서 확인할 점' 중 하나로 작성하라.
각 후보에 연결된 피드백 ID와 근거 문단을 포함하라.
""".strip()

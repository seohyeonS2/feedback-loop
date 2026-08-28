from __future__ import annotations

from collections import defaultdict
from time import monotonic
from typing import Annotated

from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .config import Settings, get_settings
from .extraction import DocumentExtractionError, extract_upload
from .llm import GeminiProvider, LLMError
from .schemas import (
    DocumentType,
    HealthResponse,
    InsightGenerationRequest,
    InsightGenerationResponse,
    ReviewRequest,
    ReviewResult,
)
from .service import ReviewService


class InMemoryRateLimiter:
    def __init__(self, limit: int):
        self.limit = limit
        self.events: defaultdict[str, list[float]] = defaultdict(list)

    def allow(self, key: str) -> bool:
        now = monotonic()
        recent = [timestamp for timestamp in self.events[key] if now - timestamp < 3600]
        self.events[key] = recent
        if len(recent) >= self.limit:
            return False
        self.events[key].append(now)
        return True


def create_app(
    settings: Settings | None = None,
    provider: object | None = None,
) -> FastAPI:
    resolved_settings = settings or get_settings()
    resolved_provider = provider or GeminiProvider(resolved_settings)
    service = ReviewService(resolved_provider, resolved_settings)
    limiter = InMemoryRateLimiter(resolved_settings.requests_per_hour)

    app = FastAPI(title=resolved_settings.app_name, version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[resolved_settings.frontend_origin],
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )

    def enforce_rate_limit(request: Request) -> None:
        client_ip = request.client.host if request.client else "unknown"
        if not limiter.allow(client_ip):
            raise HTTPException(
                status_code=429,
                detail="잠시 후 다시 시도해 주세요. 데모 사용량 제한에 도달했어요.",
            )

    @app.get("/health", response_model=HealthResponse)
    async def health() -> HealthResponse:
        return HealthResponse(
            status="ok",
            aiConfigured=bool(resolved_settings.gemini_api_key),
            model=resolved_settings.gemini_model,
        )

    @app.post("/api/v1/documents/extract")
    async def extract_document(
        file: Annotated[UploadFile, File(...)],
        document_type: Annotated[DocumentType, Form(...)],
        document_id: Annotated[str, Form(...)],
    ):
        try:
            return await extract_upload(
                file,
                document_id=document_id,
                document_type=document_type,
                max_bytes=resolved_settings.max_file_size_mb * 1024 * 1024,
            )
        except DocumentExtractionError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    @app.post("/api/v1/reviews", response_model=ReviewResult)
    async def review_submission(
        payload: ReviewRequest,
        request: Request,
        _: None = Depends(enforce_rate_limit),
    ) -> ReviewResult:
        del request
        try:
            return await service.review(payload)
        except LLMError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc

    @app.post(
        "/api/v1/insights/candidates",
        response_model=InsightGenerationResponse,
    )
    async def insight_candidates(
        payload: InsightGenerationRequest,
        request: Request,
        _: None = Depends(enforce_rate_limit),
    ) -> InsightGenerationResponse:
        del request
        try:
            return await service.generate_insights(payload)
        except LLMError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc

    return app


app = create_app()

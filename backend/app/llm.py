from __future__ import annotations

import json
from typing import TypeVar

import httpx
from pydantic import BaseModel, ValidationError

from .config import Settings
from .prompts import (
    INSIGHT_SCHEMA,
    REVIEW_SCHEMA,
    SYSTEM_INSTRUCTION,
    build_insight_prompt,
    build_review_prompt,
)
from .schemas import (
    InsightGenerationRequest,
    InsightGenerationResponse,
    ReviewRequest,
    ReviewResult,
)

ModelT = TypeVar("ModelT", bound=BaseModel)


class LLMError(RuntimeError):
    """A user-safe AI provider error."""


class LLMConfigurationError(LLMError):
    pass


class LLMProvider:
    async def review(self, request: ReviewRequest) -> ReviewResult:
        raise NotImplementedError

    async def generate_insights(
        self, request: InsightGenerationRequest
    ) -> InsightGenerationResponse:
        raise NotImplementedError


class GeminiProvider(LLMProvider):
    def __init__(self, settings: Settings):
        self.settings = settings

    async def _generate_json(
        self,
        *,
        prompt: str,
        schema: dict,
        response_model: type[ModelT],
    ) -> ModelT:
        if not self.settings.gemini_api_key:
            raise LLMConfigurationError(
                "GEMINI_API_KEY가 설정되지 않았어요. 백엔드 환경변수를 확인해 주세요."
            )

        url = (
            f"{self.settings.gemini_base_url.rstrip('/')}/models/"
            f"{self.settings.gemini_model}:generateContent"
        )
        body = {
            "systemInstruction": {"parts": [{"text": SYSTEM_INSTRUCTION}]},
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {
                "responseMimeType": "application/json",
                "responseSchema": schema,
            },
        }

        last_error: Exception | None = None
        for attempt in range(2):
            if attempt:
                body["contents"][0]["parts"][0]["text"] = (
                    prompt
                    + "\n\n이전 응답을 사용할 수 없었으니 동일한 정보를 "
                    "유효한 JSON으로 다시 반환해라."
                )
            try:
                async with httpx.AsyncClient(timeout=45.0) as client:
                    response = await client.post(
                        url,
                        headers={
                            "Content-Type": "application/json",
                            "x-goog-api-key": self.settings.gemini_api_key,
                        },
                        json=body,
                    )
                if response.status_code >= 400:
                    detail = response.text[:300]
                    raise LLMError(
                        f"Gemini 요청이 거절됐어요 ({response.status_code}): {detail}"
                    )
                payload = response.json()
                text = payload["candidates"][0]["content"]["parts"][0]["text"]
                return response_model.model_validate(json.loads(text))
            except (KeyError, IndexError, json.JSONDecodeError, ValidationError) as exc:
                last_error = exc
            except (httpx.HTTPError, LLMError) as exc:
                last_error = exc
                if isinstance(exc, LLMError) and "JSON" not in str(exc):
                    break

        raise LLMError(
            "AI 결과를 안전한 형식으로 받지 못했어요. 잠시 후 다시 시도해 주세요."
        ) from last_error

    async def review(self, request: ReviewRequest) -> ReviewResult:
        return await self._generate_json(
            prompt=build_review_prompt(request),
            schema=REVIEW_SCHEMA,
            response_model=ReviewResult,
        )

    async def generate_insights(
        self, request: InsightGenerationRequest
    ) -> InsightGenerationResponse:
        return await self._generate_json(
            prompt=build_insight_prompt(request),
            schema=INSIGHT_SCHEMA,
            response_model=InsightGenerationResponse,
        )

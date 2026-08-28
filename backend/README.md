# Backend

Feedback Loop의 문서 추출·AI 검토 API다. 업로드 파일은 요청 중 메모리에서만
읽고 저장하지 않으며, 검토 결과는 프론트엔드 브라우저 저장소에 보관한다.

## Local run

프로젝트 루트에서 만든 가상환경을 사용해 의존성을 설치한다.

```powershell
..\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
Copy-Item .env.example .env
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

`GEMINI_API_KEY`가 비어 있으면 `/health`는 동작하지만 검토 요청은 안내 오류를
반환한다. 실제 키는 `.env` 또는 배포 환경변수에만 넣고 커밋하지 않는다.

## API

- `GET /health`: 서버와 Gemini 설정 상태 확인
- `POST /api/v1/documents/extract`: PDF/DOCX 텍스트를 근거 블록으로 변환
- `POST /api/v1/reviews`: 과제 기준·초안·승인 인사이트를 바탕으로 검토
- `POST /api/v1/insights/candidates`: 두 개 이상 피드백의 반복 패턴 후보 생성

검사 명령:

```powershell
..\.venv\Scripts\python.exe -m ruff check .
..\.venv\Scripts\python.exe -m pytest
```

# 배포 메모

MVP는 정적 프론트와 무상태 API를 분리해 배포한다.

## Frontend: Vercel

1. Vercel에서 이 저장소의 `frontend/`를 프로젝트 루트로 연결한다.
2. Framework는 Vite, Build command는 `npm run build`, Output directory는
   `dist`로 둔다.
3. `VITE_API_BASE_URL`에 Render 백엔드 URL을 넣는다.

## Backend: Render

저장소 루트의 `render.yaml`을 Blueprint로 연결한다. 다음 환경변수는 Render
대시보드에서 입력한다.

- `GEMINI_API_KEY`: Gemini API 키
- `FRONTEND_ORIGIN`: 배포된 Vercel URL
- `GEMINI_MODEL`: 기본값은 `gemini-3.5-flash-lite`

Render Free 인스턴스는 유휴 후 잠들 수 있어 첫 API 요청이 느릴 수 있다. 또한
파일시스템을 영구 저장소로 사용할 수 없으므로 현재의 브라우저 저장 + 요청 중
처리 구조를 유지한다.

## 배포 전 확인

- 프론트에서 `/health`가 `status: ok`를 반환하는지 확인한다.
- `aiConfigured: true`인지 확인하고 실제 PDF/DOCX 한 개로 추출을 시험한다.
- `FRONTEND_ORIGIN`이 실제 브라우저 주소와 정확히 일치하는지 확인한다.
- API 키와 `.env` 파일은 커밋하지 않는다.

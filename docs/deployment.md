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

Render Free 인스턴스는 인바운드 요청이 15분 동안 없으면 잠들고, 다음 요청에서
다시 시작된다. 프론트엔드는 사용자가 화면에 들어오면 `/health`를 먼저 호출해
서버를 깨우고, 일시적인 연결 실패를 약 1분 동안 재시도한다. `render.yaml`의
`healthCheckPath`는 실행 중인 인스턴스와 새 배포의 준비 상태를 확인한다.

15분보다 짧은 간격으로 외부 핑을 보내 항상 실행시키는 keep-alive 봇은 추가하지
않는다. 이는 무료 인스턴스의 절전·결제 제한을 의도적으로 우회하는 방식이 될 수
있다. 항상 빠른 응답이 필요해지면 Render 유료 인스턴스로 전환한다.

Free 인스턴스의 파일시스템은 영구 저장소가 아니므로 현재의 브라우저 저장 +
요청 중 처리 구조를 유지한다.

## 배포 전 확인

- 프론트에서 `/health`가 `status: ok`를 반환하는지 확인한다.
- `aiConfigured: true`인지 확인하고 실제 PDF/DOCX 한 개로 추출을 시험한다.
- `FRONTEND_ORIGIN`이 실제 브라우저 주소와 정확히 일치하는지 확인한다.
- API 키와 `.env` 파일은 커밋하지 않는다.

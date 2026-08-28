# Frontend

Feedback Loop PC 웹 UI다. React 19, Vite, TypeScript를 사용하고, 브라우저
IndexedDB에 사용자 작업을 저장한다. 외부 API에는 파일 자체가 아니라 추출된
텍스트와 근거 위치만 보낸다.

## Local run

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

백엔드 주소가 다르면 `.env`의 `VITE_API_BASE_URL`을 바꾼다. 백엔드 없이도
`샘플로 둘러보기`와 JSON 백업/복구 화면은 사용할 수 있다.

검사 명령:

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

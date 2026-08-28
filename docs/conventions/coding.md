# Coding Conventions

## Stack boundaries

- `frontend/`: React + TypeScript + Vite. 화면 상태와 브라우저 IndexedDB
  저장소를 담당한다.
- `backend/`: FastAPI + Pydantic. 문서 추출, Gemini 호출, 입력 검증과
  응답 정규화를 담당한다.
- 백엔드는 업로드 파일이나 사용자 작업 데이터를 영구 저장하지 않는다.
  프론트엔드가 API에 보낼 때 `StoredDocument`에서 `fileData`와 `createdAt`을
  제거한 추출 결과만 사용한다.

## Naming and data

- TypeScript 컴포넌트와 타입은 PascalCase, 함수·변수는 camelCase를 쓴다.
- Python 함수·변수는 snake_case, Pydantic API 필드는 camelCase alias를 쓴다.
- 모든 검토 근거는 `documentId`와 `blockId`를 함께 가진다. AI 응답의 근거는
  서버에서 요청에 실제 존재하는 블록인지 다시 필터링한다.
- 한 번만 등장한 피드백으로 개인의 단점이나 성향을 확정하지 않는다. 서로
  다른 피드백 기록이 두 개 이상 연결된 경우에만 인사이트 후보를 만든다.

## Checks

```powershell
# frontend/
npm run typecheck
npm run lint
npm test
npm run build

# backend/
..\.venv\Scripts\python.exe -m ruff check .
..\.venv\Scripts\python.exe -m pytest
```

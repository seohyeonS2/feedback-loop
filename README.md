# Feedback Loop

대학생 과제 제출물을 강의계획서, 과제·팀플 공지, 채점기준, 교수님 피드백을
바탕으로 검토하고, 과제가 쌓일수록 나의 강점과 개선점을 기록하는 PC 웹
서비스다.

## Repository structure

```text
frontend/       # PC 웹 UI
backend/        # API, AI 분석, 파일·데이터 저장
docs/           # 기획·결정사항·도메인 문서
scripts/        # 개발 보조 스크립트
README.md
```

MVP는 React/Vite PC 웹 UI와 FastAPI 분석 API로 구성된다. 브라우저에는 과제,
추출 결과, 피드백 상태, 검토 결과와 승인한 인사이트를 저장하고, 백엔드는
업로드 파일을 영구 저장하지 않은 채 텍스트 추출과 AI 검토 응답만 처리한다.

자세한 실행 방법은 [`frontend/README.md`](frontend/README.md)와
[`backend/README.md`](backend/README.md)를 참고한다.

배포 순서는 [`docs/deployment.md`](docs/deployment.md)에 정리되어 있다.

## Current workflow

1. 의미 있는 작업은 GitHub 이슈로 범위와 완료 조건을 정한다.
2. 작업 유형에 맞는 `feature/`, `fix/`, `docs/`, `chore/` 브랜치를 만든다.
3. 논리적으로 나뉜 커밋을 만든다.
4. 검사 후 PR을 열고 리뷰한 뒤 `main`에 병합한다.

기본 검사:

```powershell
git diff --check
```

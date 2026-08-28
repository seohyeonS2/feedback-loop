# Feedback Loop

대학생 과제 제출물을 강의계획서, 과제·팀플 공지, 채점기준, 교수님 피드백을
바탕으로 검토하고, 과제가 쌓일수록 나의 강점과 개선점을 기록하는 PC 웹
서비스다.

## Repository structure

```text
frontend/       # PC 웹 UI
backend/        # API, AI 분석, 파일·데이터 저장
docs/           # 기획·결정사항·도메인 문서
scripts/        # 저장소 검사 스크립트
README.md
```

현재는 제품 구현 전 단계로, 하네스·문서·GitHub 협업 규칙과 기본 디렉터리만
준비되어 있다. 제품 코드는 `frontend/`와 `backend/`에 각각 스택을 선택한 뒤
추가한다.

## Current workflow

1. 의미 있는 작업은 GitHub 이슈로 범위와 완료 조건을 정한다.
2. 작업별 `<short-kebab-case>` 브랜치를 만든다.
3. 논리적으로 나뉜 커밋을 만든다.
4. 검사 후 PR을 열고 리뷰한 뒤 `main`에 병합한다.

검사:

```powershell
.\scripts\check_harness.ps1
git diff --check
```

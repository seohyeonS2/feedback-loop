# Feedback Loop

> **OpenAI Codex와 함께 기획, 구현, 테스트와 배포를 진행한 바이브코딩
> 프로젝트입니다.**
>
> 사용자가 서비스 방향과 기능 우선순위를 결정하고, Codex를 개발 도구로
> 활용했습니다.

[서비스 바로가기](https://feedback-loop-liart.vercel.app/)

흩어진 과제 기준과 교수님 피드백을 다음 제출물의 점검 루틴으로 연결하는
대학생용 PC 웹 서비스입니다.

Feedback Loop은 강의계획서, 과제 공지, 채점기준과 교수님 피드백을 과제별로
정리하고, 제출 초안을 사용자가 등록한 자료에 근거해 검토합니다. 점수나
교수님의 의도를 예측하는 대신 확인한 조건과 관련 문단을 함께 보여줍니다.

## 해결하려는 문제

- 과제 조건이 강의계획서, LMS 공지와 채점기준에 흩어져 있습니다.
- 제출 직전에 모든 조건과 이전 피드백을 다시 확인하기 어렵습니다.
- 한 번 받은 지적과 여러 과제에서 반복되는 학습 패턴을 구분하기 어렵습니다.

## 핵심 기능

- 개인 과제와 팀 과제에 맞는 기준 자료 관리
- PDF/DOCX 텍스트 추출과 페이지·문단 단위 근거 생성
- 과제 조건, 채점기준과 이전 피드백을 반영한 제출 초안 검토
- 검토 항목별 `통과`, `확인 필요`, `근거 없음` 상태와 출처 표시
- 교수님 피드백의 확인·반영·개선 상태 기록
- 서로 다른 피드백에서 반복된 개인 인사이트 후보 생성
- 인사이트 승인·수정·숨김과 다음 과제 재사용
- 분석 전 주민등록번호·연락처·이메일 패턴 자동 마스킹

## 사용 흐름

```text
과제 생성
  → 과제 기준 자료 등록
  → 제출 초안 업로드
  → 근거 기반 제출물 검토
  → 교수님 피드백과 반영 상태 기록
  → 반복 인사이트 승인·수정
  → 다음 과제 검토에 재사용
```

## 기술 구성

| 영역 | 기술 |
| --- | --- |
| Frontend | React 19, TypeScript, Vite |
| Backend | FastAPI, Pydantic, Uvicorn |
| Document | pypdf, python-docx |
| AI | Gemini API |
| Storage | IndexedDB |
| Test | Vitest, Testing Library, Pytest, Ruff, ESLint |
| Deploy | Vercel, Render |

## 개인정보 및 검토 원칙

- 문서 추출 직후와 AI 분석 요청 직전에 주민등록번호·연락처·이메일 패턴을
  자동으로 가립니다.
- 마스킹된 값을 AI가 복원하거나 추측하지 않도록 제한합니다.
- 이름이나 주소처럼 문맥에 따라 달라지는 정보는 완전한 자동 탐지를 보장하지
  않으므로 업로드 전에 사용자가 한 번 더 확인해야 합니다.
- 실제 점수·등급, 교수님의 의도나 팀원의 성향을 예측하지 않습니다.

## 로컬 실행

Node.js 20.19 이상과 Python 3.11 이상을 권장합니다.

### Backend

프로젝트 루트에서 실행합니다.

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements-dev.txt
Copy-Item backend\.env.example backend\.env
Set-Location backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

실제 AI 검토를 사용하려면 `backend/.env`에 Gemini API 키를 설정합니다.

### Frontend

새 PowerShell 터미널에서 실행합니다.

```powershell
Set-Location frontend
npm install
Copy-Item .env.example .env
npm run dev
```

브라우저에서 `http://localhost:5173`을 엽니다.

## 검사

```powershell
# Frontend
Set-Location frontend
npm run typecheck
npm run lint
npm test
npm run build

# Backend
Set-Location ..\backend
..\.venv\Scripts\python.exe -m ruff check .
..\.venv\Scripts\python.exe -m pytest
```

## 현재 범위

- PC 웹을 기준으로 합니다.
- PDF와 DOCX의 텍스트를 지원하며 스캔 이미지 OCR은 지원하지 않습니다.
- 학교 LMS 자동 로그인이나 무단 크롤링을 하지 않습니다.
- 계정 로그인과 기기 간 동기화는 제공하지 않습니다.

## 저장소 구조

```text
feedback-loop/
├─ frontend/       # React PC 웹
├─ backend/        # 문서 추출과 AI 검토 API
├─ docs/           # 기획, 도메인, 결정과 배포 문서
├─ scripts/        # 개발 보조 스크립트
└─ README.md
```

## 관련 문서

- [제품 기획](docs/product/feedback-loop.md)
- [도메인 용어](docs/domain/glossary.md)
- [아키텍처 결정](docs/decisions/README.md)
- [Git·GitHub 워크플로](docs/conventions/git-workflow.md)
- [배포 가이드](docs/deployment.md)

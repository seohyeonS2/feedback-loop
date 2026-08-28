# 0001. MVP 스택과 실행 경계

## Context

Feedback Loop은 대학생이 수업 자료와 초안을 올리고 제출 전 검토를 받는 PC
웹 MVP다. 파일 저장·인증·LMS 연동까지 한 번에 도입하면 초기 검증 범위가
커진다.

## Decision

- 화면은 React 19 + TypeScript + Vite로 만든다.
- 문서 추출·검토 API는 FastAPI + Pydantic으로 만든다.
- PDF는 `pypdf`, DOCX는 `python-docx`로 텍스트와 페이지/문단 근거를 만든다.
- Gemini 호출은 `LLMProvider` 인터페이스 뒤에 두고, 구조화 JSON 응답을
  Pydantic 모델로 검증한다.
- 문서는 PDF/DOCX만 지원하고 스캔 이미지 OCR은 MVP에서 지원하지 않는다.

## Rationale

프론트와 백엔드의 책임을 명확히 나누면서도 학생이 로컬에서 빠르게 실행할
수 있다. AI 공급자를 교체해도 프롬프트·응답 계약 외의 화면 코드를 바꾸지
않을 수 있다.

## Consequences

추출 정확도는 원본 문서의 텍스트 레이어에 의존한다. OCR, 인증, 학교 LMS
자동 수집, 파일 뷰어가 필요해지는 시점에는 별도 결정 기록이 필요하다.

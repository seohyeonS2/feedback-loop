import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";

import {
  ApiError,
  extractDocument,
  formatEvidence,
  generateInsightCandidates,
  reviewSubmission,
} from "./api";
import { createSampleSnapshot } from "./sampleData";
import {
  clearStorage,
  emptySnapshot,
  exportSnapshot,
  importSnapshot,
  readSnapshot,
  replaceSnapshot,
} from "./storage";
import {
  DOCUMENT_LABELS,
  EMPTY_SNAPSHOT,
  FEEDBACK_STATUS_LABELS,
  INSIGHT_LABELS,
  type AppSnapshot,
  type Assignment,
  type DocumentType,
  type ExtractedDocument,
  type FeedbackRecord,
  type FeedbackStatus,
  type InsightCandidate,
  type PersonalInsight,
  type ReviewRecord,
  type ReviewResult,
  type SourceReference,
  type StoredDocument,
} from "./types";

type Route =
  | { name: "dashboard" | "assignments" | "profile" | "settings" }
  | { name: "assignment" | "review"; assignmentId: string };

const ROUTE_TITLES: Record<Route["name"], string> = {
  dashboard: "오늘의 제출 준비",
  assignments: "과제 워크스페이스",
  assignment: "과제 워크스페이스",
  review: "제출물 검토",
  profile: "나의 피드백 프로필",
  settings: "데이터 관리",
};

function makeId(prefix: string): string {
  const randomId = globalThis.crypto?.randomUUID?.();
  return randomId ? `${prefix}-${randomId}` : `${prefix}-${Date.now()}`;
}

function now(): string {
  return new Date().toISOString();
}

function parseRoute(): Route {
  const hash = window.location.hash.replace(/^#/, "") || "dashboard";
  const [name, assignmentId] = hash.split("/");
  if (
    (name === "assignment" || name === "review") &&
    assignmentId
  ) {
    return { name, assignmentId };
  }
  if (name === "assignments" || name === "profile" || name === "settings") {
    return { name };
  }
  return { name: "dashboard" };
}

function useRoute(): [Route, (path: string) => void] {
  const [route, setRoute] = useState<Route>(parseRoute);
  useEffect(() => {
    const handleHashChange = () => setRoute(parseRoute());
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);
  return [route, (path) => {
    window.location.hash = path;
  }];
}

function formatDate(value: string): string {
  if (!value) return "날짜 미정";
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).format(new Date(value));
}

function getLatestReview(
  reviews: ReviewRecord[],
  assignmentId: string,
): ReviewRecord | undefined {
  return reviews
    .filter((review) => review.assignmentId === assignmentId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

function sortAssignmentsForDashboard(assignments: Assignment[]): Assignment[] {
  const today = new Date().toISOString().slice(0, 10);
  const urgency = (dueDate: string) => {
    if (!dueDate) return 1;
    return dueDate < today ? 2 : 0;
  };
  return [...assignments].sort(
    (a, b) =>
      urgency(a.dueDate) - urgency(b.dueDate) ||
      a.dueDate.localeCompare(b.dueDate),
  );
}

function stripStoredDocument(document: StoredDocument): ExtractedDocument {
  return {
    documentId: document.documentId,
    fileName: document.fileName,
    documentType: document.documentType,
    mimeType: document.mimeType,
    blocks: document.blocks,
    warnings: document.warnings,
    characterCount: document.characterCount,
  };
}

function apiMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.";
}

export default function App() {
  const [route, navigate] = useRoute();
  const [snapshot, setSnapshot] = useState<AppSnapshot>(EMPTY_SNAPSHOT);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    readSnapshot()
      .then(setSnapshot)
      .catch(() => setLoadError("브라우저 저장소를 열지 못했어요."))
      .finally(() => setIsLoading(false));
  }, []);

  async function persist(nextSnapshot: AppSnapshot): Promise<void> {
    setSnapshot(nextSnapshot);
    await replaceSnapshot(nextSnapshot);
  }

  async function handleCreateAssignment(fields: {
    courseName: string;
    title: string;
    dueDate: string;
    description: string;
  }): Promise<void> {
    const assignmentId = makeId("assignment");
    const timestamp = now();
    const assignment: Assignment = {
      id: assignmentId,
      ...fields,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await persist({
      ...snapshot,
      assignments: [assignment, ...snapshot.assignments],
    });
    navigate(`#assignment/${assignmentId}`);
  }

  async function handleAddDocument(document: StoredDocument): Promise<void> {
    const nextDocuments = [
      document,
      ...snapshot.documents.filter(
        (item) => item.documentId !== document.documentId,
      ),
    ];
    await persist({ ...snapshot, documents: nextDocuments });
  }

  async function handleAddFeedback(feedback: FeedbackRecord): Promise<void> {
    await persist({
      ...snapshot,
      feedbackRecords: [
        feedback,
        ...snapshot.feedbackRecords.filter(
          (item) => item.feedbackId !== feedback.feedbackId,
        ),
      ],
    });
  }

  async function handleUpdateFeedback(feedback: FeedbackRecord): Promise<void> {
    await persist({
      ...snapshot,
      feedbackRecords: snapshot.feedbackRecords.map((item) =>
        item.feedbackId === feedback.feedbackId ? feedback : item,
      ),
    });
  }

  async function handleReview(assignment: Assignment): Promise<void> {
    const documents = snapshot.documents.filter(
      (document) => document.assignmentId === assignment.id,
    );
    const drafts = documents.filter((document) => document.documentType === "draft");
    const draft = drafts[0];
    if (!draft) {
      setNotice("먼저 제출 초안을 업로드해 주세요.");
      return;
    }
    setNotice("");
    try {
      const result = await reviewSubmission({
        assignment: {
          assignmentId: assignment.id,
          title: assignment.title,
          courseName: assignment.courseName,
          description: assignment.description,
        },
        contextDocuments: documents
          .filter((document) => document.documentType !== "draft")
          .map(stripStoredDocument),
        feedbackRecords: snapshot.feedbackRecords,
        draft: stripStoredDocument(draft),
        activeInsights: snapshot.insights
          .filter((insight) => insight.state === "approved" || insight.state === "edited")
          .map((insight) => ({
            insightId: insight.insightId,
            kind: insight.kind,
            text: insight.text,
            evidenceRefs: insight.evidenceRefs,
          })),
      });
      const review: ReviewRecord = {
        reviewId: result.reviewId,
        assignmentId: assignment.id,
        result,
        createdAt: now(),
      };
      await persist({
        ...snapshot,
        reviews: [
          review,
          ...snapshot.reviews.filter((item) => item.reviewId !== review.reviewId),
        ],
      });
      navigate(`#review/${assignment.id}`);
    } catch (error) {
      setNotice(apiMessage(error));
    }
  }

  async function handleAddInsight(candidate: InsightCandidate): Promise<void> {
    if (snapshot.insights.some((insight) => insight.candidateId === candidate.candidateId)) {
      setNotice("이미 프로필 후보에 저장된 항목이에요.");
      return;
    }
    const insight: PersonalInsight = {
      ...candidate,
      insightId: makeId("insight"),
      text: candidate.statement,
      state: "candidate",
      updatedAt: now(),
    };
    await persist({ ...snapshot, insights: [insight, ...snapshot.insights] });
    setNotice("프로필 후보에 저장했어요. 나의 피드백 프로필에서 확정할 수 있어요.");
  }

  async function handleUpdateInsight(insight: PersonalInsight): Promise<void> {
    await persist({
      ...snapshot,
      insights: snapshot.insights.map((item) =>
        item.insightId === insight.insightId ? insight : item,
      ),
    });
  }

  async function handleLoadSample(): Promise<void> {
    const sample = createSampleSnapshot();
    await persist(sample);
    setNotice("샘플 과제를 불러왔어요. 실제 자료를 넣기 전 흐름을 먼저 확인해 보세요.");
    navigate("#assignment/sample-assignment-current");
  }

  async function handleExport(): Promise<void> {
    const serialized = await exportSnapshot();
    const blob = new Blob([serialized], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `feedback-loop-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice("브라우저에 저장된 데이터를 JSON으로 내보냈어요.");
  }

  async function handleImport(file: File): Promise<void> {
    try {
      const imported = await importSnapshot(await file.text());
      await persist(imported);
      setNotice("백업 데이터를 복구했어요.");
    } catch {
      setNotice("백업 파일을 읽지 못했어요. Feedback Loop에서 내보낸 JSON인지 확인해 주세요.");
    }
  }

  async function handleClear(): Promise<void> {
    await clearStorage();
    setSnapshot(emptySnapshot());
    navigate("#dashboard");
    setNotice("브라우저에 저장된 Feedback Loop 데이터를 모두 지웠어요.");
  }

  if (isLoading) {
    return <div className="loading-screen">저장된 과제를 불러오는 중…</div>;
  }

  if (loadError) {
    return <div className="loading-screen error-text">{loadError}</div>;
  }

  const currentAssignment =
    route.name === "assignment" || route.name === "review"
      ? snapshot.assignments.find((item) => item.id === route.assignmentId)
      : undefined;

  let content: ReactNode;
  if (route.name === "dashboard") {
    content = (
      <Dashboard
        snapshot={snapshot}
        onNavigate={navigate}
        onLoadSample={handleLoadSample}
      />
    );
  } else if (route.name === "assignments") {
    content = (
      <AssignmentsPage
        snapshot={snapshot}
        onCreate={handleCreateAssignment}
        onNavigate={navigate}
      />
    );
  } else if (route.name === "profile") {
    content = (
      <ProfilePage
        snapshot={snapshot}
        onAddCandidate={handleAddInsight}
        onUpdateInsight={handleUpdateInsight}
      />
    );
  } else if (route.name === "settings") {
    content = (
      <SettingsPage
        onExport={handleExport}
        onImport={handleImport}
        onClear={handleClear}
      />
    );
  } else if (!currentAssignment) {
    content = (
      <EmptyState
        icon="?"
        title="과제를 찾지 못했어요"
        description="과제 목록에서 다시 선택해 주세요."
        actionLabel="과제 목록으로"
        onAction={() => navigate("#assignments")}
      />
    );
  } else if (route.name === "assignment") {
    content = (
      <AssignmentPage
        assignment={currentAssignment}
        snapshot={snapshot}
        onAddDocument={handleAddDocument}
        onAddFeedback={handleAddFeedback}
        onUpdateFeedback={handleUpdateFeedback}
        onReview={handleReview}
        onNavigate={navigate}
      />
    );
  } else {
    const latestReview = getLatestReview(snapshot.reviews, currentAssignment.id);
    content = (
      <ReviewPage
        assignment={currentAssignment}
        snapshot={snapshot}
        review={latestReview}
        onAddInsight={handleAddInsight}
        onNavigate={navigate}
      />
    );
  }

  return (
    <AppShell
      route={route}
      title={ROUTE_TITLES[route.name]}
      assignmentCount={snapshot.assignments.length}
      onNavigate={navigate}
    >
      {notice && <div className="global-notice">{notice}</div>}
      {content}
    </AppShell>
  );
}

function AppShell({
  route,
  title,
  assignmentCount,
  onNavigate,
  children,
}: {
  route: Route;
  title: string;
  assignmentCount: number;
  onNavigate: (path: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => onNavigate("#dashboard")}>
          <span className="brand-mark">↺</span>
          <span>
            <strong>Feedback</strong>
            <strong>Loop</strong>
          </span>
        </button>
        <p className="sidebar-caption">제출 전의 작은 루틴</p>
        <nav className="main-nav" aria-label="주요 메뉴">
          <NavButton
            active={route.name === "dashboard"}
            icon="⌂"
            label="대시보드"
            onClick={() => onNavigate("#dashboard")}
          />
          <NavButton
            active={route.name === "assignments" || route.name === "assignment" || route.name === "review"}
            icon="▣"
            label="내 과제"
            count={assignmentCount}
            onClick={() => onNavigate("#assignments")}
          />
          <NavButton
            active={route.name === "profile"}
            icon="✦"
            label="나의 피드백"
            onClick={() => onNavigate("#profile")}
          />
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-mini">
            <span className="status-dot" />
            <span>브라우저에만 저장</span>
          </div>
          <NavButton
            active={route.name === "settings"}
            icon="⚙"
            label="데이터 관리"
            onClick={() => onNavigate("#settings")}
          />
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">FEEDBACK LOOP / {route.name.toUpperCase()}</p>
            <h1>{title}</h1>
          </div>
          <div className="topbar-chip">
            <span className="avatar">ME</span>
            <span>나의 작업실</span>
          </div>
        </header>
        <div className="content-wrap">{children}</div>
      </main>
    </div>
  );
}

function NavButton({
  active,
  icon,
  label,
  count,
  onClick,
}: {
  active: boolean;
  icon: string;
  label: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button className={`nav-button ${active ? "active" : ""}`} onClick={onClick}>
      <span className="nav-icon">{icon}</span>
      <span>{label}</span>
      {count !== undefined && <span className="nav-count">{count}</span>}
    </button>
  );
}

function Dashboard({
  snapshot,
  onNavigate,
  onLoadSample,
}: {
  snapshot: AppSnapshot;
  onNavigate: (path: string) => void;
  onLoadSample: () => Promise<void>;
}) {
  const activeAssignments = sortAssignmentsForDashboard(snapshot.assignments);
  const activeAssignment = activeAssignments[0];
  const latestReview = activeAssignment
    ? getLatestReview(snapshot.reviews, activeAssignment.id)
    : undefined;
  const activeInsights = snapshot.insights.filter(
    (insight) => insight.state === "approved" || insight.state === "edited",
  );
  const actionItems = latestReview?.result.checks
    .filter((check) => check.status !== "pass")
    .slice(0, 3) ?? [];

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div className="hero-copy">
          <span className="hero-kicker">오늘의 제출 준비</span>
          <h2>제출하기 전,<br /><em>한 번 더</em> 확인해요.</h2>
          <p>
            수업 자료와 교수님 피드백을 한곳에 모아<br />
            다음 제출물에 바로 연결해 보세요.
          </p>
          <div className="hero-actions">
            <button className="primary-button" onClick={() => onNavigate("#assignments")}>
              {activeAssignment ? "내 과제 열기" : "첫 과제 만들기"} <span>→</span>
            </button>
            {!activeAssignment && (
              <button className="text-button" onClick={() => void onLoadSample()}>
                샘플로 둘러보기
              </button>
            )}
          </div>
        </div>
        <div className="hero-orbit" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="orbit-core">↺</div>
          <span className="orbit-label label-top">자료</span>
          <span className="orbit-label label-right">검토</span>
          <span className="orbit-label label-bottom">성장</span>
        </div>
      </section>

      <section className="stats-grid">
        <StatCard label="정리한 과제" value={String(snapshot.assignments.length)} suffix="개" tone="lavender" />
        <StatCard label="저장한 피드백" value={String(snapshot.feedbackRecords.length)} suffix="건" tone="peach" />
        <StatCard label="확정한 인사이트" value={String(activeInsights.length)} suffix="개" tone="mint" />
      </section>

      {activeAssignment ? (
        <section className="dashboard-grid">
          <div className="panel active-assignment-panel">
            <PanelHeading eyebrow="UP NEXT" title="가장 가까운 과제" actionLabel="전체 보기" onAction={() => onNavigate("#assignments")} />
            <button className="assignment-highlight" onClick={() => onNavigate(`#assignment/${activeAssignment.id}`)}>
              <div className="assignment-highlight-top">
                <span className="soft-tag">{activeAssignment.courseName}</span>
                <span className="due-label">{formatDate(activeAssignment.dueDate)} 제출</span>
              </div>
              <h3>{activeAssignment.title}</h3>
              <p>{activeAssignment.description || "아직 과제 설명이 없어요."}</p>
              <div className="assignment-progress">
                <span>검토 준비도</span>
                <strong>{latestReview ? (latestReview.result.readiness === "ready" ? "확인 완료" : "확인할 점 있음") : "자료를 모아 주세요"}</strong>
              </div>
              <div className="progress-track"><span style={{ width: latestReview ? "82%" : "30%" }} /></div>
            </button>
          </div>
          <div className="panel action-panel">
            <PanelHeading eyebrow="QUICK CHECK" title="이번 제출에서 볼 것" actionLabel="프로필 보기" onAction={() => onNavigate("#profile")} />
            <div className="action-list">
              {actionItems.length > 0 ? actionItems.map((item) => (
                <div className={`action-row ${item.status}`} key={item.checkId}>
                  <span className="action-icon">{item.status === "not_found" ? "?" : "!"}</span>
                  <div><strong>{item.title}</strong><p>{item.detail}</p></div>
                </div>
              )) : activeInsights.slice(0, 3).map((insight) => (
                <div className="action-row neutral" key={insight.insightId}>
                  <span className="action-icon">✦</span>
                  <div><strong>{insight.text}</strong><p>{INSIGHT_LABELS[insight.kind]}에서 가져온 점검 포인트</p></div>
                </div>
              ))}
              {actionItems.length === 0 && activeInsights.length === 0 && (
                <div className="empty-inline"><span>✎</span><p>검토를 완료하면<br />다음 확인 포인트가 여기에 보여요.</p></div>
              )}
            </div>
          </div>
        </section>
      ) : (
        <EmptyState
          icon="✦"
          title="첫 번째 과제를 만들어 볼까요?"
          description="과제 하나를 만들고 자료와 초안을 넣으면 제출 전 검토를 시작할 수 있어요."
          actionLabel="과제 만들기"
          onAction={() => onNavigate("#assignments")}
          secondaryLabel="샘플 데이터로 보기"
          onSecondaryAction={() => void onLoadSample()}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  suffix,
  tone,
}: {
  label: string;
  value: string;
  suffix: string;
  tone: string;
}) {
  return (
    <div className={`stat-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}<small>{suffix}</small></strong>
    </div>
  );
}

function AssignmentsPage({
  snapshot,
  onCreate,
  onNavigate,
}: {
  snapshot: AppSnapshot;
  onCreate: (fields: { courseName: string; title: string; dueDate: string; description: string }) => Promise<void>;
  onNavigate: (path: string) => void;
}) {
  return (
    <div className="page-stack">
      <div className="page-intro-row">
        <div><span className="eyebrow">ASSIGNMENTS</span><h2>과제별로 자료를 모아보세요.</h2><p>한 과제 안에서 기준부터 초안, 피드백까지 한 번에 이어져요.</p></div>
        <button className="outline-button" onClick={() => onNavigate("#dashboard")}>대시보드로</button>
      </div>
      <div className="assignments-layout">
        <div className="panel assignment-list-panel">
          <PanelHeading eyebrow="MY WORKSPACES" title={`내 과제 ${snapshot.assignments.length}개`} />
          {snapshot.assignments.length === 0 ? (
            <div className="empty-list">아직 만든 과제가 없어요.<br />오른쪽에서 첫 과제를 만들어 주세요.</div>
          ) : (
            <div className="assignment-list">
              {snapshot.assignments.map((assignment) => {
                const docs = snapshot.documents.filter((doc) => doc.assignmentId === assignment.id);
                const review = getLatestReview(snapshot.reviews, assignment.id);
                return (
                  <button className="assignment-list-item" key={assignment.id} onClick={() => onNavigate(`#assignment/${assignment.id}`)}>
                    <span className="assignment-list-icon">{assignment.courseName.slice(0, 1)}</span>
                    <span className="assignment-list-copy"><small>{assignment.courseName}</small><strong>{assignment.title}</strong><em>{docs.length}개 자료 · {review ? "검토 완료" : "검토 전"}</em></span>
                    <span className="assignment-list-arrow">→</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <CreateAssignmentForm onCreate={onCreate} />
      </div>
    </div>
  );
}

function CreateAssignmentForm({
  onCreate,
}: {
  onCreate: (fields: { courseName: string; title: string; dueDate: string; description: string }) => Promise<void>;
}) {
  const [courseName, setCourseName] = useState("");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const canSubmit = courseName.trim() && title.trim();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    await onCreate({ courseName: courseName.trim(), title: title.trim(), dueDate, description: description.trim() });
  }
  return (
    <form className="panel create-form" onSubmit={submit}>
      <span className="form-kicker">NEW WORKSPACE</span>
      <h3>새 과제 만들기</h3>
      <p>자료를 담을 과제 공간부터 만들어 볼게요.</p>
      <label>과목명<input value={courseName} onChange={(event) => setCourseName(event.target.value)} placeholder="예: 마케팅원론" /></label>
      <label>과제명<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="예: 소비자 행동 분석 보고서" /></label>
      <label>제출일 <span className="optional">선택</span><input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>
      <label>과제 설명 <span className="optional">선택</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="과제의 목적이나 기억해 둘 조건을 적어 주세요." rows={3} /></label>
      <button className="primary-button full-button" disabled={!canSubmit}>과제 공간 만들기 <span>→</span></button>
    </form>
  );
}

function AssignmentPage({
  assignment,
  snapshot,
  onAddDocument,
  onAddFeedback,
  onUpdateFeedback,
  onReview,
  onNavigate,
}: {
  assignment: Assignment;
  snapshot: AppSnapshot;
  onAddDocument: (document: StoredDocument) => Promise<void>;
  onAddFeedback: (feedback: FeedbackRecord) => Promise<void>;
  onUpdateFeedback: (feedback: FeedbackRecord) => Promise<void>;
  onReview: (assignment: Assignment) => Promise<void>;
  onNavigate: (path: string) => void;
}) {
  const documents = snapshot.documents.filter((doc) => doc.assignmentId === assignment.id);
  const feedbackRecords = snapshot.feedbackRecords.filter((feedback) => feedback.assignmentId === assignment.id);
  const draft = documents.find((doc) => doc.documentType === "draft");
  const review = getLatestReview(snapshot.reviews, assignment.id);
  const [documentType, setDocumentType] = useState<DocumentType>("assignment_notice");
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    setUploadMessage("");
    const documentId = makeId("document");
    try {
      const extracted = await extractDocument(file, documentType, documentId);
      const stored: StoredDocument = { ...extracted, assignmentId: assignment.id, fileData: file, createdAt: now() };
      await onAddDocument(stored);
      if (documentType === "feedback") {
        const originalText = extracted.blocks.map((block) => block.text).join("\n");
        const feedback: FeedbackRecord = {
          feedbackId: makeId("feedback"),
          assignmentId: assignment.id,
          originalText: originalText || "텍스트를 추출하지 못한 피드백",
          interpretation: "",
          status: "new",
          evidenceRefs: extracted.blocks.map((block) => ({ documentId, blockId: block.blockId, pageNumber: block.pageNumber, paragraphNumber: block.paragraphNumber })),
          createdAt: now(),
          updatedAt: now(),
        };
        await onAddFeedback(feedback);
      }
      setUploadMessage(`${DOCUMENT_LABELS[documentType]}을(를) 추가했어요.`);
    } catch (error) {
      setUploadMessage(apiMessage(error));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="workspace-header panel">
        <div>
          <button className="back-link" onClick={() => onNavigate("#assignments")}>← 과제 목록</button>
          <span className="soft-tag">{assignment.courseName}</span>
          <h2>{assignment.title}</h2>
          <p>{assignment.description || "이 과제의 기준과 초안을 한곳에 모아 보세요."}</p>
        </div>
        <div className="workspace-due"><span>제출일</span><strong>{formatDate(assignment.dueDate)}</strong></div>
      </section>
      <ProgressSteps hasContext={documents.some((doc) => doc.documentType !== "draft")} hasDraft={Boolean(draft)} hasReview={Boolean(review)} hasFeedback={feedbackRecords.length > 0} />
      <div className="workspace-grid">
        <div className="workspace-main">
          <section className="panel upload-panel">
            <PanelHeading eyebrow="01 · COURSE CONTEXT" title="수업 자료를 모아주세요." actionLabel="왜 필요한가요?" onAction={() => setUploadMessage("자료에 적힌 조건만을 근거로 검토해요. 자료에 없는 내용은 추측하지 않아요.")} />
            <p className="panel-description">강의계획서, 과제 공지, 팀플 공지, 채점기준, 교수님 피드백을 PDF 또는 DOCX로 추가하세요.</p>
            <div className="upload-controls">
              <select value={documentType} onChange={(event) => setDocumentType(event.target.value as DocumentType)} aria-label="자료 종류">
                <option value="assignment_notice">과제 공지</option><option value="syllabus">강의계획서</option><option value="team_notice">팀플 공지</option><option value="rubric">채점기준</option><option value="feedback">교수님 피드백</option><option value="draft">제출 초안</option>
              </select>
              <label className={`upload-button ${uploading ? "disabled" : ""}`}>
                <input type="file" accept=".pdf,.docx" onChange={handleUpload} disabled={uploading} />
                {uploading ? "텍스트를 읽는 중…" : "파일 추가 +"}
              </label>
            </div>
            {uploadMessage && <p className="inline-message">{uploadMessage}</p>}
            <DocumentList documents={documents} />
          </section>
          <section className="panel draft-panel">
            <PanelHeading eyebrow="02 · YOUR DRAFT" title="제출 초안을 올려주세요." />
            <p className="panel-description">완성 전 초안도 괜찮아요. 현재 기준에서 확인할 수 있는 부분을 찾아볼게요.</p>
            {draft ? <DraftReady document={draft} onNavigate={() => onNavigate(`#review/${assignment.id}`)} /> : <div className="draft-empty"><span className="draft-empty-icon">↗</span><div><strong>아직 초안이 없어요</strong><p>위 자료 종류를 ‘제출 초안’으로 바꾸고 파일을 추가하세요.</p></div></div>}
          </section>
          <FeedbackPanel feedbackRecords={feedbackRecords} onUpdate={onUpdateFeedback} />
        </div>
        <aside className="workspace-side">
          <section className="panel review-cta-panel">
            <span className="form-kicker">READY WHEN YOU ARE</span>
            <h3>이제 검토해 볼까요?</h3>
            <p>자료와 초안을 함께 보면 제출 전에 확인할 점을 정리할 수 있어요.</p>
            <button className="primary-button full-button" onClick={() => void onReview(assignment)} disabled={!draft}>제출물 검토하기 <span>→</span></button>
            {!draft && <small>초안을 먼저 추가해 주세요.</small>}
          </section>
          <PrivacyCallout />
        </aside>
      </div>
    </div>
  );
}

function ProgressSteps({ hasContext, hasDraft, hasReview, hasFeedback }: { hasContext: boolean; hasDraft: boolean; hasReview: boolean; hasFeedback: boolean }) {
  const steps = [["자료 등록", hasContext], ["초안 업로드", hasDraft], ["제출물 검토", hasReview], ["피드백 기록", hasFeedback]];
  return <div className="stepper">{steps.map(([label, done], index) => <div className={`step ${done ? "done" : ""}`} key={String(label)}><span>{done ? "✓" : String(index + 1).padStart(2, "0")}</span><strong>{label}</strong>{index < steps.length - 1 && <i />}</div>)}</div>;
}

function DocumentList({ documents }: { documents: StoredDocument[] }) {
  const contextDocuments = documents.filter((doc) => doc.documentType !== "draft");
  if (contextDocuments.length === 0) return <div className="document-empty">추가한 자료가 여기에 쌓여요.</div>;
  return <div className="document-list">{contextDocuments.map((document) => <div className="document-row" key={document.documentId}><span className={`file-icon ${document.documentType}`}>{document.fileName.toLowerCase().endsWith(".pdf") ? "PDF" : "DOC"}</span><div><strong>{document.fileName}</strong><small>{DOCUMENT_LABELS[document.documentType]} · {document.blocks.length}개 근거 문단</small></div>{document.warnings.length > 0 ? <span className="warning-badge">확인 필요</span> : <span className="check-badge">✓</span>}</div>)}</div>;
}

function DraftReady({ document, onNavigate }: { document: StoredDocument; onNavigate: () => void }) {
  return <div className="draft-ready"><div className="draft-file"><span className="file-icon draft">{document.fileName.toLowerCase().endsWith(".pdf") ? "PDF" : "DOC"}</span><div><strong>{document.fileName}</strong><small>{document.blocks.length}개 문단 · {document.characterCount.toLocaleString()}자</small></div></div><button className="small-button" onClick={onNavigate}>검토 화면 →</button></div>;
}

function FeedbackPanel({ feedbackRecords, onUpdate }: { feedbackRecords: FeedbackRecord[]; onUpdate: (feedback: FeedbackRecord) => Promise<void> }) {
  return <section className="panel feedback-panel"><PanelHeading eyebrow="03 · FEEDBACK LOOP" title="교수님 피드백을 기록해요." /><p className="panel-description">원문과 나만의 해석을 분리해 남기면 다음 검토에 다시 쓸 수 있어요.</p>{feedbackRecords.length === 0 ? <div className="document-empty">피드백 파일을 추가하면 원문과 반영 상태를 관리할 수 있어요.</div> : <div className="feedback-list">{feedbackRecords.map((feedback) => <FeedbackRow key={feedback.feedbackId} feedback={feedback} onUpdate={onUpdate} />)}</div>}</section>;
}

function FeedbackRow({ feedback, onUpdate }: { feedback: FeedbackRecord; onUpdate: (feedback: FeedbackRecord) => Promise<void> }) {
  const [interpretation, setInterpretation] = useState(feedback.interpretation);
  return <div className="feedback-row"><div className="feedback-original"><span className="feedback-label">원문</span><p>{feedback.originalText}</p></div><div className="feedback-edit"><label><span>나의 해석</span><textarea value={interpretation} onChange={(event) => setInterpretation(event.target.value)} placeholder="이번 피드백에서 내가 할 일을 적어 보세요." rows={2} /></label><div className="feedback-actions"><select value={feedback.status} onChange={(event) => void onUpdate({ ...feedback, status: event.target.value as FeedbackStatus, updatedAt: now() })}>{Object.entries(FEEDBACK_STATUS_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><button className="small-button" onClick={() => void onUpdate({ ...feedback, interpretation: interpretation.trim(), updatedAt: now() })}>저장</button></div></div></div>;
}

function ReviewPage({ assignment, snapshot, review, onAddInsight, onNavigate }: { assignment: Assignment; snapshot: AppSnapshot; review?: ReviewRecord; onAddInsight: (candidate: InsightCandidate) => Promise<void>; onNavigate: (path: string) => void }) {
  const documents = snapshot.documents.filter((doc) => doc.assignmentId === assignment.id);
  const draft = documents.find((doc) => doc.documentType === "draft");
  const [selectedReference, setSelectedReference] = useState<SourceReference | undefined>();
  useEffect(() => {
    if (!selectedReference) return;
    document.getElementById(selectedReference.blockId)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [selectedReference]);
  if (!review || !draft) return <EmptyState icon="↗" title="아직 검토 결과가 없어요" description="과제 워크스페이스에서 초안과 자료를 준비한 뒤 검토를 시작해 주세요." actionLabel="과제 워크스페이스로" onAction={() => onNavigate(`#assignment/${assignment.id}`)} />;
  const readinessLabel = review.result.readiness === "ready" ? "제출 준비가 됐어요" : review.result.readiness === "needs_attention" ? "몇 가지를 더 확인해요" : "검토할 자료가 부족해요";
   return <div className="review-page"><div className="review-toolbar"><div><button className="back-link" onClick={() => onNavigate(`#assignment/${assignment.id}`)}>← 워크스페이스</button><h2>{assignment.title}</h2></div><span className={`readiness-pill ${review.result.readiness}`}>{readinessLabel}</span></div><div className="review-layout"><section className="panel draft-reader"><div className="reader-header"><div><span className="eyebrow">YOUR DRAFT</span><h3>{draft.fileName}</h3></div><span>{draft.blocks.length}개 문단</span></div><div className="draft-blocks">{draft.blocks.map((block, index) => <div className={`draft-block ${selectedReference?.blockId === block.blockId ? "selected" : ""}`} id={block.blockId} key={block.blockId}><span>{String(index + 1).padStart(2, "0")}</span><p>{block.text}</p></div>)}</div></section><section className="review-results"><div className="panel result-summary"><span className="eyebrow">REVIEW SUMMARY</span><h3>{review.result.summary}</h3><div className="summary-meta"><span>검토 시각 {formatDateTime(review.createdAt)}</span><span>점수 예측 없음</span></div></div><div className="result-filter-row"><strong>확인 항목 {review.result.checks.length}</strong><span>근거 문단을 누르면 초안에서 위치를 보여줘요.</span></div><div className="check-list">{review.result.checks.map((check) => <CheckCard check={check} documents={documents} onReference={setSelectedReference} key={check.checkId} />)}</div>{review.result.warnings.length > 0 && <div className="warning-box"><strong>참고해 주세요</strong>{review.result.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div>}{review.result.insightCandidates.length > 0 && <section className="panel candidates-panel"><PanelHeading eyebrow="PROFILE CANDIDATES" title="프로필에 남길 만한 발견" /><p>반복해서 나타난 피드백을 다음 과제에도 사용할 수 있게 저장해요.</p>{review.result.insightCandidates.map((candidate) => <div className="candidate-row" key={candidate.candidateId}><div><span className={`insight-tag ${candidate.kind}`}>{INSIGHT_LABELS[candidate.kind]}</span><strong>{candidate.statement}</strong><small>근거 피드백 {candidate.feedbackRecordIds.length}건 · {candidate.confidence === "supported" ? "반복 근거 있음" : "아직 확인 중"}</small></div><button className="small-button" onClick={() => void onAddInsight(candidate)}>프로필 후보로 저장</button></div>)}</section>}</section></div></div>;
}

function CheckCard({ check, documents, onReference }: { check: ReviewResult["checks"][number]; documents: StoredDocument[]; onReference: (reference: SourceReference) => void }) {
  return <article className={`check-card ${check.status}`}><div className="check-card-header"><span className={`check-status ${check.status}`}>{check.status === "pass" ? "통과" : check.status === "attention" ? "확인 필요" : "근거 없음"}</span><span className="check-category">{check.category}</span></div><h4>{check.title}</h4><p>{check.detail}</p>{check.evidenceRefs.length > 0 && <div className="evidence-list"><span>근거</span>{check.evidenceRefs.map((reference) => { const source = documents.find((doc) => doc.documentId === reference.documentId); return <button className="evidence-chip" key={`${reference.documentId}-${reference.blockId}`} onClick={() => onReference(reference)}>{source?.fileName ?? reference.documentId} · {formatEvidence(reference)} ↗</button>; })}</div>}</article>;
}

function ProfilePage({ snapshot, onAddCandidate, onUpdateInsight }: { snapshot: AppSnapshot; onAddCandidate: (candidate: InsightCandidate) => Promise<void>; onUpdateInsight: (insight: PersonalInsight) => Promise<void> }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | undefined>();
  const [draftText, setDraftText] = useState("");
  const activeInsights = snapshot.insights.filter((insight) => insight.state !== "hidden");
  async function generate() {
    setIsGenerating(true); setMessage("");
    try {
      const result = await generateInsightCandidates(snapshot.feedbackRecords);
      for (const candidate of result.candidates) await onAddCandidate(candidate);
      setMessage(result.warnings[0] ?? (result.candidates.length > 0 ? `${result.candidates.length}개의 후보를 찾았어요.` : "새로운 반복 인사이트가 아직 없어요."));
    } catch (error) { setMessage(apiMessage(error)); } finally { setIsGenerating(false); }
  }
  function startEdit(insight: PersonalInsight) { setEditingId(insight.insightId); setDraftText(insight.text); }
  async function saveEdit(insight: PersonalInsight) { if (!draftText.trim()) return; await onUpdateInsight({ ...insight, text: draftText.trim(), statement: draftText.trim(), state: "edited", updatedAt: now() }); setEditingId(undefined); }
  return <div className="page-stack"><section className="profile-hero"><div><span className="hero-kicker">MY FEEDBACK PROFILE</span><h2>나를 단정하지 않고,<br /><em>나의 변화</em>를 기록해요.</h2><p>여러 번의 피드백에서 반복된 패턴만<br />근거와 함께 남겨요.</p></div><div className="profile-ring"><strong>{activeInsights.length}</strong><span>활성<br />인사이트</span></div></section><div className="profile-toolbar"><div><span className="eyebrow">ACCUMULATED INSIGHTS</span><h3>쌓여가는 나의 점검 포인트</h3></div><button className="outline-button" onClick={() => void generate()} disabled={isGenerating}>{isGenerating ? "피드백 비교 중…" : "새로운 패턴 찾기 ✦"}</button></div>{message && <div className="inline-message">{message}</div>}<div className="insight-columns"><section className="insight-column"><div className="column-heading"><span className="column-dot improvement" /><h4>개선 중인 점</h4><span>{activeInsights.filter((i) => i.kind === "improvement" || i.kind === "repeat_caution").length}</span></div>{activeInsights.filter((i) => i.kind !== "strength").map((insight) => <InsightCard insight={insight} editing={editingId === insight.insightId} draftText={draftText} onDraftText={setDraftText} onEdit={() => startEdit(insight)} onSave={() => void saveEdit(insight)} onApprove={() => void onUpdateInsight({ ...insight, state: "approved", updatedAt: now() })} onHide={() => void onUpdateInsight({ ...insight, state: "hidden", updatedAt: now() })} key={insight.insightId} />)}{activeInsights.filter((i) => i.kind !== "strength").length === 0 && <div className="column-empty">아직 반복해서 확인된 개선점이 없어요.<br />피드백이 쌓이면 여기에 나타나요.</div>}</section><section className="insight-column"><div className="column-heading"><span className="column-dot strength" /><h4>나의 강점</h4><span>{activeInsights.filter((i) => i.kind === "strength").length}</span></div>{activeInsights.filter((i) => i.kind === "strength").map((insight) => <InsightCard insight={insight} editing={editingId === insight.insightId} draftText={draftText} onDraftText={setDraftText} onEdit={() => startEdit(insight)} onSave={() => void saveEdit(insight)} onApprove={() => void onUpdateInsight({ ...insight, state: "approved", updatedAt: now() })} onHide={() => void onUpdateInsight({ ...insight, state: "hidden", updatedAt: now() })} key={insight.insightId} />)}{activeInsights.filter((i) => i.kind === "strength").length === 0 && <div className="column-empty">강점도 근거가 쌓이면<br />놓치지 않고 기록해 둘게요.</div>}</section></div><section className="panel feedback-history-mini"><PanelHeading eyebrow="RECENT FEEDBACK" title="최근 피드백 기록" /><div className="history-list">{snapshot.feedbackRecords.slice(0, 4).map((feedback) => <div className="history-row" key={feedback.feedbackId}><span className="history-status">{FEEDBACK_STATUS_LABELS[feedback.status]}</span><p>{feedback.originalText}</p><small>{formatDateTime(feedback.updatedAt)}</small></div>)}{snapshot.feedbackRecords.length === 0 && <div className="document-empty">과제에서 피드백을 추가하면 최근 기록이 보여요.</div>}</div></section></div>;
}

function InsightCard({ insight, editing, draftText, onDraftText, onEdit, onSave, onApprove, onHide }: { insight: PersonalInsight; editing: boolean; draftText: string; onDraftText: (value: string) => void; onEdit: () => void; onSave: () => void; onApprove: () => void; onHide: () => void }) {
  return <article className={`insight-card ${insight.state}`}><div className="insight-card-top"><span className={`insight-tag ${insight.kind}`}>{INSIGHT_LABELS[insight.kind]}</span><span className={`state-label ${insight.state}`}>{insight.state === "candidate" ? "확인 대기" : insight.state === "edited" ? "수정됨" : "활성"}</span></div>{editing ? <textarea value={draftText} onChange={(event) => onDraftText(event.target.value)} rows={3} /> : <h4>{insight.text}</h4>}<div className="insight-evidence"><span>⌁</span> 피드백 {insight.feedbackRecordIds.length}건에서 발견</div><div className="insight-actions">{editing ? <button className="small-button" onClick={onSave}>수정 저장</button> : <button className="ghost-button" onClick={onEdit}>문구 수정</button>}{insight.state === "candidate" && <button className="small-button" onClick={onApprove}>내 프로필에 추가</button>}{insight.state !== "hidden" && <button className="ghost-button muted" onClick={onHide}>숨기기</button>}</div></article>;
}

function SettingsPage({ onExport, onImport, onClear }: { onExport: () => Promise<void>; onImport: (file: File) => Promise<void>; onClear: () => Promise<void> }) {
  async function handleFile(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; event.target.value = ""; if (file) await onImport(file); }
  async function clear() { if (window.confirm("브라우저에 저장된 모든 과제·피드백·인사이트를 삭제할까요?")) await onClear(); }
  return <div className="page-stack"><div className="page-intro-row"><div><span className="eyebrow">DATA & PRIVACY</span><h2>내 데이터는 내가 관리해요.</h2><p>Feedback Loop는 로그인 없이 이 브라우저에 데이터를 저장해요.</p></div></div><div className="settings-grid"><section className="panel settings-card"><span className="settings-icon">↥</span><h3>백업 내보내기</h3><p>과제, 추출 텍스트, 검토 결과, 피드백, 인사이트를 JSON으로 저장해요.</p><button className="outline-button" onClick={() => void onExport()}>JSON으로 내보내기</button></section><section className="panel settings-card"><span className="settings-icon">↧</span><h3>백업 가져오기</h3><p>이전에 내보낸 Feedback Loop JSON을 이 브라우저에 복구해요.</p><label className="outline-button file-label"><input type="file" accept="application/json,.json" onChange={handleFile} />JSON 가져오기</label></section><section className="panel settings-card danger-card"><span className="settings-icon">×</span><h3>모든 데이터 지우기</h3><p>현재 브라우저에 저장된 과제와 피드백을 모두 삭제해요.</p><button className="danger-button" onClick={() => void clear()}>데이터 삭제</button></section></div><PrivacyCallout detailed /></div>;
}

function PrivacyCallout({ detailed = false }: { detailed?: boolean }) {
  return <div className={`privacy-callout ${detailed ? "detailed" : ""}`}><span className="privacy-icon">✦</span><div><strong>업로드 전, 이것만 기억해 주세요.</strong><p>분석을 위해 자료가 백엔드와 Gemini 무료 티어로 전송될 수 있어요. 주민번호, 연락처 등 민감한 정보는 지운 뒤 업로드하세요. 우리 백엔드는 분석 요청이 끝나면 업로드 파일을 보관하지 않아요.</p></div></div>;
}

function PanelHeading({ eyebrow, title, actionLabel, onAction }: { eyebrow: string; title: string; actionLabel?: string; onAction?: () => void }) {
  return <div className="panel-heading"><div><span className="eyebrow">{eyebrow}</span><h3>{title}</h3></div>{actionLabel && onAction && <button className="ghost-button" onClick={onAction}>{actionLabel} ↗</button>}</div>;
}

function EmptyState({ icon, title, description, actionLabel, onAction, secondaryLabel, onSecondaryAction }: { icon: string; title: string; description: string; actionLabel: string; onAction: () => void; secondaryLabel?: string; onSecondaryAction?: () => void }) {
  return <section className="empty-state panel"><span className="empty-state-icon">{icon}</span><h3>{title}</h3><p>{description}</p><div><button className="primary-button" onClick={onAction}>{actionLabel} <span>→</span></button>{secondaryLabel && onSecondaryAction && <button className="text-button" onClick={onSecondaryAction}>{secondaryLabel}</button>}</div></section>;
}

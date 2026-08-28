export type DocumentType =
  | "syllabus"
  | "assignment_notice"
  | "team_notice"
  | "rubric"
  | "feedback"
  | "draft";

export type AssignmentType = "individual" | "team";

export type FeedbackStatus =
  | "new"
  | "confirmed"
  | "applied"
  | "improved"
  | "needs_review";

export type ReviewCategory = "requirement" | "rubric" | "feedback" | "format";
export type CheckStatus = "pass" | "attention" | "not_found";
export type Readiness = "ready" | "needs_attention" | "cannot_review";
export type InsightKind = "strength" | "improvement" | "repeat_caution";
export type InsightState = "candidate" | "approved" | "edited" | "hidden";
export type Confidence = "tentative" | "supported";

export interface Assignment {
  id: string;
  assignmentType?: AssignmentType;
  courseName: string;
  title: string;
  dueDate: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface SourceBlock {
  blockId: string;
  text: string;
  pageNumber?: number | null;
  paragraphNumber?: number | null;
}

export interface SourceReference {
  documentId: string;
  blockId: string;
  pageNumber?: number | null;
  paragraphNumber?: number | null;
  quote?: string | null;
}

export interface ExtractedDocument {
  documentId: string;
  fileName: string;
  documentType: DocumentType;
  mimeType?: string | null;
  blocks: SourceBlock[];
  warnings: string[];
  characterCount: number;
}

export interface StoredDocument extends ExtractedDocument {
  assignmentId: string;
  fileData?: Blob;
  createdAt: string;
}

export interface FeedbackRecord {
  feedbackId: string;
  assignmentId: string;
  originalText: string;
  interpretation: string;
  status: FeedbackStatus;
  evidenceRefs: SourceReference[];
  createdAt: string;
  updatedAt: string;
}

export interface ActiveInsightInput {
  insightId: string;
  kind: InsightKind;
  text: string;
  evidenceRefs: SourceReference[];
}

export interface CheckItem {
  checkId: string;
  category: ReviewCategory;
  status: CheckStatus;
  title: string;
  detail: string;
  evidenceRefs: SourceReference[];
}

export interface InsightCandidate {
  candidateId: string;
  kind: InsightKind;
  statement: string;
  feedbackRecordIds: string[];
  evidenceRefs: SourceReference[];
  confidence: Confidence;
}

export interface ReviewResult {
  reviewId: string;
  readiness: Readiness;
  summary: string;
  checks: CheckItem[];
  warnings: string[];
  insightCandidates: InsightCandidate[];
}

export interface ReviewRecord {
  reviewId: string;
  assignmentId: string;
  result: ReviewResult;
  createdAt: string;
}

export interface PersonalInsight extends InsightCandidate {
  insightId: string;
  text: string;
  state: InsightState;
  updatedAt: string;
}

export interface AppSnapshot {
  assignments: Assignment[];
  documents: StoredDocument[];
  feedbackRecords: FeedbackRecord[];
  reviews: ReviewRecord[];
  insights: PersonalInsight[];
}

export const EMPTY_SNAPSHOT: AppSnapshot = {
  assignments: [],
  documents: [],
  feedbackRecords: [],
  reviews: [],
  insights: [],
};

export const DOCUMENT_LABELS: Record<DocumentType, string> = {
  syllabus: "강의계획서",
  assignment_notice: "과제 공지",
  team_notice: "팀플 공지",
  rubric: "채점기준",
  feedback: "교수님 피드백",
  draft: "제출 초안",
};

export const INSIGHT_LABELS: Record<InsightKind, string> = {
  strength: "강점",
  improvement: "개선 중인 점",
  repeat_caution: "반복해서 확인할 점",
};

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  new: "새 피드백",
  confirmed: "확인함",
  applied: "반영함",
  improved: "개선됨",
  needs_review: "다시 확인",
};

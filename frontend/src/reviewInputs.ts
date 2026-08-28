import type {
  AssignmentType,
  DocumentType,
  FeedbackRecord,
  StoredDocument,
} from "./types";

export type ContextDocumentType = Exclude<
  DocumentType,
  "draft" | "feedback"
>;

export const CONTEXT_DOCUMENT_TYPES: readonly ContextDocumentType[] = [
  "assignment_notice",
  "rubric",
  "syllabus",
  "team_notice",
];

export function getContextDocumentTypes(
  assignmentType?: AssignmentType,
): ContextDocumentType[] {
  return CONTEXT_DOCUMENT_TYPES.filter(
    (type) => type !== "team_notice" || assignmentType === "team",
  );
}

const contextDocumentTypeSet = new Set<DocumentType>(CONTEXT_DOCUMENT_TYPES);

export function isContextDocument(
  document: StoredDocument,
): document is StoredDocument & { documentType: ContextDocumentType } {
  return contextDocumentTypeSet.has(document.documentType);
}

export function getAssignmentFeedbackRecords(
  feedbackRecords: FeedbackRecord[],
  assignmentId: string,
): FeedbackRecord[] {
  return feedbackRecords.filter(
    (feedback) => feedback.assignmentId === assignmentId,
  );
}

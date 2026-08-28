import type {
  DocumentType,
  ExtractedDocument,
  FeedbackRecord,
  InsightCandidate,
  ReviewResult,
  SourceReference,
  ActiveInsightInput,
} from "./types";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail =
      payload && typeof payload === "object" && "detail" in payload
        ? String(payload.detail)
        : "요청을 처리하지 못했어요.";
    throw new ApiError(detail, response.status);
  }
  return payload as T;
}

export async function extractDocument(
  file: File,
  documentType: DocumentType,
  documentId: string,
): Promise<ExtractedDocument> {
  const form = new FormData();
  form.append("file", file);
  form.append("document_type", documentType);
  form.append("document_id", documentId);
  const response = await fetch(`${API_BASE_URL}/api/v1/documents/extract`, {
    method: "POST",
    body: form,
  });
  return parseResponse<ExtractedDocument>(response);
}

export interface ReviewRequestPayload {
  assignment: {
    assignmentId: string;
    title: string;
    courseName: string;
    description: string;
  };
  contextDocuments: ExtractedDocument[];
  feedbackRecords: FeedbackRecord[];
  draft: ExtractedDocument;
  activeInsights: ActiveInsightInput[];
}

export async function reviewSubmission(
  payload: ReviewRequestPayload,
): Promise<ReviewResult> {
  const response = await fetch(`${API_BASE_URL}/api/v1/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<ReviewResult>(response);
}

export async function generateInsightCandidates(
  feedbackRecords: FeedbackRecord[],
): Promise<{ candidates: InsightCandidate[]; warnings: string[] }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/insights/candidates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ feedbackRecords }),
  });
  return parseResponse<{ candidates: InsightCandidate[]; warnings: string[] }>(
    response,
  );
}

export function formatEvidence(reference: SourceReference): string {
  const location = [
    reference.pageNumber ? `p.${reference.pageNumber}` : "",
    reference.paragraphNumber ? `문단 ${reference.paragraphNumber}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return location || "근거 문단";
}

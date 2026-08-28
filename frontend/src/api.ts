import type {
  ActiveInsightInput,
  DocumentType,
  ExtractedDocument,
  FeedbackRecord,
  InsightCandidate,
  ReviewResult,
  SourceReference,
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

export interface ApiHealth {
  status: "ok";
  aiConfigured: boolean;
  model: string;
}

export interface WakeAnalysisOptions {
  onRetry?: () => void;
  requestTimeoutMs?: number;
  retryDelays?: number[];
}

const DEFAULT_WAKE_RETRY_DELAYS = [0, 1_500, 3_000, 6_000, 10_000];
const RETRYABLE_HEALTH_STATUSES = new Set([502, 503, 504]);

function pause(milliseconds: number): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, milliseconds));
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

export async function wakeAnalysisApi(
  options: WakeAnalysisOptions = {},
): Promise<ApiHealth> {
  const retryDelays = options.retryDelays ?? DEFAULT_WAKE_RETRY_DELAYS;
  const requestTimeoutMs = options.requestTimeoutMs ?? 12_000;
  let lastStatus = 503;

  for (const [index, retryDelay] of retryDelays.entries()) {
    if (retryDelay > 0) await pause(retryDelay);

    const controller = new AbortController();
    const timeout = globalThis.setTimeout(
      () => controller.abort(),
      requestTimeoutMs,
    );
    let response: Response | undefined;
    try {
      response = await fetch(`${API_BASE_URL}/health`, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
    } catch {
      response = undefined;
    } finally {
      globalThis.clearTimeout(timeout);
    }

    if (response?.ok) return parseResponse<ApiHealth>(response);
    if (response && !RETRYABLE_HEALTH_STATUSES.has(response.status)) {
      return parseResponse<ApiHealth>(response);
    }
    if (response) lastStatus = response.status;

    if (index < retryDelays.length - 1) options.onRetry?.();
  }

  throw new ApiError(
    "분석 서버를 준비하는 데 시간이 걸리고 있어요. 잠시 후 다시 시도해 주세요.",
    lastStatus,
  );
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

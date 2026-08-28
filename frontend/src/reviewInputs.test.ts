import { describe, expect, it } from "vitest";

import {
  getAssignmentFeedbackRecords,
  getContextDocumentTypes,
  isContextDocument,
} from "./reviewInputs";
import type { FeedbackRecord, StoredDocument } from "./types";

function storedDocument(
  assignmentId: string,
  documentId: string,
  documentType: StoredDocument["documentType"],
): StoredDocument {
  return {
    assignmentId,
    documentId,
    documentType,
    fileName: `${documentId}.docx`,
    blocks: [],
    warnings: [],
    characterCount: 0,
    createdAt: "2026-08-28T00:00:00.000Z",
  };
}

function feedbackRecord(
  assignmentId: string,
  feedbackId: string,
): FeedbackRecord {
  return {
    assignmentId,
    feedbackId,
    originalText: "근거를 보강해 주세요.",
    interpretation: "",
    status: "new",
    evidenceRefs: [],
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
  };
}

describe("review input boundaries", () => {
  it("shows team notices only for team assignments", () => {
    expect(getContextDocumentTypes("individual")).not.toContain("team_notice");
    expect(getContextDocumentTypes()).not.toContain("team_notice");
    expect(getContextDocumentTypes("team")).toContain("team_notice");
  });

  it("keeps only assignment criteria in course context", () => {
    const documents = [
      storedDocument("assignment-1", "notice", "assignment_notice"),
      storedDocument("assignment-1", "team", "team_notice"),
      storedDocument("assignment-1", "feedback", "feedback"),
      storedDocument("assignment-1", "draft", "draft"),
    ];

    expect(documents.filter(isContextDocument).map((item) => item.documentId))
      .toEqual(["notice", "team"]);
  });

  it("does not send another assignment's raw feedback", () => {
    const feedbackRecords = [
      feedbackRecord("assignment-1", "feedback-1"),
      feedbackRecord("assignment-2", "feedback-2"),
    ];

    expect(
      getAssignmentFeedbackRecords(feedbackRecords, "assignment-1").map(
        (item) => item.feedbackId,
      ),
    ).toEqual(["feedback-1"]);
  });
});

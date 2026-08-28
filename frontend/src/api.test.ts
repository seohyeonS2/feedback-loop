import { describe, expect, it } from "vitest";

import { formatEvidence } from "./api";

describe("formatEvidence", () => {
  it("formats page and paragraph evidence for the review UI", () => {
    expect(
      formatEvidence({
        documentId: "rubric-1",
        blockId: "rubric-1-block-2",
        pageNumber: 3,
        paragraphNumber: 2,
      }),
    ).toBe("p.3 · 문단 2");
  });

  it("falls back to a generic evidence label when location is unavailable", () => {
    expect(
      formatEvidence({ documentId: "notice-1", blockId: "notice-1-block-1" }),
    ).toBe("근거 문단");
  });
});

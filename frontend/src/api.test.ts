import { afterEach, describe, expect, it, vi } from "vitest";

import { formatEvidence, wakeAnalysisApi } from "./api";

afterEach(() => {
  vi.unstubAllGlobals();
});

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

describe("wakeAnalysisApi", () => {
  it("returns the backend configuration when health is ready", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "ok",
          aiConfigured: true,
          model: "gemini-3.5-flash-lite",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      wakeAnalysisApi({ retryDelays: [0], requestTimeoutMs: 100 }),
    ).resolves.toMatchObject({ status: "ok", aiConfigured: true });
  });

  it("retries a temporary connection failure before returning health", async () => {
    const onRetry = vi.fn();
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("network unavailable"))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: "ok",
            aiConfigured: false,
            model: "gemini-3.5-flash-lite",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      wakeAnalysisApi({
        retryDelays: [0, 0],
        requestTimeoutMs: 100,
        onRetry,
      }),
    ).resolves.toMatchObject({ status: "ok", aiConfigured: false });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

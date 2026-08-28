import { describe, expect, it } from "vitest";

import { importSnapshot } from "./storage";

describe("importSnapshot", () => {
  it("fills missing collections so an older backup can still open", async () => {
    await expect(importSnapshot(JSON.stringify({ assignments: [] }))).resolves.toEqual({
      assignments: [],
      documents: [],
      feedbackRecords: [],
      reviews: [],
      insights: [],
    });
  });

  it("restores stored collections without changing their shape", async () => {
    const snapshot = {
      assignments: [
        {
          id: "assignment-1",
          courseName: "서비스기획",
          title: "중간 과제",
          dueDate: "2026-09-01",
          description: "사용자 인터뷰 분석",
          createdAt: "2026-08-28T00:00:00.000Z",
          updatedAt: "2026-08-28T00:00:00.000Z",
        },
      ],
    };

    await expect(importSnapshot(JSON.stringify(snapshot))).resolves.toMatchObject(snapshot);
  });
});

import type {
  AppSnapshot,
  Assignment,
  FeedbackRecord,
  PersonalInsight,
  ReviewRecord,
  SourceReference,
  StoredDocument,
} from "./types";

const sampleNow = "2026-08-28T09:00:00.000Z";

function assignment(
  id: string,
  title: string,
  courseName: string,
  dueDate: string,
): Assignment {
  return {
    id,
    title,
    courseName,
    dueDate,
    description: "수업 자료와 채점기준을 근거로 분석 보고서를 작성합니다.",
    createdAt: sampleNow,
    updatedAt: sampleNow,
  };
}

function document(
  assignmentId: string,
  documentId: string,
  documentType: StoredDocument["documentType"],
  fileName: string,
  texts: string[],
): StoredDocument {
  return {
    assignmentId,
    documentId,
    documentType,
    fileName,
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    blocks: texts.map((text, index) => ({
      blockId: `${documentId}-b${index + 1}`,
      text,
      paragraphNumber: index + 1,
    })),
    warnings: [],
    characterCount: texts.join("").length,
    createdAt: sampleNow,
  };
}

function ref(documentId: string, blockId: string, paragraphNumber: number): SourceReference {
  return { documentId, blockId, paragraphNumber };
}

export function createSampleSnapshot(): AppSnapshot {
  const pastAssignment = assignment(
    "sample-assignment-past",
    "브랜드 사례 분석",
    "마케팅원론",
    "2026-05-20",
  );
  const currentAssignment = assignment(
    "sample-assignment-current",
    "소비자 행동 분석 보고서",
    "마케팅원론",
    "2026-09-12",
  );

  const pastFeedbackDocument = document(
    pastAssignment.id,
    "sample-feedback-past",
    "feedback",
    "브랜드 사례 분석 피드백.docx",
    ["주장의 근거가 자료 안에서 어디에 있는지 더 명확하게 연결해 주세요."],
  );
  const currentFeedbackDocument = document(
    currentAssignment.id,
    "sample-feedback-current",
    "feedback",
    "중간 보고서 피드백.docx",
    ["분석 결과를 제시할 때 사용한 자료와 해석의 연결 문장을 보강해 주세요."],
  );
  const notice = document(
    currentAssignment.id,
    "sample-notice",
    "assignment_notice",
    "소비자 행동 분석 과제 공지.docx",
    [
      "최근 3년 이내 자료를 최소 2개 사용하고 자료의 출처를 본문에 표시합니다.",
      "소비자 행동을 하나의 사례에 적용하고 관찰 결과와 해석을 구분합니다.",
    ],
  );
  const rubric = document(
    currentAssignment.id,
    "sample-rubric",
    "rubric",
    "소비자 행동 분석 채점기준.docx",
    [
      "문제 정의와 분석 질문이 구체적인가",
      "자료의 근거와 분석 결과가 논리적으로 연결되는가",
      "참고문헌과 인용 형식이 일관적인가",
    ],
  );
  const syllabus = document(
    currentAssignment.id,
    "sample-syllabus",
    "syllabus",
    "마케팅원론 강의계획서.docx",
    ["사례 분석을 통해 소비자 의사결정 과정을 설명하는 것을 목표로 합니다."],
  );
  const draft = document(
    currentAssignment.id,
    "sample-draft",
    "draft",
    "소비자 행동 분석 초안.docx",
    [
      "이번 분석에서는 대학생의 구독 서비스 이용 행동을 살펴본다.",
      "설문 결과 구독 서비스를 이용하는 학생이 많았다.",
      "따라서 편리함이 가장 큰 이유라고 판단했다.",
    ],
  );

  const feedbackRecords: FeedbackRecord[] = [
    {
      feedbackId: "sample-feedback-record-1",
      assignmentId: pastAssignment.id,
      originalText: pastFeedbackDocument.blocks[0].text,
      interpretation: "주장 뒤에 어떤 자료를 근거로 삼았는지 한 문장으로 연결해 보세요.",
      status: "improved",
      evidenceRefs: [ref(pastFeedbackDocument.documentId, pastFeedbackDocument.blocks[0].blockId, 1)],
      createdAt: sampleNow,
      updatedAt: sampleNow,
    },
    {
      feedbackId: "sample-feedback-record-2",
      assignmentId: currentAssignment.id,
      originalText: currentFeedbackDocument.blocks[0].text,
      interpretation: "자료의 관찰 결과와 나의 해석이 어디서 이어지는지 보여 주세요.",
      status: "confirmed",
      evidenceRefs: [ref(currentFeedbackDocument.documentId, currentFeedbackDocument.blocks[0].blockId, 1)],
      createdAt: sampleNow,
      updatedAt: sampleNow,
    },
  ];

  const review: ReviewRecord = {
    reviewId: "sample-review-current",
    assignmentId: currentAssignment.id,
    createdAt: sampleNow,
    result: {
      reviewId: "sample-review-current",
      readiness: "needs_attention",
      summary: "자료와 해석의 연결을 한 번 더 확인하면 제출 준비가 더 선명해져요.",
      checks: [
        {
          checkId: "sample-check-requirement",
          category: "requirement",
          status: "pass",
          title: "최근 자료 2개 사용",
          detail: "초안에 자료를 언급하는 문장이 있어요. 출처 표기를 최종 확인해 주세요.",
          evidenceRefs: [ref(notice.documentId, notice.blocks[0].blockId, 1)],
        },
        {
          checkId: "sample-check-rubric",
          category: "rubric",
          status: "attention",
          title: "관찰 결과와 해석 구분",
          detail: "설문 결과에서 편리함이라는 해석으로 넘어가는 연결 근거를 보강해 보세요.",
          evidenceRefs: [ref(draft.documentId, draft.blocks[1].blockId, 2), ref(rubric.documentId, rubric.blocks[1].blockId, 2)],
        },
        {
          checkId: "sample-check-feedback",
          category: "feedback",
          status: "attention",
          title: "근거와 주장 연결",
          detail: "이전 피드백에서 반복된 확인 포인트예요.",
          evidenceRefs: [ref(currentFeedbackDocument.documentId, currentFeedbackDocument.blocks[0].blockId, 1), ref(draft.documentId, draft.blocks[2].blockId, 3)],
        },
        {
          checkId: "sample-check-format",
          category: "format",
          status: "not_found",
          title: "참고문헌 형식",
          detail: "초안 텍스트에서 참고문헌 형식을 확인하지 못했어요.",
          evidenceRefs: [],
        },
      ],
      warnings: ["샘플 결과입니다. 실제 제출 전에는 현재 자료로 다시 검토해 주세요."],
      insightCandidates: [],
    },
  };

  const insights: PersonalInsight[] = [
    {
      insightId: "sample-insight-1",
      candidateId: "sample-insight-1",
      kind: "improvement",
      statement: "주장과 자료의 연결을 먼저 확인해 보세요.",
      text: "주장과 자료의 연결을 먼저 확인해 보세요.",
      feedbackRecordIds: [
        feedbackRecords[0].feedbackId,
        feedbackRecords[1].feedbackId,
      ],
      evidenceRefs: [
        ...feedbackRecords[0].evidenceRefs,
        ...feedbackRecords[1].evidenceRefs,
      ],
      confidence: "supported",
      state: "approved",
      updatedAt: sampleNow,
    },
  ];

  return {
    assignments: [currentAssignment, pastAssignment],
    documents: [
      notice,
      rubric,
      syllabus,
      draft,
      pastFeedbackDocument,
      currentFeedbackDocument,
    ],
    feedbackRecords,
    reviews: [review],
    insights,
  };
}

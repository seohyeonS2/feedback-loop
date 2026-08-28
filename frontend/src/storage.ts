import { openDB, type IDBPDatabase } from "idb";

import {
  EMPTY_SNAPSHOT,
  type AppSnapshot,
  type Assignment,
  type FeedbackRecord,
  type InsightCandidate,
  type PersonalInsight,
  type ReviewRecord,
  type StoredDocument,
} from "./types";

const DB_NAME = "feedback-loop";
const DB_VERSION = 1;
const STORE_NAMES = [
  "assignments",
  "documents",
  "feedbackRecords",
  "reviews",
  "insights",
] as const;

type StoreName = (typeof STORE_NAMES)[number];

interface FeedbackLoopDB {
  assignments: {
    key: string;
    value: Assignment;
  };
  documents: {
    key: string;
    value: StoredDocument;
  };
  feedbackRecords: {
    key: string;
    value: FeedbackRecord;
  };
  reviews: {
    key: string;
    value: ReviewRecord;
  };
  insights: {
    key: string;
    value: PersonalInsight;
  };
}

let databasePromise: Promise<IDBPDatabase<FeedbackLoopDB>> | undefined;

function getDatabase(): Promise<IDBPDatabase<FeedbackLoopDB>> {
  databasePromise ??= openDB<FeedbackLoopDB>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      for (const storeName of STORE_NAMES) {
        if (!database.objectStoreNames.contains(storeName)) {
          database.createObjectStore(storeName);
        }
      }
    },
  });
  return databasePromise;
}

async function readStore<T extends StoreName>(storeName: T) {
  const database = await getDatabase();
  return database.getAll(storeName) as Promise<FeedbackLoopDB[T]["value"][]>;
}

export async function readSnapshot(): Promise<AppSnapshot> {
  const [assignments, documents, feedbackRecords, reviews, insights] =
    await Promise.all([
      readStore("assignments"),
      readStore("documents"),
      readStore("feedbackRecords"),
      readStore("reviews"),
      readStore("insights"),
    ]);

  return {
    assignments,
    documents,
    feedbackRecords,
    reviews,
    insights,
  };
}

export async function replaceSnapshot(snapshot: AppSnapshot): Promise<void> {
  const database = await getDatabase();
  const transaction = database.transaction([...STORE_NAMES], "readwrite");
  for (const storeName of STORE_NAMES) {
    await transaction.objectStore(storeName).clear();
  }
  for (const assignment of snapshot.assignments) {
    await transaction.objectStore("assignments").put(assignment, assignment.id);
  }
  for (const document of snapshot.documents) {
    await transaction
      .objectStore("documents")
      .put(document, document.documentId);
  }
  for (const feedback of snapshot.feedbackRecords) {
    await transaction
      .objectStore("feedbackRecords")
      .put(feedback, feedback.feedbackId);
  }
  for (const review of snapshot.reviews) {
    await transaction.objectStore("reviews").put(review, review.reviewId);
  }
  for (const insight of snapshot.insights) {
    await transaction.objectStore("insights").put(insight, insight.insightId);
  }
  await transaction.done;
}

export async function clearStorage(): Promise<void> {
  await replaceSnapshot(EMPTY_SNAPSHOT);
}

interface EncodedBlob {
  __feedbackLoopBlob: true;
  type: string;
  data: string;
}

function isBlob(value: unknown): value is Blob {
  return typeof Blob !== "undefined" && value instanceof Blob;
}

async function encodeValue(value: unknown): Promise<unknown> {
  if (isBlob(value)) {
    const bytes = new Uint8Array(await value.arrayBuffer());
    let binary = "";
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return {
      __feedbackLoopBlob: true,
      type: value.type,
      data: btoa(binary),
    } satisfies EncodedBlob;
  }
  if (Array.isArray(value)) {
    return Promise.all(value.map((item) => encodeValue(item)));
  }
  if (value && typeof value === "object") {
    const entries = await Promise.all(
      Object.entries(value).map(async ([key, entry]) => [
        key,
        await encodeValue(entry),
      ] as const),
    );
    return Object.fromEntries(entries);
  }
  return value;
}

function decodeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => decodeValue(item));
  }
  if (value && typeof value === "object") {
    const maybeBlob = value as Partial<EncodedBlob>;
    if (maybeBlob.__feedbackLoopBlob && maybeBlob.data) {
      const binary = atob(maybeBlob.data);
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      return new Blob([bytes], { type: maybeBlob.type ?? "application/octet-stream" });
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, decodeValue(entry)]),
    );
  }
  return value;
}

export async function exportSnapshot(): Promise<string> {
  return JSON.stringify(await encodeValue(await readSnapshot()), null, 2);
}

export async function importSnapshot(serialized: string): Promise<AppSnapshot> {
  const parsed: unknown = JSON.parse(serialized);
  const decoded = decodeValue(parsed) as Partial<AppSnapshot>;
  return {
    assignments: decoded.assignments ?? [],
    documents: decoded.documents ?? [],
    feedbackRecords: decoded.feedbackRecords ?? [],
    reviews: decoded.reviews ?? [],
    insights: decoded.insights ?? [],
  };
}

export function emptySnapshot(): AppSnapshot {
  return {
    assignments: [],
    documents: [],
    feedbackRecords: [],
    reviews: [],
    insights: [],
  };
}

export type { InsightCandidate };

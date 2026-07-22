import { describe, expect, it } from "vitest";
import { isChunkLoadError } from "./chunkRecovery";

describe("isChunkLoadError", () => {
  it("recognizes stale Vite dynamic import failures", () => {
    expect(isChunkLoadError(new TypeError("Failed to fetch dynamically imported module: /assets/AuditHistorySheet-old.js"))).toBe(true);
    expect(isChunkLoadError("Importing a module script failed")).toBe(true);
    expect(isChunkLoadError("ChunkLoadError: Loading chunk 42 failed")).toBe(true);
  });

  it("does not reload for unrelated application errors", () => {
    expect(isChunkLoadError(new Error("Invalid room number"))).toBe(false);
  });
});

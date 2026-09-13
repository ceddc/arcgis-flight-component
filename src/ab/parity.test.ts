import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  runSkyTourParity,
  type SkyTourReferenceFixture,
} from "./parity";

const fixture = JSON.parse(readFileSync(
  new URL("./sky-tour-bavaria.reference.json", import.meta.url),
  "utf8",
)) as SkyTourReferenceFixture;

const worldFixture = JSON.parse(readFileSync(
  new URL("./world-skytour.reference.json", import.meta.url),
  "utf8",
)) as SkyTourReferenceFixture;

describe("standalone versus Sky Tour A/B behavior", () => {
  it("matches 720 frames from current World Sky Tour physics and extracted camera code", () => {
    const report = runSkyTourParity(worldFixture);
    expect(report).toMatchObject({
      passed: true,
      comparedFrames: 720,
      mismatchCount: 0,
      firstMismatchStep: null,
      sourceCommit: "bb86f3e9ac24b932c62230718ca8bad5b9d888df",
      sdkVersion: "5.1.21",
    });
    expect(Math.max(...Object.values(report.maxDeltas))).toBeLessThanOrEqual(report.tolerance);
  });

  it("rejects an SDK version that does not belong to the pinned reference", () => {
    expect(() => runSkyTourParity({
      ...worldFixture,
      metadata: { ...worldFixture.metadata, sdkVersion: "5.1.14" },
    })).toThrow(/SDK version/);
  });

  it("matches all 720 fixed flight and camera frames", () => {
    const report = runSkyTourParity(fixture);
    expect(report).toMatchObject({
      passed: true,
      comparedFrames: 720,
      mismatchCount: 0,
      firstMismatchStep: null,
      sourceCommit: "3300e43491321070114dd120a1db0cde3e8c200b",
      sdkVersion: "5.1.14",
    });
    expect(Math.max(...Object.values(report.maxDeltas))).toBeLessThanOrEqual(
      report.tolerance,
    );
  });

  it("rejects a fixture from an unverified source commit", () => {
    expect(() => runSkyTourParity({
      ...fixture,
      metadata: { ...fixture.metadata, sourceCommit: "different" },
    })).toThrow(/reference commit/);
  });
});

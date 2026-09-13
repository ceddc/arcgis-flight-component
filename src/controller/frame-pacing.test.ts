import { describe, expect, it } from "vitest";
import { FramePacingSampler } from "./frame-pacing";

describe("Frame pacing sampler", () => {
  it("requires enough recent samples and reports average and p95 pacing", () => {
    const sampler = new FramePacingSampler();
    for (let index = 0; index < 29; index += 1) sampler.observe(10);
    expect(sampler.sample()).toEqual({ averageFps: null, p95FrameMs: null });

    sampler.observe(20);
    expect(sampler.sample().averageFps).toBeCloseTo(96.77, 2);
    expect(sampler.sample().p95FrameMs).toBe(10);
  });

  it("clears stale samples after a suspended or invalid frame", () => {
    const sampler = new FramePacingSampler();
    for (let index = 0; index < 30; index += 1) sampler.observe(16);
    expect(sampler.sample().averageFps).toBeCloseTo(62.5);

    sampler.observe(300);
    expect(sampler.sample()).toEqual({ averageFps: null, p95FrameMs: null });
  });

  it("keeps only the newest bounded frame-time window", () => {
    const sampler = new FramePacingSampler();
    for (let index = 0; index < 180; index += 1) sampler.observe(10);
    for (let index = 0; index < 180; index += 1) sampler.observe(20);

    expect(sampler.sample().averageFps).toBeCloseTo(50);
    expect(sampler.sample().p95FrameMs).toBe(20);
  });
});

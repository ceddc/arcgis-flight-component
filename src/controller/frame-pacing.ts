/**
 * Measures recent display frame times for the ArcGIS camera cadence governor.
 *
 * A bounded rolling window reports average FPS and p95 frame duration only
 * after enough valid samples. Long stalls and invalid durations clear the
 * window so background tabs or resumed sessions cannot bias the next choice.
 */
import type { FlightFramePacing } from "../arcgis/camera-cadence";

const MINIMUM_SAMPLE_COUNT = 30;
const SAMPLE_LIMIT = 180;
const MAXIMUM_VALID_FRAME_MS = 250;

/** Stores a bounded recent frame window and reports average FPS plus p95 frame duration. */
export class FramePacingSampler {
  private readonly frameTimes = new Float64Array(SAMPLE_LIMIT);
  private count = 0;
  private cursor = 0;
  private totalFrameMs = 0;

  /** Adds one display-frame duration; invalid or long-stall values clear the rolling window. */
  observe(frameMs: number): void {
    if (!Number.isFinite(frameMs) || frameMs <= 0 || frameMs >= MAXIMUM_VALID_FRAME_MS) {
      this.clear();
      return;
    }
    if (this.count === SAMPLE_LIMIT) {
      this.totalFrameMs -= this.frameTimes[this.cursor] ?? 0;
    } else {
      this.count += 1;
    }
    this.frameTimes[this.cursor] = frameMs;
    this.totalFrameMs += frameMs;
    this.cursor = (this.cursor + 1) % SAMPLE_LIMIT;
  }

  /** Returns average FPS and p95 duration once enough frames have been observed. */
  sample(): FlightFramePacing {
    if (this.count < MINIMUM_SAMPLE_COUNT) {
      return { averageFps: null, p95FrameMs: null };
    }
    const sorted = this.values().sort((left, right) => left - right);
    return {
      averageFps: 1_000 / (this.totalFrameMs / this.count),
      p95FrameMs: sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)] ?? null,
    };
  }

  /** Discards accumulated frame history, for example when a session resumes. */
  clear(): void {
    this.count = 0;
    this.cursor = 0;
    this.totalFrameMs = 0;
  }

  private values(): number[] {
    const values = new Array<number>(this.count);
    const start = this.count === SAMPLE_LIMIT ? this.cursor : 0;
    for (let index = 0; index < this.count; index += 1) {
      values[index] = this.frameTimes[(start + index) % SAMPLE_LIMIT] ?? 0;
    }
    return values;
  }
}

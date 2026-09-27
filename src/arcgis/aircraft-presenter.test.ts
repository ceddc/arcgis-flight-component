/**
 * Verify aircraft presentation against mesh and graphic stand-ins.
 * Checks that repeated frames reuse geometry and that the propeller and plume
 * remain attached as aircraft attitude and plume scale change.
 */
import type Graphic from "@arcgis/core/Graphic.js";
import type Mesh from "@arcgis/core/geometry/Mesh.js";
import Point from "@arcgis/core/geometry/Point.js";
import MeshTransform from "@arcgis/core/geometry/support/MeshTransform.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { VehicleRenderPose } from "../core/runtime";
import { createAircraftPresenter, type ActiveAircraftMesh } from "./aircraft-presenter";
import { updateMeshMotion } from "./mesh-motion";

vi.mock("./mesh-motion", async (importOriginal) => ({
  ...await importOriginal<typeof import("./mesh-motion")>(),
  updateMeshMotion: vi.fn(),
}));

function aircraftMesh(): ActiveAircraftMesh {
  return {
    mesh: { vertexAttributes: { position: [] } } as unknown as Mesh,
    motion: {
      transform: new MeshTransform(),
      baseTranslation: [0, 0, 0],
      baseRotation: [0, 0, 0, 1],
    },
    graphic: { visible: true } as Graphic,
  };
}

function destroyMesh(aircraft: ActiveAircraftMesh): void {
  aircraft.motion.transform.destroy();
}

afterEach(() => vi.clearAllMocks());

describe("aircraft presenter", () => {
  it("releases every cloned SDK point while preserving the caller's point", () => {
    const point = new Point({ x: 10, y: 20, z: 30, spatialReference: { wkid: 3857 } });
    const clone = vi.spyOn(point, "clone");
    const vehicle = aircraftMesh();
    const presenter = createAircraftPresenter({
      vehicle, propeller: null, boost: null, point, webMercator: true,
    });
    const ownedPoints = clone.mock.results.map((result) => result.value as Point);

    try {
      expect(ownedPoints).toHaveLength(3);
      expect(ownedPoints.every((owned) => owned !== point && !owned.destroyed)).toBe(true);

      presenter.destroy();

      expect(ownedPoints.every((owned) => owned.destroyed)).toBe(true);
      expect(point.destroyed).toBe(false);
      point.set({ z: 90 });
      expect(point.z).toBe(90);
    } finally {
      presenter.destroy();
      clone.mockRestore();
      point.destroy();
      destroyMesh(vehicle);
    }
  });

  it("reuses mesh positions and keeps hidden aircraft from updating geometry", () => {
    const point = new Point({ x: 0, y: 0, z: 0, spatialReference: { wkid: 2056 } });
    const vehicle = aircraftMesh();
    const propeller = aircraftMesh();
    const boost = aircraftMesh();
    const presenter = createAircraftPresenter({ vehicle, propeller, boost, point, webMercator: false });
    const pose: VehicleRenderPose = {
      position: { x: 100, y: 200, z: 300 },
      bodyHeading: 0, travelHeading: 0, pitch: 0, roll: 0,
      speed: 100, interpolationAlpha: 0, boost: 2,
    };
    const updates = vi.mocked(updateMeshMotion);

    try {
      presenter.update(pose, true, 45, { visible: true, opacity: 1, lengthScale: 1 });
      const positions = updates.mock.calls.map((call) => call[3]);
      expect(positions[0]).toMatchObject(pose.position);
      expect(positions[1].x).toBe(100);
      expect(positions[1].y).toBeCloseTo(202.68);
      expect(positions[1].z).toBe(300);
      expect(positions[2]).toMatchObject(pose.position);
      expect(updates.mock.calls[1][2].localRotation).toEqual({ x: 0, y: 45, z: 0 });

      presenter.update({ ...pose, position: { x: 150, y: 250, z: 350 } }, true, 90, { visible: true, opacity: 1, lengthScale: 1 });
      for (let index = 0; index < 3; index += 1) {
        expect(updates.mock.calls[index + 3][3]).toBe(positions[index]);
      }
      expect(positions[0].x).toBe(150);
      expect(point).toMatchObject({ x: 0, y: 0, z: 0 });
      expect(presenter.diagnostics()).toEqual({ aircraftVisible: true, boostVisible: true });

      updates.mockClear();
      presenter.update(pose, false, 180, { visible: true, opacity: 1, lengthScale: 1 });
      expect(updates).not.toHaveBeenCalled();
      expect([vehicle, propeller, boost].every((part) => !part.graphic.visible)).toBe(true);
      expect(presenter.diagnostics()).toEqual({ aircraftVisible: false, boostVisible: false });
    } finally {
      presenter.destroy();
      point.destroy();
      [vehicle, propeller, boost].forEach(destroyMesh);
    }
  });
});

it("keeps a custom plume's nozzle attached through changing scale and aircraft attitude", () => {
  const point = new Point({ x: 0, y: 0, z: 0, spatialReference: { wkid: 2056 } });
  const vehicle = aircraftMesh();
  const boost = aircraftMesh();
  boost.mesh = { vertexAttributes: { position: new Float64Array([0, -5, 0, 0, -2, 0]) } } as unknown as Mesh;
  const presenter = createAircraftPresenter({ vehicle, propeller: null, boost, point, webMercator: false });
  const pose: VehicleRenderPose = { position: { x: 100, y: 200, z: 300 },
    bodyHeading: 90, travelHeading: 90, pitch: 0, roll: 0, speed: 200, interpolationAlpha: 0, boost: 2 };
  try {
    for (const lengthScale of [0.2, 0.8, 1.2, 0.2]) {
      presenter.update(pose, true, 0, { visible: true, opacity: 0.6, lengthScale });
      const plumePosition = vi.mocked(updateMeshMotion).mock.calls.at(-1)![3];
      expect(plumePosition.x + (-2 * lengthScale)).toBeCloseTo(98, 10);
      expect(plumePosition.y).toBeCloseTo(200, 10);
      expect(boost.motion.transform.scale).toEqual([1, lengthScale, 1]);
    }
  } finally { presenter.destroy(); point.destroy(); [vehicle, boost].forEach(destroyMesh); }
});

it.each([1, 0.3048, 1200 / 3937])("keeps tilted propeller and exhaust attachments in metres at scale %s", metersPerUnit => {
  const point = new Point({ x: 0, y: 0, z: 0, spatialReference: { wkid: 2263 } });
  const vehicle = aircraftMesh(), propeller = aircraftMesh(), boost = aircraftMesh();
  // The glTF loader has already converted these vertices to projected scene units.
  boost.mesh.vertexAttributes.position = new Float64Array([0, 2 / metersPerUnit, 0]);
  const presenter = createAircraftPresenter({ vehicle, propeller, boost, point, webMercator: false, metersPerUnit });
  const pose: VehicleRenderPose = { position: { x: 300000, y: 65000, z: 540 }, bodyHeading: 25, travelHeading: 25, pitch: 30, roll: 15, speed: 70, interpolationAlpha: 0 };
  try {
    presenter.update(pose, true, 0, { visible: true, opacity: 1, lengthScale: 1.5 });
    const positions = vi.mocked(updateMeshMotion).mock.calls.map(call => call[3]);
    expect(positions[0].z! * metersPerUnit).toBeCloseTo(540);
    const distance = (index: number) => Math.hypot(positions[index].x - positions[0].x, positions[index].y - positions[0].y, positions[index].z! - positions[0].z!) * metersPerUnit;
    expect(distance(1)).toBeCloseTo(2.68, 7);
    expect(distance(2)).toBeCloseTo(1, 7); // 2 m outlet, stretched 1.5x, shifts back 1 m.
  } finally { presenter.destroy(); point.destroy(); [vehicle, propeller, boost].forEach(destroyMesh); }
});

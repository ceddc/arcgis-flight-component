/**
 * Guards model-specific flight dispatch and profile configuration validation.
 * The suite compares classic behavior, powered tuning, Space Jet thrust,
 * paraglider energy loss, and invalid custom settings.
 */
import { describe, expect, it } from 'vitest';
import { normalizeAircraftFlight, stepAircraftFlight } from './aircraft-flight';
import { createInitialFlightState, stepFlight } from './flight';
import { normalizePlaneNavigationConfig, mergePlaneNavigationConfig } from '../config';
import { planeNavigationConfigRequiresRestart } from '../components/plane-navigation-config';
import type { ControlFrame } from './types';

const neutral: ControlFrame = { pitch: 0, bank: 0, yaw: 0, accelerate: 0, brake: 0, airbrake: false, respawn: false };
describe('aircraft flight profiles', () => {
  it('preserves classic motion over a mixed control replay', () => {
    // The adapter is expected to remain bit-for-bit compatible with the legacy integrator over a long, varied replay.
    let original = createInitialFlightState({ x: 100, y: 200, z: 4800 }, 200);
    let profileState = structuredClone(original);
    const profile = normalizeAircraftFlight({ model: 'classic' });
    for (let i = 0; i < 1200; i++) {
      const control = { ...neutral, pitch: Math.sin(i / 53), bank: Math.cos(i / 81),
        yaw: Math.sin(i / 91), turboBoost: i > 300 && i < 600, brake: i > 800 ? .8 : 0 };
      original = stepFlight(original, control, 1 / 60);
      profileState = stepAircraftFlight(profile, profileState, control, 1 / 60);
    }
    expect(profileState).toEqual(original);
  });
  it.each([['classic', 1200 / 3.6], ['super-jet', 900], ['space-jet', 10000]] as const)('reaches %s turbo limit', (model, speed) => {
    const profile = normalizeAircraftFlight({ model });
    let state = { ...createInitialFlightState({ x: 0, y: 0, z: 5000 }, 0), speed: profile.tuning.cruiseSpeed };
    for (let i = 0; i < 3600; i++) state = stepAircraftFlight(profile, state, { ...neutral, turboBoost: true }, 1 / 60);
    expect(state.speed).toBeCloseTo(speed, 3);
    expect(state.position.z).toBeCloseTo(5000);
  });
  it('honors custom sustained speed and bank limits', () => {
    const profile = normalizeAircraftFlight({ model: 'classic', tuning: { cruiseSpeed: 60, minimumSpeed: 25, maximumSpeed: 95, turboMaximumSpeed: 140, maximumBankDeg: 30 } });
    let state = { ...createInitialFlightState({ x: 0, y: 0, z: 5000 }, 0), speed: 60 };
    for (let i = 0; i < 1200; i++) state = stepAircraftFlight(profile, state, { ...neutral, bank: 1 }, 1 / 60);
    expect(state.speed).toBeCloseTo(60, 4);
    expect(state.bank).toBeCloseTo(30, 4);
  });
  it('gives the spacecraft independent vertical thrust and a 200 km ceiling', () => {
    // Start just below the cap so this checks both clamping at the ceiling and recovery when pitching down.
    const profile = normalizeAircraftFlight({ model: 'space-jet' });
    let state = { ...createInitialFlightState({ x: 0, y: 0, z: 199900 }, 0), speed: 650 };
    for (let i = 0; i < 120; i++) state = stepAircraftFlight(profile, state, { ...neutral, pitch: 1 }, 1 / 60);
    expect(state.position.z).toBe(200000);
    expect(state.speed).toBe(650);
    state = stepAircraftFlight(profile, state, { ...neutral, pitch: -1 }, 1 / 60);
    expect(state.position.z).toBeLessThan(200000);
  });
  it('keeps the glider unpowered and loses energy even with turbo requested', () => {
    // A glider may receive the shared turbo input, but its profile must still provide no powered boost.
    const profile = normalizeAircraftFlight({ model: 'paraglider' });
    let state = { ...createInitialFlightState({ x: 0, y: 0, z: 5000 }, 0), speed: 50 / 3.6 };
    for (let i = 0; i < 1200; i++) state = stepAircraftFlight(profile, state, { ...neutral, turboBoost: true }, 1 / 60);
    expect(state.speed).toBeCloseTo(50 / 3.6);
    expect(state.position.z).toBeLessThan(4990);
    expect(state.launchBoost).toBe(0);
  });
  it('selects matching starting speeds, restarts for profile changes and preserves profile on live updates', () => {
    const base = normalizePlaneNavigationConfig();
    const jet = mergePlaneNavigationConfig(base, { flight: { model: 'space-jet' } });
    expect(jet.start.speedMps).toBe(650);
    expect(planeNavigationConfigRequiresRestart(base, jet)).toBe(true);
    const live = mergePlaneNavigationConfig(jet, { powerMode: 'turbo' });
    expect(live.flight).toEqual(jet.flight);
    expect(live.start.speedMps).toBe(650);
    expect(planeNavigationConfigRequiresRestart(jet, live)).toBe(false);
    const glider = mergePlaneNavigationConfig(live, { flight: { model: 'paraglider' } });
    expect(glider.start.speedMps).toBe(50 / 3.6);
    expect(mergePlaneNavigationConfig(glider, { camera: { mode: 'cockpit' } }).flight).toEqual(glider.flight);
  });
  it('rejects invalid speeds and non-finite tuning', () => {
    expect(() => normalizeAircraftFlight({ model: 'classic', tuning: { cruiseSpeed: 0 } })).toThrow();
    expect(() => normalizeAircraftFlight({ model: 'classic', tuning: { bankResponse: NaN } })).toThrow();
    expect(() => normalizeAircraftFlight({ model: 'paraglider', tuning: { cruiseSpeed: 100 } })).toThrow();
    expect(() => normalizePlaneNavigationConfig({ flight: { model: 'paraglider', tuning: { cruiseSpeed: 100 } } })).toThrow();
    expect(() => normalizePlaneNavigationConfig({ assets: { propellerAnchorM: { x: 0, y: NaN, z: 0 } } })).toThrow();
  });
});

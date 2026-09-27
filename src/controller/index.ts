/**
 * Exposes the session controller and its lifecycle/snapshot contracts.
 * `FlightSession` connects normalized input, fixed-step physics, and the
 * hosted ArcGIS scene; import it through this entry point when coordinating
 * a flight outside the web component.
 */
export { FlightSession } from "./flight-session";
export type {
  FlightSessionOptions,
  FlightSessionPhase,
  FlightSessionSnapshot,
} from "./flight-session";

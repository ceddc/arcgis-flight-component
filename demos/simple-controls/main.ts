import "@arcgis/map-components/components/arcgis-scene";
import "../../src/components/arcgis-plane-navigation";
import type { ArcgisPlaneNavigationElement } from "../../src/components/arcgis-plane-navigation";
import { setupDemoUi } from "../shared/demo-ui";
import { mountFlightControls } from "../shared/flight-controls";
import "./style.css";

setupDemoUi();
mountFlightControls(
  document.querySelector<ArcgisPlaneNavigationElement>("arcgis-plane-navigation")!,
  document.querySelector<HTMLElement>(".flight-stage")!,
);

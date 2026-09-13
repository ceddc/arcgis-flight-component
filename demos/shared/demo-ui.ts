import "@esri/calcite-components/components/calcite-action";
import "@esri/calcite-components/components/calcite-button";
import "@esri/calcite-components/components/calcite-dialog";
import "@esri/calcite-components/components/calcite-list";
import "@esri/calcite-components/components/calcite-list-item";
import "@esri/calcite-components/components/calcite-navigation";
import "@esri/calcite-components/components/calcite-navigation-logo";
import "@esri/calcite-components/components/calcite-shell";
import "@esri/calcite-components/main.css";
import "./theme.css";

export function setupDemoUi(): void {
  const actions = document.querySelector(".header-actions");
  const shell = document.querySelector("calcite-shell");
  if (!actions || !shell) return;
  const help = document.createElement("calcite-action");
  help.icon = "keyboard";
  help.text = "Flight controls";
  const dialog = document.createElement("calcite-dialog");
  dialog.className = "keyboard-help";
  dialog.slot = "dialogs";
  dialog.heading = "Flight controls";
  dialog.description = "Use the keyboard to steer and drag the scene to look around.";
  dialog.modal = true;
  dialog.fullscreenDisabled = true;
  dialog.scale = "s";
  const list = document.createElement("calcite-list");
  list.label = "Flight controls";
  list.selectionMode = "none";
  for (const [label, description] of [
    ["Arrow keys or WASD", "Steer the aircraft"],
    ["Drag the scene", "Look around in exterior view; release to return"],
    ["Shift", "Accelerate"],
    ["Space", "Brake"],
    ["Alt + R", "Recover to level flight"],
  ]) {
    const item = document.createElement("calcite-list-item");
    item.label = label;
    item.description = description;
    list.append(item);
  }
  dialog.append(list);
  shell.append(dialog);
  actions.append(help);
  help.addEventListener("click", () => { dialog.open = true; });
}

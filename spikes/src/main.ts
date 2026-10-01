/**
 * Entry point of the disposable spike plugin `ekphrasis-spikes`.
 *
 * Each spike tests one premise that a decision record states without verification. The plugin is
 * deleted once every verdict is recorded; nothing in `src/` may import from it.
 */
import { Plugin } from "obsidian";
import { ajvCompileSpike } from "./ajv-compile";
import { extensionConflictSpike } from "./extension-conflict";
import { pythonProcessSpike } from "./python-process";
import { renderingTimeSpike } from "./rendering-time";
import type { Spike } from "./spike";

const SPIKES: readonly Spike[] = [
  extensionConflictSpike,
  ajvCompileSpike,
  renderingTimeSpike,
  pythonProcessSpike,
];

export default class SpikesPlugin extends Plugin {
  override onload(): void {
    for (const spike of SPIKES) spike.register(this);
  }
}

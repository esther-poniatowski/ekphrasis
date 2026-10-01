/**
 * Contract of one spike: a module that registers its commands and views on the spike plugin.
 */
import type { Plugin } from "obsidian";

export interface Spike {
  /** Registers the commands, views and cleanup of the spike; called once from `onload`. */
  register(plugin: Plugin): void;
}

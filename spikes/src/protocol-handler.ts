/**
 * Spike on the URI of Obsidian proposed for links by identifier, by the decision record on record
 * identifiers: does a click on `obsidian://ekphrasis-spike?…` in a note reach the handler of the
 * plugin, in the reading view and in the live preview, with and without the parameter `vault`?
 *
 * The declarations of the API state that `Plugin.registerObsidianProtocolHandler(action, handler)`
 * passes the action and the decoded query to the handler. They state neither how a click inside
 * Obsidian routes such a link, nor which vault receives a link without the parameter `vault`.
 */
import type { Plugin } from "obsidian";
import type { SpikeReport } from "./report";

const NAME = "protocol";

export function registerProtocolSpike(plugin: Plugin, report: SpikeReport): void {
  plugin.registerObsidianProtocolHandler("ekphrasis-spike", (params) => {
    report.add(
      NAME,
      `handler received ${JSON.stringify(params)} in vault ${plugin.app.vault.getName()}`,
    );
  });
}

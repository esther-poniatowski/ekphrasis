/**
 * Spike on the paths of a YAML file resolved from a note: which forms of a link, with or without
 * the extension, as a wikilink or as a Markdown link, does Obsidian resolve to a YAML file?
 *
 * The declarations of the API state that `MetadataCache.getFirstLinkpathDest` returns a `TFile`,
 * and that `resolvedLinks` and `unresolvedLinks` map each note to its destinations. The command
 * reports, for each link of the active note, the destination found by Obsidian, and whether the
 * metadata cache counts the link as resolved.
 */
import { getLinkpath, type Plugin } from "obsidian";
import type { SpikeReport } from "./report";

const NAME = "resolution";

export function registerResolutionSpike(plugin: Plugin, report: SpikeReport): void {
  plugin.addCommand({
    id: "resolve-links",
    name: "Resolve the links of the active note",
    callback: () => {
      const { workspace, metadataCache } = plugin.app;
      const note = workspace.getActiveFile();
      if (note === null) {
        report.add(NAME, "no active note");
        return;
      }
      for (const link of metadataCache.getFileCache(note)?.links ?? []) {
        const target = metadataCache.getFirstLinkpathDest(getLinkpath(link.link), note.path);
        report.add(
          NAME,
          `${link.original} -> link "${link.link}" -> ${target?.path ?? "unresolved"}`,
        );
      }
      report.add(
        NAME,
        `resolvedLinks ${JSON.stringify(metadataCache.resolvedLinks[note.path] ?? {})}`,
      );
      report.add(
        NAME,
        `unresolvedLinks ${JSON.stringify(metadataCache.unresolvedLinks[note.path] ?? {})}`,
      );
    },
  });
}

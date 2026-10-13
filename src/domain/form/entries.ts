/**
 * Effective content of the nodes of a tree: aliases followed to their anchors, and the entries
 * merged by the key `<<` expanded. The form model and the instance data read through validation
 * share these rules, so a field and its validated value always agree.
 */
import type { MappingEntry, MappingNode, YamlNode } from "../model";
import { MERGE_KEY } from "../model";
import type { FieldLock } from "./model";

/** Entry of a mapping after the expansion of merge keys. */
export interface EffectiveEntry {
  readonly key: string;
  readonly value: YamlNode;
  readonly lock: FieldLock | null;
}

/** Follows aliases to their targets; a value reached through an alias is locked. */
export function resolveAliases(
  node: YamlNode | null,
  lock: FieldLock | null,
): { node: YamlNode | null; lock: FieldLock | null } {
  let current = node;
  let currentLock = lock;
  while (current?.kind === "alias") {
    current = current.target;
    currentLock = "alias";
  }
  return { node: current, lock: currentLock };
}

/**
 * Entries of `mapping`, with the entries merged by the key `<<` appended when their key is not
 * written directly. A merged entry is locked, since its text lies in the merged mapping.
 */
export function effectiveEntries(mapping: MappingNode, lock: FieldLock | null): EffectiveEntry[] {
  const entries: EffectiveEntry[] = [];
  const seen = new Set<string>();
  const add = (entry: Pick<MappingEntry, "key" | "value">, entryLock: FieldLock | null): void => {
    if (seen.has(entry.key)) return;
    seen.add(entry.key);
    entries.push({ key: entry.key, value: entry.value, lock: entryLock });
  };
  for (const entry of mapping.entries) if (entry.key !== MERGE_KEY) add(entry, lock);
  for (const entry of mapping.entries) {
    if (entry.key !== MERGE_KEY) continue;
    for (const source of mergeSources(entry.value)) {
      for (const merged of effectiveEntries(source, "merge")) {
        add({ key: merged.key, value: merged.value }, lock ?? "merge");
      }
    }
  }
  return entries;
}

/** Mappings merged by the value of a key `<<`: one alias, or a sequence of aliases. */
function mergeSources(value: YamlNode): MappingNode[] {
  const nodes = value.kind === "sequence" ? value.items : [value];
  return nodes.flatMap((node) => {
    const target = resolveAliases(node, null).node;
    return target?.kind === "mapping" ? [target] : [];
  });
}

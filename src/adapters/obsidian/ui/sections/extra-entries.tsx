/**
 * Read-only area listing the keys of a mapping outside its schema, as YAML text. Such keys are
 * edited in the source view only.
 */
import type { JSX } from "preact";
import type { ExtraEntry } from "../../../../domain";

export function ExtraEntries({
  entries,
}: {
  readonly entries: readonly ExtraEntry[];
}): JSX.Element | null {
  if (entries.length === 0) return null;
  return (
    <div class="ekphrasis-extra-entries">
      <div class="ekphrasis-extra-heading">Keys outside the schema (edit in the source view)</div>
      {entries.map((entry) => (
        <div key={entry.id} class="ekphrasis-field" data-path={entry.id}>
          <div class="ekphrasis-field-label">{entry.key}</div>
          <pre class="ekphrasis-field-content ekphrasis-yaml-text">{entry.text}</pre>
        </div>
      ))}
    </div>
  );
}

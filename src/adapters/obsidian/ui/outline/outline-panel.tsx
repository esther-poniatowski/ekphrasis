/**
 * Content of the outline: the entries of the form of the active instance, nested as the form
 * nests its fields, with a search of the fields and a toggle restricting the entries to those
 * holding an issue, as the feature note on the outline specifies.
 *
 * A click on an entry moves the form to its field. Choosing a result of the search moves the form
 * to its field and shows its instructions. The entries of a section fold in the outline
 * independently of the form, one at a time or all at once by the buttons at the top of the panel;
 * the folded state, the search and the toggle belong to the panel of one file.
 *
 * The search field and its clear button take the classes of the search fields of Obsidian, whose
 * style sheet draws the magnifier and the cross, and hides the cross while the field is empty.
 */
import type { ComponentChildren, JSX } from "preact";
import { useState } from "preact/hooks";
import type { FormReady } from "../../../../application";
import {
  buildOutline,
  IssueIndex,
  restrictToIssues,
  searchOutline,
  type OutlineEntry,
  type OutlineMatch,
  type YamlPath,
} from "../../../../domain";

/** Number of search results displayed, so a short query lists a readable selection. */
const MAX_RESULTS = 50;

export interface OutlinePanelProps {
  /** Form of the active instance, or `null` when no form is displayed. */
  readonly form: FormReady | null;
  /** Printed field path of the field focused in the form, whose entry is highlighted. */
  readonly focusedId: string | null;
  /** Moves the form to the field at `path`, showing its instructions when `showHelp` holds. */
  readonly onReveal: (path: YamlPath, showHelp: boolean) => void;
}

export function OutlinePanel({ form, focusedId, onReveal }: OutlinePanelProps): JSX.Element {
  const [query, setQuery] = useState("");
  const [onlyIssues, setOnlyIssues] = useState(false);
  const [folded, setFolded] = useState<ReadonlySet<string>>(new Set());
  if (form === null) {
    return <div class="ekphrasis-outline-empty">No form is open.</div>;
  }
  const entries = buildOutline(form.model, IssueIndex.of(form.model, form.report.issues));
  const shown = onlyIssues ? restrictToIssues(entries) : entries;
  const toggleFold = (uid: string): void => {
    const next = new Set(folded);
    if (!next.delete(uid)) next.add(uid);
    setFolded(next);
  };
  const matches = searchOutline(entries, query);
  return (
    <div class="ekphrasis-outline">
      <div class="ekphrasis-outline-toolbar">
        <div class="ekphrasis-outline-actions">
          <ActionButton label="Collapse all" onClick={() => setFolded(sectionUids(entries))}>
            <path d="m7 20 5-5 5 5" />
            <path d="m7 4 5 5 5-5" />
          </ActionButton>
          <ActionButton label="Expand all" onClick={() => setFolded(new Set())}>
            <path d="m7 15 5 5 5-5" />
            <path d="m7 9 5-5 5 5" />
          </ActionButton>
        </div>
        <div class="search-input-container ekphrasis-outline-search-container">
          <input
            type="search"
            class="ekphrasis-outline-search"
            placeholder="Search the fields"
            aria-label="Search the fields"
            value={query}
            onInput={(event) => setQuery(event.currentTarget.value)}
            onKeyDown={(event) => {
              const [first] = matches;
              if (event.key === "Enter" && first !== undefined) onReveal(first.entry.path, true);
            }}
          />
          {query !== "" && (
            <div
              class="search-input-clear-button ekphrasis-outline-clear"
              role="button"
              aria-label="Clear the search"
              // The search field keeps the focus, so the author types the next query at once.
              onMouseDown={(event) => event.preventDefault()}
              onClick={(event) => {
                setQuery("");
                event.currentTarget.parentElement?.querySelector("input")?.focus();
              }}
            />
          )}
        </div>
        <label class="ekphrasis-outline-toggle">
          <input
            type="checkbox"
            checked={onlyIssues}
            onChange={(event) => setOnlyIssues(event.currentTarget.checked)}
          />
          Only entries with issues
        </label>
      </div>
      {query.trim() === "" ? (
        <EntryList
          entries={shown}
          focusedId={focusedId}
          folded={folded}
          onToggle={toggleFold}
          onReveal={(path) => onReveal(path, false)}
        />
      ) : (
        <SearchResults matches={matches} onChoose={(path) => onReveal(path, true)} />
      )}
      {onlyIssues && query.trim() === "" && shown.length === 0 && (
        <div class="ekphrasis-outline-empty">No entry holds an issue.</div>
      )}
    </div>
  );
}

function EntryList({
  entries,
  focusedId,
  folded,
  onToggle,
  onReveal,
}: {
  readonly entries: readonly OutlineEntry[];
  readonly focusedId: string | null;
  readonly folded: ReadonlySet<string>;
  readonly onToggle: (uid: string) => void;
  readonly onReveal: (path: YamlPath) => void;
}): JSX.Element {
  return (
    <ul class="ekphrasis-outline-list">
      {entries.map((entry) => {
        const isFolded = folded.has(entry.uid);
        const foldable = entry.section && entry.children.length > 0;
        return (
          <li
            key={entry.uid}
            class="ekphrasis-outline-item"
            data-path={entry.id}
            data-folded={isFolded ? true : undefined}
          >
            <div
              class="ekphrasis-outline-entry"
              data-focused={entry.id === focusedId ? true : undefined}
              data-issue={entry.mark ?? undefined}
            >
              {foldable ? (
                <button
                  type="button"
                  class="ekphrasis-outline-fold"
                  aria-expanded={!isFolded}
                  aria-label={isFolded ? `Expand ${entry.name}` : `Collapse ${entry.name}`}
                  onClick={() => onToggle(entry.uid)}
                >
                  {isFolded ? "▸" : "▾"}
                </button>
              ) : (
                <span class="ekphrasis-outline-fold" aria-hidden="true" />
              )}
              <button
                type="button"
                class="ekphrasis-outline-name"
                onClick={() => onReveal(entry.path)}
              >
                {entry.name}
              </button>
              {entry.mark !== null && (
                <span
                  class={`ekphrasis-outline-mark mod-${entry.mark}`}
                  aria-label={MARK_LABELS[entry.mark]}
                  title={MARK_LABELS[entry.mark]}
                />
              )}
              {entry.section && entry.issueCount > 0 && (
                <span class="ekphrasis-outline-count">{entry.issueCount}</span>
              )}
            </div>
            {foldable && !isFolded && (
              <EntryList
                entries={entry.children}
                focusedId={focusedId}
                folded={folded}
                onToggle={onToggle}
                onReveal={onReveal}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Identities of the entries of sections holding entries, at every depth of `entries`. */
function sectionUids(entries: readonly OutlineEntry[]): Set<string> {
  const uids = new Set<string>();
  const visit = (list: readonly OutlineEntry[]): void => {
    for (const entry of list) {
      if (entry.section && entry.children.length > 0) uids.add(entry.uid);
      visit(entry.children);
    }
  };
  visit(entries);
  return uids;
}

/**
 * Button of the top of the panel, drawn as an icon of the Lucide set whose paths are `children`,
 * in the style of the buttons of the core panels of Obsidian. The icon is inlined, so the panel
 * loads without Obsidian in unit tests.
 */
function ActionButton({
  label,
  onClick,
  children,
}: {
  readonly label: string;
  readonly onClick: () => void;
  readonly children: ComponentChildren;
}): JSX.Element {
  return (
    <button
      type="button"
      class="clickable-icon ekphrasis-outline-action"
      aria-label={label}
      onClick={onClick}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        {children}
      </svg>
    </button>
  );
}

const MARK_LABELS = {
  missing: "missing field",
  invalid: "invalid value",
  warning: "warning",
} as const;

function SearchResults({
  matches,
  onChoose,
}: {
  readonly matches: readonly OutlineMatch[];
  readonly onChoose: (path: YamlPath) => void;
}): JSX.Element {
  if (matches.length === 0) return <div class="ekphrasis-outline-empty">No field matches.</div>;
  return (
    <ul class="ekphrasis-outline-results">
      {matches.slice(0, MAX_RESULTS).map(({ entry, trail }) => (
        <li key={entry.uid}>
          <button
            type="button"
            class="ekphrasis-outline-result"
            data-path={entry.id}
            onClick={() => onChoose(entry.path)}
          >
            <span class="ekphrasis-outline-name">{entry.name}</span>
            {trail.length > 0 && <span class="ekphrasis-outline-trail">{trail.join(" › ")}</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}

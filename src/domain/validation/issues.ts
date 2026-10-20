/**
 * Issues of validation, and their placement in the form model.
 *
 * Each issue designates one node by its field path, names the checker that raised it, and
 * carries a severity and a message, as the feature note on validation specifies.
 */
import type { YamlPath } from "../model";
import { printFieldPath } from "../paths/field-path";
import type { Field, FormModel } from "../form/model";

export type Severity = "error" | "warning";

/** Message of a required field left unfilled, shared by every check that reports one. */
export const MISSING_MESSAGE = "This required field is missing.";

export interface Issue {
  readonly path: YamlPath;
  /** Printed field path, which matches the identifier of the field concerned. */
  readonly id: string;
  /** Name of the checker: a keyword of JSON Schema, or a checker named by `x-rules`. */
  readonly checker: string;
  readonly severity: Severity;
  /** Whether the issue reports a field left unfilled, as opposed to a filled field found invalid. */
  readonly missing: boolean;
  readonly message: string;
}

/**
 * Mark under which an issue displays: a missing field and an invalid value take different marks,
 * so an author can finish filling before correcting; a warning takes its own mark.
 */
export type IssueMark = "missing" | "invalid" | "warning";

export function markOf(item: Issue): IssueMark {
  if (item.severity === "warning") return "warning";
  return item.missing ? "missing" : "invalid";
}

/** Order in which the marks display: an invalid value first, then a missing field, then a warning. */
export const MARK_ORDER: readonly IssueMark[] = ["invalid", "missing", "warning"];

/** Mark under which a place holding `issues` displays, or `null` when it holds none. */
export function dominantMark(issues: readonly Issue[]): IssueMark | null {
  const marks = new Set(issues.map(markOf));
  return MARK_ORDER.find((mark) => marks.has(mark)) ?? null;
}

/** Builds an issue, printing its path. */
export function issue(
  path: YamlPath,
  checker: string,
  message: string,
  options: { readonly severity?: Severity; readonly missing?: boolean } = {},
): Issue {
  return {
    path,
    id: printFieldPath(path),
    checker,
    severity: options.severity ?? "error",
    missing: options.missing ?? false,
    message,
  };
}

/** Field or key outside the schema at which issues display. */
export interface IssuePlace {
  readonly id: string;
  readonly path: YamlPath;
}

/**
 * Issues of one instance, indexed for display: at the field or the key outside the schema that
 * each one designates, and else at the top of the form. The root has no row of its own, so its
 * issues display at the top as well.
 */
export class IssueIndex {
  private readonly byPlace = new Map<string, Issue[]>();
  readonly unplaced: readonly Issue[];

  constructor(
    readonly issues: readonly Issue[],
    places: ReadonlySet<string>,
  ) {
    const unplaced: Issue[] = [];
    for (const item of issues) {
      if (item.path.length > 0 && places.has(item.id)) {
        const list = this.byPlace.get(item.id) ?? [];
        list.push(item);
        this.byPlace.set(item.id, list);
      } else {
        unplaced.push(item);
      }
    }
    this.unplaced = unplaced;
  }

  /** Index of `issues` over the fields and the keys outside the schema of `model`. */
  static of(model: FormModel, issues: readonly Issue[]): IssueIndex {
    return new IssueIndex(issues, placesOf(model.root));
  }

  /** Issues displayed at the field or the key of identifier `id`. */
  at(id: string): readonly Issue[] {
    return this.byPlace.get(id) ?? [];
  }

  /** Number of issues at `path` or below it, wherever they display. */
  countWithin(path: YamlPath): number {
    return this.issues.filter((item) => startsWith(item.path, path)).length;
  }

  /**
   * Identifiers of the places holding an issue of each mark, each listed once per mark, in the
   * order of the issues. A place holding issues of two marks is listed under both.
   */
  placesByMark(): Readonly<Record<IssueMark, readonly IssuePlace[]>> {
    const places: Record<IssueMark, IssuePlace[]> = { missing: [], invalid: [], warning: [] };
    for (const item of this.issues) {
      const list = places[markOf(item)];
      if (this.byPlace.has(item.id) && !list.some(({ id }) => id === item.id)) {
        list.push({ id: item.id, path: item.path });
      }
    }
    return places;
  }

  /** Number of issues under each mark. */
  get counts(): Readonly<Record<IssueMark, number>> {
    const counts = { missing: 0, invalid: 0, warning: 0 };
    for (const item of this.issues) counts[markOf(item)] += 1;
    return counts;
  }
}

/** Identifiers of the fields and of the keys outside the schema under `field`, `field` included. */
function placesOf(field: Field, into = new Set<string>()): Set<string> {
  into.add(field.id);
  if ("children" in field) {
    for (const child of field.children) placesOf(child, into);
    for (const entry of field.extraEntries) into.add(entry.id);
  } else if ("items" in field) {
    for (const item of field.items) placesOf(item, into);
  }
  return into;
}

/** Whether `path` equals `prefix` or lies below it. */
export function startsWith(path: YamlPath, prefix: YamlPath): boolean {
  return prefix.length <= path.length && prefix.every((segment, index) => path[index] === segment);
}

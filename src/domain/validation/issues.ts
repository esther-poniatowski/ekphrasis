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

  get errors(): number {
    return this.issues.filter((item) => item.severity === "error").length;
  }

  get warnings(): number {
    return this.issues.filter((item) => item.severity === "warning").length;
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

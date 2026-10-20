/**
 * Guidance carried by the comments and the placeholders of a commented YAML template, such as a
 * template of gnomon, and the part of it that a form misses.
 *
 * A template guides its author in three ways, each of which the form must carry:
 *
 * - a comment listing values separated by ` | `, such as `# posed | refined | answered`, lists the
 *   admitted values: the field, or the entries or items of the field, must admit each of them,
 *   the unfilled values excepted;
 * - any other comment instructs: the field must carry instructions, its keyword `description`.
 *   A comment listing values and adding text, such as `# a | b; only where …`, needs both;
 * - a placeholder, a string holding a word in uppercase such as `SYMBOL` or `system.TOPIC`, shows
 *   the form of the value: the field must carry an example, its keyword `examples`.
 *
 * The comments before the first key instruct the record as a whole, so the root must carry
 * instructions. Each key of the template must be a field of the form, since an author filling the
 * form never sees a key outside the schema.
 */
import { isMap, isScalar, isSeq, parseDocument, type Node } from "yaml";
import {
  buildFormModel,
  fieldChain,
  printFieldPath,
  UnfilledValues,
  type Field,
  type FormModel,
  type SchemaSet,
  type YamlPath,
} from "../../src/domain";
import { YamlDocumentParser } from "../../src/infrastructure";

/** Guidance of the template that the form misses at one key path. */
export interface GuidanceGap {
  readonly path: string;
  readonly missing: "field" | "instructions" | "admitted values" | "example";
  readonly detail: string;
}

/** Guidance written at one place of the template. */
interface TemplateGuidance {
  readonly path: YamlPath;
  readonly comment: string | null;
  readonly placeholder: string | null;
}

const PLACEHOLDER = /\b[A-Z]{3,}\b/;

/**
 * Values listed in `comment`: each word before or after the separator ` | `, an explanation in
 * parentheses after a value excepted, as in `constitutive (the product test applies it) | …`.
 */
export function listedValues(comment: string): string[] {
  const values: string[] = [];
  const pattern = /([\w.-]+)(?:\s*\([^)]*\))?(?=\s*\|)|(?<=\|\s*)([\w.-]+)/g;
  for (const match of comment.matchAll(pattern)) {
    const value = match[1] ?? match[2];
    if (value !== undefined && !values.includes(value)) values.push(value);
  }
  return values;
}

/** Whether `comment` holds words besides its list of values, which instruct the author. */
function instructs(comment: string): boolean {
  const remainder = comment
    .replace(/[\w.-]+(?:\s*\([^)]*\))?(?:\s*\|\s*[\w.-]+(?:\s*\([^)]*\))?)+/, "")
    .replace(/[^a-z\s]/gi, " ");
  return remainder.split(/\s+/).filter((word) => word.length > 2).length >= 2;
}

/** Guidance of `template`, at each key and item, in the order of the text. */
function guidanceOf(template: string): { header: string | null; places: TemplateGuidance[] } {
  const document = parseDocument(template);
  const places: TemplateGuidance[] = [];
  const visit = (node: Node | null | undefined, path: YamlPath): void => {
    if (isMap(node)) {
      for (const pair of node.items) {
        const key = isScalar(pair.key) ? String(pair.key.value) : String(pair.key);
        const value = pair.value as Node | null;
        const childPath = [...path, key];
        const comment = isScalar(value)
          ? (value.comment ?? null)
          : value === null
            ? null
            : (value.commentBefore ?? null);
        places.push({
          path: childPath,
          comment: comment?.trim() ?? null,
          placeholder: placeholderOf(value),
        });
        visit(value, childPath);
      }
    } else if (isSeq(node)) {
      node.items.forEach((item, index) => {
        const itemPath = [...path, index];
        if (isScalar(item)) {
          places.push({ path: itemPath, comment: null, placeholder: placeholderOf(item) });
        }
        visit(item as Node, itemPath);
      });
    }
  };
  visit(document.contents, []);
  return { header: document.commentBefore?.trim() ?? null, places };
}

function placeholderOf(node: Node | null): string | null {
  if (!isScalar(node) || typeof node.value !== "string") return null;
  return PLACEHOLDER.test(node.value) ? node.value : null;
}

/**
 * Admitted values of `field`: its options, else those of its entries, read from the template of
 * a new entry or from an entry of kind `choice`, else those of its items.
 */
function admittedValues(field: Field): readonly unknown[] {
  if ("options" in field && field.kind === "choice") return field.options.map(({ value }) => value);
  if ("children" in field) {
    const entry = field.entryTemplate ?? field.children.find((child) => child.kind === "choice");
    return entry === undefined ? [] : admittedValues(entry);
  }
  if ("items" in field && field.next !== null) return admittedValues(field.next);
  return [];
}

/** Whether `field` instructs its author: by its instructions, or by a description per option. */
function hasInstructions(field: Field): boolean {
  if (field.description !== null) return true;
  return (
    "options" in field &&
    field.options.length > 0 &&
    field.options.every((option) => option.description !== null)
  );
}

/**
 * Guidance of `template` that the form of `schemas` misses, the form being built on the text of
 * the template itself. With `header`, the comments before the first key require instructions at
 * the root.
 */
export function guidanceGaps(
  schemas: SchemaSet,
  template: string,
  options: { readonly header: boolean } = { header: true },
): GuidanceGap[] {
  const parser = new YamlDocumentParser();
  const model: FormModel = buildFormModel(schemas, parser.parse(template), template);
  const unfilled = new UnfilledValues(model.unfilled);
  const { header, places } = guidanceOf(template);
  const gaps: GuidanceGap[] = [];
  if (options.header && header !== null && model.root.description === null) {
    gaps.push({ path: "(root)", missing: "instructions", detail: header });
  }
  for (const { path, comment, placeholder } of places) {
    const id = printFieldPath(path);
    const field = fieldChain(model.root, path)?.at(-1);
    if (field === undefined) {
      gaps.push({ path: id, missing: "field", detail: "no field of the form holds this key" });
      continue;
    }
    if (comment !== null) {
      const listed = listedValues(comment).filter((value) => !unfilled.has(value));
      if (listed.length > 0) {
        const admitted = admittedValues(field);
        const absent = listed.filter((value) => !admitted.includes(value));
        if (absent.length > 0) {
          gaps.push({ path: id, missing: "admitted values", detail: absent.join(", ") });
        }
      }
      if ((listed.length === 0 || instructs(comment)) && !hasInstructions(field)) {
        gaps.push({ path: id, missing: "instructions", detail: comment });
      }
    }
    if (placeholder !== null && field.examples.length === 0) {
      gaps.push({ path: id, missing: "example", detail: placeholder });
    }
  }
  return gaps;
}

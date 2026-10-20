/**
 * Text of a value written by an insertion: a key with its value on block lines, an item of a
 * block sequence, or a value written inside a flow collection.
 *
 * A new value is a tree of the domain model without source ranges. The scalars of the tree are
 * written in the style that the domain selects for a new value, at their position; the YAML
 * writer of the infrastructure produces the text of each scalar.
 */
import type { MappingEntry, ScalarNode, ScalarStyle, ScalarValue, YamlNode } from "../model";
import {
  isQuotedStyle,
  selectScalarStyle,
  textOfValue,
  type ScalarContext,
  type WrittenValue,
} from "./scalar-style";
import { INDENT_STEP, scalarPart, type ScalarText, type TextPart } from "./source-edit";

// --- New values ----------------------------------------------------------------------------------

/**
 * New scalar holding `value`. Its style `plain` stands for the style selected from the content of
 * the value; a quoted style, assigned by the siblings of the scalar, is kept when it represents
 * the value.
 */
export const newScalar = (value: ScalarValue): YamlNode => ({
  kind: "scalar",
  value,
  style: "plain",
  range: null,
});

export const newMapping = (entries: readonly (readonly [string, YamlNode])[]): YamlNode => ({
  kind: "mapping",
  flow: false,
  range: null,
  entries: entries.map(([key, value]): MappingEntry => ({ key, keyRange: null, value })),
});

export const newSequence = (items: readonly YamlNode[]): YamlNode => ({
  kind: "sequence",
  flow: false,
  range: null,
  items,
});

/**
 * Value written at the end of the path `segments` below an existing node: each key opens a
 * mapping, and each position a sequence, holding `leaf` at the end.
 */
export function nestedValue(segments: readonly (string | number)[], leaf: YamlNode): YamlNode {
  return segments.reduceRight<YamlNode>(
    (value, segment) =>
      typeof segment === "number" ? newSequence([value]) : newMapping([[segment, value]]),
    leaf,
  );
}

/** Text of a scalar written in the style selected for `value` at `context`. */
export function scalarText(
  value: WrittenValue,
  context: ScalarContext,
  current: ScalarStyle | null,
  indent: number,
): ScalarText {
  return {
    text: textOfValue(value),
    style: selectScalarStyle(value, context, current),
    context,
    indent,
  };
}

const isBlockStyle = (style: ScalarStyle): boolean => style === "literal" || style === "folded";

/** Style that the new scalar `node` keeps when it represents the value: its quoted style. */
const keptStyle = (node: ScalarNode): ScalarStyle | null =>
  isQuotedStyle(node.style) ? node.style : null;

/** Text of the null value inside a flow collection, where no empty value can stand. */
const FLOW_NULL: ScalarText = { text: "null", style: "plain", context: "flow", indent: 0 };

// --- Block lines ---------------------------------------------------------------------------------

/**
 * Lines of the key `key` holding `value`, the key indented by `indent`. The lines end with a line
 * break. The first line is not indented when `indentFirst` is false, since its insertion point
 * already follows an indentation. A nested mapping or sequence is indented one step further,
 * unless it is marked `flow`; an empty one is written `{}` or `[]`, and the null value as an
 * empty value after the colon.
 */
export function entryLines(
  key: string,
  value: YamlNode,
  indent: number,
  indentFirst: boolean,
): TextPart[] {
  const parts: TextPart[] = indentFirst ? [" ".repeat(indent)] : [];
  parts.push(scalarPart(scalarText(key, "key", null, indent)), ":");
  return [...parts, ...valueAfter(value, indent, "after-key")];
}

/**
 * Lines of an item of a block sequence holding `value`, its indicator `-` at the column `indent`.
 * A mapping item writes its first key on the line of the indicator, and its other keys aligned
 * under the first.
 */
export function itemLines(value: YamlNode, indent: number, indentFirst: boolean): TextPart[] {
  const parts: TextPart[] = indentFirst ? [" ".repeat(indent), "-"] : ["-"];
  return [...parts, ...valueAfter(value, indent, "block")];
}

/**
 * Text after a key or an item indicator at the column `indent`: the value and its lines. A
 * collection marked `flow` is written on the line of its key, between brackets or braces.
 */
function valueAfter(value: YamlNode, indent: number, context: "after-key" | "block"): TextPart[] {
  const nested = indent + INDENT_STEP;
  if ((value.kind === "mapping" || value.kind === "sequence") && value.flow) {
    return [" ", ...flowText(value), "\n"];
  }
  switch (value.kind) {
    case "scalar": {
      if (value.value === null) return ["\n"];
      // The writer indents the lines of a block scalar after a key one step beyond the key; an
      // item scalar receives the column of its content directly.
      const column = context === "block" ? nested : indent;
      const scalar = scalarText(value.value, context, keptStyle(value), column);
      return [" ", scalarPart(scalar), ...(isBlockStyle(scalar.style) ? [] : ["\n"])];
    }
    case "mapping": {
      if (value.entries.length === 0) return [" {}\n"];
      if (context === "after-key") {
        return ["\n", ...value.entries.flatMap((e) => entryLines(e.key, e.value, nested, true))];
      }
      return [
        " ",
        ...value.entries.flatMap((e, index) => entryLines(e.key, e.value, nested, index > 0)),
      ];
    }
    case "sequence": {
      if (value.items.length === 0) return [" []\n"];
      if (context === "after-key") {
        return ["\n", ...value.items.flatMap((item) => itemLines(item, nested, true))];
      }
      return [" ", ...value.items.flatMap((item, index) => itemLines(item, nested, index > 0))];
    }
    case "alias":
      return ["\n"];
  }
}

// --- Flow form -----------------------------------------------------------------------------------

/**
 * Text of `value` inside a flow collection, on one line: `{key: value, …}` for a mapping,
 * `[item, …]` for a sequence, and `null` for the null value.
 */
export function flowText(value: YamlNode): TextPart[] {
  switch (value.kind) {
    case "scalar":
      return value.value === null
        ? [scalarPart(FLOW_NULL)]
        : [scalarPart(scalarText(value.value, "flow", keptStyle(value), 0))];
    case "mapping":
      return [
        "{",
        ...joined(
          value.entries.map((entry) => [
            scalarPart(scalarText(entry.key, "flow", null, 0)),
            ": ",
            ...flowText(entry.value),
          ]),
        ),
        "}",
      ];
    case "sequence":
      return ["[", ...joined(value.items.map(flowText)), "]"];
    case "alias":
      return [scalarPart(FLOW_NULL)];
  }
}

/** Text of the null value in a flow collection, for a cleared item. */
export const flowNull = (): ScalarText => FLOW_NULL;

function joined(parts: readonly TextPart[][]): TextPart[] {
  return parts.flatMap((part, index) => (index === 0 ? part : [", ", ...part]));
}

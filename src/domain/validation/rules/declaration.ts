/**
 * Rule declarations of the keyword `x-rules`, and the interface of the checkers that run them.
 *
 * A declaration names its checker under the key `check`, may set the keys `severity` and
 * `message`, and passes every other key to the checker as an argument. A checker reads its
 * arguments when it binds a declaration, so a malformed declaration is reported once, before the
 * rule runs on any field.
 */
import { EkphrasisError } from "../../../errors";
import type { YamlPath } from "../../model";
import { FieldPathError, parseFieldPath, type PatternSegment } from "../../paths/field-path";
import { isJsonObject, type JsonObject, type JsonValue } from "../../schema/json";
import type { InstanceData } from "../instance-data";
import type { Severity } from "../issues";

/** Raised when a rule declaration is malformed; the message names the defect. */
export class RuleDeclarationError extends EkphrasisError {
  override name = "RuleDeclarationError";
}

/** Capabilities of the host that a checker may need, such as rendering a formula. */
export interface CheckerEnvironment {
  /**
   * Error raised by rendering the LaTeX formula `source`, or `null` when it renders, or when no
   * renderer is available.
   */
  formulaError(source: string): string | null;
}

/** Environment without host capabilities, under which the checker `latex` reports nothing. */
export const NO_HOST: CheckerEnvironment = { formulaError: () => null };

/** What a bound rule reads: the field that declares it, the instance, and the host. */
export interface RuleContext {
  /** Path of the field that declares the rule, from which its field paths start. */
  readonly base: YamlPath;
  readonly data: InstanceData;
  readonly environment: CheckerEnvironment;
}

/** Failure found by a rule, at one node. */
export interface Finding {
  readonly path: YamlPath;
  readonly message: string;
  /** Whether the finding reports a field left unfilled. */
  readonly missing?: boolean;
}

/**
 * State that a conditional rule imposes on one field under the current values of the instance:
 * the field must be filled, or must stay unfilled, whether or not it currently complies.
 */
export interface Constraint {
  readonly path: YamlPath;
  readonly effect: "required" | "forbidden";
  /** Statement of the condition that holds, such as "`aim` equals `description`". */
  readonly condition: string;
}

/**
 * A rule with its arguments read, ready to run on any field that declares it. A conditional rule
 * also states the constraints that hold under the current values, so the form can reflect them
 * before any issue arises.
 */
export type BoundRule = ((context: RuleContext) => readonly Finding[]) & {
  readonly constraints?: (context: RuleContext) => readonly Constraint[];
};

export interface Checker {
  readonly name: string;
  /** @throws RuleDeclarationError When the arguments do not suit the checker. */
  bind(args: RuleArguments): BoundRule;
}

/** A field path written in a rule, with its text kept for the messages. */
export interface RulePath {
  readonly text: string;
  readonly segments: readonly PatternSegment[];
}

/** A rule declaration whose common keys are read. */
export interface RuleDeclaration {
  readonly check: string;
  readonly severity: Severity;
  readonly message: string | null;
  readonly args: RuleArguments;
}

/** Keys common to every declaration, never passed to a checker. */
const COMMON_KEYS = new Set(["check", "severity", "message"]);

/** @throws RuleDeclarationError When the common keys of the declaration are malformed. */
export function parseDeclaration(raw: JsonValue): RuleDeclaration {
  if (!isJsonObject(raw)) {
    throw new RuleDeclarationError("A rule declaration must be a mapping.");
  }
  const check = raw["check"];
  if (typeof check !== "string") {
    throw new RuleDeclarationError(
      "A rule declaration must name its checker under the key `check`.",
    );
  }
  const severity = raw["severity"] ?? "error";
  if (severity !== "error" && severity !== "warning") {
    throw new RuleDeclarationError(
      `The rule \`${check}\` sets the key \`severity\` to a value other than \`error\` or \`warning\`.`,
    );
  }
  const message = raw["message"] ?? null;
  if (message !== null && typeof message !== "string") {
    throw new RuleDeclarationError(
      `The rule \`${check}\` sets the key \`message\` to a non-text value.`,
    );
  }
  const args = Object.fromEntries(Object.entries(raw).filter(([key]) => !COMMON_KEYS.has(key)));
  return { check, severity, message, args: new RuleArguments(check, args) };
}

/** Arguments of one declaration, read by its checker; every argument must be read. */
export class RuleArguments {
  private readonly read = new Set<string>();

  constructor(
    /** Name of the checker, cited by the messages. */
    readonly check: string,
    private readonly values: JsonObject,
  ) {}

  /** Raw value of the argument `name`, or `undefined` when it is absent. */
  value(name: string): JsonValue | undefined {
    this.read.add(name);
    return this.values[name];
  }

  number(name: string): number | null {
    const value = this.value(name);
    if (value === undefined) return null;
    if (typeof value !== "number") this.fail(`its argument \`${name}\` must be a number`);
    return value;
  }

  string(name: string): string | null {
    const value = this.value(name);
    if (value === undefined) return null;
    if (typeof value !== "string") this.fail(`its argument \`${name}\` must be a text`);
    return value;
  }

  /** Field path of the argument `name`, or `null` when it is absent. */
  path(name: string): RulePath | null {
    const text = this.string(name);
    if (text === null) return null;
    try {
      return { text, segments: parseFieldPath(text) };
    } catch (error) {
      if (error instanceof FieldPathError) {
        this.fail(`its argument \`${name}\`: ${error.message.replace(/\.$/, "")}`);
      }
      throw error;
    }
  }

  /** Field path of the argument `name`, which must be present. */
  requiredPath(name: string): RulePath {
    return this.path(name) ?? this.fail(`it requires the argument \`${name}\``);
  }

  /** Mapping of the argument `name`, which must be present. */
  mapping(name: string): RuleArguments {
    const value = this.value(name);
    if (!isJsonObject(value)) return this.fail(`its argument \`${name}\` must be a mapping`);
    return new RuleArguments(this.check, value);
  }

  /** @throws RuleDeclarationError When an argument was never read. */
  finish(): void {
    const unknown = Object.keys(this.values).filter((name) => !this.read.has(name));
    if (unknown.length > 0) {
      this.fail(`it admits no argument ${unknown.map((name) => `\`${name}\``).join(", ")}`);
    }
  }

  fail(reason: string): never {
    throw new RuleDeclarationError(`The rule \`${this.check}\` is malformed: ${reason}.`);
  }
}

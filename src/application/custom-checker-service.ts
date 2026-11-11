/**
 * Application orchestration of the custom checkers of a form model. The service keeps project
 * code behind the runner port: schemas select registered names by their rule declarations, and
 * the settings select instance checkers by the schema of an instance, while the adapter supplies
 * the current runner, the reason it is missing, and the instance path for the local machine.
 */
import {
  FieldPathError,
  fieldChain,
  GlobPattern,
  InstanceData,
  UnfilledValues,
  isJsonObject,
  isJsonPointer,
  issue,
  locateFinding,
  pathOfPointer,
  parseDeclaration,
  parseFieldPath,
  type Field,
  type FormModel,
  type Issue,
  type IssueOrigin,
  type JsonObject,
  type JsonValue,
  type RuleDeclaration,
  type Severity,
  type YamlNode,
  type YamlPath,
} from "../domain";
import type {
  CheckerContext,
  CustomCheckerContext,
  CustomCheckerIssue,
  CustomCheckerItem,
  CustomCheckerRegistration,
  CustomCheckerRunner,
  LocatedCheckerIssue,
} from "./protocols";

/** Issues and non-issue context produced by the custom checkers of one validation. */
export interface CustomValidationReport {
  readonly issues: readonly Issue[];
  readonly contexts: readonly CheckerContext[];
}

/** Keys interpreted by every rule declaration rather than passed to its checker. */
const COMMON_RULE_KEYS = new Set(["check", "severity", "message"]);

/** Reason given when the adapter supplies none: the machine has no checker runner. */
const NO_RUNNER = "Python checkers are unavailable";

/** Where the issues of one call display, and what a rule declaration fixes for them. */
interface Placement {
  readonly checker: string;
  /** Field that declares the rule, or the root for an instance checker. */
  readonly declaringPath: YamlPath;
  /** Severity of a returned string, of a failed call, and of every issue when fixed. */
  readonly severity: Severity;
  /** Whether the declaration states a severity, which then overrides the returned ones. */
  readonly severityFixed: boolean;
  /** Message of the declaration, which replaces every returned message. */
  readonly message: string | null;
}

export class CustomCheckerService {
  constructor(
    private readonly registrations: () => readonly CustomCheckerRegistration[],
    private readonly runner: () => CustomCheckerRunner | null,
    private readonly resolveFile: (vaultPath: string) => string,
    private readonly unavailableReason: () => string = () => NO_RUNNER,
  ) {}

  /** Names that built-in validation must recognize as externally implemented rules. */
  get checkerNames(): ReadonlySet<string> {
    return new Set(this.registrations().map(({ name }) => name));
  }

  /**
   * Run every registered custom rule declared by a filled field, in declaration order, then every
   * instance checker whose schema patterns match `schema`, the reference binding the instance.
   */
  async validate(
    path: string,
    model: FormModel,
    tree: YamlNode,
    schema = "",
  ): Promise<readonly Issue[]> {
    return (await this.validateReport(path, model, tree, schema)).issues;
  }

  /** Run custom validation and keep its non-issue context beside its issues. */
  async validateReport(
    path: string,
    model: FormModel,
    tree: YamlNode,
    schema = "",
  ): Promise<CustomValidationReport> {
    const registrations = this.registrations();
    if (registrations.length === 0) return { issues: [], contexts: [] };
    const registered = this.checkerNames;
    const data = InstanceData.fromTree(tree, new UnfilledValues(model.unfilled));
    const calls: Promise<CustomValidationReport>[] = [];
    this.visit(model.root, (field, raw) => {
      let declaration: RuleDeclaration;
      try {
        declaration = parseDeclaration(raw);
      } catch {
        // Built-in validation owns malformed-declaration diagnostics.
        return;
      }
      if (!registered.has(declaration.check) || !data.isFilled(field.path)) return;
      const placement: Placement = {
        checker: declaration.check,
        declaringPath: field.path,
        severity: declaration.severity,
        severityFixed: isJsonObject(raw) && raw["severity"] !== undefined,
        message: declaration.message,
      };
      const input = { value: data.at(field.path) ?? null, path: field.id, args: argumentsOf(raw) };
      calls.push(this.run(placement, input, model.root, data, path));
    });
    if (data.isFilled([])) {
      for (const registration of registrations) {
        if (!selects(registration, schema)) continue;
        const placement: Placement = {
          checker: registration.name,
          declaringPath: [],
          severity: "error",
          severityFixed: false,
          message: null,
        };
        const input = { value: data.value, path: "", args: registration.arguments ?? {} };
        calls.push(this.run(placement, input, model.root, data, path));
      }
    }
    const reports = await Promise.all(calls);
    return {
      issues: reports.flatMap(({ issues }) => issues),
      contexts: reports.flatMap(({ contexts }) => contexts),
    };
  }

  private async run(
    placement: Placement,
    input: { readonly value: JsonValue; readonly path: string; readonly args: JsonObject },
    root: Field,
    data: InstanceData,
    path: string,
  ): Promise<CustomValidationReport> {
    const runner = this.runner();
    if (runner === null) {
      return {
        issues: [
          issue(
            placement.declaringPath,
            placement.checker,
            `The custom checker \`${placement.checker}\` did not run because ${this.unavailableReason()}.`,
            { severity: "warning" },
          ),
        ],
        contexts: [],
      };
    }
    try {
      const returned = await runner.call({
        checker: placement.checker,
        value: input.value,
        instance: data.value,
        path: input.path,
        file: this.resolveFile(path),
        arguments: input.args,
      });
      return {
        issues: returned
          .filter((item): item is CustomCheckerIssue => !isContext(item))
          .map((item) => convert(item, placement, root, data)),
        contexts: returned.filter(isContext).map((item) => contextOf(item, placement.checker)),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        issues: [
          issue(placement.declaringPath, placement.checker, placement.message ?? message, {
            severity: placement.severity,
          }),
        ],
        contexts: [],
      };
    }
  }

  private visit(field: Field, receive: (field: Field, rule: JsonValue) => void): void {
    for (const rule of field.rules) receive(field, rule);
    const children = "children" in field ? field.children : "items" in field ? field.items : [];
    for (const child of children) this.visit(child, receive);
  }
}

/** Whether one returned item supplies checker context instead of reporting an issue. */
function isContext(item: CustomCheckerItem): item is CustomCheckerContext {
  return typeof item !== "string" && "kind" in item && item.kind === "context";
}

/** Context of one checker in the naming convention of the application layer. */
function contextOf(item: CustomCheckerContext, checker: string): CheckerContext {
  return {
    checker,
    label: item.label,
    value: item.value,
    ...(item.description === undefined ? {} : { description: item.description }),
    ...(item.result_class === undefined ? {} : { resultClass: item.result_class }),
    ...(item.documentation_target === undefined
      ? {}
      : { documentationTarget: item.documentation_target }),
  };
}

/** Whether `registration` checks the instances bound by the schema reference `schema`. */
function selects(registration: CustomCheckerRegistration, schema: string): boolean {
  if (schema === "") return false;
  return (registration.schemas ?? []).some((pattern) => new GlobPattern(pattern).matches(schema));
}

/**
 * Issue of one returned item. A string stays at the declaring field. A located item takes its own
 * place: a field path, or a JSON Pointer refined by its discriminator; an item whose location is
 * no JSON Pointer stays at the root, with that location kept in its origin. An error at a field of
 * the form left unfilled reports a missing field, as for the built-in checks; at a path designating
 * no field, it reports an invalid value.
 */
function convert(
  returned: CustomCheckerIssue,
  placement: Placement,
  root: Field,
  data: InstanceData,
): Issue {
  if (typeof returned === "string") {
    return issue(placement.declaringPath, placement.checker, placement.message ?? returned, {
      severity: placement.severity,
    });
  }
  let path: YamlPath;
  try {
    path = locationOf(returned, root, data.value);
  } catch (error) {
    if (!(error instanceof FieldPathError)) throw error;
    return issue(placement.declaringPath, placement.checker, error.message, {
      severity: placement.severity,
    });
  }
  const severity = placement.severityFixed ? placement.severity : returned.severity;
  const origin = originOf(returned);
  const controlledBy = controllingDecisionOf(returned, root, data.value);
  const unfilledField = path.length > 0 && fieldChain(root, path) !== null && !data.isFilled(path);
  return issue(path, placement.checker, placement.message ?? returned.message, {
    severity,
    missing: severity === "error" && unfilledField,
    ...(controlledBy === undefined ? {} : { controlledBy }),
    ...(origin === null ? {} : { origin }),
  });
}

/** Existing form field whose value or presence activates `returned`, when the checker names one. */
function controllingDecisionOf(
  returned: LocatedCheckerIssue,
  root: Field,
  instance: JsonValue,
): YamlPath | undefined {
  if (returned.controlled_by === undefined || !isJsonPointer(returned.controlled_by)) {
    return undefined;
  }
  const path = pathOfPointer(returned.controlled_by, instance);
  return path.length > 0 && fieldChain(root, path) !== null ? path : undefined;
}

/** Field path at which a located item displays. */
function locationOf(returned: LocatedCheckerIssue, root: Field, instance: JsonValue): YamlPath {
  if (returned.path !== undefined) return concretePath(returned.path);
  if (returned.pointer !== undefined && isJsonPointer(returned.pointer)) {
    return locateFinding(root, instance, returned.pointer, returned.discriminator ?? "");
  }
  return [];
}

/** Classification, guidance and original location of a located item, or `null` without any. */
function originOf(returned: LocatedCheckerIssue): IssueOrigin | null {
  const origin: IssueOrigin = {
    ...(returned.rule === undefined ? {} : { rule: returned.rule }),
    ...(returned.result_class === undefined ? {} : { resultClass: returned.result_class }),
    ...(returned.repair_condition === undefined
      ? {}
      : { repairCondition: returned.repair_condition }),
    ...(returned.documentation_target === undefined
      ? {}
      : { documentationTarget: returned.documentation_target }),
    ...(returned.source_file === undefined ? {} : { sourceFile: returned.source_file }),
    ...((returned.locus ?? returned.pointer) === undefined
      ? {}
      : { locus: returned.locus ?? returned.pointer }),
    ...(returned.discriminator === undefined ? {} : { discriminator: returned.discriminator }),
  };
  return Object.keys(origin).length === 0 ? null : origin;
}

/** Checker-specific arguments of a declaration already validated by `parseDeclaration`. */
function argumentsOf(raw: JsonValue): JsonObject {
  if (!isJsonObject(raw)) return {};
  return Object.fromEntries(Object.entries(raw).filter(([key]) => !COMMON_RULE_KEYS.has(key)));
}

/** Parse a returned issue path, rejecting wildcards because an issue designates one node. */
function concretePath(text: string): YamlPath {
  const path = parseFieldPath(text);
  if (path.some((segment) => typeof segment !== "string" && typeof segment !== "number")) {
    throw new FieldPathError(`Invalid field path \`${text}\`: an issue path admits no wildcard.`);
  }
  return path as YamlPath;
}

/**
 * Checks of the Python route used by configured project capabilities. Every configured command
 * requires the platform, interpreter file and interpreter start. Custom checkers additionally
 * require their registrations, schema patterns, imports, package data and one measured run.
 *
 * The run is made once, on the opened record, through the same Python code as a validation; the
 * diagnostic never repeats it to estimate a duration.
 */
import { GlobPattern, globDefect } from "../../domain";
import type { CustomCheckerRegistration, DocumentParser } from "../protocols";
import type { EkphrasisSettings } from "../settings";
import {
  commandTarget,
  expandPlaceholders,
  findingsArguments,
  isFindingsRoute,
  seconds,
} from "./checker-command";
import type { ImportResult, ImportTarget, ProbeOutcome, PythonProbe } from "./ports";
import { probeFailure } from "./probe-failure";
import type { OpenedRecord } from "./record-checks";
import { blocked, notPassed, passed, type CheckSubject, type DiagnosticCheck } from "./report";
import { measuredRun, REPORT_SUBJECT, type Usable } from "./run-checks";
import type { SchemaFacts } from "./schema-checks";

export interface CheckerCheckDependencies {
  readonly settings: EkphrasisSettings;
  /** Whether the host is the desktop app, the only one that runs Python. */
  readonly desktop: boolean;
  /** Probe of the interpreter; `null` where Python cannot run. */
  readonly probe: PythonProbe | null;
  readonly facts: SchemaFacts;
  readonly record: OpenedRecord | null;
  readonly parser: DocumentParser;
  /** Absolute path of a vault file, as the checkers receive it. */
  readonly resolveFile: (vaultPath: string) => string;
}

const SUBJECTS = {
  registrations: {
    id: "checker.registrations",
    consequence: "checks",
    dependency: "Registered custom checkers",
    affects: "the checkers concerned",
  },
  patterns: {
    id: "checker.patterns",
    consequence: "checks",
    dependency: "Schema patterns of instance checkers",
    affects: "the instance checkers concerned",
  },
  selection: {
    id: "checker.selection",
    consequence: "checks",
    dependency: "Schemas selected by instance checkers",
    affects: "the instance checkers concerned",
  },
  record: {
    id: "checker.record",
    consequence: "degraded",
    dependency: "Instance checkers of the opened record",
    affects: "custom checks of this record",
  },
  imports: {
    id: "checker.imports",
    consequence: "checks",
    dependency: "Modules imported by the checkers",
    affects: "the checkers concerned",
  },
  data: {
    id: "checker.package-data",
    consequence: "checks",
    dependency: "Data files of the imported packages",
    affects: "the checkers concerned",
  },
} as const satisfies Record<string, CheckSubject>;

interface RuntimeSubjects {
  readonly platform: CheckSubject;
  readonly interpreter: CheckSubject;
  readonly launch: CheckSubject;
  readonly configured: boolean;
  readonly provider: string;
}

/** Subjects of the shared Python runtime, specialized by the capabilities that use it. */
function runtimeSubjects(settings: EkphrasisSettings): RuntimeSubjects {
  const capabilities = [
    ...(settings.customCheckers.length > 0 ? ["custom checks"] : []),
    ...(settings.primaryViewCommand.length > 0 ? ["primary views"] : []),
    ...(settings.postCreationCommand.length > 0 ? ["post-creation actions"] : []),
  ];
  const checkers = settings.customCheckers.length > 0;
  const commands = capabilities.length > (checkers ? 1 : 0);
  const prefix = !checkers && commands ? "command" : "checker";
  const consequence = checkers ? "checks" : "degraded";
  const affects = capabilities.length === 0 ? "Python integration" : capabilities.join(" and ");
  const subject = (id: string, dependency: string): CheckSubject => ({
    id: `${prefix}.${id}`,
    consequence,
    dependency,
    affects,
  });
  return {
    platform: subject("platform", "Platform of Python integration"),
    interpreter: subject("interpreter", "Python interpreter file"),
    launch: subject("launch", "Start of the Python interpreter"),
    configured: capabilities.length > 0,
    provider: affects,
  };
}

export async function checkerChecks(
  dependencies: CheckerCheckDependencies,
): Promise<readonly DiagnosticCheck[]> {
  const { settings, probe } = dependencies;
  const runtime = runtimeSubjects(settings);
  if (!dependencies.desktop || probe === null) {
    return [
      notPassed(
        "unavailable",
        runtime.platform,
        "Python integration runs only in the desktop app of Obsidian. On this device, forms and built-in checks remain available.",
        "Open the vault on a desktop computer to run the configured Python capabilities.",
      ),
    ];
  }
  const checks: DiagnosticCheck[] = [
    passed(runtime.platform, "The desktop app of Obsidian can run Python integration."),
  ];
  if (settings.customCheckers.length === 0) {
    checks.push(
      passed(
        SUBJECTS.registrations,
        "No custom checker is registered, so only the checks declared in the schemas run.",
      ),
    );
    if (!runtime.configured) return checks;
    const interpreter = settings.pythonInterpreter.trim();
    const interpreterCheck = await interpreterFileCheck(
      probe,
      interpreter,
      runtime.interpreter,
      runtime.provider,
    );
    checks.push(interpreterCheck);
    if (interpreterCheck.status !== "pass") {
      checks.push(blocked(runtime.launch, "the Python interpreter file"));
      return checks;
    }
    const environment = await probe.environment(interpreter);
    checks.push(launchCheck(environment, interpreter, runtime.launch));
    return checks;
  }
  const { check: registrationCheck, usable } = registrationsCheck(settings.customCheckers);
  checks.push(registrationCheck);
  const interpreter = settings.pythonInterpreter.trim();
  const interpreterCheck = await interpreterFileCheck(
    probe,
    interpreter,
    runtime.interpreter,
    runtime.provider,
  );
  checks.push(interpreterCheck);
  checks.push(patternsCheck(usable));
  checks.push(selectionCheck(usable, dependencies.facts));
  const reference = bindingReference(dependencies.record);
  const selecting = usable.filter((entry) => selects(entry.registration, reference));
  checks.push(recordSelectionCheck(usable, reference, selecting));

  if (interpreterCheck.status !== "pass") {
    for (const subject of [runtime.launch, SUBJECTS.imports, SUBJECTS.data, REPORT_SUBJECT]) {
      checks.push(blocked(subject, "the Python interpreter file"));
    }
    return checks;
  }
  const environment = await probe.environment(interpreter);
  checks.push(launchCheck(environment, interpreter, runtime.launch));
  if (environment.status !== "answered") {
    for (const subject of [SUBJECTS.imports, SUBJECTS.data, REPORT_SUBJECT]) {
      checks.push(blocked(subject, "the start of the Python interpreter"));
    }
    return checks;
  }

  const file =
    dependencies.record === null ? null : dependencies.resolveFile(dependencies.record.path);
  const cwd = file === null ? null : file.slice(0, Math.max(0, file.lastIndexOf("/")));
  const targets = importTargets(usable, dependencies.resolveFile, file);
  const imported = await probe.imports(
    interpreter,
    cwd,
    targets.map(({ target }) => target),
  );
  const importCheck = importsCheck(imported, targets, interpreter);
  checks.push(importCheck.check);
  checks.push(await packageDataCheck(probe, interpreter, cwd, importCheck.packages));

  if (
    dependencies.record === null ||
    file === null ||
    reference === null ||
    selecting.length === 0
  ) {
    checks.push(
      notPassed(
        "unavailable",
        REPORT_SUBJECT,
        dependencies.record === null
          ? "No record is open, so no checker was run."
          : "No registered instance checker selects the opened record, so no checker was run.",
        "Open a record whose schema an instance checker selects, then run the diagnostic again to measure that checker once.",
      ),
    );
  } else {
    for (const entry of selecting) {
      checks.push(
        ...(await measuredRun(dependencies, probe, dependencies.record, interpreter, entry, file)),
      );
    }
  }
  return checks;
}

/** Complete registrations with unique names and well-formed arguments, and the others reported. */
function registrationsCheck(registrations: readonly CustomCheckerRegistration[]): {
  readonly check: DiagnosticCheck;
  readonly usable: readonly Usable[];
} {
  const failures: string[] = [];
  const warnings: string[] = [];
  const usable: Usable[] = [];
  const names = new Set<string>();
  registrations.forEach((registration, index) => {
    const label =
      registration.name.trim() === "" ? `Checker ${index + 1}` : `\`${registration.name}\``;
    const missing = (["name", "module", "function"] as const).filter(
      (key) => registration[key].trim() === "",
    );
    if (missing.length > 0) {
      warnings.push(`${label} lacks its ${missing.join(", ")}, so Ekphrasis ignores it.`);
      return;
    }
    if (names.has(registration.name)) {
      failures.push(
        `${label} is registered twice, so the Python process refuses every registration.`,
      );
      return;
    }
    names.add(registration.name);
    if (!isFindingsRoute(registration)) {
      usable.push({ registration, findings: null });
      return;
    }
    const args = findingsArguments(registration);
    if (args.status === "invalid") {
      failures.push(`${label} runs a command, but ${args.reason}.`);
      return;
    }
    usable.push({
      registration,
      findings: { command: args.command, root: args.root },
    });
  });
  const total = registrations.length;
  if (failures.length > 0) {
    return {
      usable,
      check: notPassed(
        "fail",
        SUBJECTS.registrations,
        failures.join(" "),
        'Correct each checker named above under *Custom checkers* in the settings of Ekphrasis: give each a unique name, and to a command a list `command` of text arguments, such as `{"command": ["-m", "tool", "check", "{folder}"]}`.',
        [...failures, ...warnings],
      ),
    };
  }
  if (warnings.length > 0) {
    return {
      usable,
      check: notPassed(
        "warning",
        SUBJECTS.registrations,
        warnings.join(" "),
        "Complete or remove each incomplete checker under *Custom checkers* in the settings of Ekphrasis.",
        warnings,
      ),
    };
  }
  return {
    usable,
    check: passed(
      SUBJECTS.registrations,
      `${total} custom ${total === 1 ? "checker is" : "checkers are"} registered: ${registrations.map(({ name }) => `\`${name}\``).join(", ")}.`,
    ),
  };
}

async function interpreterFileCheck(
  probe: PythonProbe,
  interpreter: string,
  subject: CheckSubject,
  provider: string,
): Promise<DiagnosticCheck> {
  const enter = `Enter under *Python interpreter* the absolute path of the environment that provides ${provider}, for instance the output of \`python -c "import sys; print(sys.executable)"\` run in that environment.`;
  if (interpreter === "") {
    return notPassed("fail", subject, "No Python interpreter is set.", enter);
  }
  if (!isAbsolute(interpreter)) {
    return notPassed(
      "fail",
      subject,
      `The interpreter \`${interpreter}\` is not an absolute path; Obsidian does not search the paths of your shell.`,
      enter,
    );
  }
  const file = await probe.inspectInterpreter(interpreter);
  switch (file.status) {
    case "executable":
      return passed(subject, `\`${interpreter}\` is an executable file.`);
    case "missing":
      return notPassed("fail", subject, `No file exists at \`${interpreter}\`.`, enter);
    case "not-file":
      return notPassed(
        "fail",
        subject,
        `\`${interpreter}\` is a directory, not an interpreter.`,
        enter,
      );
    case "not-executable":
      return notPassed(
        "fail",
        subject,
        `\`${interpreter}\` exists but cannot be executed (${file.reason}).`,
        `Make the file executable, or ${enter.charAt(0).toLowerCase()}${enter.slice(1)}`,
        [file.reason],
      );
  }
}

function isAbsolute(path: string): boolean {
  return path.startsWith("/") || /^[A-Za-z]:[\\/]/.test(path) || path.startsWith("\\\\");
}

function patternsCheck(usable: readonly Usable[]): DiagnosticCheck {
  const failures: string[] = [];
  const warnings: string[] = [];
  let count = 0;
  for (const { registration } of usable) {
    for (const pattern of registration.schemas ?? []) {
      count += 1;
      const defect = globDefect(pattern);
      if (defect?.kind === "malformed") {
        failures.push(
          `\`${registration.name}\`: \`${pattern}\` is no valid pattern (${defect.reason}).`,
        );
      } else if (defect?.kind === "unclosed") {
        warnings.push(
          `\`${registration.name}\`: \`${pattern}\` has no closing delimiter for \`${defect.delimiter}\`, which it matches literally.`,
        );
      }
    }
  }
  const action =
    "Correct the pattern under *Instance schemas* of the checker, in the settings of Ekphrasis; a pattern such as `project:*` selects every contract of a project.";
  if (failures.length > 0) {
    return notPassed("fail", SUBJECTS.patterns, failures.join(" "), action, [
      ...failures,
      ...warnings,
    ]);
  }
  if (warnings.length > 0) {
    return notPassed("warning", SUBJECTS.patterns, warnings.join(" "), action, warnings);
  }
  return passed(
    SUBJECTS.patterns,
    count === 0
      ? "No checker selects schemas by pattern; checkers run where schemas declare their rules."
      : `${count} schema ${count === 1 ? "pattern parses" : "patterns parse"}.`,
  );
}

/** Each instance checker selects at least one contract identifier of the registry. */
function selectionCheck(usable: readonly Usable[], facts: SchemaFacts): DiagnosticCheck {
  const instanceCheckers = usable.filter(
    ({ registration }) => (registration.schemas ?? []).length > 0,
  );
  if (instanceCheckers.length === 0) {
    return passed(SUBJECTS.selection, "No instance checker is registered.");
  }
  if (facts.identifiers.length === 0) {
    return notPassed(
      "unavailable",
      SUBJECTS.selection,
      "The registry lists no contract identifier to match the patterns against.",
      "Repair the schema registry first, then run the diagnostic again.",
    );
  }
  const unmatched: string[] = [];
  const matched: string[] = [];
  for (const { registration } of instanceCheckers) {
    const count = facts.identifiers.filter((identifier) =>
      selects(registration, identifier),
    ).length;
    const line = `\`${registration.name}\` (${(registration.schemas ?? []).map((p) => `\`${p}\``).join(", ")}) selects ${count} of ${facts.identifiers.length} contracts of the registry.`;
    (count === 0 ? unmatched : matched).push(line);
  }
  if (unmatched.length > 0) {
    const sample = facts.identifiers
      .slice(0, 3)
      .map((identifier) => `\`${identifier}\``)
      .join(", ");
    return notPassed(
      "fail",
      SUBJECTS.selection,
      unmatched.join(" "),
      `Write under *Instance schemas* a pattern matching the identifiers of the registry, such as ${sample}.`,
      [...unmatched, ...matched],
    );
  }
  return passed(SUBJECTS.selection, matched.join(" "));
}

/** Instance checkers that select the schema binding the opened record. */
function recordSelectionCheck(
  usable: readonly Usable[],
  reference: string | null,
  selecting: readonly Usable[],
): DiagnosticCheck {
  if (reference === null) {
    return passed(SUBJECTS.record, "No bound record is open.");
  }
  if (selecting.length > 0) {
    return passed(
      SUBJECTS.record,
      `\`${reference}\` is checked by ${selecting.map(({ registration }) => `\`${registration.name}\``).join(", ")}.`,
    );
  }
  const instanceCheckers = usable.filter(
    ({ registration }) => (registration.schemas ?? []).length > 0,
  );
  if (instanceCheckers.length === 0) {
    return passed(
      SUBJECTS.record,
      "No instance checker is registered; only the rules declared by the schema check this record.",
    );
  }
  return notPassed(
    "warning",
    SUBJECTS.record,
    `No registered instance checker selects \`${reference}\`, the schema of the opened record.`,
    "If a checker of your project should check this record, add a pattern matching its identifier under *Instance schemas* of that checker.",
  );
}

function launchCheck(
  outcome: ProbeOutcome<{
    readonly version: string;
    readonly executable: string;
  }>,
  interpreter: string,
  subject: CheckSubject,
): DiagnosticCheck {
  if (outcome.status === "answered") {
    return passed(subject, `\`${interpreter}\` starts Python ${outcome.result.version}.`, [
      outcome.result.executable,
    ]);
  }
  const failure = probeFailure(outcome);
  return notPassed(
    "fail",
    subject,
    `\`${interpreter}\` does not start as a Python interpreter: ${failure.summary}`,
    "Select a Python interpreter under *Python interpreter*, such as the file `bin/python` of a conda or virtual environment.",
    failure.details,
  );
}

/** Probe target of one registration, with the installed package that provides it. */
interface TargetEntry {
  readonly name: string;
  readonly target: ImportTarget;
  readonly packageName: string | null;
}

/** Probe target of each registration: the module of a function, or the code of a command. */
function importTargets(
  usable: readonly Usable[],
  resolveFile: (vaultPath: string) => string,
  file: string | null,
): readonly TargetEntry[] {
  return usable.flatMap(({ registration, findings }): TargetEntry[] => {
    const name = registration.name;
    if (findings === null) {
      const module = registration.module.endsWith(".py")
        ? resolveFile(registration.module)
        : registration.module;
      return [
        {
          name,
          target: {
            kind: "module",
            module,
            attribute: registration.function,
          } as const,
          packageName: registration.module.endsWith(".py") ? null : topPackage(module),
        },
      ];
    }
    const target = commandTarget(findings.command);
    if (target.kind === "module") {
      return [
        {
          name,
          target: { kind: "entry", module: target.name },
          packageName: topPackage(target.name),
        },
      ];
    }
    if (target.kind === "script") {
      const path = file === null ? target.path : expandPlaceholders(target.path, file);
      return [{ name, target: { kind: "script", path } as const, packageName: null }];
    }
    return [];
  });
}

function topPackage(module: string): string {
  return module.split(".")[0] ?? module;
}

function importsCheck(
  outcome: ProbeOutcome<readonly ImportResult[]>,
  targets: readonly TargetEntry[],
  interpreter: string,
): { readonly check: DiagnosticCheck; readonly packages: readonly string[] } {
  if (targets.length === 0) {
    return {
      check: passed(SUBJECTS.imports, "The checkers name no module or script to import."),
      packages: [],
    };
  }
  if (outcome.status !== "answered") {
    const failure = probeFailure(outcome);
    return {
      check: notPassed(
        "fail",
        SUBJECTS.imports,
        `The imports could not be checked: ${failure.summary}`,
        "Run the diagnostic again; if the failure persists, copy the report for the maintainers of Ekphrasis.",
        failure.details,
      ),
      packages: [],
    };
  }
  const failures: string[] = [];
  const passedLines: string[] = [];
  const packages = new Set<string>();
  outcome.result.forEach((result, index) => {
    const entry = targets[index];
    if (entry === undefined) return;
    const what = entry.target.kind === "script" ? "the script" : "the module";
    const verb = entry.target.kind === "module" ? "imports" : "is found";
    if (result.error === null) {
      passedLines.push(
        `\`${entry.name}\`: ${what} \`${result.target}\` ${verb}${result.origin === null ? "" : ` from \`${result.origin}\``} in ${seconds(result.durationMs)}.`,
      );
      if (entry.packageName !== null) packages.add(entry.packageName);
    } else {
      failures.push(`\`${entry.name}\`: ${what} \`${result.target}\` fails: ${result.error}`);
    }
  });
  if (failures.length > 0) {
    return {
      check: notPassed(
        "fail",
        SUBJECTS.imports,
        `The interpreter \`${interpreter}\` cannot load what the checkers need; the first: ${failures[0]}`,
        "Install the missing package into the environment of this interpreter, or enter under *Python interpreter* the interpreter of the environment where the package is installed.",
        [...failures, ...passedLines],
      ),
      packages: [...packages],
    };
  }
  return {
    check: passed(SUBJECTS.imports, passedLines.join(" "), []),
    packages: [...packages],
  };
}

async function packageDataCheck(
  probe: PythonProbe,
  interpreter: string,
  cwd: string | null,
  packages: readonly string[],
): Promise<DiagnosticCheck> {
  if (packages.length === 0) {
    return passed(SUBJECTS.data, "No imported package to inspect.");
  }
  const failures: string[] = [];
  const lines: string[] = [];
  for (const name of packages) {
    const outcome = await probe.packageData(interpreter, cwd, name);
    if (outcome.status !== "answered") {
      failures.push(`\`${name}\`: ${probeFailure(outcome).summary}`);
      continue;
    }
    const data = outcome.result;
    if (data.root === null) {
      lines.push(`\`${name}\` holds no files on disk to read.`);
    } else if (data.unreadable.length > 0) {
      failures.push(
        `\`${name}\`: ${data.unreadable.length} data ${data.unreadable.length === 1 ? "file" : "files"} cannot be read, such as \`${data.unreadable[0]?.path ?? ""}\` (${data.unreadable[0]?.error ?? ""}).`,
        ...data.unreadable.map(({ path, error }) => `${path}: ${error}`),
      );
    } else {
      lines.push(
        `\`${name}\`: ${data.readable} data ${data.readable === 1 ? "file reads" : "files read"} in \`${data.root}\`.`,
      );
    }
  }
  if (failures.length > 0) {
    return notPassed(
      "fail",
      SUBJECTS.data,
      failures[0] ?? "",
      "Reinstall the package in the environment of the interpreter, or restore the read permission of the files listed.",
      [...failures, ...lines],
    );
  }
  return passed(SUBJECTS.data, lines.join(" "));
}

/** Reference that binds the opened record: a logical identifier or a schema path. */
function bindingReference(record: OpenedRecord | null): string | null {
  const state = record?.state ?? null;
  if (state === null) return null;
  if (
    state.status === "form" ||
    state.status === "parse-error" ||
    state.status === "schema-error"
  ) {
    return state.binding.reference;
  }
  return state.status === "invalid-binding" ? state.reference : null;
}

function selects(registration: CustomCheckerRegistration, reference: string | null): boolean {
  if (reference === null || reference === "") return false;
  return (registration.schemas ?? []).some((pattern) => {
    if (globDefect(pattern)?.kind === "malformed") return false;
    return new GlobPattern(pattern).matches(reference);
  });
}

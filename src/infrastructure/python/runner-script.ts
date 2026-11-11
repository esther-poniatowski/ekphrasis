/**
 * Python program embedded in the plugin bundle and passed to the configured interpreter with
 * `-c`. It imports only functions registered by the user, then exchanges one JSON message per
 * line until standard input closes.
 *
 * The program also provides two modules that registrations may name. The function
 * `ekphrasis_findings.findings_log` runs a command that writes a SARIF 2.1.0 findings log. The
 * function `ekphrasis_commands.source_state` compares a stored token with a command's output.
 *
 * The program is the library of the runner, defining the module `ekphrasis_findings` and the
 * registration and call of checkers, followed by the loop answering the requests. The setup
 * probe executes the same library with a loop of its own, so that the diagnostic runs a command
 * and reads its log through the very code of a validation.
 */
import { FINDINGS_LOG_CHECKER, SOURCE_STATE_CHECKER } from "../../application";

export const PYTHON_RUNNER_LIBRARY = String.raw`
import importlib
import importlib.util
import json
import os
import subprocess
import sys
import types
from urllib.parse import unquote, urlparse

CHECKERS = {}
MODULES = {}


def _expand(text, file):
    return str(text).replace("{file}", file).replace("{folder}", os.path.dirname(file))


def _artifact_path(artifact, root, bases):
    uri = artifact.get("uri")
    if not isinstance(uri, str):
        return None
    if uri.startswith("file:"):
        return os.path.realpath(unquote(urlparse(uri).path))
    base = root
    base_id = artifact.get("uriBaseId")
    declared = bases.get(base_id) if isinstance(base_id, str) else None
    if isinstance(declared, dict) and str(declared.get("uri", "")).startswith("file:"):
        base = unquote(urlparse(declared["uri"]).path)
    return os.path.realpath(os.path.join(base, unquote(uri)))


def findings_log(
    value, *, instance, path, file, command, root="{folder}", context_property=None
):
    """Run the interpreter with the arguments command, read the SARIF findings log written on
    standard output, and return each result on file. A relative artifact URI resolves against
    root, which is also the working directory of the command; {file} and {folder} expand to the
    checked file and its folder. A run declared unsuccessful adds one warning per notification."""
    base, completed = _run_command(command, root, file)
    log = _read_log(completed)
    return _log_contexts(log, context_property) + _log_issues(log, base, file)


def _run_command(command, root, file, timeout=None):
    """Run the interpreter with the arguments command in the expanded root, and return that
    root with the completed process; a timeout kills the command and raises TimeoutExpired."""
    if not isinstance(command, list) or not all(isinstance(part, str) for part in command):
        raise TypeError("the argument command must be a list of strings")
    base = os.path.realpath(_expand(root, file))
    completed = subprocess.run(
        [sys.executable] + [_expand(part, file) for part in command],
        cwd=base,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        encoding="utf-8",
        errors="replace",
        timeout=timeout,
    )
    return base, completed


def _read_log(completed):
    """Findings log written on the standard output of a completed command."""
    try:
        return json.loads(completed.stdout)
    except ValueError:
        detail = completed.stderr.strip()[-2000:]
        raise RuntimeError(
            "the command exited with status " + str(completed.returncode)
            + " without writing a findings log" + (": " + detail if detail else "")
        )


def source_state(
    value, *, instance, path, file, command, pointer, root="{folder}"
):
    """Compare the string at pointer with the one non-empty line written by command. The command
    owns the computation of the token; this adapter only reports whether both strings match."""
    stored = _pointer_value(instance, pointer)
    if not isinstance(stored, str):
        raise TypeError("the source-state pointer must designate a string")
    _, completed = _run_command(command, root, file)
    current = _state_output(completed)
    if stored == current:
        return [{
            "kind": "context",
            "label": "Source state",
            "value": "current",
            "description": "The stored source state matches the current source records.",
            "result_class": "generated-artifact freshness",
        }]
    return [{
        "message": (
            "This generated file is stale: its stored source state does not match the current "
            "source records. Regenerate the file before relying on it."
        ),
        "pointer": pointer,
        "severity": "warning",
        "result_class": "generated-artifact freshness",
        "repair_condition": "Regenerate the file from the current source records.",
    }]


def _state_output(completed):
    """The one non-empty output line of a successful source-state command."""
    detail = completed.stderr.strip()[-2000:]
    if completed.returncode != 0:
        raise RuntimeError(
            "the source-state command exited with status " + str(completed.returncode)
            + (": " + detail if detail else "")
        )
    lines = [line.strip() for line in completed.stdout.splitlines() if line.strip()]
    if len(lines) != 1:
        raise RuntimeError("the source-state command must write exactly one non-empty line")
    return lines[0]


def _pointer_value(instance, pointer):
    """Value of instance at an RFC 6901 JSON Pointer."""
    if not isinstance(pointer, str) or (pointer and not pointer.startswith("/")):
        raise TypeError("the argument pointer must be a JSON Pointer")
    current = instance
    for raw in pointer[1:].split("/") if pointer else []:
        segment = raw.replace("~1", "/").replace("~0", "~")
        if isinstance(current, dict) and segment in current:
            current = current[segment]
        elif isinstance(current, list) and segment.isdigit() and int(segment) < len(current):
            current = current[int(segment)]
        else:
            raise KeyError("the source-state pointer designates no value: " + pointer)
    return current


def _log_issues(log, base, file):
    """Located issues of the results of log on file, with one warning per notification of a
    run declared unsuccessful; a relative artifact URI resolves against base."""
    target = os.path.realpath(file)
    issues = []
    for run in log.get("runs") or []:
        driver = ((run.get("tool") or {}).get("driver") or {}).get("name") or ""
        bases = run.get("originalUriBaseIds") or {}
        for invocation in run.get("invocations") or []:
            if invocation.get("executionSuccessful") is not False:
                continue
            for note in invocation.get("toolExecutionNotifications") or [{}]:
                text = (note.get("message") or {}).get("text") or "no reason is given"
                issues.append({
                    "message": (driver or "The command") + " did not complete its run: " + text,
                    "pointer": "",
                    "severity": "warning",
                })
        for result in run.get("results") or []:
            location = (result.get("locations") or [{}])[0]
            artifact = (location.get("physicalLocation") or {}).get("artifactLocation") or {}
            if _artifact_path(artifact, base, bases) != target:
                continue
            logical = (location.get("logicalLocations") or [{}])[0].get("name") or ""
            locus = logical.partition("#")[2]
            issue = {
                "message": (result.get("message") or {}).get("text") or "",
                "severity": "error" if result.get("level", "warning") == "error" else "warning",
            }
            issue["pointer" if locus == "" or locus.startswith("/") else "locus"] = locus
            properties = result.get("properties") or {}

            def bag(name):
                return properties.get(driver + "/" + name, properties.get(name))

            optional = {
                "rule": result.get("ruleId"),
                "discriminator": (result.get("partialFingerprints") or {}).get("discriminator/v1"),
                "controlled_by": bag("controllingDecision"),
                "result_class": bag("resultClass"),
                "repair_condition": bag("repairCondition"),
                "documentation_target": bag("documentationTarget"),
                "source_file": artifact.get("uri"),
            }
            issue.update({key: item for key, item in optional.items() if isinstance(item, str)})
            issues.append(issue)
    return issues


def _log_contexts(log, property_name):
    """Context objects held by the selected property of each run, normalized for the host."""
    if property_name is None:
        return []
    if not isinstance(property_name, str) or not property_name:
        raise TypeError("the argument context_property must be a non-empty string")
    contexts = []
    for run in log.get("runs") or []:
        value = (run.get("properties") or {}).get(property_name)
        if value is None:
            continue
        entries = value if isinstance(value, list) else [value]
        for entry in entries:
            if not isinstance(entry, dict):
                raise TypeError("the selected context property must hold an object or a list of objects")
            if not isinstance(entry.get("label"), str) or not isinstance(entry.get("value"), str):
                raise TypeError("each selected context object must hold string label and value fields")
            context = {
                "kind": "context",
                "label": entry.get("label"),
                "value": entry.get("value"),
            }
            optional = {
                "description": entry.get("description"),
                "result_class": entry.get("resultClass"),
                "documentation_target": entry.get("documentationTarget"),
            }
            context.update({key: item for key, item in optional.items() if isinstance(item, str)})
            contexts.append(context)
    return contexts


_FINDINGS = types.ModuleType("${FINDINGS_LOG_CHECKER.module}")
setattr(_FINDINGS, "${FINDINGS_LOG_CHECKER.function}", findings_log)
sys.modules["${FINDINGS_LOG_CHECKER.module}"] = _FINDINGS

_COMMANDS = types.ModuleType("${SOURCE_STATE_CHECKER.module}")
setattr(_COMMANDS, "${SOURCE_STATE_CHECKER.function}", source_state)
sys.modules["${SOURCE_STATE_CHECKER.module}"] = _COMMANDS


def load_module(reference):
    if reference in MODULES:
        return MODULES[reference]
    if os.path.isfile(reference):
        name = "_ekphrasis_checker_" + str(len(MODULES))
        spec = importlib.util.spec_from_file_location(name, reference)
        if spec is None or spec.loader is None:
            raise ImportError("cannot load checker module at " + reference)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
    else:
        module = importlib.import_module(reference)
    MODULES[reference] = module
    return module


def register(entries):
    loaded = {}
    for entry in entries:
        name = entry["name"]
        if name in loaded:
            raise ValueError("duplicate checker name: " + name)
        function = getattr(load_module(entry["module"]), entry["function"])
        if not callable(function):
            raise TypeError("registered checker is not callable: " + name)
        loaded[name] = function
    CHECKERS.clear()
    CHECKERS.update(loaded)


def call(message):
    name = message["checker"]
    if name not in CHECKERS:
        raise KeyError("checker is not registered: " + name)
    arguments = message.get("arguments") or {}
    return CHECKERS[name](
        message.get("value"),
        instance=message.get("instance"),
        path=message.get("path"),
        file=message.get("file"),
        **arguments,
    )
`;

/** Loop of the runner: one JSON request per line of standard input, until it closes. */
const RUNNER_LOOP = String.raw`
for line in sys.stdin:
    request = None
    try:
        request = json.loads(line)
        if request.get("type") == "register":
            register(request.get("checkers") or [])
            result = None
        elif request.get("type") == "call":
            result = call(request)
        else:
            raise ValueError("unknown request type")
        response = {"id": request.get("id"), "ok": True, "result": result}
    except Exception as error:
        response = {
            "id": request.get("id") if isinstance(request, dict) else None,
            "ok": False,
            "error": type(error).__name__ + ": " + str(error),
        }
    sys.stdout.write(json.dumps(response, separators=(",", ":")) + "\n")
    sys.stdout.flush()
`;

export const PYTHON_CHECKER_RUNNER = PYTHON_RUNNER_LIBRARY + RUNNER_LOOP;

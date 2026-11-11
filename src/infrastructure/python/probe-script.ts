/**
 * Python program of the setup probe, passed to the configured interpreter with `-B -c`. It runs
 * the library of the checker runner, so that a command runs and its findings log converts into
 * issues through the very code of a validation, then answers one JSON request read from standard
 * input with one JSON answer on standard output.
 *
 * Every request only reads. The probe imports modules, opens the data files of a package for one
 * byte, runs the configured command once, or calls a registered function once. The option `-B`
 * and the variable `PYTHONDONTWRITEBYTECODE` keep Python from writing bytecode caches. Anything
 * that imported code prints goes to standard error, so that it cannot corrupt the answer.
 */
import { PYTHON_RUNNER_LIBRARY } from "./runner-script";

/** Bound on the number of data files of one package that the probe opens. */
export const PACKAGE_DATA_LIMIT = 5000;

const PROBE_LOOP = String.raw`
import platform
import time

_ANSWER = sys.stdout
sys.stdout = sys.stderr
_LEVELS = ("none", "note", "warning", "error")
_CODE_SUFFIXES = (".py", ".pyc", ".pyo", ".pyi", ".so", ".pyd")


def _text(value):
    if isinstance(value, bytes):
        return value.decode("utf-8", "replace")
    return value or ""


def _tail(value, size=2000):
    return _text(value).strip()[-size:]


def _error(exc):
    return type(exc).__name__ + ": " + str(exc)


def _milliseconds(started):
    return (time.perf_counter() - started) * 1000.0


def _environment(request):
    return {"version": platform.python_version(), "executable": sys.executable}


def _locate_entry(name):
    """Import the top-level package of the module that -m runs, and locate that module without
    running it; a package run by -m needs its submodule __main__."""
    module = importlib.import_module(name.split(".")[0])
    spec = importlib.util.find_spec(name)
    if spec is None:
        raise ModuleNotFoundError("No module named " + repr(name))
    if spec.submodule_search_locations is not None:
        if importlib.util.find_spec(name + ".__main__") is None:
            raise ModuleNotFoundError(repr(name) + " is a package without __main__, so -m cannot run it")
    return spec.origin or getattr(module, "__file__", None)


def _imports(request):
    results = []
    for target in request["targets"]:
        started = time.perf_counter()
        error = None
        origin = None
        kind = target["kind"]
        name = target["path"] if kind == "script" else target["module"]
        try:
            if kind == "script":
                origin = os.path.realpath(name)
                if not os.path.isfile(origin):
                    raise FileNotFoundError("no script exists at " + origin)
                if not os.access(origin, os.R_OK):
                    raise PermissionError("the script " + origin + " cannot be read")
            elif kind == "entry":
                origin = _locate_entry(name)
            else:
                module = load_module(name)
                origin = getattr(module, "__file__", None)
                attribute = target.get("attribute")
                if attribute:
                    if not callable(getattr(module, attribute)):
                        raise TypeError(attribute + " is not callable")
        except BaseException as exc:
            error = _error(exc)
        results.append({
            "target": name,
            "error": error,
            "origin": origin,
            "duration_ms": _milliseconds(started),
        })
    return results


def _package_data(request):
    name = request["package"]
    module = importlib.import_module(name)
    folders = list(getattr(module, "__path__", None) or [])
    if not folders:
        return {"package": name, "root": None, "readable": 0, "unreadable": []}
    readable = 0
    unreadable = []
    for base in folders:
        for folder, subfolders, files in os.walk(base):
            subfolders[:] = [item for item in subfolders if item != "__pycache__"]
            for item in sorted(files):
                if item.endswith(_CODE_SUFFIXES):
                    continue
                path = os.path.join(folder, item)
                try:
                    with open(path, "rb") as handle:
                        handle.read(1)
                    readable += 1
                except OSError as exc:
                    unreadable.append({"path": path, "error": type(exc).__name__ + ": " + (exc.strerror or str(exc))})
                if readable + len(unreadable) >= ${PACKAGE_DATA_LIMIT}:
                    break
    return {"package": name, "root": folders[0], "readable": readable, "unreadable": unreadable[:50]}


def _result_defects(result):
    if not isinstance(result, dict):
        return ["a JSON object"]
    missing = []
    message = result.get("message")
    if not (isinstance(message, dict) and isinstance(message.get("text"), str) and message["text"].strip()):
        missing.append("message.text")
    if result.get("level", "warning") not in _LEVELS:
        missing.append("a level among " + ", ".join(_LEVELS))
    uri = None
    locations = result.get("locations")
    if isinstance(locations, list) and locations and isinstance(locations[0], dict):
        physical = locations[0].get("physicalLocation")
        artifact = physical.get("artifactLocation") if isinstance(physical, dict) else None
        uri = artifact.get("uri") if isinstance(artifact, dict) else None
    if not isinstance(uri, str) or uri == "":
        missing.append("locations[0].physicalLocation.artifactLocation.uri")
    return missing


def _report(completed, base, file):
    text = completed.stdout or ""
    if text.strip() == "":
        return {"kind": "empty"}
    try:
        log = json.loads(text)
    except ValueError:
        return {"kind": "invalid-json", "excerpt": text.strip()[:200]}
    if not isinstance(log, dict):
        return {"kind": "not-sarif", "reason": "its top-level value is no JSON object"}
    if log.get("version") != "2.1.0":
        return {"kind": "not-sarif", "reason": "its version is " + json.dumps(log.get("version")) + ", not \"2.1.0\""}
    runs = log.get("runs")
    if not isinstance(runs, list) or not all(isinstance(run, dict) for run in runs):
        return {"kind": "not-sarif", "reason": "it holds no list runs of JSON objects"}
    defects = []
    count = 0
    for run in runs:
        results = run.get("results") or []
        if not isinstance(results, list):
            return {"kind": "not-sarif", "reason": "a run holds results that are no list"}
        for result in results:
            missing = _result_defects(result)
            if missing:
                defects.append({"index": count, "missing": missing})
            count += 1
    conversion_error = None
    issues = []
    try:
        issues = _log_issues(log, base, file)
    except Exception as exc:
        conversion_error = _error(exc)
    return {
        "kind": "sarif",
        "runs": len(runs),
        "results": count,
        "defects": defects[:50],
        "issues": issues,
        "conversion_error": conversion_error,
    }


def _command(request):
    file = request["file"]
    started = time.perf_counter()
    try:
        base, completed = _run_command(
            request["command"], request.get("root") or "{folder}", file,
            timeout=request["cap_ms"] / 1000.0,
        )
    except subprocess.TimeoutExpired as expired:
        return {
            "timed_out": True,
            "duration_ms": _milliseconds(started),
            "exit_code": None,
            "stderr": _tail(expired.stderr),
            "report": {"kind": "empty"},
        }
    return {
        "timed_out": False,
        "duration_ms": _milliseconds(started),
        "exit_code": completed.returncode,
        "stderr": _tail(completed.stderr),
        "report": _report(completed, base, file),
    }


def _call(request):
    register([request["registration"]])
    started = time.perf_counter()
    result = call(request["call"])
    return {"duration_ms": _milliseconds(started), "result": result}


_REQUESTS = {
    "environment": _environment,
    "imports": _imports,
    "package-data": _package_data,
    "command": _command,
    "call": _call,
}

try:
    request = json.loads(sys.stdin.read())
    answer = json.dumps({"ok": True, "result": _REQUESTS[request["type"]](request)})
except BaseException as exc:
    answer = json.dumps({"ok": False, "error": _error(exc)})
_ANSWER.write(answer + "\n")
_ANSWER.flush()
`;

export const PYTHON_SETUP_PROBE = PYTHON_RUNNER_LIBRARY + PROBE_LOOP;

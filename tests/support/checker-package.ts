/**
 * Python packages written into a temporary folder for the tests of the setup diagnostic. The
 * package `fakechk` stands for a tool whose command writes a findings log: its module `__main__`
 * takes a mode, the folder to check and further values, and writes one kind of report on its
 * standard output. The package `lockedpkg` holds a data file that cannot be read.
 *
 * Modes of `python -m fakechk <mode> <folder> [value]`:
 *
 * - `ok`: a SARIF 2.1.0 log with one error on `<folder>/record.yml`, at the pointer `/title`;
 * - `empty`: no output, an error message, and the exit status 2;
 * - `text`: a line of text that is no JSON;
 * - `not-sarif`: a JSON list;
 * - `defects`: a SARIF log whose result lacks its message and its location;
 * - `sleep`: the log of `ok` after `value` seconds;
 * - `tree`: starts a descendant process that sleeps for 60 seconds, writes the process identifiers
 *   of the command and of that descendant to the file `value`, then sleeps for 60 seconds.
 */
import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const MAIN = `
import json
import os
import subprocess
import sys
import time

mode, folder = sys.argv[1], sys.argv[2]
value = sys.argv[3] if len(sys.argv) > 3 else None


def log(results):
    return json.dumps({
        "version": "2.1.0",
        "runs": [{"tool": {"driver": {"name": "fakechk"}}, "results": results}],
    })


GOOD = [{
    "ruleId": "fake.rule",
    "level": "error",
    "message": {"text": "The title is wrong."},
    "locations": [{
        "physicalLocation": {"artifactLocation": {"uri": os.path.join(folder, "record.yml")}},
        "logicalLocations": [{"name": "record#/title"}],
    }],
}]

if mode == "ok":
    print(log(GOOD))
elif mode == "empty":
    sys.stderr.write("fakechk: the folder holds no inquiry\\n")
    sys.exit(2)
elif mode == "text":
    print("checked 1 file")
elif mode == "not-sarif":
    print("[]")
elif mode == "defects":
    print(log([{"level": "error"}]))
elif mode == "sleep":
    time.sleep(float(value))
    print(log(GOOD))
elif mode == "tree":
    descendant = subprocess.Popen([sys.executable, "-c", "import time; time.sleep(60)"])
    with open(value + ".part", "w") as handle:
        handle.write(str(os.getpid()) + " " + str(descendant.pid))
    os.replace(value + ".part", value)
    time.sleep(60)
`;

/** Writes the packages into `root`, which then belongs on the `PYTHONPATH` of the interpreter. */
export function writeCheckerPackages(root: string): void {
  const fake = join(root, "fakechk");
  mkdirSync(join(fake, "data"), { recursive: true });
  writeFileSync(join(fake, "__init__.py"), "");
  writeFileSync(join(fake, "__main__.py"), MAIN);
  writeFileSync(join(fake, "data", "rules.yml"), "rules: []\n");
  const locked = join(root, "lockedpkg");
  mkdirSync(join(locked, "data"), { recursive: true });
  writeFileSync(join(locked, "__init__.py"), "");
  const secret = join(locked, "data", "rules.yml");
  writeFileSync(secret, "rules: []\n");
  chmodSync(secret, 0o000);
}

/** Whether the tests run as the superuser, who reads a file without its read permission. */
export function runsAsRoot(): boolean {
  return typeof process.getuid === "function" && process.getuid() === 0;
}

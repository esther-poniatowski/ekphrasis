/**
 * Spike on the Python process: starts an interpreter through `child_process` with a runner script
 * embedded as a string, exchanges one JSON message per line, and stops the process when the
 * plugin unloads.
 *
 * Decision record: Python checkers (`docs/adr/python-checkers.md`).
 */
import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import { tmpdir } from "os";
import { join } from "path";
import { Modal, Setting, type App, type Plugin } from "obsidian";
import { describeError, ms, showReport } from "./report";
import type { Spike } from "./spike";

/** File to which the runner appends the cause of its exit, read after the vault closes. */
const EXIT_LOG = join(tmpdir(), "ekphrasis-spike-python.log");
const REPLY_TIMEOUT_MS = 10_000;

/**
 * Runner script: answers each line of standard input with one JSON line, and records why it
 * exits. End of input means the parent closed the pipe or died; SIGTERM means the plugin killed it.
 */
const RUNNER = `
import json, os, signal, sys, time
LOG = sys.argv[1]
def record(cause):
    with open(LOG, "a") as log:
        log.write(f"{time.strftime('%H:%M:%S')} pid={os.getpid()} exit={cause}\\n")
def on_term(signum, frame):
    record("SIGTERM")
    sys.exit(0)
signal.signal(signal.SIGTERM, on_term)
for line in sys.stdin:
    request = json.loads(line)
    reply = {"id": request["id"], "result": {"echo": request["args"], "version": sys.version.split()[0], "executable": sys.executable}}
    sys.stdout.write(json.dumps(reply) + "\\n")
    sys.stdout.flush()
record("end of input")
`;

let running: ChildProcessWithoutNullStreams | null = null;
let interpreter = "python3";

/** Modal asking for the interpreter path, since the PATH of a desktop app may lack the shell's. */
class InterpreterModal extends Modal {
  constructor(
    app: App,
    private readonly onSubmit: (path: string) => void,
  ) {
    super(app);
  }

  override onOpen(): void {
    this.titleEl.setText("Python interpreter");
    let value = interpreter;
    new Setting(this.contentEl)
      .setName("Interpreter")
      .setDesc("Command or absolute path, e.g. /Users/me/miniconda3/envs/gnomon/bin/python.")
      .addText((text) => text.setValue(value).onChange((next) => (value = next.trim())));
    new Setting(this.contentEl).addButton((button) =>
      button
        .setButtonText("Start")
        .setCta()
        .onClick(() => {
          this.close();
          this.onSubmit(value);
        }),
    );
  }

  override onClose(): void {
    this.contentEl.empty();
  }
}

/** Sends one request and resolves with the first line of standard output. */
function exchange(child: ChildProcessWithoutNullStreams, request: object): Promise<string> {
  return new Promise((resolve, reject) => {
    let buffer = "";
    const timer = window.setTimeout(
      () => reject(new Error("no reply within the timeout")),
      REPLY_TIMEOUT_MS,
    );
    const onData = (chunk: Buffer): void => {
      buffer += chunk.toString("utf8");
      const newline = buffer.indexOf("\n");
      if (newline < 0) return;
      window.clearTimeout(timer);
      child.stdout.off("data", onData);
      resolve(buffer.slice(0, newline));
    };
    child.stdout.on("data", onData);
    child.once("error", reject);
    child.stdin.write(`${JSON.stringify(request)}\n`);
  });
}

async function startAndExchange(app: App, path: string): Promise<void> {
  interpreter = path;
  stop();
  const lines = [`- Interpreter: ${path}`, `- Exit log: ${EXIT_LOG}`];
  const start = performance.now();
  try {
    const child = spawn(path, ["-u", "-c", RUNNER, EXIT_LOG], { stdio: "pipe" });
    running = child;
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString("utf8")));
    child.once("exit", (code, signal) => {
      console.info(`[ekphrasis-spikes] Python process exited: code=${code} signal=${signal}`);
      if (running === child) running = null;
    });
    const reply = await exchange(child, {
      id: 1,
      call: "echo",
      args: { field: "task.epistemic_aim" },
    });
    lines.push(
      `- Process id: ${child.pid ?? "unknown"}`,
      `- First reply after start: ${ms(performance.now() - start)}`,
      `- Reply: ${reply}`,
    );
    const second = performance.now();
    await exchange(child, { id: 2, call: "echo", args: {} });
    lines.push(`- Second reply on the running process: ${ms(performance.now() - second)}`);
    if (stderr) lines.push(`- Standard error: ${stderr.trim()}`);
  } catch (error) {
    lines.push(`- FAILED: ${describeError(error)}`);
  }
  showReport(app, { title: "Python process", lines });
}

function stop(): void {
  running?.kill("SIGTERM");
  running = null;
}

export const pythonProcessSpike: Spike = {
  register(plugin: Plugin) {
    plugin.register(stop);
    plugin.addCommand({
      id: "python-start-and-exchange",
      name: "Python: start a process and exchange one message",
      callback: () =>
        new InterpreterModal(plugin.app, (path) => void startAndExchange(plugin.app, path)).open(),
    });
    plugin.addCommand({
      id: "python-stop",
      name: "Python: stop the process",
      callback: () => {
        const pid = running?.pid;
        stop();
        showReport(plugin.app, {
          title: "Python process stopped",
          lines: [`- Process id: ${pid ?? "none running"}`, `- Exit log: ${EXIT_LOG}`],
        });
      },
    });
  },
};

/** Desktop process for a configured producer command, invoked without a shell. */
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { EkphrasisError } from "../../errors";
import { stopTree, treeRootOptions } from "../python/process-tree";

export class ConfiguredCommandProcessError extends EkphrasisError {
  override name = "ConfiguredCommandProcessError";
}

export class ConfiguredCommandProcess {
  constructor(
    private readonly executable: string,
    private readonly workingDirectory: string,
    private readonly timeoutMs: number,
  ) {}

  /** Run one configured argument list after replacing its declared placeholders. */
  run(command: readonly string[], replacements: Readonly<Record<string, string>>): Promise<string> {
    if (command.length === 0) {
      throw new ConfiguredCommandProcessError("the configured command is empty");
    }
    const args = command.map((argument) =>
      Object.entries(replacements).reduce(
        (value, [name, replacement]) => substitute(value, `{${name}}`, replacement),
        argument,
      ),
    );
    return this.execute(args);
  }

  private execute(args: readonly string[]): Promise<string> {
    return new Promise((resolveOutput, reject) => {
      void import("node:child_process").then(({ spawn }) => {
        const child = spawn(this.executable, args, {
          cwd: this.workingDirectory,
          stdio: "pipe",
          ...treeRootOptions(),
        });
        this.readProcess(child, resolveOutput, reject);
      }, reject);
    });
  }

  private readProcess(
    child: ChildProcessWithoutNullStreams,
    resolveOutput: (output: string) => void,
    reject: (error: Error) => void,
  ): void {
    let output = "";
    let errors = "";
    let settled = false;
    const settle = (answer: string | Error): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (typeof answer === "string") resolveOutput(answer);
      else reject(answer);
    };
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => (output += chunk));
    child.stderr.on("data", (chunk: string) => (errors = (errors + chunk).slice(-8192)));
    child.on("error", (error) => settle(new ConfiguredCommandProcessError(error.message)));
    child.on("close", (code) => {
      if (code === 0) settle(output);
      else {
        const detail = errors.trim();
        settle(
          new ConfiguredCommandProcessError(
            detail === "" ? `the command exited with code ${String(code)}` : detail,
          ),
        );
      }
    });
    const timer = setTimeout(() => {
      stopTree(child);
      settle(new ConfiguredCommandProcessError(`the command exceeded ${this.timeoutMs} ms`));
    }, this.timeoutMs);
  }
}

function substitute(text: string, placeholder: string, value: string): string {
  return text.split(placeholder).join(value);
}

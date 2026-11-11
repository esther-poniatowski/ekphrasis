/**
 * Desktop process for a configured generated-view command. The producer selects the file and
 * reports it as JSON, so Ekphrasis does not reproduce the producer's target-to-view rules.
 */
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import type { GeneratedViewRunner } from "../../application";
import { EkphrasisError } from "../../errors";
import { stopTree, treeRootOptions } from "../python/process-tree";

interface GeneratedViewResult {
  readonly path: string;
}

export class GeneratedViewProcessError extends EkphrasisError {
  override name = "GeneratedViewProcessError";
}

export class GeneratedViewProcess implements GeneratedViewRunner {
  constructor(
    private readonly executable: string,
    private readonly vaultRoot: string,
    private readonly timeoutMs: number,
  ) {}

  async run(command: readonly string[], target: string): Promise<string> {
    const normalizedTarget = target.trim();
    if (normalizedTarget === "") throw new GeneratedViewProcessError("enter a completion target");
    const args = command.map((argument) =>
      substitute(substitute(argument, "{vault}", this.vaultRoot), "{target}", normalizedTarget),
    );
    const output = await this.execute(args);
    let parsed: unknown;
    try {
      parsed = JSON.parse(output.trim());
    } catch {
      throw new GeneratedViewProcessError("the producer did not return one JSON result");
    }
    if (!isGeneratedViewResult(parsed)) {
      throw new GeneratedViewProcessError("the producer result does not contain a path");
    }
    return this.vaultPath(parsed.path);
  }

  private execute(args: readonly string[]): Promise<string> {
    return new Promise((resolveOutput, reject) => {
      void import("node:child_process").then(({ spawn }) => {
        const child = spawn(this.executable, args, {
          cwd: this.vaultRoot,
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
    child.on("error", (error) => settle(new GeneratedViewProcessError(error.message)));
    child.on("close", (code) => {
      if (code === 0) settle(output);
      else {
        const detail = errors.trim();
        settle(
          new GeneratedViewProcessError(
            detail === "" ? `the producer exited with code ${String(code)}` : detail,
          ),
        );
      }
    });
    const timer = setTimeout(() => {
      stopTree(child);
      settle(new GeneratedViewProcessError(`the producer exceeded ${this.timeoutMs} ms`));
    }, this.timeoutMs);
  }

  private async vaultPath(reported: string): Promise<string> {
    const paths = await import("node:path");
    const absolute = paths.resolve(this.vaultRoot, reported);
    const path = paths.relative(this.vaultRoot, absolute);
    if (path === "" || path === ".." || path.startsWith(`..${paths.sep}`)) {
      throw new GeneratedViewProcessError("the producer returned a path outside the vault");
    }
    if (!/\.ya?ml$/iu.test(path)) {
      throw new GeneratedViewProcessError("the producer returned a file that is not YAML");
    }
    const { stat } = await import("node:fs/promises");
    try {
      if (!(await stat(absolute)).isFile()) throw new Error("not a file");
    } catch {
      throw new GeneratedViewProcessError("the producer returned a YAML file that does not exist");
    }
    return path.split(paths.sep).join("/");
  }
}

function substitute(text: string, placeholder: string, value: string): string {
  return text.split(placeholder).join(value);
}

function isGeneratedViewResult(value: unknown): value is GeneratedViewResult {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    typeof (value as Record<string, unknown>)["path"] === "string"
  );
}

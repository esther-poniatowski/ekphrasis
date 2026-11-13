/**
 * Desktop process for a configured generated-view command. The producer selects the file and
 * reports it as JSON, so Ekphrasis does not reproduce the producer's target-to-view rules.
 */
import type { GeneratedViewRunner } from "../../application";
import { EkphrasisError } from "../../errors";
import {
  ConfiguredCommandProcess,
  ConfiguredCommandProcessError,
} from "./configured-command-process";

interface GeneratedViewResult {
  readonly path: string;
}

export class GeneratedViewProcessError extends EkphrasisError {
  override name = "GeneratedViewProcessError";
}

export class GeneratedViewProcess implements GeneratedViewRunner {
  private readonly process: ConfiguredCommandProcess;

  constructor(
    executable: string,
    private readonly vaultRoot: string,
    timeoutMs: number,
  ) {
    this.process = new ConfiguredCommandProcess(executable, vaultRoot, timeoutMs);
  }

  async run(command: readonly string[], target: string): Promise<string> {
    const normalizedTarget = target.trim();
    if (normalizedTarget === "") throw new GeneratedViewProcessError("enter a completion target");
    let output: string;
    try {
      output = await this.process.run(command, {
        vault: this.vaultRoot,
        target: normalizedTarget,
      });
    } catch (error) {
      if (error instanceof ConfiguredCommandProcessError) {
        throw new GeneratedViewProcessError(error.message);
      }
      throw error;
    }
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

function isGeneratedViewResult(value: unknown): value is GeneratedViewResult {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    typeof (value as Record<string, unknown>)["path"] === "string"
  );
}

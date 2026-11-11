import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { GeneratedViewProcess } from "../../src/infrastructure";

const roots: string[] = [];

afterEach(async () => {
  const { rm } = await import("node:fs/promises");
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function runner(): Promise<{ root: string; process: GeneratedViewProcess }> {
  const root = await mkdtemp(join(tmpdir(), "ekphrasis-view-"));
  roots.push(root);
  await mkdir(join(root, "views"));
  return { root, process: new GeneratedViewProcess(process.execPath, root, 5000) };
}

describe("generated view process", () => {
  it("substitutes the explicit target and returns the producer-selected vault path", async () => {
    const { root, process: producer } = await runner();
    await writeFile(join(root, "views", "question-typed.yml"), "_schema: example:view@1\n");

    await expect(
      producer.run(
        [
          "-e",
          "console.log(JSON.stringify({path: process.argv[1]}))",
          "{vault}/views/{target}.yml",
        ],
        "question-typed",
      ),
    ).resolves.toBe("views/question-typed.yml");
  });

  it("requires one non-empty explicit target", async () => {
    const { process: producer } = await runner();
    await expect(producer.run(["-e", ""], "  ")).rejects.toThrow("enter a completion target");
  });

  it("rejects output that is not the machine-readable producer contract", async () => {
    const { process: producer } = await runner();
    await expect(producer.run(["-e", 'console.log("written")'], "target")).rejects.toThrow(
      "did not return one JSON result",
    );
  });

  it("refuses a reported file outside the vault", async () => {
    const { root, process: producer } = await runner();
    await expect(
      producer.run(
        ["-e", "console.log(JSON.stringify({path: process.argv[1]}))", join(root, "..", "x.yml")],
        "target",
      ),
    ).rejects.toThrow("outside the vault");
  });

  it("refuses a reported YAML file that was not generated", async () => {
    const { process: producer } = await runner();
    await expect(
      producer.run(["-e", "console.log(JSON.stringify({path: 'views/missing.yml'}))"], "target"),
    ).rejects.toThrow("does not exist");
  });
});

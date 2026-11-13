import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ConfiguredCommandProcess } from "../../src/infrastructure";

const roots: string[] = [];

afterEach(async () => {
  const { rm } = await import("node:fs/promises");
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function runner(): Promise<ConfiguredCommandProcess> {
  const root = await mkdtemp(join(tmpdir(), "ekphrasis-command-"));
  roots.push(root);
  return new ConfiguredCommandProcess(process.execPath, root, 5000);
}

describe("configured command process", () => {
  it("substitutes each declared placeholder without invoking a shell", async () => {
    const process = await runner();

    await expect(
      process.run(
        ["-e", "console.log(process.argv.slice(1).join('|'))", "{vault}", "{path}", "{schema}"],
        {
          vault: "/vault root",
          path: "inquiry/new-question.yml",
          schema: "project:question@1",
        },
      ),
    ).resolves.toBe("/vault root|inquiry/new-question.yml|project:question@1\n");
  });

  it("reports a command failure from standard error", async () => {
    const process = await runner();

    await expect(
      process.run(["-e", "console.error('registration failed'); process.exit(3)"], {}),
    ).rejects.toThrow("registration failed");
  });
});

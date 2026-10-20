import { describe, expect, it } from "vitest";
import {
  OutlineChannel,
  type OutlineSource,
} from "../../src/adapters/obsidian/views/outline-channel";

const source = (filePath: string): OutlineSource => ({
  filePath,
  form: null,
  focusedId: null,
  reveal: () => undefined,
});

describe("channel of the outline", () => {
  it("follows the active source, and reports the changes of that source only", () => {
    const channel = new OutlineChannel();
    const calls: (string | null)[] = [];
    const unsubscribe = channel.subscribe(() => calls.push(channel.source?.filePath ?? null));
    const a = source("a.yml");
    const b = source("b.yml");
    channel.activate(a);
    channel.activate(a);
    channel.changed(b);
    channel.changed(a);
    channel.activate(b);
    channel.release(a);
    channel.release(b);
    unsubscribe();
    channel.activate(a);
    expect(calls).toEqual(["a.yml", "a.yml", "b.yml", null]);
  });
});

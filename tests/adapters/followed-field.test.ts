import { describe, expect, it } from "vitest";
import type { FormState } from "../../src/application";
import { followedOutcome, subpathOfState } from "../../src/adapters/obsidian/views/followed-field";
import type { YamlPath } from "../../src/domain";

/** A form state of status `form`; the outcome reads its status only. */
const FORM = { status: "form" } as FormState;
const UNBOUND: FormState = { status: "unbound" };

const holds =
  (...ids: string[]) =>
  (path: YamlPath): boolean =>
    ids.includes(path.join("."));

describe("ephemeral state of a followed link", () => {
  it("reads the subpath passed by Obsidian, and ignores the other states", () => {
    expect(subpathOfState({ subpath: "#subject.system" })).toBe("#subject.system");
    expect(subpathOfState({ focus: true })).toBeNull();
    expect(subpathOfState(null)).toBeNull();
    expect(subpathOfState({ subpath: 3 })).toBeNull();
  });
});

describe("field reached by a followed link", () => {
  it("moves the form to the field once the form is built", () => {
    expect(followedOutcome("#subject.system", null, holds("subject.system"))).toEqual({
      kind: "wait",
    });
    expect(followedOutcome("#subject.system", FORM, holds("subject.system"))).toEqual({
      kind: "reveal",
      path: ["subject", "system"],
    });
    expect(followedOutcome("#rows[1].name", FORM, holds("rows.1.name"))).toEqual({
      kind: "reveal",
      path: ["rows", 1, "name"],
    });
  });

  it("leaves the form as it is for a link to the root", () => {
    expect(followedOutcome("", FORM, holds())).toEqual({ kind: "none" });
  });

  it("names a field path that designates no field of the form", () => {
    expect(followedOutcome("#subject.missing", FORM, holds("subject.system"))).toEqual({
      kind: "notice",
      message:
        "Ekphrasis: the instance holds no field `subject.missing`, so the form opens at its top.",
    });
  });

  it("states the defect of a malformed field path, without waiting for the form", () => {
    expect(followedOutcome("#rows[*]", null, holds())).toMatchObject({
      kind: "notice",
      message: expect.stringContaining("holds a wildcard") as string,
    });
    expect(followedOutcome("#", null, holds())).toMatchObject({ kind: "notice" });
  });

  it("reports an instance without a form", () => {
    expect(followedOutcome("#subject.system", UNBOUND, holds())).toEqual({
      kind: "notice",
      message:
        "Ekphrasis: the instance has no form, so the link cannot reach the field `subject.system`.",
    });
  });
});

import { describe, expect, it } from "vitest";
import { readModeline } from "../../../src/domain";

describe("modeline", () => {
  it("reads the schema among the leading comment lines", () => {
    const text = "# Header\n\n# yaml-language-server: $schema=../s/q.schema.yaml\nid: x\n";
    expect(readModeline(text)).toBe("../s/q.schema.yaml");
  });

  it("tolerates a byte order mark, spacing and CRLF line ends", () => {
    expect(readModeline("﻿#  yaml-language-server :  $schema=q.yaml  \r\nid: x")).toBe("q.yaml");
  });

  it("ignores a modeline after the first data line", () => {
    expect(readModeline("id: x\n# yaml-language-server: $schema=q.yaml\n")).toBeNull();
  });

  it("returns null without a modeline", () => {
    expect(readModeline("# a comment\nid: x\n")).toBeNull();
    expect(readModeline("")).toBeNull();
  });
});

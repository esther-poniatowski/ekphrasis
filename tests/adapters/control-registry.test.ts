import { describe, expect, it } from "vitest";
import { createDefaultRegistry } from "../../src/adapters/obsidian/ui/default-registry";
import { GroupSection } from "../../src/adapters/obsidian/ui/sections/group-section";
import { SequenceSection } from "../../src/adapters/obsidian/ui/sections/sequence-section";
import { MAPPING_KINDS, SCALAR_KINDS, SEQUENCE_KINDS } from "../../src/domain";

describe("default control registry", () => {
  const registry = createDefaultRegistry();

  it.each(SCALAR_KINDS)("registers a control for the scalar kind %s", (kind) => {
    expect(registry.hasControl(kind)).toBe(true);
  });

  it("displays every collection kind, through a section until its control exists", () => {
    for (const kind of MAPPING_KINDS) expect(registry.mapping(kind)).toBe(GroupSection);
    for (const kind of SEQUENCE_KINDS) expect(registry.sequence(kind)).toBe(SequenceSection);
  });
});

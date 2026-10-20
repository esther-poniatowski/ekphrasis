import { describe, expect, it } from "vitest";
import { ChoicesControl } from "../../src/adapters/obsidian/ui/controls/choices-control";
import { createDefaultRegistry } from "../../src/adapters/obsidian/ui/default-registry";
import { GroupSection } from "../../src/adapters/obsidian/ui/sections/group-section";
import { KeyedRecordsSection } from "../../src/adapters/obsidian/ui/sections/keyed-records-section";
import { SequenceSection } from "../../src/adapters/obsidian/ui/sections/sequence-section";
import {
  KeyedTableSection,
  TableSection,
} from "../../src/adapters/obsidian/ui/sections/table-section";
import { MAPPING_KINDS, SCALAR_KINDS, SEQUENCE_KINDS } from "../../src/domain";

describe("default control registry", () => {
  const registry = createDefaultRegistry();

  it.each([...SCALAR_KINDS, ...MAPPING_KINDS, ...SEQUENCE_KINDS])(
    "registers a control for the kind %s",
    (kind) => {
      expect(registry.hasControl(kind)).toBe(true);
    },
  );

  it("displays each collection kind through its own control", () => {
    expect(registry.mapping("group")).toBe(GroupSection);
    expect(registry.mapping("alternatives")).toBe(GroupSection);
    expect(registry.mapping("keyed-table")).toBe(KeyedTableSection);
    expect(registry.mapping("keyed-records")).toBe(KeyedRecordsSection);
    expect(registry.sequence("list")).toBe(SequenceSection);
    expect(registry.sequence("records")).toBe(SequenceSection);
    expect(registry.sequence("table")).toBe(TableSection);
    expect(registry.sequence("choices")).toBe(ChoicesControl);
  });
});

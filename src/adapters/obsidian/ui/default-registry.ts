/**
 * Registry holding the controls shipped with ekphrasis.
 */
import { ControlRegistry } from "./control-registry";
import { BooleanControl } from "./controls/boolean-control";
import { ChoiceControl } from "./controls/choice-control";
import { ChoicesControl } from "./controls/choices-control";
import { RenderedControl } from "./controls/rendered-control";
import { NumberControl, TextControl } from "./controls/text-control";
import { GroupSection } from "./sections/group-section";
import { KeyedRecordsSection } from "./sections/keyed-records-section";
import { SequenceSection } from "./sections/sequence-section";
import { KeyedTableSection, TableSection } from "./sections/table-section";

export function createDefaultRegistry(): ControlRegistry {
  return new ControlRegistry({
    scalar: TextControl,
    mapping: GroupSection,
    sequence: SequenceSection,
  })
    .registerScalar(["label", "text"], TextControl)
    .registerScalar(["markdown-line", "markdown", "latex"], RenderedControl)
    .registerScalar(["number"], NumberControl)
    .registerScalar(["boolean"], BooleanControl)
    .registerScalar(["choice"], ChoiceControl)
    .registerMapping(["group", "alternatives"], GroupSection)
    .registerMapping(["keyed-table"], KeyedTableSection)
    .registerMapping(["keyed-records"], KeyedRecordsSection)
    .registerSequence(["list", "records"], SequenceSection)
    .registerSequence(["table"], TableSection)
    .registerSequence(["choices"], ChoicesControl);
}

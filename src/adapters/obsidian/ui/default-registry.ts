/**
 * Registry holding the controls shipped with ekphrasis.
 */
import { ControlRegistry } from "./control-registry";
import { BooleanControl } from "./controls/boolean-control";
import { ChoiceControl } from "./controls/choice-control";
import { NumberControl } from "./controls/number-control";
import { TextControl } from "./controls/text-control";
import { TextareaControl } from "./controls/textarea-control";
import { GroupSection } from "./sections/group-section";
import { SequenceSection } from "./sections/sequence-section";

export function createDefaultRegistry(): ControlRegistry {
  return new ControlRegistry({
    scalar: TextControl,
    mapping: GroupSection,
    sequence: SequenceSection,
  })
    .registerScalar(["label", "text", "markdown-line", "latex"], TextControl)
    .registerScalar(["markdown"], TextareaControl)
    .registerScalar(["number"], NumberControl)
    .registerScalar(["boolean"], BooleanControl)
    .registerScalar(["choice"], ChoiceControl)
    .registerMapping(["group"], GroupSection);
}

/**
 * Content of an Obsidian notice, in which each span between backticks displays as code.
 *
 * A notice given a string displays its backticks as written, so every notice whose text marks a
 * path or an identifier with backticks passes it through this function.
 */
import { codeSpans } from "./code-spans";

export function noticeText(text: string): DocumentFragment {
  const fragment = document.createDocumentFragment();
  for (const span of codeSpans(text)) {
    if (span.code) {
      const code = document.createElement("code");
      code.textContent = span.text;
      fragment.append(code);
    } else if (span.text !== "") {
      fragment.append(document.createTextNode(span.text));
    }
  }
  return fragment;
}

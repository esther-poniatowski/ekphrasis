/**
 * Environment of the checkers inside Obsidian: the checker `latex` renders a formula with the
 * MathJax of Obsidian, and reports the error that MathJax marks in its output.
 */
import { renderMath } from "obsidian";
import type { CheckerEnvironment } from "../../domain";

/**
 * MathJax renders a formula that fails to parse as an element `mjx-merror`, whose attribute
 * `data-mjx-error` holds the message. An undefined command renders in colour, without error.
 */
export const OBSIDIAN_CHECKER_ENVIRONMENT: CheckerEnvironment = {
  formulaError(source: string): string | null {
    try {
      const error = renderMath(source, false).querySelector("mjx-merror");
      if (error === null) return null;
      return error.getAttribute("data-mjx-error") ?? error.textContent ?? "unknown error";
    } catch (error) {
      // MathJax loads after the plugin, so a formula checked before MathJax is ready reports no error.
      console.warn("ekphrasis: a formula could not be checked.", error);
      return null;
    }
  },
};

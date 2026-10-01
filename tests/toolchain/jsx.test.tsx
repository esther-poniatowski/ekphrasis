/**
 * Guards the JSX settings of `tsconfig.json`: a TSX file under Vitest must compile to Preact calls.
 */
import { isValidElement } from "preact";
import { describe, expect, it } from "vitest";

describe("JSX toolchain", () => {
  it("compiles TSX to Preact elements", () => {
    const element = <p class="probe">text</p>;

    expect(isValidElement(element)).toBe(true);
    expect(element.type).toBe("p");
    expect(element.props).toMatchObject({ class: "probe", children: "text" });
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const global = readFileSync(join(__dirname, "global.css"), "utf8");

function ruleBody(selector: string): string {
  const start = global.indexOf(`${selector} {`);
  expect(start, `missing rule for ${selector}`).toBeGreaterThan(-1);
  return global.slice(start, global.indexOf("}", start));
}

describe("piano key surfaces survive the dark theme", () => {
  const keyFaces = [
    ".jam-key--white",
    ".jam-key--black",
    ".hero-key--white",
    ".hero-key--black"
  ];

  it.each(keyFaces)("%s paints a literal key colour, not a theme token", (selector) => {
    const body = ruleBody(selector);

    expect(body).toMatch(/background:\s*var\(--key-/);
    expect(body).not.toMatch(/var\(--inverse-surface\)/);
  });

  const keyBeds = [".jam-keyboard", ".hero-piano"];

  it.each(keyBeds)("%s uses a fixed felt colour so white keys stay legible", (selector) => {
    const body = ruleBody(selector);

    expect(body).toMatch(/background:\s*var\(--key-bed\)/);
    expect(body).not.toMatch(/var\(--inverse-surface\)/);
  });

  it("defines key tokens once and does not flip them per theme", () => {
    const theme = readFileSync(join(__dirname, "theme.css"), "utf8");
    const darkBlock = theme.slice(theme.indexOf('[data-theme="dark"] {'));

    for (const token of ["--key-white", "--key-black", "--key-bed"]) {
      expect(theme, `${token} must be defined`).toContain(`${token}:`);
      expect(darkBlock, `${token} must not be overridden in dark`).not.toContain(`${token}:`);
    }
  });

  it("keeps the in-scale hint readable by layering over the key colour", () => {
    for (const selector of [".jam-key--white.is-in-scale", ".jam-key--black.is-in-scale"]) {
      const body = ruleBody(selector);

      expect(body).toMatch(/var\(--key-(white|black)\)/);
      expect(body).not.toMatch(/#ffffff|#20242a/);
    }
  });
});

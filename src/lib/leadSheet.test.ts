import { describe, expect, it } from "vitest";
import {
  buildLeadSheet,
  leadSheetHtmlFromSketch,
  renderLeadSheetHtml
} from "./leadSheet";
import { createDefaultSongSketch } from "./songSketches";
import type { SongSketch } from "../types/course";

function emptyTracksSketch(title = "Empty"): SongSketch {
  const base = createDefaultSongSketch(title);

  return {
    ...base,
    form: [],
    tracks: {
      drums: [],
      bass: [],
      chords: [],
      melody: [],
      voiceGuide: []
    }
  };
}

describe("buildLeadSheet", () => {
  it("groups bars into sections and resolves I in C to chord symbol C", () => {
    // Given a default sketch in C major (form A A B B A A B B).
    const sketch = createDefaultSongSketch("Test");

    // When the lead sheet model is built.
    const sheet = buildLeadSheet(sketch);

    // Then sections collapse the runs and the first chord resolves to C.
    expect(sheet.title).toBe("Test");
    expect(sheet.key).toBe("C");
    expect(sheet.mode).toBe("major");
    expect(sheet.sections.map((section) => section.label)).toEqual([
      "A",
      "B",
      "A",
      "B",
      "C",
      "A"
    ]);
    expect(sheet.sections[0].bars[0].chordNumeral).toBe("I");
    expect(sheet.sections[0].bars[0].chordSymbol).toBe("C");
  });

  it("collapses consecutive identical form labels into one multi-bar section", () => {
    // Given a sketch whose form is a single run of four A bars.
    const base = createDefaultSongSketch("Run");
    const sketch: SongSketch = {
      ...base,
      form: ["A", "A", "A", "A"],
      tracks: {
        ...base.tracks,
        chords: ["I", "IV", "V", "I"],
        melody: ["C4", "E4", "G4", "C5"]
      }
    };

    // When built.
    const sheet = buildLeadSheet(sketch);

    // Then there is exactly one section holding all four bars in order.
    expect(sheet.sections).toHaveLength(1);
    expect(sheet.sections[0].label).toBe("A");
    expect(sheet.sections[0].bars.map((bar) => bar.barIndex)).toEqual([
      0, 1, 2, 3
    ]);
  });

  it("resolves a V7 bar to the chord symbol G7 in C major", () => {
    // Given a sketch with a single dominant-seventh bar in C.
    const base = createDefaultSongSketch("Dominant");
    const sketch: SongSketch = {
      ...base,
      form: ["A"],
      tracks: { ...base.tracks, chords: ["V7"], melody: ["G4"] }
    };

    // When built.
    const sheet = buildLeadSheet(sketch);

    // Then the numeral V7 resolves to G7.
    expect(sheet.sections[0].bars[0].chordSymbol).toBe("G7");
  });

  it("does not throw on an empty-tracks sketch and yields no sections", () => {
    // Given a sketch with empty form and tracks.
    const sketch = emptyTracksSketch();

    // When/Then building never throws and produces an empty section list.
    expect(() => buildLeadSheet(sketch)).not.toThrow();
    expect(buildLeadSheet(sketch).sections).toEqual([]);
  });

  it("guards a form longer than the chords track with safe defaults", () => {
    // Given more form bars than chord/melody slots.
    const base = createDefaultSongSketch("Ragged");
    const sketch: SongSketch = {
      ...base,
      form: ["A", "A", "A"],
      tracks: { ...base.tracks, chords: ["I"], melody: ["C4"] }
    };

    // When built.
    const sheet = buildLeadSheet(sketch);
    const bars = sheet.sections[0].bars;

    // Then missing slots fall back to "I" and "rest" without throwing.
    expect(bars).toHaveLength(3);
    expect(bars[1].chordNumeral).toBe("I");
    expect(bars[1].melody).toBe("rest");
  });
});

describe("renderLeadSheetHtml", () => {
  it("returns a complete document with the title and a print block", () => {
    // Given a built default sheet.
    const sheet = buildLeadSheet(createDefaultSongSketch("Print Me"));

    // When rendered to HTML.
    const html = renderLeadSheetHtml(sheet);

    // Then it is a valid doctype document with title and print media query.
    expect(html.toLowerCase().startsWith("<!doctype html")).toBe(true);
    expect(html).toContain("Print Me");
    expect(html).toContain("@media print");
    expect(html).toContain("</html>");
  });

  it("escapes dangerous title text instead of emitting raw markup", () => {
    // Given a title containing a script tag and an ampersand.
    const base = createDefaultSongSketch("<script>alert(1)</script> & Co");
    const sheet = buildLeadSheet(base);

    // When rendered.
    const html = renderLeadSheetHtml(sheet);

    // Then the raw tag is gone and entities are present.
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&amp;");
  });

  it("renders a minimal but valid document for an empty sketch", () => {
    // Given an empty-tracks sketch.
    const sheet = buildLeadSheet(emptyTracksSketch("Nothing Yet"));

    // When rendered.
    const html = renderLeadSheetHtml(sheet);

    // Then it stays valid and shows the gentle placeholder.
    expect(html.toLowerCase().startsWith("<!doctype html")).toBe(true);
    expect(html).toContain("no bars yet");
    expect(html).not.toContain("<script>");
  });
});

describe("leadSheetHtmlFromSketch", () => {
  it("matches rendering the built model directly", () => {
    // Given a default sketch.
    const sketch = createDefaultSongSketch("One Step");

    // When using the convenience function.
    const direct = renderLeadSheetHtml(buildLeadSheet(sketch));
    const convenience = leadSheetHtmlFromSketch(sketch);

    // Then both paths produce identical output.
    expect(convenience).toBe(direct);
  });
});

/**
 * Printable lead-sheet builder for the Song Lab.
 *
 * Turns a {@link SongSketch} into a calm, printable lead sheet: a typed data
 * model ({@link LeadSheet}) and a self-contained HTML document string
 * ({@link renderLeadSheetHtml}) ready to hand to a print surface.
 *
 * The model groups consecutive bars by their `form` label into sections, and
 * resolves each bar's Roman numeral into a concrete chord symbol via
 * {@link theoryContextForChord} so the printed sheet shows real chord names
 * (e.g. "I" in C -> "C", "V7" -> "G7") alongside the numeral.
 *
 * Everything here is pure and deterministic: no React, no Tone.js, no
 * randomness, no Date, no DOM, and no network or file I/O. The functions build
 * strings and plain data only; opening a window or invoking print belongs to
 * the page layer. All dynamic text is HTML-escaped, and the rendered document
 * contains no `<script>`.
 *
 * @see ./theoryContext for chord resolution.
 * @see ./songSketches for {@link createDefaultSongSketch} fixtures.
 */

import type { SongSketch } from "../types/course";
import type { KeyMode } from "./theory";
import { theoryContextForChord } from "./theoryContext";

/** A single bar of a lead sheet, resolved to a concrete chord symbol. */
export type LeadSheetBar = {
  /** Zero-based bar index within the original sketch. */
  barIndex: number;
  /** Roman numeral (or figured-bass token) as authored, e.g. "I", "V7". */
  chordNumeral: string;
  /** Concrete chord symbol resolved within the key, e.g. "C", "G7". */
  chordSymbol: string;
  /** Melody note name for the bar, e.g. "E4", or "rest". */
  melody: string;
};

/** A run of consecutive bars sharing the same `form` label. */
export type LeadSheetSection = {
  /** The shared form label, e.g. "A", "B", "Chorus". */
  label: string;
  /** Bars belonging to this section, in order. */
  bars: LeadSheetBar[];
};

/** The full printable lead-sheet model derived from a {@link SongSketch}. */
export type LeadSheet = {
  title: string;
  key: string;
  mode: KeyMode;
  bpm: number;
  meter: string;
  sections: LeadSheetSection[];
};

/** Placeholder used when a melody slot is empty/missing. */
const EMPTY_MELODY = "rest";

/** Escape text for safe interpolation into HTML element content/attributes. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Resolve a Roman numeral to a concrete chord symbol within the key/mode. */
function resolveChordSymbol(
  numeral: string,
  key: string,
  mode: KeyMode
): string {
  return theoryContextForChord({ key, mode, chord: numeral }).chord;
}

/**
 * Build the lead-sheet data model from a sketch.
 *
 * Bars are taken from `form` and grouped into sections wherever the label
 * changes. Each bar resolves its chord symbol from the parallel `chords`
 * track; out-of-range chord or melody slots fall back to safe defaults
 * ("I" and "rest") so a ragged or empty sketch never throws.
 */
export function buildLeadSheet(sketch: SongSketch): LeadSheet {
  const key = sketch.key ?? "C";
  const mode: KeyMode = sketch.mode === "minor" ? "minor" : "major";
  const chords = sketch.tracks.chords;
  const melody = sketch.tracks.melody;

  const sections: LeadSheetSection[] = [];

  for (let barIndex = 0; barIndex < sketch.form.length; barIndex += 1) {
    const label = sketch.form[barIndex];
    const chordNumeral = chords[barIndex] ?? "I";
    const melodyNote = melody[barIndex] ?? EMPTY_MELODY;

    const bar: LeadSheetBar = {
      barIndex,
      chordNumeral,
      chordSymbol: resolveChordSymbol(chordNumeral, key, mode),
      melody: melodyNote
    };

    const current = sections.at(-1);

    if (current && current.label === label) {
      current.bars.push(bar);
    } else {
      sections.push({ label, bars: [bar] });
    }
  }

  return {
    title: sketch.title,
    key,
    mode,
    bpm: sketch.bpm,
    meter: sketch.meter,
    sections
  };
}

/** Render a single bar block. */
function renderBar(bar: LeadSheetBar): string {
  const isRest = bar.melody.trim().toLowerCase() === EMPTY_MELODY;
  const melodyMarkup = isRest
    ? '<span class="rest" aria-label="rest">&#119102;</span>'
    : escapeHtml(bar.melody);

  return [
    '<div class="bar">',
    `<div class="chord">${escapeHtml(bar.chordSymbol)}</div>`,
    `<div class="numeral">${escapeHtml(bar.chordNumeral)}</div>`,
    `<div class="melody">${melodyMarkup}</div>`,
    "</div>"
  ].join("");
}

/** Render a labeled section block. */
function renderSection(section: LeadSheetSection): string {
  const bars = section.bars.map(renderBar).join("");

  return [
    '<section class="section">',
    `<h2 class="section-label">${escapeHtml(section.label)}</h2>`,
    `<div class="bars">${bars}</div>`,
    "</section>"
  ].join("");
}

/** Inline stylesheet for the printable document. */
const LEAD_SHEET_STYLES = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 2rem;
    font-family: "Iowan Old Style", Georgia, "Times New Roman", serif;
    color: #1c1b22;
    background: #fbfbf7;
    line-height: 1.5;
  }
  header.sheet-header {
    border-bottom: 2px solid #1c1b22;
    padding-bottom: 1rem;
    margin-bottom: 1.5rem;
  }
  h1.sheet-title {
    margin: 0 0 0.35rem;
    font-size: 2rem;
    letter-spacing: 0.01em;
  }
  .sheet-meta {
    margin: 0;
    font-size: 0.95rem;
    color: #4a4754;
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 1.25rem;
  }
  .sheet-meta span { white-space: nowrap; }
  .section { margin-bottom: 1.5rem; page-break-inside: avoid; }
  .section-label {
    margin: 0 0 0.5rem;
    font-size: 1.05rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: #6b4f9b;
  }
  .bars {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .bar {
    border: 1px solid #d7d4cc;
    border-radius: 6px;
    padding: 0.6rem 0.85rem;
    min-width: 5.5rem;
    text-align: center;
    background: #ffffff;
  }
  .bar .chord { font-size: 1.4rem; font-weight: 600; }
  .bar .numeral { font-size: 0.8rem; color: #8a8794; margin-top: 0.1rem; }
  .bar .melody {
    margin-top: 0.5rem;
    padding-top: 0.4rem;
    border-top: 1px dotted #d7d4cc;
    font-size: 0.95rem;
    color: #36333f;
  }
  .bar .melody .rest { font-size: 1.2rem; color: #b3b0bb; }
  .empty-note { color: #6b6873; font-style: italic; }
  @media print {
    body { padding: 0; background: #ffffff; }
    .bar { background: #ffffff; }
    .section { page-break-inside: avoid; }
  }
`;

/**
 * Render a complete, self-contained HTML document for the lead sheet.
 *
 * The output is a valid `<!doctype html>` document with an inline `<style>`
 * block (including an `@media print` section) and no JavaScript. All dynamic
 * text is escaped. An empty sketch yields a valid but minimal document with a
 * gentle placeholder rather than an error.
 */
export function renderLeadSheetHtml(sheet: LeadSheet): string {
  const body =
    sheet.sections.length > 0
      ? sheet.sections.map(renderSection).join("")
      : '<p class="empty-note">This sketch has no bars yet.</p>';

  const meta = [
    `<span>Key: ${escapeHtml(sheet.key)} ${escapeHtml(sheet.mode)}</span>`,
    `<span>Tempo: ${escapeHtml(String(sheet.bpm))} BPM</span>`,
    `<span>Meter: ${escapeHtml(sheet.meter)}</span>`
  ].join("");

  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(sheet.title)} &mdash; Lead Sheet</title>`,
    `<style>${LEAD_SHEET_STYLES}</style>`,
    "</head>",
    "<body>",
    '<header class="sheet-header">',
    `<h1 class="sheet-title">${escapeHtml(sheet.title)}</h1>`,
    `<p class="sheet-meta">${meta}</p>`,
    "</header>",
    '<main class="sheet-body">',
    body,
    "</main>",
    "</body>",
    "</html>"
  ].join("");
}

/** Build and render a sketch's lead sheet in one step. */
export function leadSheetHtmlFromSketch(sketch: SongSketch): string {
  return renderLeadSheetHtml(buildLeadSheet(sketch));
}

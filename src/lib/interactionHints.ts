import type { InteractionHint, PracticePrompt } from "./practiceEngine";

const routeByModule: Record<string, string> = {
  pitch: "/practice/pitch/setup",
  staff: "/practice/staff/setup",
  scales: "/practice/scales/setup",
  intervals: "/practice/intervals/setup",
  chords: "/practice/chords/setup",
  harmony: "/practice/harmony/setup",
  rhythm: "/practice/rhythm/setup",
  ear: "/practice/ear/setup",
  instruments: "/practice/instruments/setup"
};

function moduleHint(prompt: PracticePrompt): string {
  if (prompt.inputMode === "staff-click") {
    return "Anchor the clef first, then count lines and spaces from a note you know.";
  }

  if (prompt.inputMode === "rhythm-grid") {
    return "Count the total beat value before checking the pattern.";
  }

  if (prompt.inputMode === "piano-roll" || prompt.moduleId === "chords") {
    return "Check the root, third, and fifth before adding color tones or inversions.";
  }

  if (prompt.inputMode === "harmony-board") {
    return "Name the key, then map each chord to its scale degree.";
  }

  if (prompt.inputMode === "analysis-board") {
    return "Separate what the passage is doing from the exact chord labels.";
  }

  if (prompt.inputMode === "listening") {
    return "Replay once, sing or tap what changed, then choose the closest label.";
  }

  if (
    prompt.inputMode === "instrument-board" ||
    prompt.inputMode === "fretboard" ||
    prompt.inputMode === "drum-pad" ||
    prompt.inputMode === "voice-range" ||
    prompt.inputMode === "song-arranger"
  ) {
    return "Find the same idea on the instrument before naming it.";
  }

  if (prompt.moduleId === "scales") {
    return "Keep the letter names in order and then adjust sharps or flats.";
  }

  return "Compare your selection with the expected answer one item at a time.";
}

export function buildInteractionHint(
  prompt: PracticePrompt,
  selected: string[]
): InteractionHint {
  return {
    shortHint: prompt.interactionHint?.shortHint ?? moduleHint(prompt),
    selectedExplanation:
      prompt.interactionHint?.selectedExplanation ??
      `You selected ${selected.length > 0 ? selected.join(" -> ") : "nothing yet"}.`,
    retryTarget:
      prompt.interactionHint?.retryTarget ??
      `Retry ${prompt.skillTargets?.[0] ?? prompt.moduleId}.`,
    linkedPracticeRoute:
      prompt.interactionHint?.linkedPracticeRoute ??
      routeByModule[prompt.moduleId] ??
      "/practice",
    linkedInstrumentRoute:
      prompt.interactionHint?.linkedInstrumentRoute ??
      (prompt.moduleId === "instruments" ? "/instruments" : undefined)
  };
}

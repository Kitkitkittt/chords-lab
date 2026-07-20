import { Midi, Note } from "tonal";

export type SingBackScore = Readonly<{
  verdict: "match" | "low" | "high";
  targetNote: string;
  detectedNote: string;
  cents: number;
}>;

export type ClapOnset = Readonly<{
  rms: number;
  onset: boolean;
}>;

export type ClapBackScore = Readonly<{
  verdict: "match" | "close" | "retry";
  expectedCount: number;
  detectedCount: number;
  meanAbsoluteTimingErrorMs: number | null;
}>;

const DEFAULT_CLAP_THRESHOLD = 0.15;

export function scoreSingBack(
  targetNote: string,
  detectedFrequency: number
): SingBackScore | null {
  const targetMidi = Note.midi(targetNote);

  if (
    typeof targetMidi !== "number" ||
    !Number.isFinite(targetMidi) ||
    !Number.isFinite(detectedFrequency) ||
    detectedFrequency <= 0
  ) {
    return null;
  }

  const detectedMidi = Midi.freqToMidi(detectedFrequency);
  const detectedNote = Note.fromMidi(Math.round(detectedMidi));

  if (!Number.isFinite(detectedMidi) || !detectedNote) {
    return null;
  }

  const cents = Math.round(wrapPitchClassCents((detectedMidi - targetMidi) * 100));
  const verdict = Math.abs(cents) <= 35 ? "match" : cents < 0 ? "low" : "high";

  return Object.freeze({ verdict, targetNote, detectedNote, cents });
}

export function detectClapOnset(
  buffer: Float32Array,
  previousRms: number,
  threshold = DEFAULT_CLAP_THRESHOLD
): ClapOnset {
  if (
    buffer.length === 0 ||
    !Number.isFinite(previousRms) ||
    !Number.isFinite(threshold) ||
    threshold < 0
  ) {
    return Object.freeze({ rms: 0, onset: false });
  }

  let sumSquares = 0;

  for (const sample of buffer) {
    if (!Number.isFinite(sample)) {
      return Object.freeze({ rms: 0, onset: false });
    }

    sumSquares += sample * sample;
  }

  const rms = Math.sqrt(sumSquares / buffer.length);

  if (!Number.isFinite(rms)) {
    return Object.freeze({ rms: 0, onset: false });
  }

  return Object.freeze({
    rms,
    onset: previousRms < threshold && rms >= threshold
  });
}

export function scoreClapBack(
  pattern: readonly ("hit" | "rest")[],
  onsetTimesMs: readonly number[],
  bpm: number
): ClapBackScore {
  const expectedCount = pattern.filter((cell) => cell === "hit").length;
  const detectedCount = onsetTimesMs.length;

  if (
    !Number.isFinite(bpm) ||
    bpm <= 0 ||
    onsetTimesMs.some((time) => !Number.isFinite(time))
  ) {
    return clapScore("retry", expectedCount, detectedCount, null);
  }

  const eighthNoteMs = 30000 / bpm;
  const expectedTimes = pattern.reduce<number[]>((times, cell, index) => {
    if (cell === "hit") {
      times.push(index * eighthNoteMs);
    }

    return times;
  }, []);
  const normalizedExpected = normalizeTimes(expectedTimes);
  const normalizedDetected = normalizeTimes(onsetTimesMs);

  if (expectedCount === 0 || detectedCount === 0) {
    return clapScore(
      expectedCount === detectedCount ? "match" : "retry",
      expectedCount,
      detectedCount,
      null
    );
  }

  const exactErrors = timingErrors(normalizedExpected, normalizedDetected);

  if (expectedCount === detectedCount && exactErrors) {
    const meanAbsoluteTimingErrorMs = mean(exactErrors);

    if (exactErrors.every((error) => error <= 90)) {
      return clapScore(
        "match",
        expectedCount,
        detectedCount,
        meanAbsoluteTimingErrorMs
      );
    }

    if (exactErrors.every((error) => error <= 180)) {
      return clapScore(
        "close",
        expectedCount,
        detectedCount,
        meanAbsoluteTimingErrorMs
      );
    }

    return clapScore(
      "retry",
      expectedCount,
      detectedCount,
      meanAbsoluteTimingErrorMs
    );
  }

  if (Math.abs(expectedCount - detectedCount) === 1) {
    const closestErrors = closestOneOffErrors(normalizedExpected, normalizedDetected);

    if (closestErrors && closestErrors.every((error) => error <= 180)) {
      return clapScore("close", expectedCount, detectedCount, mean(closestErrors));
    }
  }

  return clapScore("retry", expectedCount, detectedCount, null);
}

function wrapPitchClassCents(cents: number): number {
  return ((cents + 600) % 1200 + 1200) % 1200 - 600;
}

function normalizeTimes(times: readonly number[]): number[] {
  const firstTime = times[0];
  return times.map((time) => time - firstTime);
}

function timingErrors(
  expectedTimes: readonly number[],
  detectedTimes: readonly number[]
): number[] | null {
  if (expectedTimes.length !== detectedTimes.length) {
    return null;
  }

  return expectedTimes.map((expectedTime, index) =>
    Math.abs(expectedTime - detectedTimes[index])
  );
}

function closestOneOffErrors(
  expectedTimes: readonly number[],
  detectedTimes: readonly number[]
): number[] | null {
  const longer = expectedTimes.length > detectedTimes.length ? expectedTimes : detectedTimes;
  const shorter = expectedTimes.length > detectedTimes.length ? detectedTimes : expectedTimes;
  let closest: number[] | null = null;

  for (let skipIndex = 0; skipIndex < longer.length; skipIndex += 1) {
    const candidate = longer.filter((_, index) => index !== skipIndex);
    const errors = timingErrors(
      expectedTimes.length > detectedTimes.length ? candidate : shorter,
      expectedTimes.length > detectedTimes.length ? shorter : candidate
    );

    if (errors && (!closest || mean(errors) < mean(closest))) {
      closest = errors;
    }
  }

  return closest;
}

function mean(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function clapScore(
  verdict: ClapBackScore["verdict"],
  expectedCount: number,
  detectedCount: number,
  meanAbsoluteTimingErrorMs: number | null
): ClapBackScore {
  return Object.freeze({
    verdict,
    expectedCount,
    detectedCount,
    meanAbsoluteTimingErrorMs
  });
}

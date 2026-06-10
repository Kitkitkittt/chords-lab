import AccidentalsSteps, {
  meta as accidentalsStepsMeta
} from "../content/lessons/accidentals-steps.mdx";
import AnalysisLab, {
  meta as analysisLabMeta
} from "../content/lessons/analysis-lab.mdx";
import CadencesPhrases, {
  meta as cadencesPhrasesMeta
} from "../content/lessons/cadences-phrases.mdx";
import ChordExtensions, {
  meta as chordExtensionsMeta
} from "../content/lessons/chord-extensions.mdx";
import CommonProgressions, {
  meta as commonProgressionsMeta
} from "../content/lessons/common-progressions.mdx";
import DiatonicHarmony, {
  meta as diatonicHarmonyMeta
} from "../content/lessons/diatonic-harmony.mdx";
import EarTrainingBasics, {
  meta as earTrainingBasicsMeta
} from "../content/lessons/ear-training-basics.mdx";
import Intervals, { meta as intervalsMeta } from "../content/lessons/intervals.mdx";
import IntervalsFluency, {
  meta as intervalsFluencyMeta
} from "../content/lessons/intervals-fluency.mdx";
import FormSongSections, {
  meta as formSongSectionsMeta
} from "../content/lessons/form-song-sections.mdx";
import MinorScalesModes, {
  meta as minorScalesModesMeta
} from "../content/lessons/minor-scales-modes.mdx";
import PopRockHarmony, {
  meta as popRockHarmonyMeta
} from "../content/lessons/pop-rock-harmony.mdx";
import ReviewGlossary, {
  meta as reviewGlossaryMeta
} from "../content/lessons/review-glossary.mdx";
import RhythmMeterLab, {
  meta as rhythmMeterLabMeta
} from "../content/lessons/rhythm-meter-lab.mdx";
import RhythmMeter, {
  meta as rhythmMeterMeta
} from "../content/lessons/rhythm-meter.mdx";
import ScaleFluency, {
  meta as scaleFluencyMeta
} from "../content/lessons/scale-fluency.mdx";
import ScalesKeys, {
  meta as scalesKeysMeta
} from "../content/lessons/scales-keys.mdx";
import SeventhChordsKeys, {
  meta as seventhChordsKeysMeta
} from "../content/lessons/seventh-chords-keys.mdx";
import SeventhsInversions, {
  meta as seventhsInversionsMeta
} from "../content/lessons/sevenths-inversions.mdx";
import SongBuilding, {
  meta as songBuildingMeta
} from "../content/lessons/song-building.mdx";
import SoundPitch, {
  meta as soundPitchMeta
} from "../content/lessons/sound-pitch.mdx";
import StaffKeyboard, {
  meta as staffKeyboardMeta
} from "../content/lessons/staff-keyboard.mdx";
import SyncopationGroove, {
  meta as syncopationGrooveMeta
} from "../content/lessons/syncopation-groove.mdx";
import Triads, { meta as triadsMeta } from "../content/lessons/triads.mdx";
import TwelveBarBlues, {
  meta as twelveBarBluesMeta
} from "../content/lessons/twelve-bar-blues.mdx";
import VoiceLeadingBasics, {
  meta as voiceLeadingBasicsMeta
} from "../content/lessons/voice-leading-basics.mdx";
import type { CourseModule, Lesson } from "../types/course";

export const courseModules: CourseModule[] = [
  {
    slug: "foundations",
    title: "Foundations",
    colorRole: "melody",
    description:
      "Name pitch, place it on the staff, and connect symbols to the keyboard.",
    lessonSlugs: ["sound-pitch", "staff-keyboard"]
  },
  {
    slug: "rhythm",
    title: "Rhythm",
    colorRole: "rhythm",
    description:
      "Read pulse, measures, note values, rests, dots, ties, and triplets.",
    lessonSlugs: ["rhythm-meter"]
  },
  {
    slug: "pitch-systems",
    title: "Pitch Systems",
    colorRole: "melody",
    description:
      "Use accidentals, steps, scales, scale degrees, key signatures, and the circle of fifths.",
    lessonSlugs: ["accidentals-steps", "scales-keys"]
  },
  {
    slug: "intervals-chords",
    title: "Intervals and Chords",
    colorRole: "harmony",
    description:
      "Measure distances, spell triads, and review the beginner concept map.",
    lessonSlugs: ["intervals", "triads", "review-glossary"]
  },
  {
    slug: "scale-fluency",
    title: "Scale Fluency",
    colorRole: "melody",
    description:
      "Build major and minor scales, name scale degrees, and read key patterns.",
    lessonSlugs: ["scale-fluency"]
  },
  {
    slug: "expanded-chords",
    title: "Triads, Sevenths, and Inversions",
    colorRole: "harmony",
    description:
      "Move chord tones through inversions and add seventh-chord color.",
    lessonSlugs: ["sevenths-inversions"]
  },
  {
    slug: "diatonic-harmony",
    title: "Diatonic Harmony",
    colorRole: "harmony",
    description:
      "Build chords inside a key and read beginner Roman numerals.",
    lessonSlugs: ["diatonic-harmony"]
  },
  {
    slug: "rhythm-lab",
    title: "Rhythm and Meter Lab",
    colorRole: "rhythm",
    description:
      "Complete measures, place rests, and hear triplet groupings.",
    lessonSlugs: ["rhythm-meter-lab"]
  },
  {
    slug: "ear-training",
    title: "Ear Training Basics",
    colorRole: "melody",
    description:
      "Identify replayable intervals, triads, scales, and rhythm cells.",
    lessonSlugs: ["ear-training-basics"]
  },
  {
    slug: "song-building",
    title: "Song Building",
    colorRole: "harmony",
    description:
      "Combine beat, bass, chords, melody, and form in the Song Lab.",
    lessonSlugs: ["song-building"]
  },
  {
    slug: "intervals-fluency",
    title: "Intervals Fluency",
    colorRole: "melody",
    description:
      "Name interval size, quality, inversion, and sound with generated drills.",
    lessonSlugs: ["intervals-fluency"]
  },
  {
    slug: "minor-modes",
    title: "Minor Scales and Modes",
    colorRole: "melody",
    description:
      "Compare minor forms, modal centers, and expanded scale colors.",
    lessonSlugs: ["minor-scales-modes"]
  },
  {
    slug: "sevenths-in-keys",
    title: "Seventh Chords in Keys",
    colorRole: "harmony",
    description:
      "Build diatonic seventh chords and connect them to Roman numerals.",
    lessonSlugs: ["seventh-chords-keys"]
  },
  {
    slug: "cadences",
    title: "Cadences and Phrases",
    colorRole: "harmony",
    description:
      "Hear phrase endings and map cadences to harmonic motion.",
    lessonSlugs: ["cadences-phrases"]
  },
  {
    slug: "progressions",
    title: "Common Progressions",
    colorRole: "harmony",
    description:
      "Use common Roman numeral loops for practice and songwriting.",
    lessonSlugs: ["common-progressions"]
  },
  {
    slug: "voice-leading",
    title: "Voice-Leading Basics",
    colorRole: "harmony",
    description:
      "Move chord tones smoothly and keep common tones visible.",
    lessonSlugs: ["voice-leading-basics"]
  },
  {
    slug: "pop-rock",
    title: "Pop/Rock Harmony",
    colorRole: "harmony",
    description:
      "Use loops, bass motion, and texture changes in song sketches.",
    lessonSlugs: ["pop-rock-harmony"]
  },
  {
    slug: "form-sections",
    title: "Form and Song Sections",
    colorRole: "rhythm",
    description:
      "Plan repeated and contrasting sections for eight-bar sketches.",
    lessonSlugs: ["form-song-sections"]
  },
  {
    slug: "analysis-lab",
    title: "Analysis Lab",
    colorRole: "harmony",
    description:
      "Combine rhythm, melody, harmony, and form labels in short analyses.",
    lessonSlugs: ["analysis-lab"]
  },
  {
    slug: "extensions",
    title: "Chord Extensions",
    colorRole: "harmony",
    description:
      "Add sevenths, ninths, and suspensions for richer chord color.",
    lessonSlugs: ["chord-extensions"]
  },
  {
    slug: "groove",
    title: "Syncopation and Groove",
    colorRole: "rhythm",
    description:
      "Accent off-beats and build syncopated grooves you can feel.",
    lessonSlugs: ["syncopation-groove"]
  },
  {
    slug: "blues",
    title: "The Blues",
    colorRole: "harmony",
    description:
      "Play the twelve-bar blues form with dominant-seventh color.",
    lessonSlugs: ["twelve-bar-blues"]
  }
];

export const lessons: Lesson[] = [
  { ...soundPitchMeta, Component: SoundPitch },
  { ...staffKeyboardMeta, Component: StaffKeyboard },
  { ...rhythmMeterMeta, Component: RhythmMeter },
  { ...accidentalsStepsMeta, Component: AccidentalsSteps },
  { ...scalesKeysMeta, Component: ScalesKeys },
  { ...intervalsMeta, Component: Intervals },
  { ...triadsMeta, Component: Triads },
  { ...reviewGlossaryMeta, Component: ReviewGlossary },
  { ...scaleFluencyMeta, Component: ScaleFluency },
  { ...seventhsInversionsMeta, Component: SeventhsInversions },
  { ...diatonicHarmonyMeta, Component: DiatonicHarmony },
  { ...rhythmMeterLabMeta, Component: RhythmMeterLab },
  { ...earTrainingBasicsMeta, Component: EarTrainingBasics },
  { ...songBuildingMeta, Component: SongBuilding },
  { ...intervalsFluencyMeta, Component: IntervalsFluency },
  { ...minorScalesModesMeta, Component: MinorScalesModes },
  { ...seventhChordsKeysMeta, Component: SeventhChordsKeys },
  { ...cadencesPhrasesMeta, Component: CadencesPhrases },
  { ...commonProgressionsMeta, Component: CommonProgressions },
  { ...voiceLeadingBasicsMeta, Component: VoiceLeadingBasics },
  { ...popRockHarmonyMeta, Component: PopRockHarmony },
  { ...formSongSectionsMeta, Component: FormSongSections },
  { ...analysisLabMeta, Component: AnalysisLab },
  { ...chordExtensionsMeta, Component: ChordExtensions },
  { ...syncopationGrooveMeta, Component: SyncopationGroove },
  { ...twelveBarBluesMeta, Component: TwelveBarBlues }
];

export const lessonsBySlug = new Map(
  lessons.map((lesson) => [lesson.slug, lesson])
);

export const modulesBySlug = new Map(
  courseModules.map((module) => [module.slug, module])
);

export function getFirstIncompleteLesson(
  completedLessonSlugs: string[]
): Lesson {
  return (
    lessons.find((lesson) => !completedLessonSlugs.includes(lesson.slug)) ??
    lessons[0]
  );
}

export function getAdjacentLessons(lessonSlug: string): {
  previous?: Lesson;
  next?: Lesson;
} {
  const index = lessons.findIndex((lesson) => lesson.slug === lessonSlug);

  return {
    previous: index > 0 ? lessons[index - 1] : undefined,
    next: index >= 0 && index < lessons.length - 1 ? lessons[index + 1] : undefined
  };
}

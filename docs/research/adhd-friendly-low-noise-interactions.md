# ADHD-Friendly Low-Noise Learning Interactions

Research resolution for [Research ADHD-friendly low-noise learning interactions](https://github.com/Kitkitkittt/chords-lab/issues/5).

## Decision-relevant findings

- **First-run guidance:** provide one obvious starting action, state the immediate task and next action in plain language, and expose current, complete, and pending steps so a distracted learner can resume without restarting. [W3C COGA: Make each step clear](https://github.com/w3c/coga/blob/main/design-guide/o1p04-clear-steps.html)
- **Focus mode:** avoid unsolicited sound, motion, pop-ups, reminders, or content changes. Changes should follow learner action and preserve a stable route back. This supports ChordsLab's no-autoplay and calm-interaction principles. [W3C COGA: Avoid interruptions](https://github.com/w3c/coga/blob/main/design-guide/o5p01-minimal-interruptions.html) · [W3C COGA: Let users control changes](https://github.com/w3c/coga/blob/main/design-guide/o8p01-motion.html)
- **Answer feedback:** every submitted answer needs rapid, clear, visual, and programmatically determinable status. Evidence does not support assuming that immediate corrective feedback universally improves ADHD learning: one adult ADHD probabilistic-learning experiment found worse learning under immediate than seconds-delayed feedback, with ADHD severity negatively associated with immediate-feedback learning. Prototype timing and content rather than mandating instant correction. [W3C COGA: Provide feedback](https://github.com/w3c/coga/blob/main/design-guide/o4p10-status-feedback.html) · [Gabay et al., 2018](https://www.nature.com/articles/s41598-018-33551-3)
- **Session structure:** the learner controls start, pace, pause, exit, and return. Show bounded task structure and progress rather than countdowns, and retain enough context to resume. [W3C COGA: Make each step clear](https://github.com/w3c/coga/blob/main/design-guide/o1p04-clear-steps.html)
- **Choice density:** provide one primary action, keep the main choice set to five or fewer items, and defer nonessential choices behind clearly named secondary controls. [W3C COGA: Manageable quantity](https://github.com/w3c/coga/blob/main/design-guide/o5p03-manageable-quantity.html)

## Constraints for downstream decisions

1. First-run and resume states identify one current task and one primary next action.
2. Focus mode never creates unsolicited sensory or content changes and always preserves orientation and a safe exit.
3. Answer feedback is accessible and unambiguous, but exact timing remains a prototype decision.
4. Sessions remain self-paced, interruptible, and resumable without penalties.
5. Primary screens expose no more than five main choices; nonessential controls remain discoverable but secondary.
6. Validation should test comprehension, calmness, resumption, and feedback timing without making clinical claims.

## Not supported

- A universal rule that immediate feedback is always best.
- An evidence-based optimal session duration or exact trial count for this learner group.
- An ADHD-specific universal choice limit beyond the broader cognitive-accessibility guidance.
- Timers, streaks, rewards, or autoplay as necessary motivators.

## Confidence and limits

Confidence is high for the accessibility interaction constraints and moderate for feedback timing. The feedback study concerns adults performing a probabilistic-learning task, not beginner music learners. ADHD is heterogeneous; these findings constrain prototypes but do not substitute for learner validation.

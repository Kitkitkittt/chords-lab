import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Most tests assume a returning learner. Pre-seed the first-run tour flag so its
// modal does not block interactions. The dedicated tour test clears it.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    try {
      window.localStorage.setItem("chordslab.tour.v1", "seen");
    } catch {
      // ignore
    }
  });
});

test("home, lesson completion, progress persistence, and accessibility", async ({
  page
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Chords Lab" })).toBeVisible();

  const accessibilityScanResults = await new AxeBuilder({ page })
    .disableRules(["color-contrast"])
    .analyze();
  expect(accessibilityScanResults.violations).toEqual([]);

  await page.getByRole("link", { name: "Continue lesson" }).click();
  await expect(
    page.getByRole("heading", { name: "Sound, Pitch, and Octaves" })
  ).toBeVisible();

  await page.getByLabel("C4 and C5").check();
  await page.getByRole("button", { name: /check answer/i }).click();
  await expect(page.getByRole("status").last()).toContainText(
    "C4 and C5 share the letter C"
  );

  await page.getByRole("button", { name: /mark complete/i }).click();
  await page.goto("/progress");
  await expect(page.getByText("Micro-check score: 1 correct")).toBeVisible();

  await page.reload();
  await expect(page.getByText("Micro-check score: 1 correct")).toBeVisible();
});

test("first-run welcome tour shows once and dismisses", async ({ page, context }) => {
  // Clear the seeded flag so the tour appears for this test only.
  await context.addInitScript(() => {
    try {
      window.localStorage.removeItem("chordslab.tour.v1");
    } catch {
      // ignore
    }
  });

  await page.goto("/");
  const dialog = page.getByRole("dialog", { name: /calm way to learn/i });
  await expect(dialog).toBeVisible();
  await page.getByRole("button", { name: /Start learning/i }).click();
  await expect(dialog).toBeHidden();
});

test("the More menu opens and navigates to a secondary page", async ({
  page
}) => {
  await page.goto("/");
  // Use whichever "More" button is visible: the top bar on desktop, or the
  // bottom bar on mobile (the other primary nav is hidden per breakpoint).
  await page.getByRole("button", { name: "More" }).filter({ visible: true }).click();

  const menu = page.getByRole("menu", { name: "More navigation" });
  await expect(menu).toBeVisible();
  await menu.getByRole("menuitem", { name: "Sources" }).click();

  await expect(
    page.getByRole("heading", { name: "Bibliography and use notes" })
  ).toBeVisible();
});

test("index practice hub supports multiple interactive modules", async ({
  page
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Practice hub" })
  ).toBeVisible();

  await expect(page.getByRole("tab", { name: /build a scale/i })).toHaveAttribute(
    "aria-selected",
    "true"
  );
  const labControls = page.locator(".lab-controls");
  await labControls.getByRole("button", { name: "F", exact: true }).click();
  await expect(page.locator(".lab-status")).toContainText("Bb4");

  await page.getByRole("tab", { name: /staff challenge/i }).click();
  await labControls.getByRole("button", { name: "C4" }).click();
  await expect(page.locator(".lab-status")).toContainText("Correct: C4");
  await expect(page.getByText(/Notation unavailable/)).toHaveCount(0);

  await page.getByRole("tab", { name: /tap rhythm/i }).click();
  await labControls.getByRole("button", { name: "2" }).click();
  await expect(page.locator(".lab-status")).toContainText("F4 G4 F4 G4");
});

test("practice modules record pitch, chord, scale, rhythm, and ear attempts", async ({
  page
}) => {
  await page.goto("/practice/pitch");
  await expect(
    page.getByRole("heading", { name: "Interactive modules" })
  ).toBeVisible();

  await page
    .locator(".practice-choice-grid")
    .getByRole("button", { name: "C", exact: true })
    .click();
  await page.getByRole("button", { name: /check answer/i }).click();
  await expect(page.locator(".practice-result-panel")).toContainText(
    "C4 uses the letter name C"
  );

  await page.locator(".practice-module-card").filter({ hasText: "Build triads" }).click();
  const chordChoices = page.locator(".practice-choice-grid");
  await chordChoices.getByRole("button", { name: "C", exact: true }).click();
  await chordChoices.getByRole("button", { name: "E", exact: true }).click();
  await chordChoices.getByRole("button", { name: "G", exact: true }).click();
  await page.getByRole("button", { name: /check answer/i }).click();
  await expect(page.locator(".practice-result-panel")).toContainText(
    "C is spelled C E G"
  );

  await page.goto("/practice/scales");
  const scaleChoices = page.locator(".practice-choice-grid");
  for (const note of ["C", "D", "E", "F", "G", "A", "B", "C"]) {
    await scaleChoices.getByRole("button", { name: note, exact: true }).click();
  }
  await page.getByRole("button", { name: /check answer/i }).click();
  await expect(page.locator(".practice-result-panel")).toContainText(
    "C major keeps the letter order visible"
  );

  await page.goto("/practice/rhythm");
  const rhythmChoices = page.locator(".practice-choice-grid");
  for (const beat of ["hit", "rest", "hit", "hit"]) {
    await rhythmChoices.getByRole("button", { name: beat, exact: true }).click();
  }
  await page.getByRole("button", { name: /check answer/i }).click();
  await expect(page.locator(".practice-result-panel")).toContainText(
    "second beat is silent"
  );

  await page.goto("/practice/ear");
  await page.getByRole("button", { name: /play prompt/i }).click();
  await page
    .locator(".practice-choice-grid")
    .getByRole("button", { name: "perfect fifth" })
    .click();
  await page.getByRole("button", { name: /check answer/i }).click();
  await expect(page.locator(".practice-result-panel")).toContainText(
    "C to G is a stable perfect fifth"
  );

  await page.goto("/progress");
  await expect(page.getByText("Practice score: 5 correct")).toBeVisible();
});

test("review and Song Lab routes are interactive without autoplay", async ({
  page
}) => {
  await page.goto("/review");
  await expect(
    page.getByRole("heading", { name: "Mixed practice" })
  ).toBeVisible();
  await page
    .locator(".practice-choice-grid")
    .getByRole("button", { name: "E4" })
    .click();
  await page.getByRole("button", { name: /check answer/i }).click();
  await expect(page.locator(".practice-result-panel")).toContainText(
    "Expected C4"
  );

  await page.goto("/lab/song");
  await expect(
    page.getByRole("heading", { name: "Build a small loop" })
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Ready");
  await page.getByRole("button", { name: /2/i }).first().click();
  await expect(page.getByText(/Beat hit hit hit hit/)).toBeVisible();
  await page.getByRole("button", { name: /save sketch/i }).click();
  await expect(page.getByRole("status")).toContainText("Sketch saved locally");
  await page.getByRole("button", { name: /Explain loop/i }).click();
  await expect(page.getByText(/The loop starts/)).toBeVisible();
  await page.goto("/lab/song/sketches");
  await expect(
    page.getByRole("heading", { name: "Saved sketches" })
  ).toBeVisible();
  await expect(page.getByText(/Eight-bar loop/)).toBeVisible();
});

test("instrument lab opens full-band workbenches", async ({ page }) => {
  await page.goto("/instruments");
  await expect(
    page.getByRole("heading", { name: "Instrument lab" })
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Piano/i })).toBeVisible();
  await expect(page.getByText("Ensemble Skills")).toBeVisible();

  await page.goto("/instruments/guitar");
  await expect(
    page.getByRole("heading", { name: "Guitar", exact: true })
  ).toBeVisible();
  await expect(page.getByText("C open")).toBeVisible();

  await page.goto("/instruments/drums");
  await expect(
    page.getByRole("heading", { name: "Drums", exact: true })
  ).toBeVisible();
  await page.getByLabel("Drum groove editor").getByRole("button", { name: "1" }).first().click();

  await page.goto("/instruments/voice");
  await expect(
    page.getByRole("heading", { name: "Voice", exact: true })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "do 1 C4" })).toBeVisible();
});

test("theory tools routes switch between circle and progression tools", async ({
  page
}) => {
  await page.goto("/tools/circle");
  await expect(
    page.getByRole("heading", { level: 1, name: /Interactive theory tools/i })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Circle of fifths/i })
  ).toBeVisible();

  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
  expect(accessibilityScanResults.violations).toEqual([]);

  await page.goto("/tools/progression");
  await expect(
    page.getByRole("heading", { name: /Chord progression playground/i })
  ).toBeVisible();
});

test("practice setup starts a generated harmony session", async ({ page }) => {
  await page.goto("/practice/harmony/setup");
  await expect(
    page.getByRole("heading", { name: "Harmony session" })
  ).toBeVisible();
  await page.getByLabel("Topic").selectOption("cadences");
  await page.getByLabel("Prompt count").fill("3");
  await page.getByRole("button", { name: /start generated session/i }).click();
  await expect(
    page.getByRole("heading", { name: "Interactive modules" })
  ).toBeVisible();
  await expect(page.getByText(/3 generated prompts/)).toBeVisible();
});

test("offline app shell is served after first load", async ({ page, context }) => {
  test.setTimeout(60000);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Chords Lab" })).toBeVisible();
  await page.waitForFunction(async () => {
    const registrations = await navigator.serviceWorker.getRegistrations();

    return registrations.some(
      (registration) =>
        registration.active || registration.waiting || registration.installing
    );
  });
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

  await context.setOffline(true);
  await page.goto("/instruments");
  await expect(page.getByRole("heading", { name: "Instrument lab" })).toBeVisible();
});

test("project plan page documents app status", async ({ page }) => {
  await page.goto("/plan");
  await expect(
    page.getByRole("heading", { name: "Plan and progress" })
  ).toBeVisible();
  await expect(
    page.getByText("V7 UX flow and interaction-first music learning PWA")
  ).toBeVisible();
  await expect(page.getByText("Foundation app scaffold")).toBeVisible();
  await expect(page.getByText("Module goals")).toBeVisible();
  await expect(page.getByText("V7 acceptance checklist")).toBeVisible();
});

test("progress export and content review routes are reachable", async ({ page }) => {
  await page.goto("/progress/export");
  await expect(
    page.getByRole("heading", { name: "Export and import" })
  ).toBeVisible();
  await expect(page.getByLabel("Progress export JSON")).toContainText(
    "completedLessonSlugs"
  );

  await page.goto("/plan/content-review");
  await expect(page.getByRole("heading", { name: "Educator QA" })).toBeVisible();
  await expect(page.getByText("Lesson checks")).toBeVisible();
});

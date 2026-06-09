import { describe, expect, it } from "vitest";
import {
  EAR_GAMES,
  earGameMeta,
  nextEarGameRound,
  type EarGameId
} from "./earGames";

const GAMES: EarGameId[] = ["interval", "chord-quality", "higher-lower"];

describe("earGames lib", () => {
  it("exposes metadata for each game", () => {
    expect(EAR_GAMES.map((meta) => meta.id).sort()).toEqual(
      [...GAMES].sort()
    );
  });

  it("generates a valid round for every game type", () => {
    for (const game of GAMES) {
      const round = nextEarGameRound(game);
      expect(round.game).toBe(game);
      expect(round.notes.length).toBeGreaterThanOrEqual(2);
      expect(round.options.length).toBeGreaterThanOrEqual(2);
      expect(round.prompt.length).toBeGreaterThan(0);
      expect(round.reveal.length).toBeGreaterThan(0);
    }
  });

  it("always includes the correct answer among the options", () => {
    for (const game of GAMES) {
      for (let i = 0; i < 20; i += 1) {
        const round = nextEarGameRound(game);
        const ids = round.options.map((option) => option.id);
        expect(ids).toContain(round.answerId);
      }
    }
  });

  it("uses sequence playback for intervals and chord playback for quality", () => {
    expect(nextEarGameRound("interval").play).toBe("sequence");
    expect(nextEarGameRound("chord-quality").play).toBe("chord");
  });

  it("higher-lower options are exactly higher and lower", () => {
    const round = nextEarGameRound("higher-lower");
    expect(round.options.map((option) => option.id).sort()).toEqual([
      "higher",
      "lower"
    ]);
  });

  it("falls back to the first game for unknown ids in meta lookup", () => {
    expect(earGameMeta("interval").id).toBe("interval");
  });
});

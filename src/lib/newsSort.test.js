import { compareNewsNewest, newsSortTime } from "./newsSort";

describe("newsSortTime", () => {
  test("uses published_at ahead of created_at", () => {
    expect(
      newsSortTime({
        published_at: "2026-10-05T10:00:00.000Z",
        created_at: "2026-10-01T10:00:00.000Z",
      })
    ).toBe(Date.parse("2026-10-05T10:00:00.000Z"));
  });

  test("falls back to created_at when published_at is missing", () => {
    expect(newsSortTime({ published_at: null, created_at: "2026-10-04T08:00:00.000Z" })).toBe(
      Date.parse("2026-10-04T08:00:00.000Z")
    );
  });

  test("sorts newest coalesce(published_at, created_at) first", () => {
    const rows = [
      { id: "old", published_at: null, created_at: "2026-10-01T00:00:00.000Z" },
      { id: "published", published_at: "2026-10-05T09:00:00.000Z", created_at: "2026-09-01T00:00:00.000Z" },
      { id: "stored", published_at: null, created_at: "2026-10-04T12:00:00.000Z" },
    ];
    expect(rows.sort(compareNewsNewest).map((row) => row.id)).toEqual(["published", "stored", "old"]);
  });
});

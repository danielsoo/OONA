import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { granularityOf, localBucketKey, localBuckets, percentChange, regroup, weekHourGrid } from "./insights-buckets.ts";

// UTC hour keys made from local times, so these hold in any time zone.
const keyAt = (y: number, m: number, d: number, h: number) => new Date(y, m - 1, d, h).toISOString().slice(0, 13);

describe("activity chart buckets", () => {
  it("counts by hour for a day, by day for longer", () => {
    assert.equal(granularityOf("24h"), "hour");
    assert.equal(granularityOf("7d"), "day");
    assert.equal(granularityOf("90d"), "day");
  });

  it("lists every local day of a week, oldest first", () => {
    const to = new Date(2026, 9, 21, 15, 30);
    const from = new Date(to.getTime() - 7 * 24 * 3600_000);
    const days = localBuckets(from.toISOString(), to.toISOString(), "day");
    assert.equal(days.length, 8);
    assert.equal(days[0]!.key, "2026-10-14");
    assert.equal(days.at(-1)!.key, "2026-10-21");
  });

  it("lists the hours of the last day", () => {
    const to = new Date(2026, 9, 21, 15, 30);
    const hours = localBuckets(new Date(to.getTime() - 24 * 3600_000).toISOString(), to.toISOString(), "hour");
    assert.equal(hours.length, 25);
    assert.equal(hours.at(-1)!.key, "2026-10-21T15");
  });

  it("regroups UTC hours into local days and hours, keeping every count", () => {
    const hourly = { [keyAt(2026, 10, 20, 23)]: 2, [keyAt(2026, 10, 21, 0)]: 3, [keyAt(2026, 10, 21, 9)]: 5 };
    const days = [{ key: "2026-10-20", start: 0 }, { key: "2026-10-21", start: 0 }];
    assert.deepEqual(regroup(hourly, days, "day"), [2, 8]);
    const hours = [{ key: localBucketKey(new Date(2026, 9, 21, 9).getTime(), "hour"), start: 0 }];
    assert.deepEqual(regroup(hourly, hours, "hour"), [5]);
  });

  it("drops counts outside the buckets", () => {
    assert.deepEqual(regroup({ [keyAt(2026, 1, 1, 12)]: 4 }, [{ key: "2026-10-21", start: 0 }], "day"), [0]);
  });

  it("lays counts out by local weekday and hour", () => {
    // 2026-10-19 is a Monday.
    const grid = weekHourGrid({ [keyAt(2026, 10, 19, 8)]: 3, [keyAt(2026, 10, 25, 22)]: 1, [keyAt(2026, 10, 26, 8)]: 2 });
    assert.equal(grid.length, 7);
    assert.equal(grid[0]![8], 5);
    assert.equal(grid[6]![22], 1);
    assert.equal(grid.flat().reduce((a, b) => a + b, 0), 6);
  });

  it("compares with the period before", () => {
    assert.equal(percentChange(150, 100), 50);
    assert.equal(percentChange(50, 100), -50);
    assert.equal(percentChange(0, 0), 0);
    assert.equal(percentChange(7, 0), null);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isNewVisit, VISIT_GAP_MS } from "./visit-clock.ts";

describe("isNewVisit", () => {
  const now = 1_800_000_000_000;

  it("counts a first ever arrival as a new visit", () => {
    assert.equal(isNewVisit(null, now), true);
  });

  it("a reload or new tab while the site is in use is not a new visit", () => {
    assert.equal(isNewVisit(now - 5_000, now), false);
    assert.equal(isNewVisit(now - VISIT_GAP_MS, now), false);
  });

  it("coming back after the gap is a new visit", () => {
    assert.equal(isNewVisit(now - VISIT_GAP_MS - 1, now), true);
    assert.equal(isNewVisit(now - 24 * 60 * 60 * 1000, now), true);
  });
});

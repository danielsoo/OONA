import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { workIncludedInShare } from "./portfolio-share.ts";

const shown = { portfolioSubmissionHidden: false };
const hidden = { portfolioSubmissionHidden: true };

describe("workIncludedInShare", () => {
  it("shows exactly the works a link lists, and nothing added later", () => {
    const editing = { includedWorkIds: ["cut-1", "cut-2"], excludedWorkIds: [] };
    assert.equal(workIncludedInShare("cut-1", shown, editing, true), true);
    assert.equal(workIncludedInShare("cut-2", shown, editing, false), true);
    assert.equal(workIncludedInShare("camera-1", shown, editing, false), false);
    assert.equal(workIncludedInShare("new-work", shown, editing, true), false);
  });

  it("keeps two links for two places apart", () => {
    const editing = { includedWorkIds: ["cut-1"], excludedWorkIds: [] };
    const camera = { includedWorkIds: ["camera-1"], excludedWorkIds: [] };
    assert.equal(workIncludedInShare("cut-1", shown, camera, false), false);
    assert.equal(workIncludedInShare("camera-1", shown, editing, false), false);
  });

  it("lets you list your own work hidden from links", () => {
    assert.equal(workIncludedInShare("reel", hidden, { includedWorkIds: ["reel"], excludedWorkIds: [] }, true), true);
  });

  it("keeps out someone else's work its owner hid, even when listed", () => {
    assert.equal(workIncludedInShare("theirs", hidden, { includedWorkIds: ["theirs"], excludedWorkIds: [] }, false), false);
    assert.equal(workIncludedInShare("theirs", hidden, { includedWorkIds: [], excludedWorkIds: [] }, false), false);
  });

  it("an older link shows everything not left out or hidden", () => {
    const old = { includedWorkIds: [], excludedWorkIds: ["skip"] };
    assert.equal(workIncludedInShare("keep", shown, old, true), true);
    assert.equal(workIncludedInShare("skip", shown, old, true), false);
    assert.equal(workIncludedInShare("mine-hidden", hidden, old, true), false);
  });
});

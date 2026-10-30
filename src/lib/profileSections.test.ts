import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PROFILE_SECTION_IDS, parseProfileSection } from "./profileSections.ts";

describe("parseProfileSection", () => {
  it("keeps every id addressable by its own name", () => {
    for (const id of PROFILE_SECTION_IDS) assert.equal(parseProfileSection(id), id);
  });

  it("lands the sections that were merged away on the one that replaced them", () => {
    // "discover" was the switch deciding whether anyone can find you and
    // "preview" was the page they find; both are "public" now, and anything
    // already linking to either has to keep working.
    assert.equal(parseProfileSection("discover"), "public");
    assert.equal(parseProfileSection("preview"), "public");
    // the older one, renamed before these
    assert.equal(parseProfileSection("displayName"), "about");
  });

  it("falls back to About for anything it does not know", () => {
    assert.equal(parseProfileSection(null), "about");
    assert.equal(parseProfileSection(""), "about");
    assert.equal(parseProfileSection("nope"), "about");
    assert.equal(parseProfileSection("PUBLIC"), "about");
  });
});

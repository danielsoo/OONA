import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AVATAR_PRESETS,
  AVATAR_PRESET_GROUPS,
  isAvatarPreset,
  parseAvatarUrlInput,
} from "./avatarPresets.ts";

const UID = "user-1";
const ownUpload = `https://firebasestorage.googleapis.com/v0/b/x/o/users/${UID}/profile/avatar.jpg`;

describe("avatar presets", () => {
  it("keeps every preset distinct, under public/images/avatars, and named", () => {
    assert.equal(AVATAR_PRESETS.length, AVATAR_PRESET_GROUPS.flatMap((g) => g.presets).length);
    assert.equal(new Set(AVATAR_PRESETS.map((p) => p.id)).size, AVATAR_PRESETS.length);
    assert.equal(new Set(AVATAR_PRESETS.map((p) => p.src)).size, AVATAR_PRESETS.length);
    for (const preset of AVATAR_PRESETS) {
      assert.match(preset.src, /^\/images\/avatars\/[a-z0-9-]+\.webp$/, preset.id);
      assert.ok(preset.label.trim().length > 0, preset.id);
    }
  });

  it("recognises its own paths and nothing else", () => {
    for (const preset of AVATAR_PRESETS) assert.equal(isAvatarPreset(preset.src), true, preset.id);
    assert.equal(isAvatarPreset("/images/avatars/not-a-preset.webp"), false);
    assert.equal(isAvatarPreset("/images/avatars/film-reel.webp "), false);
    assert.equal(isAvatarPreset("images/avatars/film-reel.webp"), false);
  });
});

describe("parseAvatarUrlInput", () => {
  it("takes a preset", () => {
    assert.equal(parseAvatarUrlInput("/images/avatars/film-reel.webp", UID), "/images/avatars/film-reel.webp");
    assert.equal(parseAvatarUrlInput("  /images/avatars/sea-whale.webp  ", UID), "/images/avatars/sea-whale.webp");
  });

  it("still takes this person's own upload", () => {
    assert.equal(parseAvatarUrlInput(ownUpload, UID), ownUpload);
  });

  it("clears the picture on null or empty", () => {
    assert.equal(parseAvatarUrlInput(null, UID), null);
    assert.equal(parseAvatarUrlInput("", UID), null);
    assert.equal(parseAvatarUrlInput("   ", UID), null);
  });

  it("refuses anything that is neither", () => {
    // someone else's upload
    assert.equal(parseAvatarUrlInput(ownUpload.replace(UID, "user-2"), UID), undefined);
    // any other address: an avatar is shown on every page its owner appears on
    assert.equal(parseAvatarUrlInput("https://example.com/tracker.gif", UID), undefined);
    assert.equal(parseAvatarUrlInput("http://example.com/a.png", UID), undefined);
    assert.equal(parseAvatarUrlInput("javascript:alert(1)", UID), undefined);
    assert.equal(parseAvatarUrlInput("data:image/png;base64,AAAA", UID), undefined);
    // a local path that is not a preset
    assert.equal(parseAvatarUrlInput("/images/home/featured.webp", UID), undefined);
    assert.equal(parseAvatarUrlInput("/images/avatars/../../secret.webp", UID), undefined);
    // wrong types
    assert.equal(parseAvatarUrlInput(42, UID), undefined);
    assert.equal(parseAvatarUrlInput({ src: ownUpload }, UID), undefined);
  });

  it("does not let a preset-looking suffix smuggle another address in", () => {
    assert.equal(parseAvatarUrlInput("https://evil.test/images/avatars/film-reel.webp", UID), undefined);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AVATAR_PRESETS,
  AVATAR_PRESET_GROUPS,
  isAvatarPreset,
  parseAvatarUrlInput,
} from "./avatarPresets.ts";

const UID = "abC123xyz";
// What firebase/storage getDownloadURL() actually hands back: the object path
// is percent-encoded, so every slash in it is %2F.
const ownUpload =
  `https://firebasestorage.googleapis.com/v0/b/oona.appspot.com/o/` +
  `users%2F${UID}%2Fprofile%2Favatar.jpg?alt=media&token=6f1d6c2e-0b4a-4f1e-9a77-6b2f0f3e1d55`;

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

  it("still takes this person's own upload, as getDownloadURL writes it", () => {
    assert.equal(parseAvatarUrlInput(ownUpload, UID), ownUpload);
  });

  it("takes the other shapes a bucket is served under", () => {
    const unencoded = `https://firebasestorage.googleapis.com/v0/b/oona.appspot.com/o/users/${UID}/profile/a.jpg`;
    assert.equal(parseAvatarUrlInput(unencoded, UID), unencoded);
    const plain = `https://storage.googleapis.com/oona.appspot.com/users/${UID}/profile/a.jpg`;
    assert.equal(parseAvatarUrlInput(plain, UID), plain);
    const newDomain = `https://oona.firebasestorage.app/v0/b/oona/o/users%2F${UID}%2Fprofile%2Fa.jpg`;
    assert.equal(parseAvatarUrlInput(newDomain, UID), newDomain);
  });

  it("clears the picture on null or empty", () => {
    assert.equal(parseAvatarUrlInput(null, UID), null);
    assert.equal(parseAvatarUrlInput("", UID), null);
    assert.equal(parseAvatarUrlInput("   ", UID), null);
  });

  it("refuses anything that is neither", () => {
    // someone else's upload
    assert.equal(parseAvatarUrlInput(ownUpload.replaceAll(UID, "someoneElse"), UID), undefined);
    // the right path on a host that is not the storage bucket
    assert.equal(parseAvatarUrlInput(`https://anywhere.example/users/${UID}/profile/a.jpg`, UID), undefined);
    assert.equal(
      parseAvatarUrlInput(`https://firebasestorage.googleapis.com.evil.test/v0/b/x/o/users%2F${UID}%2Fprofile%2Fa.jpg`, UID),
      undefined,
    );
    // inside the bucket, but not this person's profile folder
    assert.equal(
      parseAvatarUrlInput(`https://firebasestorage.googleapis.com/v0/b/x/o/works%2F${UID}%2Fstill.jpg`, UID),
      undefined,
    );
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

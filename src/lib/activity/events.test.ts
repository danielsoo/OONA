import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  activityArea,
  activityCategory,
  describeUserAgent,
  isActivityType,
  isBotUserAgent,
  sanitizeActivityData,
  sanitizeActivityId,
  sanitizeActivityPath,
} from "./events.ts";

describe("activity events", () => {
  it("knows its own types and files each under a category", () => {
    assert.equal(isActivityType("page_view"), true);
    assert.equal(isActivityType("drop_table"), false);
    assert.equal(activityCategory("page_view"), "pages");
    assert.equal(activityCategory("click"), "clicks");
    assert.equal(activityCategory("video_complete"), "watching");
    assert.equal(activityCategory("search"), "search");
    assert.equal(activityCategory("sign_up"), "account");
  });

  it("tells the part of the site from the path", () => {
    assert.equal(activityArea("/"), "home");
    assert.equal(activityArea("/watch/abc/low-tide"), "films");
    assert.equal(activityArea("/society?tab=discover"), "society");
    assert.equal(activityArea("/people/lena"), "society");
    assert.equal(activityArea("/school/riverside"), "schools");
    assert.equal(activityArea("/uploader/upload"), "upload");
    assert.equal(activityArea("/somewhere"), "other");
  });

  it("keeps same-site paths without secrets", () => {
    assert.equal(sanitizeActivityPath("/society?tab=discover"), "/society?tab=discover");
    assert.equal(sanitizeActivityPath("/auth/action?mode=resetPassword&oobCode=SECRET&lang=en"), "/auth/action?lang=en");
    assert.equal(sanitizeActivityPath("/invite?token=abc"), "/invite");
    assert.equal(sanitizeActivityPath("/a#section"), "/a");
    assert.equal(sanitizeActivityPath("https://evil.example/x"), null);
    assert.equal(sanitizeActivityPath("//evil.example/x"), null);
    assert.equal(sanitizeActivityPath(42), null);
    assert.equal(sanitizeActivityPath(`/${"x".repeat(400)}`)!.length, 300);
  });

  it("bounds an event's details", () => {
    const data = sanitizeActivityData({
      label: "  Watch   now ",
      position: 12.345,
      checked: true,
      empty: "   ",
      nested: { no: 1 },
      "bad key": "x",
      infinite: Infinity,
      long: "y".repeat(500),
    });
    assert.deepEqual(Object.keys(data).sort(), ["checked", "label", "long", "position"]);
    assert.equal(data.label, "Watch now");
    assert.equal(data.position, 12.3);
    assert.equal((data.long as string).length, 200);
    assert.deepEqual(sanitizeActivityData(["a"]), {});
    assert.deepEqual(sanitizeActivityData(null), {});
  });

  it("reads devices and browsers, and leaves crawlers out", () => {
    const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
    assert.deepEqual(describeUserAgent(iphone), { device: "mobile", browser: "Safari", os: "iOS" });
    const mac = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36";
    assert.deepEqual(describeUserAgent(mac), { device: "desktop", browser: "Chrome", os: "macOS" });
    assert.equal(isBotUserAgent("Googlebot/2.1 (+http://www.google.com/bot.html)"), true);
    assert.equal(isBotUserAgent(mac), false);
  });

  it("accepts only ids the browser could have made", () => {
    assert.equal(sanitizeActivityId("3f2a9c1e-7b4d-4e8a-9f00-1234567890ab"), "3f2a9c1e-7b4d-4e8a-9f00-1234567890ab");
    assert.equal(sanitizeActivityId("short"), null);
    assert.equal(sanitizeActivityId("has spaces in it"), null);
    assert.equal(sanitizeActivityId(undefined), null);
  });
});

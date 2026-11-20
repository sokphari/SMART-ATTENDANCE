import assert from "node:assert/strict";
import test from "node:test";
import { khmer } from "../src/i18n/khmer.ts";
import fs from "node:fs";

const english = JSON.parse(fs.readFileSync(new URL("../src/i18n/en.json", import.meta.url), "utf8"));

test("English and Khmer dictionaries cover matching translation keys", () => {
  const missing = Object.keys(english).filter((key) => !khmer[key]);
  assert.deepEqual(missing, []);
});
test("each Khmer translation is non-empty and has no replacement glyph", () => {
  for (const [key, value] of Object.entries(khmer)) {
    assert.ok(value.trim(), `Empty Khmer translation: ${key}`);
    assert.ok(!value.includes("\uFFFD"), `Broken Khmer characters in: ${key}`);
  }
});
test("essential academic and attendance terminology is translated", () => {
  for (const key of ["Students", "Teachers", "Buildings & Rooms", "Attendance", "Present", "Absent", "Late", "Permission", "Language"]) {
    assert.notEqual(khmer[key], key);
    assert.match(khmer[key], /[\u1780-\u17FF]/);
  }
});

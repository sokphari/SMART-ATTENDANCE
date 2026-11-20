import assert from "node:assert/strict";
import test from "node:test";
import { getQrWindowPhase, readableCountdown, secondsUntil } from "../src/features/teacher-portal/qrWindow.ts";

const starts_at = "2026-11-20T21:09:00+07:00";
const closes_at = "2026-11-20T23:39:00+07:00";
const time = (localTime) => Date.parse("2026-11-20T" + localTime + "+07:00");
const session = (status = "open") => ({ status, starts_at, closes_at });

test("open status before the check-in window is upcoming, not closed", () => {
  assert.equal(getQrWindowPhase(session(), time("14:44:00")), "upcoming");
  assert.equal(secondsUntil(starts_at, time("14:44:00")), 6 * 3600 + 25 * 60);
});

test("QR is active only during the time window of an open session", () => {
  assert.equal(getQrWindowPhase(session(), time("21:09:00")), "active");
  assert.equal(getQrWindowPhase(session(), time("22:09:00")), "active");
  assert.equal(getQrWindowPhase(session(), time("23:39:00")), "ended");
});

test("scheduled and closed sessions cannot generate QR tokens", () => {
  assert.equal(getQrWindowPhase(session("scheduled"), time("21:19:00")), "waiting");
  assert.equal(getQrWindowPhase(session("closed"), time("22:00:00")), "ended");
  assert.equal(getQrWindowPhase(session("cancelled"), time("22:00:00")), "ended");
});

test("invalid session dates and missing sessions are unavailable", () => {
  assert.equal(getQrWindowPhase(null, time("22:00:00")), "unavailable");
  assert.equal(getQrWindowPhase({ ...session(), starts_at: "invalid" }, time("22:00:00")), "unavailable");
  assert.equal(getQrWindowPhase({ ...session(), closes_at: starts_at }, time("22:00:00")), "unavailable");
});

test("countdown remains readable and clamps at zero", () => {
  assert.equal(readableCountdown(3600 + 120 + 4), "1h 2m 4s");
  assert.equal(readableCountdown(65), "1m 5s");
  assert.equal(secondsUntil(closes_at, time("23:40:00")), 0);
});

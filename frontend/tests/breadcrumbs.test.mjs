import assert from "node:assert/strict";
import test from "node:test";
import { buildBreadcrumbs } from "../src/lib/navigation/breadcrumbs.ts";

const admin = [
  { label: "Students", href: "/students" },
  { label: "Class Sections", href: "/class-sections" },
  { label: "Buildings & Rooms", href: "/buildings" },
];

const teacher = [
  { label: "My classes", href: "/teacher/classes" },
  { label: "Live Attendance", href: "/teacher/attendance-sessions" },
];

test("shows a single current item on the dashboard", () => {
  assert.deepEqual(buildBreadcrumbs("/dashboard", "/dashboard", admin), [
    { label: "Dashboard" },
  ]);
});

test("links dashboard and shows an admin section", () => {
  assert.deepEqual(buildBreadcrumbs("/buildings", "/dashboard", admin), [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Buildings & Rooms" },
  ]);
});

test("create and nested edit routes have human-readable labels", () => {
  assert.deepEqual(buildBreadcrumbs("/students/create", "/dashboard", admin), [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Students", href: "/students" },
    { label: "Create Student" },
  ]);
  assert.deepEqual(buildBreadcrumbs("/students/23/edit", "/dashboard", admin), [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Students", href: "/students" },
    { label: "Student Details", href: "/students/23" },
    { label: "Edit Student" },
  ]);
});

test("teacher navigation uses teacher home and readable class actions", () => {
  assert.deepEqual(buildBreadcrumbs("/teacher/classes/8/attendance", "/teacher/dashboard", teacher), [
    { label: "Dashboard", href: "/teacher/dashboard" },
    { label: "My classes", href: "/teacher/classes" },
    { label: "Class Details", href: "/teacher/classes/8" },
    { label: "Take Attendance" },
  ]);
});

test("unknown pages do not expose a numeric ID", () => {
  assert.deepEqual(buildBreadcrumbs("/unknown/123", "/dashboard", admin), [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Details" },
  ]);
});

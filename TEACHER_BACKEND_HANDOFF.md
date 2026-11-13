# Teacher Role — Backend Handoff

This document describes the teacher experience in the Android app, separates existing backend support from app integration, and proposes the API work needed to complete the teacher workflows.

## Scope and implementation status

The Android teacher navigation includes:

- Teacher dashboard
- Courses
- Attendance sessions and session details
- QR attendance
- Manual attendance
- Teacher profile and logout

The mobile API layer currently calls:

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/v1/auth/me` | Load the signed-in user |
| `POST` | `/api/v1/auth/logout` | End the signed-in session |
| `GET` | `/api/v1/teacher/attendance-sessions` | List attendance sessions |
| `POST` | `/api/v1/teacher/attendance-sessions` | Create an attendance session |
| `POST` | `/api/v1/teacher/attendance-sessions/{id}/qr-token` | Generate a short-lived QR token |

These are the confirmed teacher-related operations in the Android API interfaces. The app also has screens for manual attendance, courses, and profile, but those features do not currently have corresponding teacher endpoints in the mobile API layer. The dashboard and session-detail screens should not be assumed to have full backend data support until those screen flows are connected and verified.

The backend already documents teacher-only session listing, creation, session details, QR-token generation, and session closing. The Android `TeacherApi` currently exposes session listing, creation, and QR-token generation, but not session details or closing. The backend's existing attendance/session rules remain authoritative.

## Existing teacher API contract

All teacher endpoints require an authenticated active user with the `teacher` role. The backend must scope access to the signed-in teacher and their assignments; never trust a teacher ID supplied by the mobile client.

### List sessions

```http
GET /api/v1/teacher/attendance-sessions
    ?status=open
    &class_section_id=12
    &date_from=2026-11-01
    &date_to=2026-11-30
    &per_page=15
```

Filters are optional. The mobile app currently expects a `data` array of sessions with `id`, `class_section_id`, optional `class_schedule_id` and `classroom_id`, `session_date`, `starts_at`, `late_after`, `closes_at`, and `status`. The backend may include richer relationship fields; clients should tolerate optional fields.

### Create a session

```http
POST /api/v1/teacher/attendance-sessions
Content-Type: application/json

{
  "class_section_id": 12,
  "class_schedule_id": 31,
  "classroom_id": 4,
  "session_date": "2026-11-13",
  "starts_at": "2026-11-13T08:00:00+07:00",
  "late_after": "2026-11-13T08:15:00+07:00",
  "closes_at": "2026-11-13T10:00:00+07:00"
}
```

`class_schedule_id` and `classroom_id` are optional, but at least one must be supplied. When only a schedule is supplied, use its classroom. The section must be active and assigned to the teacher, and the classroom must be active. Only one open session is allowed per section. The session response is expected under `data`.

### Generate a QR token

```http
POST /api/v1/teacher/attendance-sessions/{id}/qr-token
```

The response contains `data.token` and `data.expires_at`. Tokens expire after 30 seconds; rotating a token revokes the previous active token. The app must refresh the QR before expiration and must not treat a token as an attendance record.

### Available in backend, not yet wired in Android API

```http
GET  /api/v1/teacher/attendance-sessions/{id}
POST /api/v1/teacher/attendance-sessions/{id}/close
```

Closing a session marks enrolled students with no attendance record as `absent` using `verification_method=system`. The backend response includes a status and attendance summary.

## Recommended backend work

### Priority 1 — Assigned teaching data and roster

The app needs a server-authoritative list of what the signed-in teacher can teach, so teachers can choose a section when creating a session and view their courses.

```http
GET /api/v1/teacher/class-sections?status=active&per_page=15
GET /api/v1/teacher/class-sections/{id}
GET /api/v1/teacher/class-sections/{id}/students?search=&per_page=50
GET /api/v1/teacher/class-sections/{id}/schedules?date_from=&date_to=
```

Return only sections assigned to the authenticated teacher. Include the useful display data for the app: course code/name, section name, semester, enrolled count/capacity, and schedule/classroom details. The roster should contain only actively enrolled students and include stable student IDs, display names, student codes, and enrollment status. Use pagination for larger rosters.

If existing admin resources already expose the necessary data, do not broaden admin access to teachers; add teacher-scoped endpoints or policies.

### Priority 2 — Attendance detail and manual marking

The teacher attendance-detail/manual-attendance screens need the roster's attendance state for one session and a way to record corrections made in person.

```http
GET  /api/v1/teacher/attendance-sessions/{id}/attendance?status=&search=&per_page=50
POST /api/v1/teacher/attendance-sessions/{id}/attendance/manual
```

Suggested bulk request:

```json
{
  "records": [
    {
      "student_id": 101,
      "status": "present",
      "remarks": "Verified in person"
    },
    {
      "student_id": 102,
      "status": "excused",
      "remarks": "Approved absence"
    }
  ]
}
```

The read response should include each enrolled student's attendance status (or `unmarked`), `verification_method`, `checked_in_at`, and remarks, plus totals for `present`, `late`, `absent`, `excused`, and `unmarked`.

For manual marking, validate the entire request before applying changes and commit it atomically. Enforce that:

- The session belongs to a section assigned to the authenticated teacher.
- Each student is enrolled in that section.
- Status is one of `present`, `late`, `absent`, or `excused`.
- A session that is closed cannot be silently edited; define an explicit reopen or correction workflow if edits after close are required.
- Manual records use `verification_method=manual` and record the acting teacher in `marked_by`.
- Duplicate student entries are rejected; concurrent/double submissions cannot create duplicate attendance rows.
- Writes are auditable, including actor, session, student, old/new status, reason/remarks, and timestamp.

Return `409` for duplicate/conflicting state, `403` for a teacher outside the assignment, `404` for inaccessible/missing resources, and `422` for invalid fields. Do not accept client-supplied `teacher_id`, verification method, or marked-by identity.

### Priority 3 — Session lifecycle and teacher dashboard

Wire the existing close operation into Android and expose a server-backed summary for dashboard/session details:

```http
POST /api/v1/teacher/attendance-sessions/{id}/close
GET  /api/v1/teacher/dashboard
```

The dashboard should be scoped to the current teacher and return stable, documented fields such as today's scheduled classes, currently open sessions, sessions awaiting closure, and recent attendance totals. Keep the existing close behavior that creates system-verified absences. A repeated close request should have documented idempotent behavior or return a clear `409`.

### Priority 4 — Attendance history and reporting

Support teachers reviewing their past sessions and attendance without exposing other teachers' sections:

```http
GET /api/v1/teacher/attendance
    ?class_section_id=12
    &status=late
    &date_from=2026-11-01
    &date_to=2026-11-30
    &per_page=15
GET /api/v1/teacher/reports/attendance
    ?class_section_id=12
    &date_from=2026-11-01
    &date_to=2026-11-30
```

Return paginated attendance/session data and clearly defined totals and rates. All filters must remain limited to the authenticated teacher's assignments.

### Profile

Use the existing `GET /api/v1/auth/me` response for displaying the signed-in user's name, email, role, and status. Add a teacher profile-update endpoint only if the app supports profile editing; validate editable fields and do not allow role, status, or teacher assignment changes through self-service.

## Shared API expectations

- Base path: `/api/v1`; authenticated calls use the Sanctum token returned by login.
- Use JSON and consistent envelopes: single resources under `data`; paginated lists under `data`, `links`, and `meta`.
- Preserve snake_case API fields, including `class_section_id`, `session_date`, and `expires_at`.
- `401` means missing/expired authentication; `403` means authenticated but not allowed; `404` means not found or intentionally inaccessible; `409` means a business-rule conflict; `422` returns field-level `errors`.
- Use server time and timezone-aware timestamps. Document the timezone policy for session date/time comparisons.
- Make state-changing operations transactional and safe under retries. Return useful validation/business-rule messages without exposing internal errors.
- Keep authorization enforcement in backend policies/services, not only in Android navigation.

## Suggested delivery order

1. Teacher-scoped sections, schedules, and roster.
2. Attendance detail and audited manual attendance.
3. Android integration for session detail and session close; dashboard summary.
4. Teacher attendance history/reports.
5. Profile editing and notifications only if product scope requires them.

## Android source references

- Role routing: `mobile_teacher/app/src/main/java/com/rupp/teacher/core/navigation/AppNavigation.kt`
- Teacher navigation/screens: `mobile_teacher/app/src/main/java/com/rupp/teacher/presentation/teacher/`
- Teacher API interface: `mobile_teacher/app/src/main/java/com/rupp/teacher/data/remote/api/TeacherApi.kt`
- Teacher request/response models: `mobile_teacher/app/src/main/java/com/rupp/teacher/data/remote/dto/teacher/`
- Existing backend teacher API details: `backend/API_DOCUMENTATION.md`, section 8

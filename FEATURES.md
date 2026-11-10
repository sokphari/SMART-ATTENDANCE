# Smart Attendance — Backend Feature Handoff

Last updated: 2026-11-10

This document summarizes the backend features that are complete and ready for team integration. The project is a Laravel 12 API with Sanctum authentication, PostgreSQL, and Docker.

**Status:** Admin MVP, attendance engine, attendance corrections, and audit logs are complete. Full test suite is green: **190 tests / 822 assertions**.

---

## Quick Start

```bash
docker compose up -d --build
docker compose exec app php artisan key:generate
docker compose exec app php artisan migrate
docker compose exec app php artisan db:seed --class=AdminUserSeeder
docker compose exec app php artisan db:seed --class=DepartmentSeeder
```

- API base URL: `http://localhost:8001/api/v1`
- Health check: `GET /api/v1/health`
- Admin credentials come from `.env`:
  - `ADMIN_EMAIL` (default: `admin@example.com`)
  - `ADMIN_PASSWORD` (default: `password`)

Login:

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "password"
}
```

Response contains `data` (user) and `token`. Send the token as:

```http
Authorization: Bearer <token>
```

---

## Roles

| Role | Access |
|---|---|
| `admin` | All `/api/v1/admin/*` endpoints |
| `teacher` | `/api/v1/teacher/*` attendance session endpoints |
| `student` | `/api/v1/student/*` check-in endpoint |

Inactive accounts are rejected by the role middleware.

---

## Completed Modules

### Authentication and Users

- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout`
- Admin user CRUD: `/api/v1/admin/users`
- Self-deactivation is blocked for admins.
- After 5 failed login attempts for the same email and IP, login is blocked for 60 seconds. Successful login clears the failed-attempt counter.

### Academic Structure

- Departments: `/api/v1/admin/departments`
- Academic years: `/api/v1/admin/academic-years`
- Semesters: `/api/v1/admin/semesters`
- Courses: `/api/v1/admin/courses`
- Class sections: `/api/v1/admin/class-sections`
- Classrooms: `/api/v1/admin/classrooms`
- Teacher assignments: `/api/v1/admin/teacher-assignments`
- Enrollments: `/api/v1/admin/enrollments`
- Class schedules: `/api/v1/admin/class-schedules`

All resource modules support:

```http
GET    /api/v1/admin/{resource}
POST   /api/v1/admin/{resource}
GET    /api/v1/admin/{resource}/{id}
PUT    /api/v1/admin/{resource}/{id}
PATCH  /api/v1/admin/{resource}/{id}
DELETE /api/v1/admin/{resource}/{id}
```

Common list filters:

| Resource | Filters |
|---|---|
| Users | `search`, `role`, `status`, `per_page` |
| Departments | `search`, `status`, `per_page` |
| Academic years | `search`, `status`, `per_page` |
| Semesters | `search`, `academic_year_id`, `status`, `per_page` |
| Students | `search`, `department_id`, `status`, `year_level`, `per_page` |
| Teachers | `search`, `department_id`, `status`, `per_page` |
| Courses | `search`, `department_id`, `status`, `per_page` |
| Class sections | `search`, `course_id`, `semester_id`, `status`, `per_page` |
| Classrooms | `search`, `status`, `per_page` |
| Teacher assignments | `search`, `class_section_id`, `teacher_id`, `per_page` |
| Enrollments | `search`, `class_section_id`, `student_id`, `status`, `per_page` |
| Class schedules | `search`, `class_section_id`, `classroom_id`, `day_of_week`, `per_page` |

### Students and Teachers

- Admin CRUD under `/api/v1/admin/students` and `/api/v1/admin/teachers`.
- Creating a student or teacher also creates the linked user account in one transaction.
- `DELETE` deactivates the linked user account while preserving the academic profile.
- Student codes and teacher codes are unique.
- Enrollment respects class-section capacity and only counts `enrolled` records.

### Class Scheduling

- Weekly schedules with day, start/end time, and effective date range.
- Conflict checks prevent:
  - Two schedules for the same section overlapping in time.
  - Double-booking a classroom.
  - Double-booking a teacher (through teacher assignments).
- Back-to-back schedules are allowed.

### Admin Dashboard

```http
GET /api/v1/admin/dashboard
```

Returns counts and 30-day trends for users, departments, students, teachers, courses, class sections, classrooms, teacher assignments, enrollments, and class schedules.

### Attendance Sessions (Teacher)

```http
GET  /api/v1/teacher/attendance-sessions
POST /api/v1/teacher/attendance-sessions
GET  /api/v1/teacher/attendance-sessions/{id}
POST /api/v1/teacher/attendance-sessions/{id}/qr-token
POST /api/v1/teacher/attendance-sessions/{id}/close
```

Rules:

- Teacher must be assigned to the class section.
- Exactly one open session is allowed per class section.
- Opening a session snapshots the classroom latitude, longitude, and allowed radius.
- QR tokens expire after 30 seconds.
- Only a SHA-256 hash of the token is stored; the plaintext token is returned once.
- Rotating a token revokes the previous active token.
- Closing a session inserts `absent` records with `verification_method=system` for enrolled students who have no attendance record.

### Student Check-In

```http
POST /api/v1/student/attendance/check-in
```

Request:

```json
{
  "token": "<plaintext dynamic QR token>",
  "latitude": 11.5564,
  "longitude": 104.9282,
  "gps_accuracy_meters": 10
}
```

Server checks:

- Token exists, is unexpired, and is not revoked.
- Attendance session is open and within its active window.
- Student is actively enrolled in the session's class section.
- Student has not already checked in.
- GPS accuracy is at most 30 meters.
- Student is inside the classroom radius (Haversine distance).
- Status is `present` before `late_after`, otherwise `late`.
- Double check-in is blocked by a database unique constraint and returns `409`.

### Admin Attendance and Reports

```http
GET /api/v1/admin/attendance
GET /api/v1/admin/reports/attendance
```

Attendance filters: `search`, `class_section_id`, `attendance_session_id`, `student_id`, `status`, `date_from`, `date_to`, `per_page`.

Report filters: `class_section_id`, `semester_id`, `date_from`, `date_to`.

The report returns totals by status, attendance rate, and per-section breakdown.

### Attendance Corrections

```http
GET  /api/v1/admin/attendance-corrections
POST /api/v1/admin/attendance-corrections
GET  /api/v1/admin/attendance-corrections/{id}
POST /api/v1/admin/attendance-corrections/{id}/review
```

- A correction request needs `attendance_id`, `requested_status`, and `reason`.
- Only one `pending` correction is allowed per attendance record.
- Review decision must be `approved` or `rejected`.
- Approval updates the attendance status, sets `verification_method=manual`, and records the reviewing admin in `marked_by`.
- Rejection leaves the attendance unchanged.
- Both actions write an audit log entry.

### Audit Logs

```http
GET /api/v1/admin/audit-logs
```

Filters: `user_id`, `action`, `entity_type`, `entity_id`, `date_from`, `date_to`, `per_page`.

Currently audited actions:

- `attendance_correction.requested`
- `attendance_correction.approved`
- `attendance_correction.rejected`

Audit entries store actor, action, entity, old/new values, IP address, and timestamp.

---

## API Conventions

- All endpoints are under `/api/v1`.
- Protected endpoints require `Authorization: Bearer <token>`.
- List endpoints are paginated and return `data`, `links`, and `meta`.
- Validation failures return `422` with `errors`.
- Unauthorized requests return `401`; forbidden role/profile access returns `403`.
- Duplicate or conflicting state operations return `409` where applicable.

Delete behavior:

- Users, departments, courses, class sections, classrooms, and enrollments are deactivated or status-changed.
- Academic years are hard-deleted only when they have no semesters.
- Semesters, class schedules, and teacher assignments are hard-deleted.
- Students and teachers deactivate the linked user on delete.

---

## Commands

Run the full test suite:

```bash
docker compose exec -T app php artisan test
```

Run code style checks/fixes:

```bash
docker compose exec -T app ./vendor/bin/pint --test
docker compose exec -T app ./vendor/bin/pint
```

Apply migrations:

```bash
docker compose exec -T app php artisan migrate --force
```

Do not run `migrate:fresh` against a shared or important database.

---

## Not Yet Implemented

- Notifications module.
- Android/Kotlin client integration.
- Audit logging across every admin module (currently focused on attendance corrections).
- Admin UI/frontend.
- Policy-level separation between correction requester and reviewer.

# Smart Attendance API Documentation

Frontend integration reference for the Laravel backend.

## 1. Base URL and headers

All API routes are under `/api/v1`.

```text
{BACKEND_URL}/api/v1
```

For JSON requests, send:

```http
Accept: application/json
Content-Type: application/json
```

Authenticated requests must also send the Sanctum bearer token returned by login:

```http
Authorization: Bearer {token}
```

Authentication uses personal access tokens. The token should be stored securely by the frontend and removed after logout.

## 2. Common response formats

### Single resource

```json
{
  "data": {
    "id": 1
  }
}
```

### Paginated collection

List endpoints return Laravel's paginated resource format:

```json
{
  "data": [],
  "links": {
    "first": "...",
    "last": "...",
    "prev": null,
    "next": "..."
  },
  "meta": {
    "current_page": 1,
    "from": 1,
    "last_page": 1,
    "per_page": 15,
    "to": 15,
    "total": 15
  }
}
```

Most list endpoints accept `per_page`; the default is `15`.

### Validation error (`422`)

```json
{
  "message": "The given data was invalid.",
  "errors": {
    "field_name": ["The field name is required."]
  }
}
```

Other common statuses:

- `200` successful read/update/action
- `201` successful create/action
- `204` successful delete
- `401` missing or invalid token
- `403` authenticated user does not have permission
- `404` resource not found
- `409` business-rule conflict
- `422` validation failure

## 3. Authentication

### Login

```http
POST /auth/login
```

Request:

```json
{
  "email": "user@example.com",
  "password": "secret123",
  "device_name": "web-browser"
}
```

`device_name` is optional.

Response (`200`):

```json
{
  "data": {
    "id": 1,
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "admin",
    "status": "active",
    "email_verified_at": null,
    "created_at": "2026-11-10T08:00:00.000000Z",
    "updated_at": "2026-11-10T08:00:00.000000Z"
  },
  "token": "1|..."
}
```

Only active accounts can log in. Login is rate-limited to five failed attempts per minute.

### Current user

```http
GET /auth/me
```

Auth: any authenticated user.

### Logout

```http
POST /auth/logout
```

Auth: any authenticated user.

Response (`200`):

```json
{
  "message": "Logged out successfully."
}
```

## 4. Health check

### Health

```http
GET /health
```

Authentication: none.

Response:

```json
{
  "status": "ok",
  "service": "smart-attendance",
  "timestamp": "2026-11-11T10:00:00+00:00"
}
```

## 5. Roles

| Role | Access |
|---|---|
| `admin` | Dashboard, user and academic-management APIs, attendance reports/corrections |
| `teacher` | Own attendance sessions and QR tokens |
| `student` | Own QR check-in |

## 6. Admin dashboard

### Dashboard summary

```http
GET /admin/dashboard
```

Auth: `admin`.

Response (`200`): `data` contains `counts` and `trends`.

```json
{
  "data": {
    "counts": {
      "users": {"total": 0, "admins": 0, "teachers": 0, "students": 0, "active": 0, "inactive": 0, "suspended": 0},
      "departments": {"total": 0, "active": 0},
      "students": {"total": 0, "active": 0},
      "teachers": {"total": 0, "active": 0},
      "courses": {"total": 0, "active": 0},
      "class_sections": {"total": 0, "active": 0},
      "classrooms": {"total": 0, "active": 0},
      "teacher_assignments": {"total": 0},
      "enrollments": {"total": 0, "enrolled": 0, "dropped": 0, "completed": 0},
      "class_schedules": {"total": 0}
    },
    "trends": {
      "students_last_30_days": 0,
      "teachers_last_30_days": 0,
      "enrollments_last_30_days": 0,
      "schedules_last_30_days": 0
    }
  }
}
```

## 7. Admin CRUD endpoints

All endpoints in this section require the `admin` role and support:

```text
GET    /admin/{resource}
POST   /admin/{resource}
GET    /admin/{resource}/{id}
PUT    /admin/{resource}/{id}
PATCH  /admin/{resource}/{id}
DELETE /admin/{resource}/{id}
```

Create and update responses contain the resource under `data`. Delete returns `204` with no body.

### Users

Resource path: `/admin/users`

List filters: `search`, `role`, `status`, `per_page`.

Create:

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "password123",
  "role": "student",
  "status": "active"
}
```

Update fields are optional: `name`, `email`, `password`, `role`, `status`.

User response fields: `id`, `name`, `email`, `role`, `status`, `email_verified_at`, `created_at`, `updated_at`.

### Departments

Resource path: `/admin/departments`

List filters: `search`, `status`, `per_page`.

Create:

```json
{
  "name": "Computer Science",
  "code": "CS",
  "description": "Computer science department",
  "status": "active"
}
```

Update fields are optional: `name`, `code`, `description`, `status`.

Response fields: `id`, `name`, `code`, `description`, `status`, `created_at`, `updated_at`.

### Academic years

Resource path: `/admin/academic-years`

List filters: `search`, `status`, `per_page`.

Create:

```json
{
  "name": "2026-2027",
  "start_date": "2026-09-01",
  "end_date": "2027-08-31",
  "status": "upcoming"
}
```

`end_date` must be after `start_date`. Update fields are optional. Response fields: `id`, `name`, `start_date`, `end_date`, `status`, `semesters_count`, `created_at`, `updated_at`.

### Semesters

Resource path: `/admin/semesters`

List filters: `search`, `academic_year_id`, `status`, `per_page`.

Create:

```json
{
  "academic_year_id": 1,
  "name": "Semester 1",
  "start_date": "2026-09-01",
  "end_date": "2027-01-31",
  "status": "upcoming"
}
```

Response fields: `id`, `academic_year_id`, `academic_year`, `name`, `start_date`, `end_date`, `status`, `created_at`, `updated_at`.

### Courses

Resource path: `/admin/courses`

List filters: `search`, `department_id`, `status`, `per_page`.

Create:

```json
{
  "department_id": 1,
  "course_code": "CS101",
  "name": "Introduction to Programming",
  "description": "Programming fundamentals",
  "credits": 3,
  "status": "active"
}
```

`credits` must be between 1 and 30. Response fields: `id`, `department_id`, `department`, `course_code`, `name`, `description`, `credits`, `status`, `created_at`, `updated_at`.

### Class sections

Resource path: `/admin/class-sections`

List filters: `search`, `course_id`, `semester_id`, `status`, `per_page`.

Create:

```json
{
  "course_id": 1,
  "semester_id": 1,
  "section_code": "A",
  "capacity": 40,
  "status": "active"
}
```

`capacity` must be between 1 and 500. Response fields: `id`, `course_id`, `course`, `semester_id`, `semester`, `section_code`, `capacity`, `status`, `created_at`, `updated_at`.

### Classrooms

Resource path: `/admin/classrooms`

List filters: `search`, `status`, `per_page`.

Create:

```json
{
  "room_code": "B101",
  "building": "Main Building",
  "floor": "1",
  "latitude": 11.5564,
  "longitude": 104.9282,
  "allowed_radius_meters": 100,
  "status": "active"
}
```

Latitude must be between `-90` and `90`; longitude between `-180` and `180`; radius between `10` and `1000` meters. Response fields: `id`, `room_code`, `building`, `floor`, `latitude`, `longitude`, `allowed_radius_meters`, `status`, `created_at`, `updated_at`.

### Class schedules

Resource path: `/admin/class-schedules`

List filters: `search`, `class_section_id`, `classroom_id`, `day_of_week`, `per_page`.

Create:

```json
{
  "class_section_id": 1,
  "classroom_id": 1,
  "day_of_week": 1,
  "start_time": "08:00:00",
  "end_time": "10:00:00",
  "effective_from": "2026-09-01",
  "effective_until": "2027-01-31"
}
```

`day_of_week` is `1` through `7`. Times use `H:i:s`. Response fields: `id`, `class_section_id`, `class_section`, `classroom_id`, `classroom`, `day_of_week`, `start_time`, `end_time`, `effective_from`, `effective_until`, `created_at`, `updated_at`.

### Teachers

Resource path: `/admin/teachers`

List filters: `search`, `department_id`, `status`, `per_page`.

Create:

```json
{
  "name": "Teacher Name",
  "email": "teacher@example.com",
  "password": "password123",
  "status": "active",
  "department_id": 1,
  "teacher_code": "T001",
  "phone": "+85512345678"
}
```

Update fields are optional. Response fields: `id`, `user_id`, `user`, `department_id`, `department`, `teacher_code`, `phone`, `created_at`, `updated_at`.

### Students

Resource path: `/admin/students`

List filters: `search`, `department_id`, `status`, `year_level`, `per_page`.

Create:

```json
{
  "name": "Student Name",
  "email": "student@example.com",
  "password": "password123",
  "status": "active",
  "department_id": 1,
  "student_code": "S001",
  "year_level": 1,
  "phone": "+85512345678"
}
```

`year_level` must be between 1 and 10. Update fields are optional. Response fields: `id`, `user_id`, `user`, `department_id`, `department`, `student_code`, `year_level`, `phone`, `created_at`, `updated_at`.

### Teacher assignments

Resource path: `/admin/teacher-assignments`

List filters: `search`, `class_section_id`, `teacher_id`, `per_page`.

Create:

```json
{
  "class_section_id": 1,
  "teacher_id": 1,
  "assigned_at": "2026-09-01T08:00:00+00:00"
}
```

`assigned_at` is optional. Response fields: `id`, `class_section_id`, `class_section`, `teacher_id`, `teacher`, `assigned_at`, `created_at`, `updated_at`.

### Enrollments

Resource path: `/admin/enrollments`

List filters: `search`, `class_section_id`, `student_id`, `status`, `per_page`.

Create:

```json
{
  "class_section_id": 1,
  "student_id": 1,
  "enrollment_date": "2026-09-01",
  "status": "enrolled"
}
```

Response fields: `id`, `class_section_id`, `class_section`, `student_id`, `student`, `enrollment_date`, `status`, `created_at`, `updated_at`.

## 8. Teacher attendance APIs

All endpoints require the `teacher` role. Teachers can access only sessions assigned to their teacher profile.

### List own attendance sessions

```http
GET /teacher/attendance-sessions?status=open&class_section_id=1&date_from=2026-11-01&date_to=2026-11-30&per_page=15
```

Filters: `status`, `class_section_id`, `date_from`, `date_to`, `per_page`.

### Open an attendance session

```http
POST /teacher/attendance-sessions
```

Request:

```json
{
  "class_section_id": 1,
  "class_schedule_id": 1,
  "classroom_id": 1,
  "session_date": "2026-11-11",
  "starts_at": "2026-11-11T08:00:00+00:00",
  "late_after": "2026-11-11T08:15:00+00:00",
  "closes_at": "2026-11-11T10:00:00+00:00"
}
```

`class_schedule_id` and `classroom_id` are optional, but at least one must be supplied. If only a schedule is supplied, its classroom is used. The class section must be active, the teacher must be assigned to it, and the classroom must be active.

The session starts with status `open`. Only one open session is allowed per class section.

### Show a session

```http
GET /teacher/attendance-sessions/{attendanceSessionId}
```

### Generate a QR token

```http
POST /teacher/attendance-sessions/{attendanceSessionId}/qr-token
```

The session must be open and currently within its time window. Existing active QR tokens are revoked. Tokens expire after 30 seconds or when the session closes.

Response (`201`):

```json
{
  "data": {
    "token": "random-token-value",
    "expires_at": "2026-11-11T08:00:30+00:00"
  }
}
```

The frontend should display the returned token as a QR code and refresh it before expiration.

### Close a session

```http
POST /teacher/attendance-sessions/{attendanceSessionId}/close
```

Closing marks enrolled students without an attendance record as `absent` with verification method `system`.

Response:

```json
{
  "data": {
    "id": 1,
    "status": "closed"
  },
  "summary": {
    "present": 20,
    "late": 2,
    "absent": 3,
    "excused": 0,
    "total": 25
  }
}
```

Attendance session resource fields include: `id`, `class_section_id`, `class_section`, `class_schedule_id`, `teacher_id`, `teacher`, `classroom_id`, `classroom`, `session_date`, `starts_at`, `late_after`, `closes_at`, `closed_at`, `status`, `allowed_latitude`, `allowed_longitude`, `allowed_radius_meters`, `created_at`, `updated_at`.

Session statuses: `scheduled`, `open`, `closed`, `cancelled`.

## 9. Student attendance APIs

### Check in with QR token and GPS

```http
POST /student/attendance/check-in
```

Auth: `student`.

Request:

```json
{
  "token": "token-read-from-qr-code",
  "latitude": 11.5564,
  "longitude": 104.9282,
  "gps_accuracy_meters": 8.5
}
```

Validation:

- `token`: required string, maximum 255 characters
- `latitude`: required number from `-90` to `90`
- `longitude`: required number from `-180` to `180`
- `gps_accuracy_meters`: required number from `0` to `30`

The token must be valid, not expired or revoked; the session must be open and within its time window; and the student must be enrolled in the class. The request must also be within the classroom radius.

Response (`201`) is an attendance resource with fields: `id`, `attendance_session_id`, `session`, `student_id`, `student`, `status`, `verification_method`, `latitude`, `longitude`, `gps_accuracy_meters`, `distance_meters`, `checked_in_at`, `marked_by`, `remarks`, `created_at`, `updated_at`.

Attendance statuses: `present`, `late`, `absent`, `excused`.

Verification methods: `dynamic_qr`, `manual`, `system`.

## 10. Admin attendance APIs

All endpoints in this section require the `admin` role.

### Attendance records

```http
GET /admin/attendance
```

Filters: `search`, `class_section_id`, `attendance_session_id`, `student_id`, `status`, `date_from`, `date_to`, `per_page`.

Returns a paginated collection of attendance resources.

### Attendance report

```http
GET /admin/reports/attendance?class_section_id=1&semester_id=1&date_from=2026-11-01&date_to=2026-11-30
```

All query parameters are optional.

Response:

```json
{
  "data": {
    "total": 100,
    "by_status": {
      "present": 70,
      "late": 10,
      "absent": 15,
      "excused": 5
    },
    "attendance_rate": 80.0,
    "by_section": [
      {
        "class_section_id": 1,
        "section_code": "A",
        "course_code": "CS101",
        "total": 25,
        "present": 18,
        "late": 3,
        "absent": 3,
        "excused": 1,
        "attendance_rate": 84.0
      }
    ]
  }
}
```

Attendance rate is calculated as `(present + late) / total * 100`, rounded to two decimals. A zero-total report returns `0`.

### Attendance corrections

List:

```http
GET /admin/attendance-corrections?status=pending&attendance_id=1&requested_by=1&reviewed_by=1&per_page=15
```

Create:

```http
POST /admin/attendance-corrections
```

```json
{
  "attendance_id": 1,
  "requested_status": "excused",
  "reason": "Medical leave"
}
```

Show:

```http
GET /admin/attendance-corrections/{attendanceCorrectionId}
```

Review:

```http
POST /admin/attendance-corrections/{attendanceCorrectionId}/review
```

```json
{
  "status": "approved",
  "review_note": "Verified by administration"
}
```

Review `status` must be `approved` or `rejected`. `review_note` is optional and has a maximum length of 2000 characters.

Correction statuses: `pending`, `approved`, `rejected`.

Correction resource fields: `id`, `attendance_id`, `attendance`, `requested_by`, `requester`, `reviewed_by`, `reviewer`, `reason`, `requested_status`, `status`, `reviewed_at`, `review_note`, `created_at`, `updated_at`.

### Audit logs

```http
GET /admin/audit-logs?user_id=1&action=created&entity_type=App%5CModels%5CStudent&entity_id=1&date_from=2026-11-01&date_to=2026-11-30&per_page=15
```

All filters are optional. Response fields: `id`, `user_id`, `user`, `action`, `entity_type`, `entity_id`, `old_values`, `new_values`, `ip_address`, `created_at`.

## 11. Enum values

| Field | Values |
|---|---|
| User role | `admin`, `teacher`, `student` |
| Account status | `active`, `inactive`, `suspended` |
| Academic period status | `upcoming`, `active`, `completed` |
| Department/course/classroom/class-section status | `active`, `inactive` |
| Enrollment status | `enrolled`, `dropped`, `completed` |
| Attendance status | `present`, `late`, `absent`, `excused` |
| Attendance session status | `scheduled`, `open`, `closed`, `cancelled` |
| Correction status | `pending`, `approved`, `rejected` |
| Verification method | `dynamic_qr`, `manual`, `system` |

## 12. Frontend implementation notes

1. Call `POST /auth/login` first and attach the returned token to every protected request.
2. Use the authenticated user's `role` to select the appropriate dashboard and route group.
3. For list screens, use `data` for rows and `meta.current_page`, `meta.last_page`, `meta.total`, and `links.next`/`links.prev` for pagination.
4. Keep relationship fields such as `department`, `course`, `semester`, `student`, and `teacher` nullable because they are only included when loaded by that endpoint.
5. Use ISO-8601 timestamps for datetime values and `YYYY-MM-DD` for date values.
6. Handle `401`, `403`, `409`, and `422` separately so the UI can show authentication, permission, business-rule, and field-validation messages correctly.


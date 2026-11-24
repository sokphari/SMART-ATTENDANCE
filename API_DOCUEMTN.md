Smart Attendance — API Integration Guide
Audience: Web and Android/mobile developers
Source: sokphari/SMART-ATTENDANCE, branch dev
Reviewed: 2026-11-24
API version: v1

This guide describes registered routes and selected request contracts reviewed against backend source. Examples use fictional data. Routes marked contract check required need their current FormRequest/service/resource reviewed before implementing writes. No live API tests were performed.
1. Getting started
Laravel REST API, Sanctum personal access tokens, PostgreSQL and Docker; web frontend uses Next.js. Start services from the repository root:
docker compose up -d --build
docker compose ps
docker compose exec app php artisan route:list --path=api/v1
Default Docker backend: http://localhost:8002/api/v1 (frontend: port 3002). The root environment can override BACKEND_PORT and FRONTEND_PORT; check actual mappings. For an Android emulator use http://10.0.2.2:8002/api/v1 when the backend runs on its host. For a physical device or teammate's machine use the host LAN IP and actual published port; localhost refers to the client itself. Use HTTPS in production and for browser geolocation outside localhost. Configure CORS for authorized web origins or use the existing Next.js proxy. Never expose local test endpoints in production.

All paths below are relative to /api/v1. JSON requests use Accept: application/json and Content-Type: application/json. Protected routes also require Authorization: Bearer <token>.
curl -i http://localhost:8002/api/v1/health
2. Authentication and common responses
Method	Path	Access
GET	/health	Public
GET	/branding	Public
POST	/auth/login	Public
GET	/auth/me	Authenticated
POST	/auth/logout	Authenticated
GET	/notifications	Authenticated


Login body (device_name optional):
{"email":"teacher@example.com","password":"your-password","device_name":"web-browser"}
Example response (200):
{"data":{"id":1,"name":"Teacher Name","email":"teacher@example.com","role":"teacher","status":"active"},"token":"1|example-token"}
Read token from the top level (result.token), user from result.data. Store credentials securely; mobile should use platform-backed secure storage. Avoid logging tokens or storing passwords. Remove local authentication state after logout. Roles: admin, teacher, student. Teacher module permissions also apply; frontend navigation is not an authorization boundary.

Single resource: {"data":{"id":1}}. Typical paginated resource collection:
{"data":[],"links":{"first":"...","last":"...","prev":null,"next":null},"meta":{"current_page":1,"last_page":1,"per_page":15,"total":0}}
Not every endpoint uses this envelope: login, health, local availability, attendance summaries, gradebooks and binary exports have their own shapes. Relationships may be nullable or omitted. Dates use YYYY-MM-DD; timestamps should include an ISO-8601 timezone offset, e.g. +07:00 for Cambodia.
Status	Handling
200 / 201	Success / created
204	Success, no body; do not parse JSON
401	Clear expired session and sign in again
403	Permission denied; do not retry blindly
404	Missing or unavailable resource
409	Business conflict; refresh state and show message
422	Validation failure; display field errors
423	Locked grades or grade policy
429	Rate limited; respect Retry-After
500	Unexpected server error; show safe message


Example validation response: {"message":"The given data was invalid.","errors":{"email":["The email field is required."]}}.
3. Admin resources
Admin token required. Standard apiResource routes: GET /admin/{resource}, POST /admin/{resource}, GET /admin/{resource}/{id}, PUT/PATCH /admin/{resource}/{id}, DELETE /admin/{resource}/{id}. Floors are an exception: create using the nested building route below. Do not assume every list accepts the same filters.
Resource	Path	Typical list filters (existing reference; confirm newer fields)
Users	/admin/users	search, role, status
Departments	/admin/departments	search, status
Programs	/admin/programs	contract check required
Academic years	/admin/academic-years	search, status
Semesters	/admin/semesters	academic_year_id, search, status
Courses	/admin/courses	department_id, search, status
Class sections	/admin/class-sections	course_id, semester_id, search, status
Buildings	/admin/buildings	contract check required
Floors	/admin/floors	contract check required
Classrooms	/admin/classrooms	search, status
Teachers	/admin/teachers	department_id, search, status
Students	/admin/students	department_id, year_level, search, status
Teacher assignments	/admin/teacher-assignments	class_section_id, teacher_id
Enrollments	/admin/enrollments	class_section_id, student_id, status
Class schedules	/admin/class-schedules	class_section_id, classroom_id, day_of_week


Most paginated lists accept page and per_page. Example: GET /admin/students?search=student&per_page=15&page=1.

Legacy documented student creation example (contract check required for new required fields):
{"name":"Example Student","email":"student@example.com","password":"example-password","status":"active","department_id":1,"student_code":"S001","year_level":1,"phone":"+85512345678"}
Use IDs returned by actual list endpoints. student_id, teacher_id and user_id are distinct profile/account identifiers.
Additional admin routes
Method	Path
GET	/admin/dashboard
PUT	/admin/branding
POST	/admin/buildings/setup
GET, POST	/admin/buildings/{id}/floors
GET	/admin/class-sections/{id}/eligible-students
GET	/admin/class-schedules/summary
GET	/admin/class-schedules/configuration
PATCH	/admin/class-schedules/time-slots/{id}
PATCH	/admin/class-schedules/settings
GET	/admin/teachers/{id}/workload
GET	/admin/attendance
GET	/admin/attendance/qr-sessions
POST	/admin/attendance/qr-sessions/{id}/qr-token
GET	/admin/audit-logs
GET, POST	/admin/attendance-corrections
GET	/admin/attendance-corrections/{id}
POST	/admin/attendance-corrections/{id}/review


For correction creation, documented body: {"attendance_id":1,"requested_status":"excused","reason":"Approved leave"}. Review: {"status":"approved","review_note":"Verified"}; review status is approved or rejected.
4. Teacher API
Teacher token and corresponding module permission required. Backend scopes access to teacher assignments.
Method	Path	Purpose
GET	/teacher/dashboard	Summary
GET	/teacher/class-sections	Assigned classes
GET	/teacher/class-sections/{id}	Class detail
GET	/teacher/class-sections/{id}/students	Roster
GET	/teacher/class-sections/{id}/schedules	Schedule
GET, POST	/teacher/attendance-sessions	List / open session
GET	/teacher/attendance-sessions/{id}	Session detail
GET	/teacher/attendance-sessions/{id}/attendance	Attendance roster
POST	/teacher/attendance-sessions/{id}/attendance/manual	Mark attendance
POST	/teacher/attendance-sessions/{id}/qr-token	Generate QR
POST	/teacher/attendance-sessions/{id}/local-qr-test	Local test mode
POST	/teacher/attendance-sessions/{id}/close	Close session
GET	/teacher/attendance	History
GET, POST	/teacher/attendance-corrections	Corrections
GET, PATCH	/teacher/profile	Profile


Open attendance session
POST /teacher/attendance-sessions returns 201 with data containing the session. Example times must be replaced with the intended session window.
{"class_section_id":1,"class_schedule_id":1,"classroom_id":1,"session_date":"2026-11-24","starts_at":"2026-11-24T08:00:00+07:00","late_after":"2026-11-24T08:15:00+07:00","closes_at":"2026-11-24T10:00:00+07:00"}
Supply at least a classroom or class schedule. late_after >= starts_at, closes_at >= late_after. Use an assigned section. Session list filters: status, class_section_id, date_from, date_to, per_page.
Manual attendance
GET /teacher/attendance-sessions/{id}/attendance?status=unmarked&per_page=50 accepts optional status, search, per_page (1–100). Returns paginated resource collection plus summary.

POST /teacher/attendance-sessions/{id}/attendance/manual:
{"records":[{"student_id":101,"status":"present"},{"student_id":102,"status":"excused","remarks":"Approved leave"}]}
1–100 records, distinct student IDs; remarks optional, max 1000 characters. Response: data session resource plus summary. Use the server response and refresh roster. Allowed attendance statuses: present, late, absent, excused; unmarked is a read filter only. UI may label excused as Permission.
QR attendance and closing
POST /teacher/attendance-sessions/{id}/qr-token returns 201 with data.token and data.expires_at. Use actual server expiration to refresh QR, do not hardcode the lifetime. Stop rotation on close or unmount. A QR token is not an attendance record.

POST /teacher/attendance-sessions/{id}/close returns data session plus summary. Closing marks unrecorded enrolled students absent under documented session rules. Refresh roster after closing.

Session statuses: scheduled, open, closed, cancelled. Verification methods: dynamic_qr, manual, system.
Update teacher profile
PATCH /teacher/profile: optional name (max 150), email (unique, max 150), phone (nullable, max 30). Never send role or assignment changes here.
5. Student attendance and registration
Authenticated check-in
POST /student/attendance/check-in (student token):
{"token":"scanned-qr-token","latitude":11.5564,"longitude":104.9282,"gps_accuracy_meters":8.5}
Location fields required when geofencing is enabled, nullable otherwise. Accuracy threshold is configurable (default 30 m). Latitude range −90 to 90; longitude −180 to 180. Use real device location. Backend validates QR/session/enrollment and applicable location rules. Do not bypass geofencing or create optimistic attendance records before server confirmation.
Local QR testing (development only)
GET /attendance/local-scan-availability returns {"enabled":true} only when local environment and local QR testing configuration permit it.

POST /attendance/local-check-in (public local-test route, throttled 6/min):
{"token":"scanned-qr-token","attendance_id":"000000005","device_id":"550e8400-e29b-41d4-a716-446655440000","latitude":11.5564,"longitude":104.9282,"gps_accuracy_meters":8.5}
Attendance ID must be a nine-digit string, retaining leading zeros. Device ID is a UUID; use a stable device identifier for the test client. GPS requirements follow configured settings. Successful check-in returns 201 attendance resource. This route must remain disabled outside development.
Registration links
Method	Path	Access
POST	/admin/student-registration-links	Admin
GET	/admin/student-registration-links/{id}	Admin
POST	/admin/student-registration-links/{id}/revoke	Admin
GET	/student-registrations/{token}	Link token
GET	/student-registrations/{token}/departments	Link token
POST	/student-registrations/{token}	Link token


Registration returns 201 with data.student, data.enrollment, data.section_created and message. Check current registration validator and service before constructing the form. Link tokens are sensitive; do not log them.
6. Reports and exports
Both /admin and /teacher prefixes register the following GET routes (role and teacher report module permissions apply):
Relative report path	Purpose
/reports/attendance	Attendance aggregate
/reports/overview	Overview
/reports/daily	Daily
/reports/weekly	Weekly
/reports/monthly	Monthly
/reports/students/{studentId}	Student report
/reports/classes/{sectionId}	Class report
/reports/exports/attendance	Export attendance
/reports/exports/students/{studentId}	Export student report
/reports/exports/classes/{sectionId}	Export class report


Documented attendance report filters: class_section_id, semester_id (admin), date_from, date_to. Existing reference defines attendance rate as (present + late) / total * 100, zero for no records. Verify filters and output content type for newer report endpoints. For downloads use a blob rather than JSON.
7. Grades and semester results
Method	Path	Access
GET	/admin/gradebook/sections	Admin
GET	/admin/gradebook/{sectionId}	Admin
PATCH	/admin/gradebook/{sectionId}/{studentId}	Admin
GET	/teacher/gradebook/sections	Teacher
GET	/teacher/gradebook/{sectionId}	Teacher
PATCH	/teacher/gradebook/{sectionId}/{studentId}	Teacher
GET, PUT	/admin/semesters/{semesterId}/grade-policy	Admin
GET	/admin/semester-results	Admin
POST	/admin/semester-results/{sectionId}/approve	Admin
POST	/admin/semester-results/{sectionId}/publish	Admin
GET	/admin/semester-results/{sectionId}/pdf	Admin
GET	/student/semester-results	Student
GET	/student/semester-results/{sectionId}/pdf	Student


Gradebook sections filters: semester_id, department_id; gradebook detail filters: search, per_page (1–100). Semester results filters: semester_id, department_id, class_section_id, search. Results response contains data.sections and data.students.
Save grade (PATCH)
{"activities_score":9,"midterm_score":25,"final_score":42,"finalize":true}
Fields are optional; score limits come from the semester policy. Attendance score is server-calculated. Finalization requires all three assessment scores and finalized attendance. Approved/published grades are locked (423). Teacher access requires assigned section and grades module.
Grade policy (PUT)
Example policy, not a claim about current stored configuration:
{"attendance_points":10,"activities_points":10,"midterm_points":30,"final_points":50,"pass_threshold":50,"late_credit":0.5,"permission_credit":1,"absent_credit":0,"missing_attendance_policy":"exclude","require_all_subjects_pass":true,"max_subject_offerings":10,"weekly_contact_hours":20}
All policy fields required; component points must total 100; credits 0–1; missing attendance policy exclude or zero; max subject offerings 1–30; weekly contact hours 0.5–40. Approved results lock policy edits. Workflow: enter scores → finalize → admin approve → publish → student views published results. Admin PDF may use ?draft=true or ?student_id=...; students can only access their own published result, not drafts.
8. Web integration (Next.js / TypeScript)
Set .env.local to actual backend URL (or use the existing same-origin proxy if configured):
NEXT_PUBLIC_API_URL=http://localhost:8002/api/v1
Rebuild Docker frontend if changing build-time public variables. Do not put secrets in NEXT_PUBLIC_*.

src/lib/api.ts example:
const BASE = process.env.NEXT_PUBLIC_API_URL;

export class ApiError extends Error {
  constructor(public status: number, message: string,
    public errors?: Record<string, string[]>) { super(message); }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  if (!BASE) throw new Error('API URL is not configured');
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (typeof options.body === 'string') headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (res.status === 204) return undefined as T;
  const isJson = (res.headers.get('content-type') || '').includes('json');
  const body = isJson ? await res.json() : null;
  if (!res.ok) throw new ApiError(res.status, body?.message || `Request failed (${res.status})`, body?.errors);
  if (!isJson) throw new Error('Expected JSON response');
  return body as T;
}
Example calls:
const login = await apiFetch<{data: {id: number; role: string}; token: string}>('/auth/login', {
  method: 'POST', body: JSON.stringify({ email, password, device_name: 'web-browser' })
});
const token = login.token;
const classes = await apiFetch<{data: unknown[]}>('/teacher/class-sections', {}, token);
const roster = await apiFetch(`/teacher/attendance-sessions/${sessionId}/attendance`, {}, token);
await apiFetch(`/teacher/attendance-sessions/${sessionId}/attendance/manual`, {
  method: 'POST', body: JSON.stringify({ records: [{ student_id: studentId, status: 'present' }] })
}, token);
PDF download example:
async function downloadResult(sectionId: number, token: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/semester-results/${sectionId}/pdf`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/pdf, application/json' }
  });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url; a.download = `semester-results-${sectionId}.pdf`;
  a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
9. Android integration
Existing project uses an Android teacher module. For Retrofit set base URL with trailing slash, e.g. http://10.0.2.2:8002/api/v1/. Use a Bearer header via an authenticated interceptor, retain snake_case mappings, and model pagination and nullable relationships. Example interface:
interface TeacherApi {
    @GET("teacher/class-sections")
    suspend fun classes(): Response<JsonObject>

    @GET("teacher/attendance-sessions/{id}/attendance")
    suspend fun attendance(@Path("id") id: Long): Response<JsonObject>

    @POST("teacher/attendance-sessions/{id}/attendance/manual")
    suspend fun mark(@Path("id") id: Long, @Body body: JsonObject): Response<JsonObject>
}
Illustrative Retrofit/Gson imports: retrofit2.Response, retrofit2.http.GET, POST, Path, Body, com.google.gson.JsonObject. Use the project's existing converter and typed DTOs for production. Check HTTP errors before reading success DTOs. Use debug-only cleartext configuration if needed; HTTPS for release.
10. Integration checklist
- [ ] Verify backend port and health endpoint.
- [ ] Login with each role; verify protected requests reject missing token and wrong roles.
- [ ] Test lists, filters, pagination, empty data and validation errors.
- [ ] Teacher: assigned classes → roster → open session → QR/manual attendance → close.
- [ ] Student: valid check-in, expired QR, duplicate attendance, GPS and permission errors.
- [ ] Verify local QR route is disabled outside local development.
- [ ] Grades: scores, finalize, approve, publish, PDF, locked edits and student access isolation.
- [ ] Test reports, registration links, loading/error states and real device connectivity.
- [ ] Check route inventory and current request validators before merging changes.
11. Source references and maintenance
- Registered route files
- Docker configuration
- Attendance controllers and validators
- Grade controller and service
- Teacher module
- Student module
- Previous teacher handoff — some feature statuses are outdated relative to current routes.
Whenever an endpoint changes, update its method/path, roles/module permissions, required and optional fields, sample responses, errors and client examples. This guide is a source-reviewed integration reference, not an exhaustive OpenAPI schema. For endpoints whose payloads have not been reviewed, consult the current FormRequest/controller/service and test the actual response before integrating.
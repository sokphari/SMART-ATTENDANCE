Smart Attendance
Laravel + PostgreSQL  |  Backend API Implementation Guide
ADMIN-FIRST ROADMAP  •  PROJECT SETUP AND DATABASE CONNECTION ALREADY COMPLETE
Goal: build and verify a secure, versioned admin API first; then build the attendance engine and Android endpoints on the same Laravel backend.
Implementation baseline
Already done	Next work	Not in this phase
Laravel project initialized; PostgreSQL connection working	Backend architecture, authentication, role checks and Admin APIs	Kotlin UI, QR scanning, GPS Android integration
Database is reachable from Laravel	Migrations and seed data for Admin workflows	Public student signup or multi-university tenancy

Assumptions: one university; roles admin / teacher / student; admin uses a web dashboard; students and teachers use Android; QR + GPS required for attendance. Use the existing project directory—do not recreate the Laravel app.
1. Recommended backend folder structure
app/
  Enums/                    # UserRole, AccountStatus, AttendanceStatus
  Http/
    Controllers/Api/V1/
      Auth/                 # AuthController
      Admin/                # Dashboard, Student, Teacher, Department...
      Teacher/              # Later
      Student/              # Later
    Requests/Api/V1/Admin/  # StoreStudentRequest, UpdateStudentRequest...
    Resources/              # StudentResource, CourseResource...
    Middleware/             # EnsureRole (optional)
  Models/                   # User, Student, Teacher, Department, ...
  Policies/                 # Authorization for each resource
  Services/                 # Academic/ and Attendance/ services
  Actions/                  # Optional focused actions
  Jobs/                     # Later: finalize sessions, notifications
database/
  migrations/
  factories/
  seeders/
routes/api.php
tests/Feature/Api/V1/Admin/
tests/Feature/Api/V1/Auth/
Keep controllers thin. Validate in Form Requests, authorize with Policies / role middleware, put multi-model operations inside services, and serialize with API Resources. Do not add a generic Repository layer until it solves a real need.
2. Step-by-step implementation order
Step	Module / deliverable	Definition of done
0	Foundation: API conventions, env, test database	/api/v1/health returns JSON; config and test database isolated
1	Users + Sanctum + role checks	Admin can login/logout/me; student cannot reach /admin
2	Departments CRUD	Validation, pagination, filters, soft delete/deactivation policy tested
3	Academic years + semesters	Dates and parent relations validated
4	Students CRUD	Create user + student profile in one transaction; unique student_code
5	Teachers CRUD	Create user + teacher profile in one transaction; unique teacher_code
6	Courses CRUD	Belong to department; unique course_code
7	Class sections CRUD	Belong to course and semester; unique section per offering
8	Classrooms CRUD	GPS coordinates and radius validated
9	Teacher assignments CRUD	Only valid teacher and section; no duplicate assignment
10	Student enrollments CRUD	Only active students; no duplicate enrollment; capacity check
11	Class schedules CRUD	Time validity, room/teacher conflicts, day-of-week
12	Admin dashboard + reporting	Counts and attendance summaries from real DB queries
13	Attendance session + QR/GPS engine	Server-side checks, unique check-in, status finalization
14	Teacher + student APIs; Kotlin integration	Scope-limited permissions and contract tests

Work one module at a time: migration → model/relationships → request validation → policy → service (if needed) → controller → resource → route → feature test → API collection.
3. Phase 0 — verify existing setup (do not reinitialize)
php artisan about
php artisan migrate:status
php artisan route:list --path=api
php artisan config:show database
php artisan test
Set DB_CONNECTION=pgsql in .env and keep credentials only in environment configuration. If using Docker, run artisan commands in the Laravel app container (e.g., docker compose exec app php artisan ...), replacing “app” with your actual service name.
Configure a separate testing database in .env.testing or phpunit.xml; never run RefreshDatabase tests against real project data. If API routing is not installed, use the route setup supported by your installed Laravel version (for example php artisan install:api when applicable).
4. Phase 1 — authentication and Admin permission
Use Sanctum bearer tokens for Android/API clients. Admin web may use Laravel session auth for a same-origin dashboard; do not expose admin bearer tokens to browser localStorage. For initial API testing, use Sanctum auth:sanctum on protected routes.
    1. Create / verify users migration with role (admin, teacher, student), status (active, inactive, suspended), email and password; ensure emails are unique.
    2. Install/configure Sanctum if not already installed; confirm personal_access_tokens migration exists.
    3. Create UserRole and UserStatus enums (or constants); allow only known role/status values.
    4. Create AuthController: login, me, logout; validate request input and rate-limit login.
    5. Add authorization: gate/policy or middleware restricting Admin endpoints to active admin users. Return 401 if unauthenticated, 403 if authenticated without permission.
    6. Seed one admin via an environment-provided password; never commit a fixed production password.
    7. Test invalid credentials, inactive account, invalid/expired token, non-admin access and logout token revocation.
php artisan make:controller Api/V1/Auth/AuthController
php artisan make:request Api/V1/Auth/LoginRequest
php artisan make:seeder AdminUserSeeder
php artisan make:test Feature/Api/V1/Auth/LoginTest
5. Phase 2 — Admin modules and database order
Build order	Tables	Critical design rules
A	users, departments	users.role + status checked server-side; department.code unique
B	academic_years, semesters	start < end; semester within academic year
C	students, teachers	unique users FK; unique student_code / teacher_code
D	courses, class_sections	course_code unique; (course_id, semester_id, section_code) unique
E	classrooms, teacher_assignments	valid lat/long/radius; (section_id, teacher_id) unique
F	enrollments, class_schedules	(section_id, student_id) unique; enforce time conflict rules
G	attendance_sessions, attendance_qr_tokens, attendances	finalized later; ensure room snapshot and duplicate protection
H	attendance_corrections, audit_logs, notifications	audit sensitive changes; review workflow

Important schema refinement: nullable GPS fields in attendances for manual corrections and generated absences; set verification_method to dynamic_qr, manual, or system. Avoid requiring GPS on system-generated absent records. Preserve class session GPS rules (room position/radius snapshot) so later room edits do not change historical validation.
6. Admin module contracts — endpoints
Base path: /api/v1. All routes below require auth:sanctum plus admin authorization.
Resource	Route pattern	Methods / scope
Dashboard	/admin/dashboard	GET summary counts, recent trends
Departments	/admin/departments	GET list, POST, GET {id}, PUT/PATCH {id}, DELETE {id}
Academic years	/admin/academic-years	Full CRUD
Semesters	/admin/semesters	Full CRUD
Students	/admin/students	Full CRUD; filters by department/year/status
Teachers	/admin/teachers	Full CRUD; filters by department/status
Courses	/admin/courses	Full CRUD; search by code/name
Class sections	/admin/class-sections	Full CRUD; course, semester filters
Classrooms	/admin/classrooms	Full CRUD; GPS validation
Assignments	/admin/teacher-assignments	List, assign, update, unassign
Enrollments	/admin/enrollments	List, enroll, change status, withdraw
Schedules	/admin/class-schedules	Full CRUD; detect room conflicts
Attendance	/admin/attendance	Read/filter plus authorized corrections later
Reports	/admin/reports/attendance	GET aggregated reports, later CSV export
Audit logs	/admin/audit-logs	Read-only with pagination

7. Generate the first Admin module: Departments
Use Departments first to establish your reusable pattern before creating Student/Teacher APIs.
php artisan make:model Department -mfs
php artisan make:controller Api/V1/Admin/DepartmentController --api
php artisan make:request Api/V1/Admin/StoreDepartmentRequest
php artisan make:request Api/V1/Admin/UpdateDepartmentRequest
php artisan make:resource DepartmentResource
php artisan make:policy DepartmentPolicy --model=Department
php artisan make:test Feature/Api/V1/Admin/DepartmentApiTest
Suggested departments columns: id, name, code unique, description nullable, status, timestamps. Store and update requests should trim/validate code and enforce uniqueness (update ignores own ID).
// routes/api.php — illustrative structure (use your actual controller imports)
Route::prefix('v1')->group(function () {
    Route::post('auth/login', [AuthController::class, 'login'])
        ->middleware('throttle:login'); // define limiter before use
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('auth/me', [AuthController::class, 'me']);
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::prefix('admin')->middleware('role:admin')->group(function () {
            Route::apiResource('departments', DepartmentController::class);
        });
    });
});
The role:admin middleware alias must be registered in bootstrap/app.php in modern Laravel versions, or replace it with an authorized policy/gate approach. The code above is a route plan, not a complete drop-in implementation.
8. Standard API response format
Use Laravel API Resources for success payloads. Keep error shapes consistent for frontend consumption; Laravel validation errors normally use the errors object.
// GET /api/v1/admin/departments/1
{
  "data": { "id": 1, "name": "Computer Science",
            "code": "CS", "status": "active" }
}

// Validation error — HTTP 422
{
  "message": "The given data was invalid.",
  "errors": { "code": ["The code has already been taken."] }
}
Suggested statuses: 200 OK; 201 Created; 204 No Content; 401 Unauthenticated; 403 Forbidden; 404 Not Found; 409 Conflict; 422 Validation Error. Paginate collection endpoints; use query params page, per_page, search and supported filters.
9. Tests and acceptance criteria for every Admin CRUD
    • Authentication: guest gets 401; active student/teacher gets 403; admin succeeds.
    • Validation: missing required input, duplicate code, invalid foreign keys and bad GPS fields return 422.
    • Data integrity: related records not silently lost; deleting a referenced department is restricted or archived.
    • Listing: paginated, searchable, filterable and sorted consistently.
    • Responses: correct HTTP status, field names and non-sensitive payload; passwords never returned.
    • Transactions: user + student profile or user + teacher profile are created atomically.
    • Audit: sensitive admin create/update/delete changes record actor, action and timestamp.
php artisan migrate
php artisan db:seed --class=AdminUserSeeder
php artisan route:list --path=api/v1/admin
php artisan test --filter=DepartmentApiTest
10. Recommended first development sprint
Day / milestone	Deliverable	Verify before proceeding
Milestone 1	Auth + role authorization + admin seeder	Admin login works; non-admin access denied
Milestone 2	Departments CRUD complete	Tests pass; API collection contains five operations
Milestone 3	Academic years and semesters	FK/date validation tests pass
Milestone 4	Students and teachers CRUD	Transactional user/profile creation and password safety
Milestone 5	Courses, sections, rooms	All academic FK + unique constraints work
Milestone 6	Assignment, enrollment, timetable	No duplicate enrollment; conflict tests pass
Milestone 7	Admin dashboard, audit and reports	Summary queries verified against seeded fixtures

11. Attendance-engine prerequisites (after Admin MVP)
    • Attendance sessions must refer to existing sections, assigned teachers and classroom location snapshots.
    • QR tokens rotate around every 30 seconds and store only hashes; validate expiry and revocation server-side.
    • Student check-in requires authenticated enrollment, open session, valid QR, fresh precise GPS and radius check.
    • GPS-only verification cannot guarantee physical presence; treat spoofing as an explicit security risk.
    • Database unique(attendance_session_id, student_id) prevents double check-in under concurrency.
    • On session closure, insert Absent records for eligible students who did not check in; use verification_method=system and null GPS fields.
    • For manual overrides, require reason and actor; preserve prior values in an audit trail.
12. Current next action — start here
Since Laravel and PostgreSQL are already connected, implement Step 1 now: inspect the existing users migration and Sanctum installation, then create AuthController, LoginRequest, role authorization, an AdminUserSeeder, and login/security feature tests. After that, build the Department module as your template for the remaining Admin CRUD APIs.
Do not run php artisan migrate:fresh against important existing data. Review migrations before executing them. Commit after each green module so rollback is easy.
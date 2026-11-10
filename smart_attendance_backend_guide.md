SMART ATTENDANCE  /  BACKEND IMPLEMENTATION

Smart Attendance

Laravel + PostgreSQL  |  Backend API Implementation Guide

ADMIN-FIRST ROADMAP  •  PROJECT SETUP AND DATABASE CONNECTION ALREADY COMPLETE

Goal: build and verify a secure, versioned admin API first; then build the attendance engine and Android endpoints on the same Laravel backend.

Implementation baseline

Already done

Next work

Not in this phase

Laravel project initialized; PostgreSQL connection working

Backend architecture, authentication, role checks and Admin APIs

Kotlin UI, QR scanning, GPS Android integration

Database is reachable from Laravel

Migrations and seed data for Admin workflows

Public student signup or multi-university tenancy

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

Step

Module / deliverable

Definition of done

0

Foundation: API conventions, env, test database

/api/v1/health returns JSON; config and test database isolated

1

Users + Sanctum + role checks

Admin can login/logout/me; student cannot reach /admin

2

Departments CRUD

Validation, pagination, filters, soft delete/deactivation policy tested

3

Academic years + semesters

Dates and parent relations validated

4

Students CRUD

Create user + student profile in one transaction; unique student_code

5

Teachers CRUD

Create user + teacher profile in one transaction; unique teacher_code

6

Courses CRUD

Belong to department; unique course_code

7

Class sections CRUD

Belong to course and semester; unique section per offering

8

Classrooms CRUD

GPS coordinates and radius validated

9

Teacher assignments CRUD

Only valid teacher and section; no duplicate assignment

10

Student enrollments CRUD

Only active students; no duplicate enrollment; capacity check

11

Class schedules CRUD

Time validity, room/teacher conflicts, day-of-week

12

Admin dashboard + reporting

Counts and attendance summaries from real DB queries

13

Attendance session + QR/GPS engine

Server-side checks, unique check-in, status finalization

14

Teacher + student APIs; Kotlin integration

Scope-limited permissions and contract tests

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

Create / verify users migration with role (admin, teacher, student), status (active, inactive, suspended), email and password; ensure emails are unique.

Install/configure Sanctum if not already installed; confirm personal_access_tokens migration exists.

Create UserRole and UserStatus enums (or constants); allow only known role/status values.

Create AuthController: login, me, logout; validate request input and rate-limit login.

Add authorization: gate/policy or middleware restricting Admin endpoints to active admin users. Return 401 if unauthenticated, 403 if authenticated without permission.

Seed one admin via an environment-provided password; never commit a fixed production password.

Test invalid credentials, inactive account, invalid/expired token, non-admin access and logout token revocation.

php artisan make:controller Api/V1/Auth/AuthController
php artisan make:request Api/V1/Auth/LoginRequest
php artisan make:seeder AdminUserSeeder
php artisan make:test Feature/Api/V1/Auth/LoginTest

5. Phase 2 — Admin modules and database order

Build order

Tables

Critical design rules

A

users, departments

users.role + status checked server-side; department.code unique

B

academic_years, semesters

start < end; semester within academic year

C

students, teachers

unique users FK; unique student_code / teacher_code

D

courses, class_sections

course_code unique; (course_id, semester_id, section_code) unique

E

classrooms, teacher_assignments

valid lat/long/radius; (section_id, teacher_id) unique

F

enrollments, class_schedules

(section_id, student_id) unique; enforce time conflict rules

G

attendance_sessions, attendance_qr_tokens, attendances

finalized later; ensure room snapshot and duplicate protection

H

attendance_corrections, audit_logs, notifications

audit sensitive changes; review workflow

Important schema refinement: nullable GPS fields in attendances for manual corrections and generated absences; set verification_method to dynamic_qr, manual, or system. Avoid requiring GPS on system-generated absent records. Preserve class session GPS rules (room position/radius snapshot) so later room edits do not change historical validation.

6. Admin module contracts — endpoints

Base path: /api/v1. All routes below require auth:sanctum plus admin authorization.

Resource

Route pattern

Methods / scope

Dashboard

/admin/dashboard

GET summary counts, recent trends

Departments

/admin/departments

GET list, POST, GET {id}, PUT/PATCH {id}, DELETE {id}

Academic years

/admin/academic-years

Full CRUD

Semesters

/admin/semesters

Full CRUD

Students

/admin/students

Full CRUD; filters by department/year/status

Teachers

/admin/teachers

Full CRUD; filters by department/status

Courses

/admin/courses

Full CRUD; search by code/name

Class sections

/admin/class-sections

Full CRUD; course, semester filters

Classrooms

/admin/classrooms

Full CRUD; GPS validation

Assignments

/admin/teacher-assignments

List, assign, update, unassign

Enrollments

/admin/enrollments

List, enroll, change status, withdraw

Schedules

/admin/class-schedules

Full CRUD; detect room conflicts

Attendance

/admin/attendance

Read/filter plus authorized corrections later

Reports

/admin/reports/attendance

GET aggregated reports, later CSV export

Audit logs

/admin/audit-logs

Read-only with pagination

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

Authentication: guest gets 401; active student/teacher gets 403; admin succeeds.

Validation: missing required input, duplicate code, invalid foreign keys and bad GPS fields return 422.

Data integrity: related records not silently lost; deleting a referenced department is restricted or archived.

Listing: paginated, searchable, filterable and sorted consistently.

Responses: correct HTTP status, field names and non-sensitive payload; passwords never returned.

Transactions: user + student profile or user + teacher profile are created atomically.

Audit: sensitive admin create/update/delete changes record actor, action and timestamp.

php artisan migrate
php artisan db:seed --class=AdminUserSeeder
php artisan route:list --path=api/v1/admin
php artisan test --filter=DepartmentApiTest

10. Recommended first development sprint

Day / milestone

Deliverable

Verify before proceeding

Milestone 1

Auth + role authorization + admin seeder

Admin login works; non-admin access denied

Milestone 2

Departments CRUD complete

Tests pass; API collection contains five operations

Milestone 3

Academic years and semesters

FK/date validation tests pass

Milestone 4

Students and teachers CRUD

Transactional user/profile creation and password safety

Milestone 5

Courses, sections, rooms

All academic FK + unique constraints work

Milestone 6

Assignment, enrollment, timetable

No duplicate enrollment; conflict tests pass

Milestone 7

Admin dashboard, audit and reports

Summary queries verified against seeded fixtures

11. Attendance-engine prerequisites (after Admin MVP)

Attendance sessions must refer to existing sections, assigned teachers and classroom location snapshots.

QR tokens rotate around every 30 seconds and store only hashes; validate expiry and revocation server-side.

Student check-in requires authenticated enrollment, open session, valid QR, fresh precise GPS and radius check.

GPS-only verification cannot guarantee physical presence; treat spoofing as an explicit security risk.

Database unique(attendance_session_id, student_id) prevents double check-in under concurrency.

On session closure, insert Absent records for eligible students who did not check in; use verification_method=system and null GPS fields.

For manual overrides, require reason and actor; preserve prior values in an audit trail.

12. Current next action — start here

Since Laravel and PostgreSQL are already connected, implement Step 1 now: inspect the existing users migration and Sanctum installation, then create AuthController, LoginRequest, role authorization, an AdminUserSeeder, and login/security feature tests. After that, build the Department module as your template for the remaining Admin CRUD APIs.

Do not run php artisan migrate:fresh against important existing data. Review migrations before executing them. Commit after each green module so rollback is easy.


Smart Attendance · Admin-first Backend & Database Specification

SMART ATTENDANCE  /  BACKEND IMPLEMENTATION

APPENDIX A — Database Schema & ERD Analysis

Implementation-ready data model • Admin-first Laravel API • PostgreSQL 14+ • Single university

This appendix adds the approved 18-table relational model to the admin-first backend roadmap. The companion smart_attendance_postgresql_schema.sql file contains the full PostgreSQL DDL. Laravel migrations should be the source of schema changes in the application; the SQL is a reference and may be applied only to a disposable empty development database.

A1. Schema design principles

One users table provides authentication; students and teachers are one-to-one academic profiles linked through user_id.

Enrollment belongs to a class_section, not the course itself. A section belongs to one course in one semester.

The teacher–section relationship is many-to-many through teacher_assignments; each attendance session identifies the teacher who opened it.

Each attendance session belongs to a section, optionally to a schedule, and references one classroom. Copy classroom latitude, longitude and allowed radius into the session so historical checks remain reproducible.

Dynamic QR tokens rotate every 30 seconds. Only a SHA-256 token hash is stored; expiration and session closure are validated server-side.

Attendance records are unique by (attendance_session_id, student_id). GPS fields are mandatory for successful dynamic_qr records but nullable for manual or system-created absences.

Absences are finalized after session closure for eligible enrolled students; correction requests reference existing attendance rows.

Persist timestamps as UTC TIMESTAMPTZ; interpret academic dates and timetables in Asia/Phnom_Penh.

Use RESTRICT on academic history foreign keys, avoid physical deletes when referenced; prefer deactivation and audited changes.

A2. ERD relationship map

users 1—0..1 students; users 1—0..1 teachers

departments 1—many students / teachers / courses

academic_years 1—many semesters

courses 1—many class_sections; semesters 1—many class_sections

class_sections many—many teachers via teacher_assignments

class_sections many—many students via enrollments

class_sections 1—many class_schedules; classrooms 1—many class_schedules

class_sections 1—many attendance_sessions; classrooms 1—many attendance_sessions

attendance_sessions 1—many attendance_qr_tokens

attendance_sessions 1—many attendances; students 1—many attendances

attendances 1—many attendance_corrections

users 1—many notifications / audit_logs

Practical cardinality note: a single user may have at most one student or one teacher profile. Laravel business validation must ensure the profile type matches users.role and must prohibit both student and teacher profiles on the same user in this MVP.

A3. Database dictionary — 18 application tables

#

Table

Purpose

Critical keys / fields

01

departments

Academic departments

code UNIQUE; status

02

users

Login identity / role

email UNIQUE; role, status

03

students

Student profile

user_id UNIQUE; student_code UNIQUE; department_id

04

teachers

Teacher profile

user_id UNIQUE; teacher_code UNIQUE; department_id

05

academic_years

Academic period

name UNIQUE; start/end dates

06

semesters

Subperiod of academic year

academic_year_id; UNIQUE(year,name)

07

courses

Course catalog

department_id; course_code UNIQUE

08

class_sections

Course offering in semester

course_id; semester_id; UNIQUE(course,semester,section_code)

09

teacher_assignments

Teachers allocated to sections

UNIQUE(class_section_id,teacher_id)

10

enrollments

Student section membership

UNIQUE(class_section_id,student_id); status

11

classrooms

Room and GPS geofence

room_code UNIQUE; latitude/longitude/radius

12

class_schedules

Weekly timetable

section_id; classroom_id; day/start/end

13

attendance_sessions

Individual class attendance event

section_id; teacher_id; room snapshot; timestamps

14

attendance_qr_tokens

Rotating QR token hashes

session_id; token_hash UNIQUE; expires_at

15

attendances

Student session attendance

UNIQUE(session_id,student_id); GPS & status

16

attendance_corrections

Audit-ready correction request

attendance_id; requester/reviewer; decision

17

notifications

User notifications

user_id; read_at; JSONB data

18

audit_logs

Security / business audit

actor; entity; JSONB changes

A4. Field-level definitions for implementation

departments

id BIGINT PK; code VARCHAR(30) UNIQUE; name VARCHAR(150); description TEXT NULL; status VARCHAR(20); created_at,updated_at TIMESTAMPTZ

users

id BIGINT PK; name VARCHAR(150); email VARCHAR(150) UNIQUE; password VARCHAR(255); role VARCHAR(20); status VARCHAR(20); email_verified_at TIMESTAMPTZ NULL; remember_token VARCHAR(100) NULL; created_at,updated_at

students

id PK; user_id FK UNIQUE; department_id FK; student_code VARCHAR(50) UNIQUE; year_level SMALLINT (1..10); phone VARCHAR(30) NULL; timestamps

teachers

id PK; user_id FK UNIQUE; department_id FK; teacher_code VARCHAR(50) UNIQUE; phone VARCHAR(30) NULL; timestamps

academic_years

id PK; name VARCHAR(30) UNIQUE; start_date,end_date DATE; status upcoming/active/completed; timestamps

semesters

id PK; academic_year_id FK; name VARCHAR(50); start_date,end_date DATE; status; UNIQUE(academic_year_id,name); timestamps

courses

id PK; department_id FK; course_code VARCHAR(50) UNIQUE; name VARCHAR(150); description TEXT NULL; credits SMALLINT >0; status; timestamps

class_sections

id PK; course_id FK; semester_id FK; section_code VARCHAR(30); capacity INTEGER >0; status; UNIQUE(course_id,semester_id,section_code); timestamps

teacher_assignments

id PK; class_section_id FK; teacher_id FK; assigned_at TIMESTAMPTZ; UNIQUE(section,teacher)

enrollments

id PK; class_section_id FK; student_id FK; enrollment_date DATE; status enrolled/dropped/completed; UNIQUE(section,student); timestamps

classrooms

id PK; room_code VARCHAR(50) UNIQUE; building/floor NULL; latitude,longitude NUMERIC(10,7); allowed_radius_meters INTEGER (10..1000); status; timestamps

class_schedules

id PK; class_section_id FK; classroom_id FK; day_of_week SMALLINT (1..7); start_time,end_time TIME; effective_from, effective_until DATE NULL; timestamps

attendance_sessions

id PK; class_section_id FK; class_schedule_id FK NULL; teacher_id FK; classroom_id FK; session_date DATE; starts_at,late_after,closes_at TIMESTAMPTZ; closed_at NULL; status scheduled/open/closed/cancelled; allowed_latitude,allowed_longitude NUMERIC(10,7); allowed_radius_meters INTEGER; timestamps

attendance_qr_tokens

id PK; attendance_session_id FK; token_hash CHAR(64) UNIQUE; expires_at TIMESTAMPTZ; revoked_at NULL; created_at

attendances

id PK; attendance_session_id FK; student_id FK; status present/late/absent/excused; verification_method dynamic_qr/manual/system; latitude/longitude NUMERIC(10,7) NULL; gps_accuracy_meters/distance_meters NUMERIC NULL; checked_in_at NULL; marked_by FK NULL; remarks NULL; UNIQUE(session,student); timestamps

attendance_corrections

id PK; attendance_id FK; requested_by FK; reviewed_by FK NULL; reason TEXT; requested_status; status pending/approved/rejected; reviewed_at NULL; review_note NULL; timestamps

notifications

id PK; user_id FK; title; message; type; data JSONB NULL; read_at NULL; created_at

audit_logs

id PK; user_id FK NULL; action; entity_type; entity_id NULL; old_values/new_values JSONB NULL; ip_address INET NULL; created_at

A5. Attendance validation and lifecycle rules

Code

Rule

Backend enforcement

AT-01

Only assigned teacher opens a session

Policy on teacher_assignments and active section

AT-02

Only one open session per section

Partial unique index status=open

AT-03

QR rotates ~30 seconds

CSPRNG token; hash stored; expires_at; strict token expiry

AT-04

Student must be actively enrolled

Verify enrollments.status=enrolled

AT-05

GPS required for QR check-in

Latitude/longitude/accuracy required; DB dynamic_qr CHECK

AT-06

Distance <= session geofence

Haversine server-side from session snapshots

AT-07

GPS quality thresholds

Accuracy <= 30 m, fresh location <= 15 s (configurable)

AT-08

No duplicated attendance

Database UNIQUE(session,student); transaction and conflict handling

AT-09

Present vs late

Server current time vs late_after and closes_at

AT-10

Final absent records

On close, insert system/absent for enrolled students not checked in

AT-11

Admin/teacher corrections

Approved request updates attendance + audit_logs transaction

AT-12

Preserve history

Restrict deletion; maintain correction and audit trails

Security limitation: GPS can be spoofed on compromised devices. Client mock-location flags are advisory, not tamper-proof evidence. Consider in-room teacher oversight or campus Wi-Fi signals in a later phase.

A6. Admin-first migration order

01. users (or carefully modify Laravel default users migration)

02. departments

03. students

04. teachers

05. academic_years

06. semesters

07. courses

08. class_sections

09. teacher_assignments

10. enrollments

11. classrooms

12. class_schedules

13. attendance_sessions

14. attendance_qr_tokens

15. attendances

16. attendance_corrections

17. notifications

18. audit_logs

19. Sanctum personal_access_tokens (Laravel package migration)

Laravel migrations should use $table->id(), foreignId()->constrained(), unique(), index(), timestampsTz(); and appropriate CHECK constraints via DB::statement() when needed. Do not run the raw SQL after equivalent migrations, or tables will conflict.

A7. Admin API module order & dependencies

Sprint

Admin module

Prerequisite / acceptance

1

Authentication + admin role

Seed admin; login/me/logout; 401/403 tests

2

Departments

CRUD + unique code; FK delete protection

3

Academic years / semesters

Date and containment validation; lifecycle

4

Students / teachers

Transactional users+profiles; role consistency

5

Courses / sections

Department and semester association

6

Classrooms / schedules

Geofence configuration; overlapping slot checks

7

Teacher assignments / enrollment

Duplicate prevention; capacity / conflicts

8

Admin attendance read/report

Filters, pagination, data integrity

9

QR + GPS engine (teacher/student APIs)

Session lifecycle, token rotation, geofence, absences

10

Corrections / notifications / audit

Policy-controlled updates and traceability

A8. Minimum Admin API endpoints

Version prefix: /api/v1. Require auth:sanctum plus active-admin authorization on each admin API route.

Method

Endpoint

Scope

GET, POST

/admin/departments

List/create

GET, PUT, DELETE

/admin/departments/{id}

Detail/update/deactivate

GET, POST

/admin/academic-years

List/create

GET, POST

/admin/semesters

List/create

GET, POST

/admin/students

List/create user + student

GET, POST

/admin/teachers

List/create user + teacher

GET, POST

/admin/courses

List/create

GET, POST

/admin/class-sections

List/create

GET, POST

/admin/classrooms

List/create

GET, POST

/admin/class-schedules

List/create

GET, POST

/admin/teacher-assignments

List/assign

GET, POST

/admin/enrollments

List/enroll

GET

/admin/attendance

Filter attendance

GET

/admin/reports/attendance

Aggregated reports

GET

/admin/audit-logs

Audits

For all CRUD modules also implement GET /{id}, PATCH /{id}, and DELETE /{id} or a dedicated deactivate endpoint as business rules require. Use Form Requests, Policies, API Resources, pagination, and feature tests.

A9. Recommended setup & verification

php artisan migrate:status

php artisan make:model Department -m

php artisan make:controller Api/V1/Admin/DepartmentController --api

php artisan make:request Api/V1/Admin/StoreDepartmentRequest

php artisan make:policy DepartmentPolicy --model=Department

php artisan route:list --path=api

php artisan migrate --pretend

php artisan migrate

php artisan test

Safe rollout: (1) review current database tables, (2) generate one migration per table in dependency order, (3) implement admin resources sequentially, (4) test with a separate testing database, (5) introduce attendance engine only after enrollment and scheduling APIs pass.

A10. Open implementation decisions

Account deletion should be deactivation unless there is no academic history.

Attendance correction approvals must define which teacher/admin can approve and how absent-to-excused counts in reporting.

The session scheduling policy should prevent teacher, room, and section time conflicts in application logic.

Database constraints do not enforce student profile role alignment; add Laravel validation/service transactions (or database triggers if strict DB-level enforcement is required).

Smart Attendance · Admin-first Backend & Database Specification
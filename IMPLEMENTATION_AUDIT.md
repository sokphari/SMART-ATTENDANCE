# Smart Attendance module audit

Audit date: 2026-11-20

Status meanings: **EXISTS** is already usable in the current architecture; **PARTIAL** means core records or screens exist but a requirement below is missing; **MISSING** means there is no structured implementation yet.

| Module | Status | Existing implementation | Gaps to address |
| --- | --- | --- | --- |
| Department Management | EXISTS | `backend/app/Modules/Departments`, `backend/database/migrations/2026_11_10_090000_create_departments_table.php`, `frontend/src/features/departments` | Keep current CRUD and authorization. |
| Academic Management | PARTIAL | Academic years and semesters APIs/models/pages in `backend/app/Modules/{AcademicYears,Semesters}` and `frontend/src/features/{academic-years,semesters}`; student `year_level` already exists | Programs are missing; student year is a numeric field but is not represented in class setup. |
| Subject/Course Management | PARTIAL | Course catalog and CRUD in `backend/app/Modules/Courses` and `frontend/src/features/courses` | Program relationship is missing; optional credits exist and should remain supported. |
| Teacher Management | PARTIAL | Teacher/user profile, department, account status, assignments and admin/teacher pages | Teacher qualifications are missing. |
| Building, Floor & Classroom Management | PARTIAL | `Classroom` has flat `building` and `floor` text columns and a CRUD API in `backend/app/Modules/Classrooms` | Structured buildings/floors, room capacity/type, cascading selectors and class capacity validation are missing. |
| Student Management | PARTIAL | Students, registration workflow, department, gender, year level, enrollment/account/history views in `backend/app/Modules/Students` and `frontend/src/features/students` | Program/cohort association is missing. |
| Class/Section Management | PARTIAL | Class sections, section code/capacity/status, teacher assignments and detail/list views in `backend/app/Modules/ClassSections` and `frontend/src/features/class-sections` | No generated class code, student year or atomic create-with-teacher-and-timetable flow. |
| Timetable Management | PARTIAL | Schedule CRUD, period settings and conflict service in `backend/app/Modules/ClassSchedules`; admin schedule UI in `frontend/src/features/schedules` | Schedule rows are created separately from sections; room capacity and class date-range validation need integration. |
| Enrollment Management | PARTIAL | Enrollment CRUD, transfer, unique student/section key, transaction and section row lock in `backend/app/Modules/Enrollments` | Eligible-student suggestions are missing; retain locking and add matching program/year filters. |
| Attendance Management | EXISTS | Sessions, QR tokens, manual marking, history, corrections, reports and teacher ownership checks in `backend/app/Modules/Attendance`; admin and teacher UI | Preserve the existing workflows; add regression coverage for any integration change. |

## Implementation checklist

- [x] Inspect current routes, migrations, models, module services, pages, navigation, Docker and tests.
- [x] Add structured program and student-year/class-year support without dropping legacy fields.
- [x] Add structured building/floor/room hierarchy while preserving legacy classroom fields/data.
- [x] Add the four-step class wizard and atomically persist the section, teacher assignment and schedule rows.
- [x] Enforce server-side room capacity, active location, teacher/room conflict and class-range checks.
- [x] Add eligible-student suggestions and preserve safe enrollment concurrency.
- [x] Add API tests for setup, hierarchy, class creation, eligibility and capacity; retain attendance workflows.
- [ ] Verify a production-style PostgreSQL upgrade with existing data. Do not run this automatically; a PostgreSQL test environment must be isolated from the application database first.

Testing note: Laravel tests must be run with explicit `DB_CONNECTION=sqlite DB_DATABASE=:memory: DB_URL=` overrides when using this Compose service. Docker supplies PostgreSQL environment variables that otherwise override the SQLite defaults in `phpunit.xml`.

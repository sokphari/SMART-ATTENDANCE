<?php

namespace App\Modules\Students\Services;

use App\Enums\DepartmentStatus;
use App\Models\AuditLog;
use App\Models\Department;
use App\Models\Student;
use App\Models\StudentRegistrationToken;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

class StudentRegistrationService
{
    public function __construct(private readonly StudentServices $students) {}

    /** @return array{id: int, url: string, expires_at: string, status: string} */
    public function generate(User $admin, Request $request): array
    {
        $plainToken = bin2hex(random_bytes(32));
        $expiresAt = now()->addMinutes((int) config('student_registration.token_ttl_minutes', 15));

        $registration = StudentRegistrationToken::create([
            'created_by' => $admin->id,
            'token_hash' => hash('sha256', $plainToken),
            'expires_at' => $expiresAt,
        ]);

        $origin = $request->headers->get('origin');
        $frontendBase = is_string($origin) && preg_match('/^https?:\/\/[a-z0-9.\-:]+$/i', $origin)
            ? $origin
            : (string) config('student_registration.frontend_url', 'http://localhost:3000');

        return [
            'id' => $registration->id,
            'url' => rtrim($frontendBase, '/').'/student-register/'.$plainToken,
            'expires_at' => $expiresAt->toISOString(),
            'status' => 'active',
        ];
    }

    /** @return array{status: string, expires_at: string, used_at: ?string, revoked_at: ?string} */
    public function stateByPlainToken(string $plainToken): array
    {
        return $this->state($this->findToken($plainToken));
    }

    /** @return array{status: string, expires_at: string, used_at: ?string, revoked_at: ?string} */
    public function state(StudentRegistrationToken $token): array
    {
        return [
            'status' => $this->status($token),
            'expires_at' => $token->expires_at->toISOString(),
            'used_at' => $token->used_at?->toISOString(),
            'revoked_at' => $token->revoked_at?->toISOString(),
        ];
    }

    /** @return list<array{id: int, name: string, code: string}> */
    public function departments(string $plainToken): array
    {
        $this->assertUsable($this->findToken($plainToken));

        return Department::query()
            ->where('status', DepartmentStatus::Active->value)
            ->orderBy('name')
            ->get(['id', 'name', 'code'])
            ->map(fn (Department $department): array => [
                'id' => $department->id,
                'name' => $department->name,
                'code' => $department->code,
            ])
            ->all();
    }

    /**
     * @param array{first_name: string, last_name: string, gender: string, department_id: int, year_level: int, phone: string, email: string, password: string} $data
     * @return array{student: Student, section_created: bool}
     */
    public function register(string $plainToken, array $data, ?string $ipAddress): array
    {
        return DB::transaction(function () use ($plainToken, $data, $ipAddress): array {
            $token = StudentRegistrationToken::query()
                ->where('token_hash', hash('sha256', $plainToken))
                ->lockForUpdate()
                ->first();

            if (! $token) {
                abort(404, 'This registration link is not valid.');
            }
            $this->assertUsable($token);

            $department = Department::query()->whereKey($data['department_id'])->lockForUpdate()->first();
            if (! $department || ! $department->isActive()) {
                throw ValidationException::withMessages([
                    'department_id' => ['Choose an active department.'],
                ]);
            }

            $student = $this->students->create([
                'name' => trim($data['first_name'].' '.$data['last_name']),
                'email' => $data['email'],
                'password' => $data['password'],
                'status' => 'active',
                'department_id' => $department->id,
                'student_code' => $this->students->generateStudentCode(),
                'year_level' => $data['year_level'],
                'phone' => $data['phone'],
                'gender' => $data['gender'],
            ]);

            $token->forceFill(['used_at' => now()])->save();
            $sectionCreated = (bool) $student->getAttribute('registration_section_created');
            $student->load([
                'user',
                'department',
                'enrollments' => fn ($query) => $query->where('status', 'enrolled')
                    ->with(['classSection.course.department', 'classSection.semester.academicYear']),
            ]);

            $enrollment = $student->enrollments->first();
            AuditLog::create([
                'user_id' => null,
                'action' => 'students.qr_registered',
                'entity_type' => Student::class,
                'entity_id' => $student->id,
                'new_values' => [
                    'student_code' => $student->student_code,
                    'department_id' => $student->department_id,
                    'class_section_id' => $enrollment?->class_section_id,
                    'registration_token_id' => $token->id,
                ],
                'ip_address' => $ipAddress,
                'created_at' => now(),
            ]);

            if ($sectionCreated && $enrollment?->classSection) {
                AuditLog::create([
                    'user_id' => null,
                    'action' => 'students.registration_section_created',
                    'entity_type' => 'class_section',
                    'entity_id' => $enrollment->class_section_id,
                    'new_values' => [
                        'section_code' => $enrollment->classSection->section_code,
                        'student_code' => $student->student_code,
                        'department' => $department->name,
                        'course' => $enrollment->classSection->course?->name,
                        'needs_setup' => true,
                    ],
                    'ip_address' => $ipAddress,
                    'created_at' => now(),
                ]);
            }

            return ['student' => $student, 'section_created' => $sectionCreated];
        }, 3);
    }

    public function revoke(StudentRegistrationToken $token, User $admin): void
    {
        DB::transaction(function () use ($token, $admin): void {
            $locked = StudentRegistrationToken::query()->whereKey($token->id)->lockForUpdate()->firstOrFail();
            if ($this->status($locked) !== 'active') {
                throw new HttpException(409, 'This registration link is no longer active.');
            }

            $locked->forceFill(['revoked_at' => now()])->save();
            AuditLog::create([
                'user_id' => $admin->id,
                'action' => 'students.registration_link_revoked',
                'entity_type' => 'student_registration_token',
                'entity_id' => $locked->id,
                'ip_address' => request()->ip(),
                'created_at' => now(),
            ]);
        });
    }

    private function findToken(string $plainToken): StudentRegistrationToken
    {
        $token = StudentRegistrationToken::query()
            ->where('token_hash', hash('sha256', $plainToken))
            ->first();

        if (! $token) {
            abort(404, 'This registration link is not valid.');
        }

        return $token;
    }

    private function status(StudentRegistrationToken $token): string
    {
        if ($token->used_at) return 'used';
        if ($token->revoked_at) return 'revoked';
        if ($token->expires_at->isPast()) return 'expired';
        return 'active';
    }

    private function assertUsable(StudentRegistrationToken $token): void
    {
        $status = $this->status($token);
        if ($status === 'used') {
            throw new HttpException(409, 'This registration link has already been used.');
        }
        if ($status === 'revoked') {
            throw new HttpException(410, 'This registration link was revoked by an administrator.');
        }
        if ($status === 'expired') {
            throw new HttpException(410, 'This registration link has expired. Ask the administrator for a new QR code.');
        }
    }
}

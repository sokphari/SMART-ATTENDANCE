<?php

namespace App\Modules\TeacherAssignments\Services;

use App\Models\TeacherAssignment;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class TeacherAssignmentServices
{
    /**
     * @param  array{search?: string|null, class_section_id?: int|string|null, teacher_id?: int|string|null, per_page?: int|string|null}  $filters
     */
    public function paginate(array $filters = []): LengthAwarePaginator
    {
        return TeacherAssignment::query()
            ->with([
                'classSection.course.department',
                'classSection.semester',
                'teacher.user',
                'teacher.department',
            ])
            ->when($filters['search'] ?? null, function ($query, string $search): void {
                $term = '%'.strtolower($search).'%';

                $query->whereHas('teacher', function ($query) use ($term): void {
                    $query->whereRaw('LOWER(teacher_code) LIKE ?', [$term])
                        ->orWhereHas('user', function ($query) use ($term): void {
                            $query->whereRaw('LOWER(name) LIKE ?', [$term])
                                ->orWhereRaw('LOWER(email) LIKE ?', [$term]);
                        });
                });
            })
            ->when(
                $filters['class_section_id'] ?? null,
                fn ($query, $classSectionId) => $query->where('class_section_id', $classSectionId)
            )
            ->when(
                $filters['teacher_id'] ?? null,
                fn ($query, $teacherId) => $query->where('teacher_id', $teacherId)
            )
            ->orderBy('id')
            ->paginate((int) ($filters['per_page'] ?? 15))
            ->withQueryString();
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): TeacherAssignment
    {
        $assignment = DB::transaction(function () use ($data): TeacherAssignment {
            \App\Models\ClassSection::query()->whereKey($data['class_section_id'])->lockForUpdate()->firstOrFail();
            \App\Models\Teacher::query()->whereKey($data['teacher_id'])->lockForUpdate()->firstOrFail();

            return TeacherAssignment::create([
                'class_section_id' => $data['class_section_id'],
                'teacher_id' => $data['teacher_id'],
                'assigned_at' => $data['assigned_at'] ?? now(),
            ]);
        }, 3);

        return $assignment->load($this->relations());
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(TeacherAssignment $assignment, array $data): TeacherAssignment
    {
        DB::transaction(function () use ($assignment, $data): void {
            $locked = TeacherAssignment::query()->whereKey($assignment->id)->lockForUpdate()->firstOrFail();
            $sectionId = (int) ($data['class_section_id'] ?? $locked->class_section_id);
            $teacherId = (int) ($data['teacher_id'] ?? $locked->teacher_id);
            \App\Models\ClassSection::query()->whereIn('id', [$locked->class_section_id, $sectionId])->orderBy('id')->lockForUpdate()->get();
            \App\Models\Teacher::query()->whereIn('id', [$locked->teacher_id, $teacherId])->orderBy('id')->lockForUpdate()->get();
            $locked->fill($data)->save();
        }, 3);

        return $assignment->refresh()->load($this->relations());
    }

    public function unassign(TeacherAssignment $assignment): void
    {
        DB::transaction(function () use ($assignment): void {
            $locked = TeacherAssignment::query()->whereKey($assignment->id)->lockForUpdate()->firstOrFail();
            \App\Models\ClassSection::query()->whereKey($locked->class_section_id)->lockForUpdate()->firstOrFail();
            \App\Models\Teacher::query()->whereKey($locked->teacher_id)->lockForUpdate()->firstOrFail();
            $locked->delete();
        }, 3);
    }

    /**
     * @return list<string>
     */
    private function relations(): array
    {
        return ['classSection.course.department', 'classSection.semester', 'teacher.user', 'teacher.department'];
    }
}

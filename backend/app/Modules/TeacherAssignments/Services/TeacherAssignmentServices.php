<?php

namespace App\Modules\TeacherAssignments\Services;

use App\Models\TeacherAssignment;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

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
        $assignment = TeacherAssignment::create([
            'class_section_id' => $data['class_section_id'],
            'teacher_id' => $data['teacher_id'],
            'assigned_at' => $data['assigned_at'] ?? now(),
        ]);

        return $assignment->load($this->relations());
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(TeacherAssignment $assignment, array $data): TeacherAssignment
    {
        $assignment->fill($data);
        $assignment->save();

        return $assignment->refresh()->load($this->relations());
    }

    public function unassign(TeacherAssignment $assignment): void
    {
        $assignment->delete();
    }

    /**
     * @return list<string>
     */
    private function relations(): array
    {
        return ['classSection.course.department', 'classSection.semester', 'teacher.user', 'teacher.department'];
    }
}

<?php

namespace App\Modules\Teachers\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Teacher;
use App\Modules\Teachers\Requests\RequestUpdateOwnProfile;
use App\Modules\Teachers\Resources\TeacherResource;
use App\Modules\Teachers\Services\TeacherServices;
use Illuminate\Http\Request;

class TeacherProfileController extends Controller
{
    public function __construct(private readonly TeacherServices $teachers) {}

    public function show(Request $request): TeacherResource
    {
        return new TeacherResource($this->teacher($request)->load(['user', 'department']));
    }

    public function update(RequestUpdateOwnProfile $request): TeacherResource
    {
        $teacher = $this->teachers->updateOwnProfile(
            $this->teacher($request),
            $request->validated()
        );

        return new TeacherResource($teacher);
    }

    private function teacher(Request $request): Teacher
    {
        $teacher = $request->user()?->teacher;
        abort_if(! $teacher instanceof Teacher, 403, 'Teacher profile not found.');

        return $teacher;
    }
}

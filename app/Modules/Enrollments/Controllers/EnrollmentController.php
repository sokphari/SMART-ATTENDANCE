<?php

namespace App\Modules\Enrollments\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Enrollment;
use App\Modules\Enrollments\Requests\RequestStore;
use App\Modules\Enrollments\Requests\RequestUpdate;
use App\Modules\Enrollments\Resources\EnrollmentResource;
use App\Modules\Enrollments\Services\EnrollmentServices;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class EnrollmentController extends Controller
{
    public function __construct(private readonly EnrollmentServices $enrollments) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $enrollments = $this->enrollments->paginate(
            $request->only(['search', 'class_section_id', 'student_id', 'status', 'per_page'])
        );

        return EnrollmentResource::collection($enrollments);
    }

    public function store(RequestStore $request): JsonResponse
    {
        $enrollment = $this->enrollments->create($request->validated());

        return (new EnrollmentResource($enrollment))->response()->setStatusCode(201);
    }

    public function show(Enrollment $enrollment): EnrollmentResource
    {
        $enrollment->load([
            'classSection.course.department',
            'classSection.semester',
            'student.user',
            'student.department',
        ]);

        return new EnrollmentResource($enrollment);
    }

    public function update(RequestUpdate $request, Enrollment $enrollment): EnrollmentResource
    {
        return new EnrollmentResource(
            $this->enrollments->update($enrollment, $request->validated())
        );
    }

    public function destroy(Enrollment $enrollment): JsonResponse
    {
        $this->enrollments->withdraw($enrollment);

        return response()->json(null, 204);
    }
}

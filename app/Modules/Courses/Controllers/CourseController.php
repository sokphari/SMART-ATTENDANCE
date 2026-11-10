<?php

namespace App\Modules\Courses\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Modules\Courses\Requests\RequestStore;
use App\Modules\Courses\Requests\RequestUpdate;
use App\Modules\Courses\Resources\CourseResource;
use App\Modules\Courses\Services\CourseServices;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CourseController extends Controller
{
    public function __construct(private readonly CourseServices $courses) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $courses = $this->courses->paginate(
            $request->only(['search', 'department_id', 'status', 'per_page'])
        );

        return CourseResource::collection($courses);
    }

    public function store(RequestStore $request): JsonResponse
    {
        $course = $this->courses->create($request->validated());

        return (new CourseResource($course))->response()->setStatusCode(201);
    }

    public function show(Course $course): CourseResource
    {
        $course->load('department');

        return new CourseResource($course);
    }

    public function update(RequestUpdate $request, Course $course): CourseResource
    {
        return new CourseResource(
            $this->courses->update($course, $request->validated())
        );
    }

    public function destroy(Course $course): JsonResponse
    {
        $this->courses->deactivate($course);

        return response()->json(null, 204);
    }
}

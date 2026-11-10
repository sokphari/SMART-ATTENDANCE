<?php

namespace App\Modules\Semesters\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Semester;
use App\Modules\Semesters\Requests\RequestStore;
use App\Modules\Semesters\Requests\RequestUpdate;
use App\Modules\Semesters\Resources\SemesterResource;
use App\Modules\Semesters\Services\SemesterServices;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class SemesterController extends Controller
{
    public function __construct(private readonly SemesterServices $semesters) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $semesters = $this->semesters->paginate(
            $request->only(['search', 'academic_year_id', 'status', 'per_page'])
        );

        return SemesterResource::collection($semesters);
    }

    public function store(RequestStore $request): JsonResponse
    {
        $semester = $this->semesters->create($request->validated());
        $semester->load('academicYear');

        return (new SemesterResource($semester))->response()->setStatusCode(201);
    }

    public function show(Semester $semester): SemesterResource
    {
        $semester->load('academicYear');

        return new SemesterResource($semester);
    }

    public function update(RequestUpdate $request, Semester $semester): SemesterResource
    {
        $semester = $this->semesters->update($semester, $request->validated());
        $semester->load('academicYear');

        return new SemesterResource($semester);
    }

    public function destroy(Semester $semester): JsonResponse
    {
        $this->semesters->delete($semester);

        return response()->json(null, 204);
    }
}

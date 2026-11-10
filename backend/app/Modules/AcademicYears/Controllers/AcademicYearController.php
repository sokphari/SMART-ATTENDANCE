<?php

namespace App\Modules\AcademicYears\Controllers;

use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Modules\AcademicYears\Requests\RequestStore;
use App\Modules\AcademicYears\Requests\RequestUpdate;
use App\Modules\AcademicYears\Resources\AcademicYearResource;
use App\Modules\AcademicYears\Services\AcademicYearServices;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AcademicYearController extends Controller
{
    public function __construct(private readonly AcademicYearServices $academicYears) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $academicYears = $this->academicYears->paginate(
            $request->only(['search', 'status', 'per_page'])
        );

        return AcademicYearResource::collection($academicYears);
    }

    public function store(RequestStore $request): JsonResponse
    {
        $academicYear = $this->academicYears->create($request->validated());

        return (new AcademicYearResource($academicYear))->response()->setStatusCode(201);
    }

    public function show(AcademicYear $academicYear): AcademicYearResource
    {
        $academicYear->loadCount('semesters');

        return new AcademicYearResource($academicYear);
    }

    public function update(RequestUpdate $request, AcademicYear $academicYear): AcademicYearResource
    {
        return new AcademicYearResource(
            $this->academicYears->update($academicYear, $request->validated())
        );
    }

    public function destroy(AcademicYear $academicYear): JsonResponse
    {
        $this->academicYears->delete($academicYear);

        return response()->json(null, 204);
    }
}

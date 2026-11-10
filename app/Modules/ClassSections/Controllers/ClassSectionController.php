<?php

namespace App\Modules\ClassSections\Controllers;

use App\Http\Controllers\Controller;
use App\Models\ClassSection;
use App\Modules\ClassSections\Requests\RequestStore;
use App\Modules\ClassSections\Requests\RequestUpdate;
use App\Modules\ClassSections\Resources\ClassSectionResource;
use App\Modules\ClassSections\Services\ClassSectionServices;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ClassSectionController extends Controller
{
    public function __construct(private readonly ClassSectionServices $classSections) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $classSections = $this->classSections->paginate(
            $request->only(['search', 'course_id', 'semester_id', 'status', 'per_page'])
        );

        return ClassSectionResource::collection($classSections);
    }

    public function store(RequestStore $request): JsonResponse
    {
        $classSection = $this->classSections->create($request->validated());

        return (new ClassSectionResource($classSection))->response()->setStatusCode(201);
    }

    public function show(ClassSection $classSection): ClassSectionResource
    {
        $classSection->load(['course.department', 'semester']);

        return new ClassSectionResource($classSection);
    }

    public function update(RequestUpdate $request, ClassSection $classSection): ClassSectionResource
    {
        return new ClassSectionResource(
            $this->classSections->update($classSection, $request->validated())
        );
    }

    public function destroy(ClassSection $classSection): JsonResponse
    {
        $this->classSections->deactivate($classSection);

        return response()->json(null, 204);
    }
}

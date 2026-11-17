<?php

namespace App\Modules\Students\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Students\Requests\RequestStudentRegistration;
use App\Modules\Students\Resources\StudentResource;
use App\Modules\Students\Services\StudentRegistrationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudentRegistrationController extends Controller
{
    public function __construct(private readonly StudentRegistrationService $registrations) {}

    public function show(string $token): JsonResponse
    {
        return response()->json(['data' => $this->registrations->stateByPlainToken($token)]);
    }

    public function departments(string $token): JsonResponse
    {
        return response()->json(['data' => $this->registrations->departments($token)]);
    }

    public function store(RequestStudentRegistration $request, string $token): JsonResponse
    {
        $result = $this->registrations->register($token, $request->validated(), $request->ip());
        $student = (new StudentResource($result['student']))->resolve($request);

        return response()->json([
            'data' => [
                'student' => $student,
                'enrollment' => $student['current_enrollment'] ?? null,
                'section_created' => $result['section_created'],
            ],
            'message' => 'Student registration completed successfully.',
        ], 201);
    }
}

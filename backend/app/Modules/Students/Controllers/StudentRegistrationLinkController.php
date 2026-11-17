<?php

namespace App\Modules\Students\Controllers;

use App\Http\Controllers\Controller;
use App\Models\StudentRegistrationToken;
use App\Modules\Students\Services\StudentRegistrationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudentRegistrationLinkController extends Controller
{
    public function __construct(private readonly StudentRegistrationService $registrations) {}

    public function store(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->registrations->generate($request->user(), $request),
        ], 201);
    }

    public function show(StudentRegistrationToken $registrationLink): JsonResponse
    {
        return response()->json(['data' => $this->registrations->state($registrationLink)]);
    }

    public function revoke(Request $request, StudentRegistrationToken $registrationLink): JsonResponse
    {
        $this->registrations->revoke($registrationLink, $request->user());

        return response()->json(['data' => $this->registrations->state($registrationLink->refresh())]);
    }
}

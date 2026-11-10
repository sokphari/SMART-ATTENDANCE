<?php

namespace App\Modules\Attendance\Controllers;

use App\Http\Controllers\Controller;
use App\Models\AttendanceCorrection;
use App\Modules\Attendance\Requests\RequestReviewCorrection;
use App\Modules\Attendance\Requests\RequestStoreCorrection;
use App\Modules\Attendance\Resources\AttendanceCorrectionResource;
use App\Modules\Attendance\Services\AttendanceCorrectionServices;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AttendanceCorrectionController extends Controller
{
    public function __construct(private readonly AttendanceCorrectionServices $corrections) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $corrections = $this->corrections->paginate(
            $request->only([
                'status',
                'attendance_id',
                'requested_by',
                'reviewed_by',
                'per_page',
            ])
        );

        return AttendanceCorrectionResource::collection($corrections);
    }

    public function store(RequestStoreCorrection $request): JsonResponse
    {
        $correction = $this->corrections->create(
            $request->validated(),
            $request->user()
        );

        return (new AttendanceCorrectionResource($correction))
            ->response()
            ->setStatusCode(201);
    }

    public function show(AttendanceCorrection $attendanceCorrection): AttendanceCorrectionResource
    {
        return new AttendanceCorrectionResource(
            $this->corrections->loadRelations($attendanceCorrection)
        );
    }

    public function review(
        RequestReviewCorrection $request,
        AttendanceCorrection $attendanceCorrection
    ): JsonResponse {
        $correction = $this->corrections->review(
            $attendanceCorrection,
            $request->validated(),
            $request->user()
        );

        return (new AttendanceCorrectionResource($correction))
            ->response()
            ->setStatusCode(200);
    }
}

<?php

namespace App\Modules\Teachers\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Teacher;
use App\Modules\Teachers\Services\TeacherDashboardServices;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TeacherDashboardController extends Controller
{
    public function __construct(private readonly TeacherDashboardServices $dashboard) {}

    public function __invoke(Request $request): JsonResponse
    {
        $teacher = $request->user()?->teacher;
        abort_if(! $teacher instanceof Teacher, 403, 'Teacher profile not found.');

        return response()->json(['data' => $this->dashboard->summary($teacher)]);
    }
}

<?php

namespace App\Modules\Dashboard\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Dashboard\Services\DashboardServices;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function __construct(private readonly DashboardServices $dashboard) {}

    public function index(): JsonResponse
    {
        return response()->json([
            'data' => $this->dashboard->summary(),
        ]);
    }
}

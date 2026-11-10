<?php

namespace App\Modules\Users\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Users\Requests\RequestLogin;
use App\Modules\Users\Resources\UserResource;
use App\Modules\Users\Services\UserServices;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function __construct(private readonly UserServices $users) {}

    public function login(RequestLogin $request): JsonResponse
    {
        $result = $this->users->login($request->validated(), $request->ip());

        return response()->json([
            'data' => new UserResource($result['user']),
            'token' => $result['token'],
        ]);
    }

    public function me(Request $request): UserResource
    {
        return new UserResource($request->user());
    }

    public function logout(Request $request): JsonResponse
    {
        $this->users->logout($request->user());

        return response()->json(['message' => 'Logged out successfully.']);
    }
}

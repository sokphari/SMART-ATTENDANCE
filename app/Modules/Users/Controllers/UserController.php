<?php

namespace App\Modules\Users\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Users\Requests\RequestStore;
use App\Modules\Users\Requests\RequestUpdate;
use App\Modules\Users\Resources\UserResource;
use App\Modules\Users\Services\UserServices;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class UserController extends Controller
{
    public function __construct(private readonly UserServices $users) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $users = $this->users->paginate(
            $request->only(['search', 'role', 'status', 'per_page'])
        );

        return UserResource::collection($users);
    }

    public function store(RequestStore $request): JsonResponse
    {
        $user = $this->users->create($request->validated());

        return (new UserResource($user))->response()->setStatusCode(201);
    }

    public function show(User $user): UserResource
    {
        return new UserResource($user);
    }

    public function update(RequestUpdate $request, User $user): UserResource
    {
        return new UserResource($this->users->update($user, $request->validated()));
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        if ($request->user()->is($user)) {
            return response()->json([
                'message' => 'You cannot deactivate your own account.',
            ], 403);
        }

        $this->users->deactivate($user);

        return response()->json(null, 204);
    }
}

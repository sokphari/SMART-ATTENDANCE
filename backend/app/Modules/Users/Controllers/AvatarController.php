<?php

namespace App\Modules\Users\Controllers;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AvatarController extends Controller
{
    public function store(Request $request): array
    {
        $user = $request->user();
        abort_unless(in_array($user->role, [UserRole::Admin, UserRole::Teacher], true), 403);
        $request->validate(['image' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048']]);
        abort_unless(extension_loaded('gd') && function_exists('imagewebp'), 503, 'Image processing is unavailable.');

        $file = $request->file('image');
        $source = @imagecreatefromstring(file_get_contents($file->getRealPath()));
        if (! $source) throw ValidationException::withMessages(['image' => ['The image file could not be decoded.']]);
        if ($file->getMimeType() === 'image/jpeg' && function_exists('exif_read_data')) {
            $orientation = @exif_read_data($file->getRealPath())['Orientation'] ?? 1;
            $rotation = match ($orientation) { 3 => 180, 6 => -90, 8 => 90, default => 0 };
            if ($rotation !== 0) { $rotated = imagerotate($source, $rotation, 0); if ($rotated !== false) { imagedestroy($source); $source = $rotated; } }
        }
        $width = imagesx($source); $height = imagesy($source);
        $scale = min(1, 300 / max($width, $height));
        $targetWidth = max(1, (int) round($width * $scale));
        $targetHeight = max(1, (int) round($height * $scale));
        $target = imagecreatetruecolor($targetWidth, $targetHeight);
        imagealphablending($target, true);
        imagecopyresampled($target, $source, 0, 0, 0, 0, $targetWidth, $targetHeight, $width, $height);
        ob_start(); imagewebp($target, null, 78); $webp = ob_get_clean();
        imagedestroy($source); imagedestroy($target);
        if (! is_string($webp) || $webp === '') abort(500, 'Could not process the profile image.');

        $path = 'avatars/'.Str::uuid().'.webp';
        if (! Storage::disk('local')->put($path, $webp)) abort(500, 'Could not save the profile image.');
        $oldPath = $user->avatar_path;
        try {
            $user->forceFill(['avatar_path' => $path])->save();
        } catch (\Throwable $error) {
            Storage::disk('local')->delete($path);
            throw $error;
        }
        if ($oldPath) Storage::disk('local')->delete($oldPath);
        return ['data' => ['avatar_url' => '/api/v1/profile/avatar/'.$user->id.'?v='.now()->timestamp]];
    }

    public function show(Request $request, User $user): StreamedResponse
    {
        abort_unless($request->user()->is($user) || $request->user()->role === UserRole::Admin, 403);
        abort_if($user->role === UserRole::Student || ! $user->avatar_path, 404);
        abort_unless(Storage::disk('local')->exists($user->avatar_path), 404);
        return Storage::disk('local')->response($user->avatar_path, null, ['Content-Type' => 'image/webp', 'Cache-Control' => 'private, max-age=300']);
    }

    public function destroy(Request $request): \Illuminate\Http\JsonResponse
    {
        $user = $request->user();
        abort_unless(in_array($user->role, [UserRole::Admin, UserRole::Teacher], true), 403);
        $path = $user->avatar_path;
        $user->forceFill(['avatar_path' => null])->save();
        if ($path) Storage::disk('local')->delete($path);
        return response()->json(['data' => ['avatar_url' => null]]);
    }
}

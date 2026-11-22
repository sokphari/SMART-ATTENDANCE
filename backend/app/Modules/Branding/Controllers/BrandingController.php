<?php

namespace App\Modules\Branding\Controllers;

use App\Http\Controllers\Controller;
use App\Models\BrandingSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BrandingController extends Controller
{
    public function show(): JsonResponse
    {
        return response()->json(['data' => $this->settings()]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'system_name' => ['required', 'string', 'min:2', 'max:80'],
            'logo_url' => ['nullable', 'url:http,https', 'max:2048'],
            'primary_color' => ['required', 'regex:/^#[0-9A-Fa-f]{6}$/'],
        ]);

        $settings = BrandingSetting::query()->firstOrCreate(['id' => 1]);
        $settings->fill($validated)->save();

        return response()->json(['data' => $this->serialize($settings->refresh())]);
    }

    private function settings(): array
    {
        $settings = BrandingSetting::query()->first();
        if (!$settings) {
            return [
                'system_name' => 'Smart Attendance',
                'logo_url' => null,
                'primary_color' => '#2563EB',
            ];
        }

        return $this->serialize($settings);
    }

    private function serialize(BrandingSetting $settings): array
    {
        return [
            'system_name' => $settings->system_name,
            'logo_url' => $settings->logo_url,
            'primary_color' => $settings->primary_color,
        ];
    }
}

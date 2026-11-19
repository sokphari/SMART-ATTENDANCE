<?php

namespace App\Modules\Attendance\Requests;

use Illuminate\Foundation\Http\FormRequest;
use App\Models\TimetableSetting;

class RequestCheckIn extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $settings = TimetableSetting::query()->find(1);
        $geofencingEnabled = $settings?->geofencing_enabled ?? true;
        $locationRule = $geofencingEnabled ? 'required' : 'nullable';

        return [
            'token' => ['required', 'string', 'max:255'],
            'latitude' => [$locationRule, 'numeric', 'between:-90,90'],
            'longitude' => [$locationRule, 'numeric', 'between:-180,180'],
            'gps_accuracy_meters' => [$locationRule, 'numeric', 'min:0', 'max:'.($settings?->gps_accuracy_threshold_meters ?? 30)],
        ];
    }
}

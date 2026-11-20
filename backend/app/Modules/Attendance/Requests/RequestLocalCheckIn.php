<?php

namespace App\Modules\Attendance\Requests;

use App\Models\TimetableSetting;
use Illuminate\Foundation\Http\FormRequest;

class RequestLocalCheckIn extends FormRequest
{
    public function authorize(): bool
    {
        return app()->environment('local') && config('attendance.allow_local_qr_testing', false);
    }

    public function rules(): array
    {
        $settings = TimetableSetting::find(1);
        $required = ($settings?->geofencing_enabled ?? true) ? 'required' : 'nullable';

        return [
            'token' => ['required', 'string', 'max:255'],
            'attendance_id' => ['required', 'string', 'regex:/^[0-9]{9}$/'],
            'device_id' => ['required', 'string', 'uuid'],
            'latitude' => [$required, 'numeric', 'between:-90,90'],
            'longitude' => [$required, 'numeric', 'between:-180,180'],
            'gps_accuracy_meters' => [$required, 'numeric', 'min:0', 'max:'.($settings?->gps_accuracy_threshold_meters ?? 30)],
        ];
    }
}

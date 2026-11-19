<?php

namespace App\Modules\ClassSchedules\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;
use App\Models\TimetableSetting;

class RequestUpdateTimetableSettings extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'max_weekly_teaching_hours' => ['sometimes', 'required', 'numeric', 'gt:0', 'max:168'],
            'max_assigned_sections' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:1000'],
            'automatic_attendance_enabled' => ['sometimes', 'boolean'],
            'late_after_minutes' => ['sometimes', 'required', 'integer', 'min:0', 'max:240'],
            'check_in_window_minutes' => ['sometimes', 'required', 'integer', 'min:1', 'max:480'],
            'geofencing_enabled' => ['sometimes', 'boolean'],
            'gps_accuracy_threshold_meters' => ['sometimes', 'required', 'integer', 'min:1', 'max:500'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            $settings = TimetableSetting::query()->find(1);
            $lateAfter = (int) $this->input('late_after_minutes', $settings?->late_after_minutes ?? 15);
            $checkInWindow = (int) $this->input('check_in_window_minutes', $settings?->check_in_window_minutes ?? 30);
            if ($lateAfter > $checkInWindow) {
                $validator->errors()->add('late_after_minutes', 'The late threshold cannot be after the QR check-in window closes.');
            }
        }];
    }
}

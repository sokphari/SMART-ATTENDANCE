<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Local QR Check-in Testing
    |--------------------------------------------------------------------------
    | Explicit opt-in for development only. This is NEVER available when
    | APP_ENV is not "local", even if the flag is accidentally enabled.
    | Teacher ownership, authentication and the active session are still
    | validated by the service. Do not enable this for real attendance.
    */
    'allow_local_qr_testing' => (bool) env('ATTENDANCE_ENABLE_LOCAL_QR_TESTING', false),
];

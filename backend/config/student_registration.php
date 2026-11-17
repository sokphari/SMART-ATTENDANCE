<?php

return [
    'frontend_url' => env('FRONTEND_URL', 'http://localhost:3000'),
    'section_capacity' => (int) env('STUDENT_REGISTRATION_SECTION_CAPACITY', 35),
    'token_ttl_minutes' => 15,
];

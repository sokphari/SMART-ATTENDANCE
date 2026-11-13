package com.rupp.teacher.data.remote.dto.auth

data class LoginRequest(
    val email: String,
    val password: String,
    val device_name: String = "Smart Attendance Android"
)

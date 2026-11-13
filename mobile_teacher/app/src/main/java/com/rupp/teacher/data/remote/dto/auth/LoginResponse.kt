package com.rupp.teacher.data.remote.dto.auth

data class LoginResponse(
    val data: UserDto,
    val token: String
)

data class UserResponse(
    val data: UserDto
)
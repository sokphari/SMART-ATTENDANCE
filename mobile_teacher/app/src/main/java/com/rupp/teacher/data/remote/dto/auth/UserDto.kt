package com.rupp.teacher.data.remote.dto.auth

import com.google.gson.annotations.SerializedName

data class UserDto(
    val id: Int,

    val name: String,

    val email: String,

    val role: String,

    val status: String
)

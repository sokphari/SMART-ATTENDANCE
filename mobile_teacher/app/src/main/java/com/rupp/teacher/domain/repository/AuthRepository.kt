package com.rupp.teacher.domain.repository

import com.rupp.teacher.domain.model.User

interface AuthRepository {

    suspend fun login(
        email: String,
        password: String
    ): Result<User>

    suspend fun getCurrentUser(): Result<User>

    suspend fun logout(): Result<Unit>
}
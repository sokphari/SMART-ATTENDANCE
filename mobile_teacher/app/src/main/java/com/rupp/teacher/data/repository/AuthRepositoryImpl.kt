
package com.rupp.teacher.data.repository

import android.util.Log
import com.rupp.teacher.core.storage.TokenManager
import com.rupp.teacher.data.remote.api.AuthApi
import com.rupp.teacher.data.remote.dto.auth.LoginRequest
import com.rupp.teacher.domain.model.User
import com.rupp.teacher.domain.repository.AuthRepository
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import retrofit2.HttpException

class AuthRepositoryImpl(
    private val authApi: AuthApi,
    private val tokenManager: TokenManager
) : AuthRepository {

    override suspend fun login(
        email: String,
        password: String
    ): Result<User> = withContext(Dispatchers.IO) {
        try {
            Log.d("LOGIN_DEBUG", "Sending login request...")

            val response = authApi.login(
                LoginRequest(
                    email = email,
                    password = password
                )
            )

            Log.d("LOGIN_DEBUG", "HTTP Code: ${response.code()}")
            Log.d("LOGIN_DEBUG", "Successful: ${response.isSuccessful}")

            if (!response.isSuccessful) {
                val errorBody = response.errorBody()?.string()

                Log.e("LOGIN_DEBUG", "API Error: $errorBody")

                return@withContext Result.failure(
                    Exception("HTTP ${response.code()}: $errorBody")
                )
            }

            val body = response.body()
                ?: return@withContext Result.failure(
                    Exception("Empty server response")
                )

            Log.d("LOGIN_DEBUG", "Login successful")
            Log.d("LOGIN_DEBUG", "User role: ${body.data.role}")

            tokenManager.saveToken(body.token)

            Result.success(body.data.toDomain())

        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            Log.e("LOGIN_DEBUG", "Login Exception", e)
            Result.failure(e)
        }
    }

    override suspend fun getCurrentUser(): Result<User> =
        withContext(Dispatchers.IO) {
            try {
                val response = authApi.getCurrentUser()

                if (!response.isSuccessful) {
                    return@withContext Result.failure(
                        HttpException(response)
                    )
                }

                val user = response.body()?.data
                    ?: return@withContext Result.failure(
                        Exception("User data not found")
                    )

                Result.success(user.toDomain())

            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Log.e("LOGIN_DEBUG", "Get current user failed", e)
                Result.failure(e)
            }
        }

    override suspend fun logout(): Result<Unit> =
        withContext(Dispatchers.IO) {
            try {
                val response = authApi.logout()

                if (!response.isSuccessful) {
                    return@withContext Result.failure(
                        HttpException(response)
                    )
                }

                tokenManager.clearToken()

                Result.success(Unit)

            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Log.e("LOGIN_DEBUG", "Logout failed", e)
                Result.failure(e)
            }
        }
}

private fun com.rupp.teacher.data.remote.dto.auth.UserDto.toDomain() =
    User(
        id = id,
        name = name,
        email = email,
        role = role,
        status = status
    )

package com.rupp.teacher.data.remote.api




import com.rupp.teacher.data.remote.dto.auth.LoginRequest
import com.rupp.teacher.data.remote.dto.auth.LoginResponse
import com.rupp.teacher.data.remote.dto.auth.UserResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

interface AuthApi {

    @POST("auth/login")
    suspend fun login(
        @Body request: LoginRequest
    ): Response<LoginResponse>

    @GET("auth/me")
    suspend fun getCurrentUser(): Response<UserResponse>

    @POST("auth/logout")
    suspend fun logout(): Response<Unit>
}

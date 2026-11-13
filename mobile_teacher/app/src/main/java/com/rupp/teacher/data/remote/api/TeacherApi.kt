package com.rupp.teacher.data.remote.api

import com.rupp.teacher.data.remote.dto.teacher.AttendanceSessionsResponse
import com.rupp.teacher.data.remote.dto.teacher.CreateSessionRequest
import com.rupp.teacher.data.remote.dto.teacher.CreateSessionResponse
import com.rupp.teacher.data.remote.dto.teacher.QrTokenResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface TeacherApi {

    @GET("teacher/attendance-sessions")
    suspend fun getAttendanceSessions(
        @Query("status") status: String? = null,
        @Query("class_section_id") classSectionId: Int? = null,
        @Query("date_from") dateFrom: String? = null,
        @Query("date_to") dateTo: String? = null,
        @Query("per_page") perPage: Int = 15
    ): Response<AttendanceSessionsResponse>

    @POST("teacher/attendance-sessions")
    suspend fun createAttendanceSession(
        @Body request: CreateSessionRequest
    ): Response<CreateSessionResponse>

    @POST("teacher/attendance-sessions/{id}/qr-token")
    suspend fun generateQrToken(
        @Path("id") sessionId: Int
    ): Response<QrTokenResponse>
}
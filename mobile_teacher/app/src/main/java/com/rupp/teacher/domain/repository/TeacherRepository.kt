package com.rupp.teacher.domain.repository

import com.rupp.teacher.data.remote.dto.teacher.CreateSessionRequest
import com.rupp.teacher.domain.model.AttendanceSession
import com.rupp.teacher.domain.model.QrToken

interface TeacherRepository {

    suspend fun getAttendanceSessions(
        status: String? = null,
        classSectionId: Int? = null,
        dateFrom: String? = null,
        dateTo: String? = null
    ): Result<List<AttendanceSession>>

    suspend fun createAttendanceSession(
        request: CreateSessionRequest
    ): Result<AttendanceSession>

    suspend fun generateQrToken(
        sessionId: Int
    ): Result<QrToken>
}
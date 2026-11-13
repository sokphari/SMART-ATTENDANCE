
package com.rupp.teacher.data.repository

import com.rupp.teacher.data.remote.api.TeacherApi
import com.rupp.teacher.data.mapper.toDomain
import com.rupp.teacher.data.remote.dto.teacher.AttendanceSessionDto
import com.rupp.teacher.data.remote.dto.teacher.AttendanceSessionsResponse
import com.rupp.teacher.data.remote.dto.teacher.CreateSessionRequest
import com.rupp.teacher.domain.model.AttendanceSession
import com.rupp.teacher.domain.model.QrToken
import com.rupp.teacher.domain.repository.TeacherRepository
import kotlinx.coroutines.CancellationException

class TeacherRepositoryImpl(
    private val teacherApi: TeacherApi
) : TeacherRepository {

    override suspend fun getAttendanceSessions(
        status: String?,
        classSectionId: Int?,
        dateFrom: String?,
        dateTo: String?
    ): Result<List<AttendanceSession>> {
        return try {
            val response = teacherApi.getAttendanceSessions(
                status = status,
                classSectionId = classSectionId,
                dateFrom = dateFrom,
                dateTo = dateTo
            )

            if (response.isSuccessful) {

                val responseBody: AttendanceSessionsResponse? = response.body()

                val sessions: List<AttendanceSession> =
                    responseBody?.data?.map { sessionDto: AttendanceSessionDto ->
                        sessionDto.toDomain()
                    } ?: emptyList()

                Result.success(sessions)

            } else {
                Result.failure(
                    Exception(readError(response.code(), response.message()))
                )
            }
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun createAttendanceSession(
        request: CreateSessionRequest
    ): Result<AttendanceSession> {

        return try {
            val response = teacherApi.createAttendanceSession(request)

            if (response.isSuccessful) {

                val responseBody = response.body()
                    ?: throw Exception("Empty response from server")

                val session: AttendanceSession =
                    responseBody.data.toDomain()

                Result.success(session)

            } else {
                Result.failure(
                    Exception(
                        readError(response.code(), response.message())
                    )
                )
            }

        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun generateQrToken(
        sessionId: Int
    ): Result<QrToken> {
        return try {
            val response = teacherApi.generateQrToken(sessionId)

            if (response.isSuccessful) {
                val qrToken = response.body()?.data
                    ?: throw Exception("Empty QR token response")

                Result.success(qrToken.toDomain())
            } else {
                Result.failure(
                    Exception(readError(response.code(), response.message()))
                )
            }
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private fun readError(
        code: Int,
        message: String
    ): String {
        return when (code) {
            401 -> "Session expired. Please log in again."
            403 -> "You do not have permission to access this resource."
            404 -> "The requested resource was not found."
            409 -> "This attendance session conflicts with an existing session."
            422 -> "Please check the submitted information."
            else -> "Request failed ($code): $message"
        }
    }
}

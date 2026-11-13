package com.rupp.teacher.domain.usecase.teacher

import com.rupp.teacher.domain.repository.TeacherRepository

class GetAttendanceSessionsUseCase(
    private val repository: TeacherRepository
) {
    suspend operator fun invoke(
        status: String? = null,
        dateFrom: String? = null,
        dateTo: String? = null
    ) = repository.getAttendanceSessions(
        status = status,
        dateFrom = dateFrom,
        dateTo = dateTo
    )
}
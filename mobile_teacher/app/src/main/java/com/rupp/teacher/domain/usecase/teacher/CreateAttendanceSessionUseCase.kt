package com.rupp.teacher.domain.usecase.teacher

import com.rupp.teacher.data.remote.dto.teacher.CreateSessionRequest
import com.rupp.teacher.domain.repository.TeacherRepository

class CreateAttendanceSessionUseCase(
    private val repository: TeacherRepository
) {
    suspend operator fun invoke(
        request: CreateSessionRequest
    ) = repository.createAttendanceSession(request)
}
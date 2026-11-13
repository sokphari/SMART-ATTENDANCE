package com.rupp.teacher.domain.usecase.teacher

import com.rupp.teacher.domain.repository.TeacherRepository

class GenerateQrTokenUseCase(
    private val repository: TeacherRepository
) {
    suspend operator fun invoke(sessionId: Int) =
        repository.generateQrToken(sessionId)
}
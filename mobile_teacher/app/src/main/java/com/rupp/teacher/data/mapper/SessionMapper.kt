package com.rupp.teacher.data.mapper

import com.rupp.teacher.data.remote.dto.teacher.AttendanceSessionDto
import com.rupp.teacher.data.remote.dto.teacher.QrTokenDto
import com.rupp.teacher.domain.model.AttendanceSession
import com.rupp.teacher.domain.model.QrToken

fun AttendanceSessionDto.toDomain(): AttendanceSession {
    return AttendanceSession(
        id = id,
        classSectionId = classSectionId,
        sessionDate = sessionDate,
        startsAt = startsAt,
        lateAfter = lateAfter,
        closesAt = closesAt,
        status = status
    )
}

fun QrTokenDto.toDomain(): QrToken {
    return QrToken(
        token = token,
        expiresAt = expiresAt
    )
}
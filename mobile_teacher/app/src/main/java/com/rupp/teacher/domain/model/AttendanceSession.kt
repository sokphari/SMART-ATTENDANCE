package com.rupp.teacher.domain.model

data class AttendanceSession(
    val id: Int,
    val classSectionId: Int,
    val sessionDate: String,
    val startsAt: String,
    val lateAfter: String,
    val closesAt: String,
    val status: String
)
package com.rupp.teacher.presentation.teacher.attendance.model

enum class AttendanceSessionStatus {
    OPEN,
    CLOSED
}

data class TeacherAttendanceSession(
    val id: Int,
    val courseName: String,
    val courseCode: String,
    val className: String,
    val date: String,
    val startTime: String,
    val endTime: String,
    val presentCount: Int,
    val lateCount: Int,
    val absentCount: Int,
    val status: AttendanceSessionStatus
) {
    val totalStudents: Int
        get() = presentCount + lateCount + absentCount
}
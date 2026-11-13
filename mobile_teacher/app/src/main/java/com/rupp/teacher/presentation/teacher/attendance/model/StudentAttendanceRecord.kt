
package com.rupp.teacher.presentation.teacher.attendance.model

enum class StudentAttendanceStatus(val label: String) {
    PRESENT("Present"),
    LATE("Late"),
    ABSENT("Absent"),
    EXCUSED("Permission")
}

data class StudentAttendanceRecord(
    val studentId: Int,
    val studentName: String,
    val studentCode: String,
    val status: StudentAttendanceStatus,
    val checkedInAt: String? = null,
    val reason: String? = null
)

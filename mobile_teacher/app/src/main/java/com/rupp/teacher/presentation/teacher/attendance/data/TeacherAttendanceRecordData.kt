
package com.rupp.teacher.presentation.teacher.attendance.data

import com.rupp.teacher.presentation.teacher.attendance.model.StudentAttendanceRecord
import com.rupp.teacher.presentation.teacher.attendance.model.StudentAttendanceStatus

object TeacherAttendanceRecordData {

    val records = listOf(
        StudentAttendanceRecord(
            studentId = 1,
            studentName = "Dara Sok",
            studentCode = "ST001",
            status = StudentAttendanceStatus.PRESENT,
            checkedInAt = "08:05 AM"
        ),
        StudentAttendanceRecord(
            studentId = 2,
            studentName = "Sopheak Kim",
            studentCode = "ST002",
            status = StudentAttendanceStatus.LATE,
            checkedInAt = "08:25 AM"
        ),
        StudentAttendanceRecord(
            studentId = 3,
            studentName = "Vicheka Lim",
            studentCode = "ST003",
            status = StudentAttendanceStatus.PRESENT,
            checkedInAt = "08:02 AM"
        ),
        StudentAttendanceRecord(
            studentId = 4,
            studentName = "Rithy Chan",
            studentCode = "ST004",
            status = StudentAttendanceStatus.ABSENT
        ),
        StudentAttendanceRecord(
            studentId = 5,
            studentName = "Sokha Meas",
            studentCode = "ST005",
            status = StudentAttendanceStatus.PRESENT,
            checkedInAt = "08:10 AM"
        ),
        StudentAttendanceRecord(
            studentId = 6,
            studentName = "Nita Heng",
            studentCode = "ST006",
            status = StudentAttendanceStatus.ABSENT
        )
    )
}

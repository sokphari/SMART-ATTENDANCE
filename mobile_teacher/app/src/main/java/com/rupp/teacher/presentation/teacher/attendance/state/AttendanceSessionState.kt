package com.rupp.teacher.presentation.teacher.attendance.state

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.rupp.teacher.presentation.teacher.attendance.model.StudentAttendanceRecord
import com.rupp.teacher.presentation.teacher.attendance.model.StudentAttendanceStatus

class AttendanceSessionState(
    initialRecords: List<StudentAttendanceRecord>
) {
    var records by mutableStateOf(initialRecords)
        private set

    fun updateStatus(
        studentId: Int,
        status: StudentAttendanceStatus,
        reason: String? = null
    ) {
        records = records.map { record ->
            if (record.studentId == studentId) {
                record.copy(
                    status = status,
                    reason = reason,
                    checkedInAt = if (
                        status == StudentAttendanceStatus.ABSENT ||
                        status == StudentAttendanceStatus.EXCUSED
                    ) null else record.checkedInAt
                )
            } else {
                record
            }
        }
    }

    fun updateFromQrCheckIn(
        studentId: Int,
        status: StudentAttendanceStatus,
        checkedInAt: String
    ) {
        records = records.map { record ->
            if (record.studentId == studentId) {
                record.copy(
                    status = status,
                    checkedInAt = checkedInAt,
                    reason = null
                )
            } else {
                record
            }
        }
    }

    fun replaceRecords(newRecords: List<StudentAttendanceRecord>) {
        records = newRecords
    }
}
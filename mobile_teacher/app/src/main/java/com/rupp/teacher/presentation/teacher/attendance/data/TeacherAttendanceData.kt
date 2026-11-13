package com.rupp.teacher.presentation.teacher.attendance.data

import com.rupp.teacher.presentation.teacher.attendance.model.AttendanceSessionStatus
import com.rupp.teacher.presentation.teacher.attendance.model.TeacherAttendanceSession

object TeacherAttendanceData {

    val sessions = listOf(
        TeacherAttendanceSession(
            id = 1,
            courseName = "Mobile Application Development",
            courseCode = "CS401",
            className = "Year 4 - Section A",
            date = "Nov 13, 2026",
            startTime = "08:00 AM",
            endTime = "10:00 AM",
            presentCount = 28,
            lateCount = 3,
            absentCount = 4,
            status = AttendanceSessionStatus.OPEN
        ),
        TeacherAttendanceSession(
            id = 2,
            courseName = "Database Management System",
            courseCode = "CS302",
            className = "Year 3 - Section B",
            date = "Nov 12, 2026",
            startTime = "01:00 PM",
            endTime = "03:00 PM",
            presentCount = 35,
            lateCount = 2,
            absentCount = 5,
            status = AttendanceSessionStatus.CLOSED
        ),
        TeacherAttendanceSession(
            id = 3,
            courseName = "Web Application Development",
            courseCode = "CS303",
            className = "Year 3 - Section A",
            date = "Nov 11, 2026",
            startTime = "08:00 AM",
            endTime = "10:00 AM",
            presentCount = 32,
            lateCount = 2,
            absentCount = 4,
            status = AttendanceSessionStatus.CLOSED
        ),
        TeacherAttendanceSession(
            id = 4,
            courseName = "Mobile Application Development",
            courseCode = "CS401",
            className = "Year 4 - Section A",
            date = "Nov 10, 2026",
            startTime = "08:00 AM",
            endTime = "10:00 AM",
            presentCount = 30,
            lateCount = 1,
            absentCount = 4,
            status = AttendanceSessionStatus.CLOSED
        ),
        TeacherAttendanceSession(
            id = 5,
            courseName = "Database Management System",
            courseCode = "CS302",
            className = "Year 3 - Section B",
            date = "Nov 09, 2026",
            startTime = "01:00 PM",
            endTime = "03:00 PM",
            presentCount = 38,
            lateCount = 1,
            absentCount = 3,
            status = AttendanceSessionStatus.CLOSED
        )
    )
}
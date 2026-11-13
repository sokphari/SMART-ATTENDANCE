package com.rupp.teacher.presentation.teacher.courses.data

import com.rupp.teacher.presentation.teacher.courses.model.CourseStatus
import com.rupp.teacher.presentation.teacher.courses.model.TeacherCourse

object TeacherCourseData {

    val courses = listOf(
        TeacherCourse(
            id = 1,
            name = "Mobile Application Development",
            code = "CS401",
            className = "Year 4 - Section A",
            schedule = "Monday · 8:00 AM - 10:00 AM",
            studentCount = 35,
            status = CourseStatus.ONGOING
        ),
        TeacherCourse(
            id = 2,
            name = "Database Management System",
            code = "CS302",
            className = "Year 3 - Section B",
            schedule = "Tuesday · 1:00 PM - 3:00 PM",
            studentCount = 42,
            status = CourseStatus.ONGOING
        ),
        TeacherCourse(
            id = 3,
            name = "Web Application Development",
            code = "CS303",
            className = "Year 3 - Section A",
            schedule = "Wednesday · 8:00 AM - 10:00 AM",
            studentCount = 38,
            status = CourseStatus.ONGOING
        ),
        TeacherCourse(
            id = 4,
            name = "Programming Fundamentals",
            code = "CS101",
            className = "Year 1 - Section C",
            schedule = "Thursday · 1:00 PM - 3:00 PM",
            studentCount = 40,
            status = CourseStatus.COMPLETED
        )
    )
}
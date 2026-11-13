package com.rupp.teacher.presentation.teacher.courses.model

data class TeacherCourse(
    val id: Int,
    val name: String,
    val code: String,
    val className: String,
    val schedule: String,
    val studentCount: Int,
    val status: CourseStatus
)

enum class CourseStatus {
    ONGOING,
    COMPLETED
}
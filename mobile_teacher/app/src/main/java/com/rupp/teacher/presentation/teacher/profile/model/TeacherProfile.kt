package com.rupp.teacher.presentation.teacher.profile.model

data class TeacherProfile(
    val id: Int,
    val name: String,
    val email: String,
    val teacherCode: String,
    val department: String,
    val role: String,
    val phone: String,
    val status: String
)
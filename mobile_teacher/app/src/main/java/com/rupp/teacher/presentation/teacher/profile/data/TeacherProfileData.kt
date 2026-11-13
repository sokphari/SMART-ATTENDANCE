package com.rupp.teacher.presentation.teacher.profile.data

import com.rupp.teacher.presentation.teacher.profile.model.TeacherProfile

object TeacherProfileData {

    val profile = TeacherProfile(
        id = 1,
        name = "John Smith",
        email = "john.smith@example.com",
        teacherCode = "TCH-2026-001",
        department = "Information Technology",
        role = "Teacher",
        phone = "+855 12 345 678",
        status = "Active"
    )
}
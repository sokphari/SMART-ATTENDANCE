package com.rupp.teacher.presentation.shared.model


enum class UserRole(val value: String) {
    ADMIN("admin"),
    TEACHER("teacher"),
    STUDENT("student"),
    UNKNOWN("unknown");

    companion object {
        fun from(role: String?): UserRole {
            return entries.firstOrNull {
                it.value.equals(role?.trim(), ignoreCase = true)
            } ?: UNKNOWN
        }
    }
}

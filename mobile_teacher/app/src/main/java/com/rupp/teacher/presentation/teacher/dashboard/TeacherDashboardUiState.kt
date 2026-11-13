package com.rupp.teacher.presentation.teacher.dashboard

import com.rupp.teacher.domain.model.AttendanceSession

data class TeacherDashboardUiState(
    val isLoading: Boolean = false,
    val sessions: List<AttendanceSession> = emptyList(),
    val error: String? = null,
    val isCreatingSession: Boolean = false
)
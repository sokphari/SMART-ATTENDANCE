package com.rupp.teacher.presentation.teacher.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.rupp.teacher.domain.repository.TeacherRepository

class TeacherViewModelFactory(
    private val repository: TeacherRepository
) : ViewModelProvider.Factory {

    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(
        modelClass: Class<T>
    ): T {
        if (modelClass.isAssignableFrom(
                TeacherDashboardViewModel::class.java
            )
        ) {
            return TeacherDashboardViewModel(repository) as T
        }

        throw IllegalArgumentException(
            "Unknown ViewModel class: ${modelClass.name}"
        )
    }
}
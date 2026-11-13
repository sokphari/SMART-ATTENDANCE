package com.rupp.teacher.presentation.teacher.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.rupp.teacher.data.remote.dto.teacher.CreateSessionRequest
import com.rupp.teacher.domain.repository.TeacherRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class TeacherDashboardViewModel(
    private val repository: TeacherRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(
        TeacherDashboardUiState(isLoading = true)
    )

    val uiState = _uiState.asStateFlow()

    init {
        loadSessions()
    }

    fun loadSessions() {
        viewModelScope.launch {
            _uiState.update {
                it.copy(isLoading = true, error = null)
            }

            repository.getAttendanceSessions()
                .onSuccess { sessions ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            sessions = sessions,
                            error = null
                        )
                    }
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = error.message ?: "Unable to load sessions"
                        )
                    }
                }
        }
    }

    fun createSession(request: CreateSessionRequest) {
        viewModelScope.launch {
            _uiState.update {
                it.copy(isCreatingSession = true, error = null)
            }

            repository.createAttendanceSession(request)
                .onSuccess {
                    _uiState.update {
                        it.copy(isCreatingSession = false)
                    }
                    loadSessions()
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            isCreatingSession = false,
                            error = error.message ?: "Unable to create session"
                        )
                    }
                }
        }
    }
}
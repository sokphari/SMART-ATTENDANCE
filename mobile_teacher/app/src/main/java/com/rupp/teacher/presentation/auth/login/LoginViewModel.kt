package com.rupp.teacher.presentation.auth.login

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.rupp.teacher.domain.repository.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import retrofit2.HttpException
import java.io.IOException

class LoginViewModel(
    private val repository: AuthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(LoginUiState())
    val uiState = _uiState.asStateFlow()

    fun onEmailChange(value: String) {
        _uiState.update {
            it.copy(
                email = value,
                errorMessage = null
            )
        }
    }

    fun onPasswordChange(value: String) {
        _uiState.update {
            it.copy(
                password = value,
                errorMessage = null
            )
        }
    }

    fun login() {
        val currentState = _uiState.value

        if (currentState.email.isBlank()) {
            _uiState.update {
                it.copy(errorMessage = "Please enter your email.")
            }
            return
        }

        if (currentState.password.isBlank()) {
            _uiState.update {
                it.copy(errorMessage = "Please enter your password.")
            }
            return
        }

        viewModelScope.launch {

            _uiState.update {
                it.copy(
                    isLoading = true,
                    errorMessage = null
                )
            }

            val result = repository.login(
                email = currentState.email.trim(),
                password = currentState.password
            )

            result.fold(
                onSuccess = { user ->
                    if (user.status != "active") {
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                errorMessage = "Your account is not active."
                            )
                        }
                    } else {
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                user = user
                            )
                        }
                    }
                },
                onFailure = { error ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            errorMessage = getErrorMessage(error)
                        )
                    }
                }
            )
        }
    }

    private fun getErrorMessage(error: Throwable): String {
        return when (error) {
            is HttpException -> when (error.code()) {
                401 -> "Invalid email or password."
                403 -> "You are not authorized to access this account."
                422 -> "Please check your login information."
                429 -> "Too many login attempts. Please try again later."
                else -> "Server error. Please try again."
            }

            is IOException ->
                "Cannot connect to server. Check your network."

            else ->
                error.message ?: "Something went wrong."
        }
    }
}
